import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role === 'comercial') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const investorId = searchParams.get('investor_id') ? parseInt(searchParams.get('investor_id')) : null;

  // Restrict to team for directors
  let userIds;
  if (user.role === 'director') {
    userIds = db.prepare('SELECT id FROM users WHERE director_id = ? OR id = ?').all(user.id, user.id).map(u => u.id);
  } else {
    userIds = db.prepare('SELECT id FROM users').all().map(u => u.id);
  }

  const placeholders = userIds.map(() => '?').join(',');

  // Summary per investor
  const investorCondition = investorId ? ' AND i.id = ?' : '';
  const investorParams = investorId ? [investorId] : [];

  const perInvestor = db.prepare(`
    SELECT
      i.id, i.name, i.email, i.phone,
      COUNT(v.id) as total_vehicles,
      SUM(CASE WHEN v.status = 'em_stock' THEN 1 ELSE 0 END) as in_stock,
      SUM(CASE WHEN v.status = 'vendido' THEN 1 ELSE 0 END) as sold,
      SUM(CASE WHEN v.status = 'reservado' THEN 1 ELSE 0 END) as reserved,
      COALESCE(SUM(v.purchase_price), 0) as total_purchase,
      COALESCE(SUM(CASE WHEN v.sale_price IS NOT NULL THEN v.sale_price ELSE 0 END), 0) as total_sales
    FROM investors i
    LEFT JOIN vehicles v ON v.investor_id = i.id AND v.created_by IN (${placeholders})
    WHERE 1=1 ${investorCondition}
    GROUP BY i.id
    ORDER BY i.name
  `).all(...userIds, ...investorParams);

  // Add total costs and margins per investor
  const result = perInvestor.map(inv => {
    const totalCosts = db.prepare(`
      SELECT COALESCE(SUM(vc.amount), 0) as total
      FROM vehicle_costs vc
      JOIN vehicles v ON vc.vehicle_id = v.id
      WHERE v.investor_id = ? AND v.created_by IN (${placeholders})
    `).get(inv.id, ...userIds).total;

    const grossMargin = inv.total_sales - inv.total_purchase - totalCosts;

    return { ...inv, total_costs: totalCosts, gross_margin: grossMargin };
  });

  // Sold vehicles detail per investor
  const soldQuery = investorId
    ? `SELECT v.*, u.name as created_by_name, i.name as investor_name,
        COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
       FROM vehicles v JOIN users u ON v.created_by=u.id JOIN investors i ON v.investor_id=i.id
       WHERE v.status='vendido' AND v.sale_price IS NOT NULL AND v.investor_id=? AND v.created_by IN (${placeholders})
       ORDER BY v.updated_at DESC`
    : `SELECT v.*, u.name as created_by_name, i.name as investor_name,
        COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
       FROM vehicles v JOIN users u ON v.created_by=u.id JOIN investors i ON v.investor_id=i.id
       WHERE v.status='vendido' AND v.sale_price IS NOT NULL AND v.created_by IN (${placeholders})
       ORDER BY v.updated_at DESC`;

  const soldVehicles = investorId
    ? db.prepare(soldQuery).all(investorId, ...userIds)
    : db.prepare(soldQuery).all(...userIds);

  const salesDetails = soldVehicles.map(v => {
    const totalCost = v.purchase_price + v.total_vehicle_costs;
    const margin = v.sale_price - totalCost;
    const marginPercent = totalCost > 0 ? (margin / totalCost * 100) : 0;
    return {
      id: v.id, brand: v.brand, model: v.model, year: v.year,
      investor_name: v.investor_name, created_by_name: v.created_by_name,
      purchase_price: v.purchase_price, sale_price: v.sale_price,
      costs: v.total_vehicle_costs, margin, margin_percent: marginPercent,
    };
  });

  return NextResponse.json({ perInvestor: result, salesDetails });
}

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const selectedUsers = searchParams.get('users')?.split(',').map(Number).filter(Boolean) || [];
  const investorId = searchParams.get('investor_id') ? parseInt(searchParams.get('investor_id')) : null;

  let userIds;
  if (user.role === 'comercial') {
    userIds = [user.id];
  } else if (user.role === 'director') {
    const team = db.prepare('SELECT id FROM users WHERE director_id = ? OR id = ?').all(user.id, user.id)
      .filter(u => {
        const full = db.prepare('SELECT role FROM users WHERE id = ?').get(u.id);
        return full.role !== 'admin';
      })
      .map(u => u.id);
    userIds = selectedUsers.length ? selectedUsers.filter(id => team.includes(id)) : team;
  } else {
    const all = db.prepare('SELECT id FROM users').all().map(u => u.id);
    userIds = selectedUsers.length ? selectedUsers.filter(id => all.includes(id)) : all;
  }

  const placeholders = userIds.map(() => '?').join(',');
  const investorCondition = investorId ? ' AND v.investor_id = ?' : '';
  const investorParams = investorId ? [investorId] : [];

  const totalVehicles = db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.created_by IN (${placeholders})${investorCondition}`).get(...userIds, ...investorParams).count;
  const inStock = db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.status='em_stock' AND v.created_by IN (${placeholders})${investorCondition}`).get(...userIds, ...investorParams).count;
  const sold = db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.status='vendido' AND v.created_by IN (${placeholders})${investorCondition}`).get(...userIds, ...investorParams).count;
  const reserved = db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.status='reservado' AND v.created_by IN (${placeholders})${investorCondition}`).get(...userIds, ...investorParams).count;

  const totalPurchase = db.prepare(`SELECT COALESCE(SUM(v.purchase_price),0) as total FROM vehicles v WHERE v.created_by IN (${placeholders})${investorCondition}`).get(...userIds, ...investorParams).total;
  const totalSales = db.prepare(`SELECT COALESCE(SUM(v.sale_price),0) as total FROM vehicles v WHERE v.sale_price IS NOT NULL AND v.created_by IN (${placeholders})${investorCondition}`).get(...userIds, ...investorParams).total;
  const totalCosts = db.prepare(`SELECT COALESCE(SUM(vc.amount),0) as total FROM vehicle_costs vc JOIN vehicles v ON vc.vehicle_id=v.id WHERE v.created_by IN (${placeholders})${investorCondition}`).get(...userIds, ...investorParams).total;

  const soldVehicles = db.prepare(`
    SELECT v.*, u.name as created_by_name, i.name as investor_name,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
    FROM vehicles v JOIN users u ON v.created_by=u.id
    LEFT JOIN investors i ON v.investor_id = i.id
    WHERE v.status='vendido' AND v.sale_price IS NOT NULL AND v.created_by IN (${placeholders})${investorCondition}
    ORDER BY v.updated_at DESC
  `).all(...userIds, ...investorParams);

  const salesDetails = soldVehicles.map(v => {
    const totalCost = v.purchase_price + v.total_vehicle_costs;
    const margin = v.sale_price - totalCost;
    const marginPercent = totalCost > 0 ? (margin / totalCost * 100) : 0;
    return {
      id: v.id, brand: v.brand, model: v.model, year: v.year,
      purchase_price: v.purchase_price, sale_price: v.sale_price,
      costs: v.total_vehicle_costs, margin, margin_percent: marginPercent,
      created_by_name: v.created_by_name,
      investor_name: v.investor_name,
    };
  });

  const perUser = userIds.map(uid => {
    const u = db.prepare('SELECT name, role, investor_id FROM users WHERE id = ?').get(uid);
    let count, soldCount, revenue, totalPurchase, totalCosts;
    if (u.role === 'investidor' && u.investor_id) {
      // Attribute vehicles by investor_id
      count = db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock'`).get(u.investor_id).c;
      soldCount = db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido'`).get(u.investor_id).c;
      revenue = db.prepare(`SELECT COALESCE(SUM(v.sale_price),0) as t FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido' AND v.sale_price IS NOT NULL`).get(u.investor_id).t;
      totalPurchase = db.prepare(`SELECT COALESCE(SUM(v.purchase_price),0) as t FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido'`).get(u.investor_id).t;
      totalCosts = db.prepare(`SELECT COALESCE(SUM(vc.amount),0) as t FROM vehicle_costs vc JOIN vehicles v ON vc.vehicle_id=v.id WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido'`).get(u.investor_id).t;
    } else {
      count = db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.created_by=?${investorCondition}`).get(uid, ...investorParams).c;
      soldCount = db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.created_by=? AND v.status='vendido'${investorCondition}`).get(uid, ...investorParams).c;
      revenue = db.prepare(`SELECT COALESCE(SUM(v.sale_price),0) as t FROM vehicles v WHERE v.created_by=? AND v.status='vendido' AND v.sale_price IS NOT NULL${investorCondition}`).get(uid, ...investorParams).t;
      totalPurchase = db.prepare(`SELECT COALESCE(SUM(v.purchase_price),0) as t FROM vehicles v WHERE v.created_by=? AND v.status='vendido'${investorCondition}`).get(uid, ...investorParams).t;
      totalCosts = db.prepare(`SELECT COALESCE(SUM(vc.amount),0) as t FROM vehicle_costs vc JOIN vehicles v ON vc.vehicle_id=v.id WHERE v.created_by=? AND v.status='vendido'${investorCondition}`).get(uid, ...investorParams).t;
    }
    const margin = revenue - totalPurchase - totalCosts;
    const marginPercent = (totalPurchase + totalCosts) > 0 ? (margin / (totalPurchase + totalCosts) * 100) : 0;
    return { id: uid, name: u.name, role: u.role, total_vehicles: count, sold: soldCount, revenue, margin, margin_percent: marginPercent };
  });

  // Per investor summary (only for director/admin)
  let perInvestor = [];
  if (user.role !== 'comercial') {
    perInvestor = db.prepare(`
      SELECT i.id, i.name,
        COUNT(v.id) as total_vehicles,
        SUM(CASE WHEN v.status='vendido' THEN 1 ELSE 0 END) as sold,
        COALESCE(SUM(v.purchase_price), 0) as total_purchase,
        COALESCE(SUM(CASE WHEN v.sale_price IS NOT NULL THEN v.sale_price ELSE 0 END), 0) as total_sales,
        COALESCE((SELECT SUM(vc.amount) FROM vehicle_costs vc JOIN vehicles v2 ON vc.vehicle_id=v2.id WHERE v2.investor_id=i.id AND v2.created_by IN (${placeholders})), 0) as total_costs
      FROM investors i
      LEFT JOIN vehicles v ON v.investor_id = i.id AND v.created_by IN (${placeholders})
      GROUP BY i.id ORDER BY i.name
    `).all(...userIds, ...userIds);
  }

  return NextResponse.json({
    summary: { totalVehicles, inStock, sold, reserved, totalPurchase, totalSales, totalCosts, grossMargin: totalSales - totalPurchase - totalCosts },
    salesDetails,
    perUser,
    perInvestor,
  });
}

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
  const dateFrom = searchParams.get('date_from') || null;
  const dateTo = searchParams.get('date_to') || null;
  const dateCondition = (dateFrom ? ' AND v.created_at >= ?' : '') + (dateTo ? ' AND v.created_at <= ?' : '');
  const dateParams = [...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo + ' 23:59:59'] : [])];

  // Company-scoped: all users of the current user's company
  let userIds = (await db.prepare('SELECT id FROM users WHERE company_id = ?').all(user.company_id)).map(u => u.id);
  if (userIds.length === 0) userIds = [-1];

  const placeholders = userIds.map(() => '?').join(',');
  const investorCondition = ' AND i.company_id = ?' + (investorId ? ' AND i.id = ?' : '');
  const investorParams = [user.company_id, ...(investorId ? [investorId] : [])];

  const perInvestor = await db.prepare(`
    SELECT
      i.id, i.name, i.email, i.phone,
      COUNT(CASE WHEN v.vehicle_type = 'stock' THEN 1 END) as total_vehicles,
      SUM(CASE WHEN v.status = 'em_stock' AND v.vehicle_type = 'stock' THEN 1 ELSE 0 END) as in_stock,
      SUM(CASE WHEN v.status = 'vendido' AND v.vehicle_type = 'stock' THEN 1 ELSE 0 END) as sold,
      SUM(CASE WHEN v.status = 'reservado' AND v.vehicle_type = 'stock' THEN 1 ELSE 0 END) as reserved,
      COALESCE(SUM(CASE WHEN v.vehicle_type = 'stock' THEN v.purchase_price ELSE 0 END), 0) as total_purchase,
      COALESCE(SUM(CASE WHEN v.sale_price IS NOT NULL AND v.vehicle_type = 'stock' THEN v.sale_price ELSE 0 END), 0) as total_sales,
      COUNT(CASE WHEN v.vehicle_type = 'investidor' THEN 1 END) as total_investor_vehicles
    FROM investors i
    LEFT JOIN vehicles v ON v.investor_id = i.id AND v.created_by IN (${placeholders})${dateCondition}
    WHERE 1=1 ${investorCondition}
    GROUP BY i.id
    ORDER BY i.name
  `).all(...userIds, ...dateParams, ...investorParams);

  const result = await Promise.all(perInvestor.map(async inv => {
    const [stockCostsRow, investorVehicleCostsRow] = await Promise.all([
      db.prepare(`
        SELECT COALESCE(SUM(vc.amount), 0) as total
        FROM vehicle_costs vc
        JOIN vehicles v ON vc.vehicle_id = v.id
        WHERE v.investor_id = ? AND v.vehicle_type = 'stock' AND v.created_by IN (${placeholders})${dateCondition}
      `).get(inv.id, ...userIds, ...dateParams),
      db.prepare(`
        SELECT COALESCE(SUM(vc.amount), 0) as total
        FROM vehicle_costs vc
        JOIN vehicles v ON vc.vehicle_id = v.id
        WHERE v.investor_id = ? AND v.vehicle_type = 'investidor' AND v.created_by IN (${placeholders})${dateCondition}
      `).get(inv.id, ...userIds, ...dateParams),
    ]);
    const stockCosts = stockCostsRow.total;
    const investorVehicleCosts = investorVehicleCostsRow.total;
    const grossMargin = inv.total_sales - inv.total_purchase - stockCosts;
    return { ...inv, total_costs: stockCosts, investor_vehicle_costs: investorVehicleCosts, gross_margin: grossMargin };
  }));

  const soldQuery = investorId
    ? `SELECT v.*, u.name as created_by_name, i.name as investor_name,
        COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
       FROM vehicles v JOIN users u ON v.created_by=u.id JOIN investors i ON v.investor_id=i.id
       WHERE v.status='vendido' AND v.sale_price IS NOT NULL AND v.investor_id=? AND v.created_by IN (${placeholders})${dateCondition}
       ORDER BY v.updated_at DESC`
    : `SELECT v.*, u.name as created_by_name, i.name as investor_name,
        COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
       FROM vehicles v JOIN users u ON v.created_by=u.id JOIN investors i ON v.investor_id=i.id
       WHERE v.status='vendido' AND v.sale_price IS NOT NULL AND v.created_by IN (${placeholders})${dateCondition}
       ORDER BY v.updated_at DESC`;

  const soldVehicles = investorId
    ? await db.prepare(soldQuery).all(investorId, ...userIds, ...dateParams)
    : await db.prepare(soldQuery).all(...userIds, ...dateParams);

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

  const posicaoFinanceira = await Promise.all(result.map(async inv => {
    const [contributionsRow, stockVehicles, investorVehicles] = await Promise.all([
      db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM investor_contributions WHERE investor_id = ?').get(inv.id),
      db.prepare(`
        SELECT v.id, v.brand, v.model, v.year, v.license_plate, v.status, v.purchase_price, v.sale_price,
          COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs
        FROM vehicles v WHERE v.investor_id = ? AND v.vehicle_type = 'stock'
        ORDER BY v.created_at ASC
      `).all(inv.id),
      db.prepare(`
        SELECT v.id, v.brand, v.model, v.year, v.license_plate,
          COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs
        FROM vehicles v WHERE v.investor_id = ? AND v.vehicle_type = 'investidor'
      `).all(inv.id),
    ]);

    const contributions = contributionsRow.total;
    const totalPurchased = stockVehicles.reduce((s, v) => s + v.purchase_price, 0);
    const totalStockCosts = stockVehicles.reduce((s, v) => s + v.total_costs, 0);
    const totalSalesRevenue = stockVehicles.filter(v => v.status === 'vendido' && v.sale_price).reduce((s, v) => s + v.sale_price, 0);
    const totalInvestorCosts = investorVehicles.reduce((s, v) => s + v.total_costs, 0);
    const balance = contributions - totalPurchased - totalStockCosts - totalInvestorCosts + totalSalesRevenue;

    return {
      id: inv.id, name: inv.name,
      contributions, totalPurchased, totalStockCosts, totalInvestorCosts, totalSalesRevenue, balance,
      stockVehicles, investorVehicles,
    };
  }));

  const semInvestidorVehicles = await db.prepare(`
    SELECT v.id, v.brand, v.model, v.year, v.license_plate, v.status, v.vehicle_type,
      v.purchase_price, v.sale_price, v.created_at,
      u.name as created_by_name,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs
    FROM vehicles v
    JOIN users u ON v.created_by = u.id
    WHERE v.investor_id IS NULL AND v.created_by IN (${placeholders})${dateCondition}
    ORDER BY v.created_at DESC
  `).all(...userIds, ...dateParams);

  const semInvestidor = {
    stockVehicles: semInvestidorVehicles.filter(v => v.vehicle_type === 'stock').map(v => ({
      ...v,
      margin: v.sale_price ? v.sale_price - v.purchase_price - v.total_costs : null,
    })),
    totalPurchase: semInvestidorVehicles.filter(v => v.vehicle_type === 'stock').reduce((s, v) => s + v.purchase_price, 0),
    totalSales: semInvestidorVehicles.filter(v => v.vehicle_type === 'stock' && v.sale_price).reduce((s, v) => s + v.sale_price, 0),
    totalCosts: semInvestidorVehicles.reduce((s, v) => s + v.total_costs, 0),
    sold: semInvestidorVehicles.filter(v => v.vehicle_type === 'stock' && v.status === 'vendido').length,
    inStock: semInvestidorVehicles.filter(v => v.vehicle_type === 'stock' && v.status === 'em_stock').length,
  };
  semInvestidor.grossMargin = semInvestidor.totalSales - semInvestidor.totalPurchase - semInvestidor.totalCosts;

  return NextResponse.json({ perInvestor: result, salesDetails, posicaoFinanceira, semInvestidor });
}

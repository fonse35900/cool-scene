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
  const dateFrom = searchParams.get('date_from') || null;
  const dateTo = searchParams.get('date_to') || null;

  let userIds;
  if (user.role === 'comercial') {
    userIds = [user.id];
  } else if (user.role === 'director') {
    const team = (await db.prepare('SELECT id FROM users WHERE director_id = ? OR id = ?').all(user.id, user.id))
      .filter(u => {
        // directors can't see admins — filter inline
        return true; // we'll filter by role below
      })
      .map(u => u.id);
    // Exclude admin users from director scope
    const teamWithRoles = await Promise.all(team.map(id => db.prepare('SELECT id, role FROM users WHERE id = ?').get(id)));
    const filteredTeam = teamWithRoles.filter(u => u && u.role !== 'admin').map(u => u.id);
    userIds = selectedUsers.length ? selectedUsers.filter(id => filteredTeam.includes(id)) : filteredTeam;
  } else {
    const all = (await db.prepare('SELECT id FROM users').all()).map(u => u.id);
    userIds = selectedUsers.length ? selectedUsers.filter(id => all.includes(id)) : all;
  }

  const placeholders = userIds.map(() => '?').join(',');
  const investorCondition = investorId ? ' AND v.investor_id = ?' : '';
  const investorParams = investorId ? [investorId] : [];
  const dateCondition = (dateFrom ? ' AND v.created_at >= ?' : '') + (dateTo ? ' AND v.created_at <= ?' : '');
  const dateParams = [...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo + ' 23:59:59'] : [])];

  const dp = [...investorParams, ...dateParams];

  const [totalVehiclesRow, inStockRow, soldRow, reservedRow, totalPurchaseRow, totalSalesRow, totalCostsRow, soldVehicles] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.created_by IN (${placeholders})${investorCondition}${dateCondition}`).get(...userIds, ...dp),
    db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.status='em_stock' AND v.created_by IN (${placeholders})${investorCondition}${dateCondition}`).get(...userIds, ...dp),
    db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.status='vendido' AND v.created_by IN (${placeholders})${investorCondition}${dateCondition}`).get(...userIds, ...dp),
    db.prepare(`SELECT COUNT(*) as count FROM vehicles v WHERE v.status='reservado' AND v.created_by IN (${placeholders})${investorCondition}${dateCondition}`).get(...userIds, ...dp),
    db.prepare(`SELECT COALESCE(SUM(v.purchase_price),0) as total FROM vehicles v WHERE v.created_by IN (${placeholders})${investorCondition}${dateCondition}`).get(...userIds, ...dp),
    db.prepare(`SELECT COALESCE(SUM(v.sale_price),0) as total FROM vehicles v WHERE v.sale_price IS NOT NULL AND v.created_by IN (${placeholders})${investorCondition}${dateCondition}`).get(...userIds, ...dp),
    db.prepare(`SELECT COALESCE(SUM(vc.amount),0) as total FROM vehicle_costs vc JOIN vehicles v ON vc.vehicle_id=v.id WHERE v.created_by IN (${placeholders})${investorCondition}${dateCondition}`).get(...userIds, ...dp),
    db.prepare(`
      SELECT v.*, u.name as created_by_name, i.name as investor_name,
        COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
      FROM vehicles v JOIN users u ON v.created_by=u.id
      LEFT JOIN investors i ON v.investor_id = i.id
      WHERE v.status='vendido' AND v.sale_price IS NOT NULL AND v.created_by IN (${placeholders})${investorCondition}${dateCondition}
      ORDER BY v.updated_at DESC
    `).all(...userIds, ...dp),
  ]);

  const totalVehicles = totalVehiclesRow.count;
  const inStock = inStockRow.count;
  const soldCount = soldRow.count;
  const reserved = reservedRow.count;
  const totalPurchase = totalPurchaseRow.total;
  const totalSales = totalSalesRow.total;
  const totalCosts = totalCostsRow.total;

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

  // All vehicles for margin drill-down
  const allVehiclesDetail = (await db.prepare(`
    SELECT v.id, v.brand, v.model, v.year, v.status, v.purchase_price, v.sale_price,
      u.name as created_by_name, i.name as investor_name,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
    FROM vehicles v JOIN users u ON v.created_by=u.id
    LEFT JOIN investors i ON v.investor_id = i.id
    WHERE v.created_by IN (${placeholders})${investorCondition}${dateCondition}
    ORDER BY v.status, v.updated_at DESC
  `).all(...userIds, ...dp)).map(v => ({
    id: v.id, brand: v.brand, model: v.model, year: v.year, status: v.status,
    purchase_price: v.purchase_price,
    sale_price: v.sale_price,
    costs: v.total_vehicle_costs,
    margin: v.status === 'vendido' && v.sale_price != null
      ? v.sale_price - v.purchase_price - v.total_vehicle_costs
      : -(v.purchase_price + v.total_vehicle_costs),
    created_by_name: v.created_by_name,
    investor_name: v.investor_name,
  }));

  const perUser = await Promise.all(userIds.map(async uid => {
    const u = await db.prepare('SELECT name, role, investor_id FROM users WHERE id = ?').get(uid);
    let count, soldCount, revenue, totalPurchase, totalCosts;
    const idc = investorCondition + dateCondition;
    if (u.role === 'investidor' && u.investor_id) {
      const invDc = (dateFrom ? ' AND v.created_at >= ?' : '') + (dateTo ? ' AND v.created_at <= ?' : '');
      [{ c: count }, { c: soldCount }, { t: revenue }, { t: totalPurchase }, { t: totalCosts }] = await Promise.all([
        db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock'${invDc}`).get(u.investor_id, ...dateParams),
        db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido'${invDc}`).get(u.investor_id, ...dateParams),
        db.prepare(`SELECT COALESCE(SUM(v.sale_price),0) as t FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido' AND v.sale_price IS NOT NULL${invDc}`).get(u.investor_id, ...dateParams),
        db.prepare(`SELECT COALESCE(SUM(v.purchase_price),0) as t FROM vehicles v WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido'${invDc}`).get(u.investor_id, ...dateParams),
        db.prepare(`SELECT COALESCE(SUM(vc.amount),0) as t FROM vehicle_costs vc JOIN vehicles v ON vc.vehicle_id=v.id WHERE v.investor_id=? AND v.vehicle_type='stock' AND v.status='vendido'${invDc}`).get(u.investor_id, ...dateParams),
      ]);
    } else {
      [{ c: count }, { c: soldCount }, { t: revenue }, { t: totalPurchase }, { t: totalCosts }] = await Promise.all([
        db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.created_by=?${idc}`).get(uid, ...dp),
        db.prepare(`SELECT COUNT(*) as c FROM vehicles v WHERE v.created_by=? AND v.status='vendido'${idc}`).get(uid, ...dp),
        db.prepare(`SELECT COALESCE(SUM(v.sale_price),0) as t FROM vehicles v WHERE v.created_by=? AND v.status='vendido' AND v.sale_price IS NOT NULL${idc}`).get(uid, ...dp),
        db.prepare(`SELECT COALESCE(SUM(v.purchase_price),0) as t FROM vehicles v WHERE v.created_by=? AND v.status='vendido'${idc}`).get(uid, ...dp),
        db.prepare(`SELECT COALESCE(SUM(vc.amount),0) as t FROM vehicle_costs vc JOIN vehicles v ON vc.vehicle_id=v.id WHERE v.created_by=? AND v.status='vendido'${idc}`).get(uid, ...dp),
      ]);
    }
    const margin = revenue - totalPurchase - totalCosts;
    const marginPercent = (totalPurchase + totalCosts) > 0 ? (margin / (totalPurchase + totalCosts) * 100) : 0;
    return { id: uid, name: u.name, role: u.role, investor_id: u.investor_id || null, total_vehicles: count, sold: soldCount, revenue, margin, margin_percent: marginPercent };
  }));

  let perInvestor = [];
  if (user.role !== 'comercial') {
    perInvestor = await db.prepare(`
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
    summary: { totalVehicles, inStock, sold: soldCount, reserved, totalPurchase, totalSales, totalCosts, grossMargin: totalSales - totalPurchase - totalCosts },
    salesDetails,
    allVehiclesDetail,
    perUser,
    perInvestor,
  });
}

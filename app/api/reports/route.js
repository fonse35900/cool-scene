import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const selectedUsers = searchParams.get('users')?.split(',').map(Number).filter(Boolean) || [];

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

  const totalVehicles = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE created_by IN (${placeholders})`).get(...userIds).count;
  const inStock = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE status='em_stock' AND created_by IN (${placeholders})`).get(...userIds).count;
  const sold = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE status='vendido' AND created_by IN (${placeholders})`).get(...userIds).count;
  const reserved = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE status='reservado' AND created_by IN (${placeholders})`).get(...userIds).count;

  const totalPurchase = db.prepare(`SELECT COALESCE(SUM(purchase_price),0) as total FROM vehicles WHERE created_by IN (${placeholders})`).get(...userIds).total;
  const totalSales = db.prepare(`SELECT COALESCE(SUM(sale_price),0) as total FROM vehicles WHERE sale_price IS NOT NULL AND created_by IN (${placeholders})`).get(...userIds).total;
  const totalCosts = db.prepare(`SELECT COALESCE(SUM(vc.amount),0) as total FROM vehicle_costs vc JOIN vehicles v ON vc.vehicle_id=v.id WHERE v.created_by IN (${placeholders})`).get(...userIds).total;

  const soldVehicles = db.prepare(`
    SELECT v.*, u.name as created_by_name,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id=v.id),0) as total_vehicle_costs
    FROM vehicles v JOIN users u ON v.created_by=u.id
    WHERE v.status='vendido' AND v.sale_price IS NOT NULL AND v.created_by IN (${placeholders})
    ORDER BY v.updated_at DESC
  `).all(...userIds);

  const salesDetails = soldVehicles.map(v => {
    const totalCost = v.purchase_price + v.total_vehicle_costs;
    const margin = v.sale_price - totalCost;
    const marginPercent = totalCost > 0 ? (margin / totalCost * 100) : 0;
    return {
      id: v.id, brand: v.brand, model: v.model, year: v.year,
      purchase_price: v.purchase_price, sale_price: v.sale_price,
      costs: v.total_vehicle_costs, margin, margin_percent: marginPercent,
      created_by_name: v.created_by_name,
    };
  });

  const perUser = userIds.map(uid => {
    const u = db.prepare('SELECT name, role FROM users WHERE id = ?').get(uid);
    const count = db.prepare('SELECT COUNT(*) as c FROM vehicles WHERE created_by=?').get(uid).c;
    const soldCount = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE created_by=? AND status='vendido'").get(uid).c;
    const revenue = db.prepare("SELECT COALESCE(SUM(sale_price),0) as t FROM vehicles WHERE created_by=? AND status='vendido' AND sale_price IS NOT NULL").get(uid).t;
    return { id: uid, name: u.name, role: u.role, total_vehicles: count, sold: soldCount, revenue };
  });

  return NextResponse.json({
    summary: { totalVehicles, inStock, sold, reserved, totalPurchase, totalSales, totalCosts, grossMargin: totalSales - totalPurchase - totalCosts },
    salesDetails,
    perUser,
  });
}

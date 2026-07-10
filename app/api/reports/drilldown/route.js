import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user || user.role === 'comercial') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const drillUserId = parseInt(searchParams.get('drilldown_user'));
  const drillInvestorId = searchParams.get('drilldown_investor') ? parseInt(searchParams.get('drilldown_investor')) : null;

  let vehicles;
  if (drillInvestorId) {
    vehicles = db.prepare(`
      SELECT v.id, v.brand, v.model, v.year, v.license_plate, v.status,
        v.purchase_price, v.sale_price, v.created_at as date,
        COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as costs
      FROM vehicles v
      WHERE v.investor_id = ? AND v.vehicle_type = 'stock'
      ORDER BY v.created_at DESC
    `).all(drillInvestorId);
  } else {
    vehicles = db.prepare(`
      SELECT v.id, v.brand, v.model, v.year, v.license_plate, v.status,
        v.purchase_price, v.sale_price, v.created_at as date,
        COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as costs
      FROM vehicles v
      WHERE v.created_by = ? AND v.vehicle_type = 'stock'
      ORDER BY v.created_at DESC
    `).all(drillUserId);
  }

  return NextResponse.json({ vehicles });
}

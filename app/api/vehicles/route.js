import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const userId = searchParams.get('user_id');

  let query = `
    SELECT v.*, u.name as created_by_name,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs
    FROM vehicles v
    JOIN users u ON v.created_by = u.id
  `;
  const conditions = [];
  const params = [];

  if (user.role === 'comercial') {
    conditions.push('v.created_by = ?');
    params.push(user.id);
  } else if (user.role === 'director') {
    if (userId) {
      conditions.push('v.created_by = ?');
      params.push(parseInt(userId));
    } else {
      conditions.push('(v.created_by = ? OR v.created_by IN (SELECT id FROM users WHERE director_id = ?))');
      params.push(user.id, user.id);
    }
  } else if (userId) {
    conditions.push('v.created_by = ?');
    params.push(parseInt(userId));
  }

  if (status) {
    conditions.push('v.status = ?');
    params.push(status);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY v.created_at DESC';

  const vehicles = db.prepare(query).all(...params);
  return NextResponse.json(vehicles);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const data = await req.json();
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO vehicles (brand, model, year, license_plate, vin, color, mileage, fuel_type, purchase_price, sale_price, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.brand, data.model, data.year, data.license_plate || null,
    data.vin || null, data.color || null, data.mileage || null,
    data.fuel_type || null, data.purchase_price, data.sale_price || null,
    data.status || 'em_stock', data.notes || null, user.id
  );

  return NextResponse.json({ id: result.lastInsertRowid });
}

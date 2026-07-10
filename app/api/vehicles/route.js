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
  // vehicle_type: 'stock' (default), 'investidor', or 'all'
  const vehicleType = searchParams.get('type') || 'stock';

  let query = `
    SELECT v.*, u.name as created_by_name,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs,
      i.name as investor_name
    FROM vehicles v
    JOIN users u ON v.created_by = u.id
    LEFT JOIN investors i ON v.investor_id = i.id
  `;
  const conditions = [];
  const params = [];

  // Comerciais only see stock vehicles they created
  if (user.role === 'comercial') {
    conditions.push('v.created_by = ?');
    conditions.push("v.vehicle_type = 'stock'");
    params.push(user.id);
  } else if (user.role === 'director') {
    if (userId) {
      conditions.push('v.created_by = ?');
      params.push(parseInt(userId));
    } else {
      conditions.push('(v.created_by = ? OR v.created_by IN (SELECT id FROM users WHERE director_id = ?))');
      params.push(user.id, user.id);
    }
    if (vehicleType !== 'all') {
      conditions.push('v.vehicle_type = ?');
      params.push(vehicleType);
    }
  } else {
    // admin
    if (userId) {
      conditions.push('v.created_by = ?');
      params.push(parseInt(userId));
    }
    if (vehicleType !== 'all') {
      conditions.push('v.vehicle_type = ?');
      params.push(vehicleType);
    }
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

  // Only director/admin can create investor vehicles
  const vehicleType = (user.role !== 'comercial' && data.vehicle_type === 'investidor') ? 'investidor' : 'stock';

  // Investor vehicles must have an investor
  if (vehicleType === 'investidor' && !data.investor_id) {
    return NextResponse.json({ error: 'Viatura de investidor requer um investidor associado' }, { status: 400 });
  }

  const result = db.prepare(`
    INSERT INTO vehicles (brand, model, year, license_plate, vin, color, mileage, fuel_type, purchase_price, sale_price, status, notes, investor_id, vehicle_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.brand, data.model, data.year, data.license_plate || null,
    data.vin || null, data.color || null, data.mileage || null,
    data.fuel_type || null, data.purchase_price || 0, null,
    'em_stock', data.notes || null,
    data.investor_id || null, vehicleType, user.id
  );

  return NextResponse.json({ id: result.lastInsertRowid });
}

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit, fetchRow } from '@/lib/audit';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const userId = searchParams.get('user_id');
  const vehicleType = searchParams.get('type') || 'stock';
  const hasInvestor = searchParams.get('has_investor') === '1';

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

  // Every query is scoped to the user's company
  conditions.push('v.company_id = ?');
  params.push(user.company_id);

  if (user.role === 'comercial') {
    conditions.push('v.created_by = ?');
    conditions.push("v.vehicle_type = 'stock'");
    params.push(user.id);
  } else {
    // director / admin: whole company, optionally narrowed to one user
    if (userId) {
      conditions.push('v.created_by = ?');
      params.push(parseInt(userId));
    }
    if (hasInvestor) {
      conditions.push('v.investor_id IS NOT NULL');
    } else if (vehicleType !== 'all') {
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

  const vehicles = await db.prepare(query).all(...params);
  return NextResponse.json(vehicles);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const data = await req.json();
  const db = getDb();

  const vehicleType = (user.role !== 'comercial' && data.vehicle_type === 'investidor') ? 'investidor' : 'stock';

  if (vehicleType === 'investidor' && !data.investor_id) {
    return NextResponse.json({ error: 'Viatura de investidor requer um investidor associado' }, { status: 400 });
  }

  // Registration date (defaults to now if not provided)
  const createdAt = data.created_at
    ? (data.created_at.length === 10 ? data.created_at + ' 12:00:00' : data.created_at)
    : new Date().toISOString();

  // Purchase date defaults to the registration date; sale date only when sold
  const purchaseDate = data.purchase_date || createdAt.slice(0, 10);

  const result = await db.prepare(`
    INSERT INTO vehicles (brand, model, year, license_plate, vin, color, mileage, fuel_type, purchase_price, sale_price, purchase_date, sale_date, status, notes, investor_id, vehicle_type, created_by, company_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.brand, data.model, data.year, data.license_plate || null,
    data.vin || null, data.color || null, data.mileage || null,
    data.fuel_type || null, data.purchase_price || 0, null,
    purchaseDate, null,
    'em_stock', data.notes || null,
    data.investor_id || null, vehicleType,
    (user.role !== 'comercial' && data.assigned_to) ? data.assigned_to : user.id,
    user.company_id,
    createdAt, createdAt
  );

  // Log creation in history
  await db.prepare(`
    INSERT INTO vehicle_history (vehicle_id, changed_by, changed_by_name, action, changes, created_at)
    VALUES (?, ?, ?, 'created', ?, ?)
  `).run(
    result.lastInsertRowid, user.id, user.name, 'Viatura registada', createdAt
  );

  const created = await fetchRow(db, 'vehicles', result.lastInsertRowid);
  await recordAudit(db, { entity: 'vehicles', entityId: result.lastInsertRowid, action: 'insert', actor: user, after: created });

  return NextResponse.json({ id: result.lastInsertRowid });
}

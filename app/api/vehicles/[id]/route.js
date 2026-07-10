import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const vehicle = db.prepare(`
    SELECT v.*, u.name as created_by_name, i.name as investor_name FROM vehicles v
    JOIN users u ON v.created_by = u.id
    LEFT JOIN investors i ON v.investor_id = i.id
    WHERE v.id = ?
  `).get(id);

  if (!vehicle) return NextResponse.json({ error: 'Viatura não encontrada' }, { status: 404 });

  const costs = db.prepare('SELECT * FROM vehicle_costs WHERE vehicle_id = ? ORDER BY date DESC').all(id);
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);

  return NextResponse.json({ ...vehicle, costs, total_costs: totalCosts });
}

export async function PUT(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const db = getDb();

  if (user.role !== 'comercial') {
    db.prepare(`
      UPDATE vehicles SET brand=?, model=?, year=?, license_plate=?, vin=?, color=?,
      mileage=?, fuel_type=?, purchase_price=?, sale_price=?, status=?, notes=?, investor_id=?,
      created_by=?, updated_at=datetime('now') WHERE id=?
    `).run(
      data.brand, data.model, data.year, data.license_plate || null,
      data.vin || null, data.color || null, data.mileage || null,
      data.fuel_type || null, data.purchase_price, data.sale_price || null,
      data.status || 'em_stock', data.notes || null, data.investor_id || null,
      data.created_by || null, id
    );
  } else {
    db.prepare(`
      UPDATE vehicles SET brand=?, model=?, year=?, license_plate=?, vin=?, color=?,
      mileage=?, fuel_type=?, purchase_price=?, sale_price=?, status=?, notes=?,
      updated_at=datetime('now') WHERE id=?
    `).run(
      data.brand, data.model, data.year, data.license_plate || null,
      data.vin || null, data.color || null, data.mileage || null,
      data.fuel_type || null, data.purchase_price, data.sale_price || null,
      data.status || 'em_stock', data.notes || null, id
    );
  }

  if (data.new_cost) {
    db.prepare('INSERT INTO vehicle_costs (vehicle_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)').run(
      id, data.new_cost.type, data.new_cost.amount, data.new_cost.description || null,
      data.new_cost.date || new Date().toISOString()
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role === 'comercial') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}

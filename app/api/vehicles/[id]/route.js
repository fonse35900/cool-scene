import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const vehicle = await db.prepare(`
    SELECT v.*, u.name as created_by_name, i.name as investor_name FROM vehicles v
    JOIN users u ON v.created_by = u.id
    LEFT JOIN investors i ON v.investor_id = i.id
    WHERE v.id = ?
  `).get(id);

  if (!vehicle) return NextResponse.json({ error: 'Viatura não encontrada' }, { status: 404 });

  const costs = await db.prepare('SELECT * FROM vehicle_costs WHERE vehicle_id = ? ORDER BY date DESC').all(id);
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);

  const history = await db.prepare(
    'SELECT * FROM vehicle_history WHERE vehicle_id = ? ORDER BY created_at DESC, id DESC'
  ).all(id);

  return NextResponse.json({ ...vehicle, costs, total_costs: totalCosts, history });
}

// Human-readable labels and formatters for change tracking
const FIELD_LABELS = {
  brand: 'Marca', model: 'Modelo', year: 'Ano', license_plate: 'Matrícula',
  vin: 'VIN', color: 'Cor', mileage: 'Quilometragem', fuel_type: 'Combustível',
  purchase_price: 'Preço de Compra', sale_price: 'Preço de Venda',
  status: 'Estado', notes: 'Observações', investor_id: 'Investidor',
  vehicle_type: 'Tipo', created_by: 'Responsável',
};
const STATUS_LABELS = { em_stock: 'Em Stock', vendido: 'Vendido', reservado: 'Reservado' };

function fmtVal(field, val) {
  if (val === null || val === undefined || val === '') return '—';
  if (field === 'status') return STATUS_LABELS[val] || val;
  if (field === 'purchase_price' || field === 'sale_price') return `€${Number(val).toLocaleString('pt-PT')}`;
  return String(val);
}

export async function PUT(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const db = getDb();

  // Snapshot previous state to compute what changed
  const prev = await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  if (!prev) return NextResponse.json({ error: 'Viatura não encontrada' }, { status: 404 });

  if (user.role !== 'comercial') {
    await db.prepare(`
      UPDATE vehicles SET brand=?, model=?, year=?, license_plate=?, vin=?, color=?,
      mileage=?, fuel_type=?, purchase_price=?, sale_price=?, status=?, notes=?, investor_id=?,
      vehicle_type=?, created_by=?, updated_at=datetime('now') WHERE id=?
    `).run(
      data.brand, data.model, data.year, data.license_plate || null,
      data.vin || null, data.color || null, data.mileage || null,
      data.fuel_type || null, data.purchase_price, data.sale_price || null,
      data.status || 'em_stock', data.notes || null, data.investor_id || null,
      data.vehicle_type || 'stock', data.created_by || prev.created_by, id
    );
  } else {
    await db.prepare(`
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

  // Compute field-level changes (comerciais cannot change investor/type/responsible)
  const editableFields = user.role !== 'comercial'
    ? ['brand', 'model', 'year', 'license_plate', 'vin', 'color', 'mileage', 'fuel_type', 'purchase_price', 'sale_price', 'status', 'notes', 'investor_id', 'vehicle_type', 'created_by']
    : ['brand', 'model', 'year', 'license_plate', 'vin', 'color', 'mileage', 'fuel_type', 'purchase_price', 'sale_price', 'status', 'notes'];

  const norm = v => (v === undefined || v === '' ? null : v);
  const changeList = [];
  for (const f of editableFields) {
    const before = norm(prev[f]);
    let after = norm(data[f]);
    if (f === 'status') after = norm(data.status || 'em_stock');
    if (f === 'vehicle_type') after = norm(data.vehicle_type || 'stock');
    // Compare loosely (numbers vs strings from SQLite)
    if (String(before ?? '') !== String(after ?? '')) {
      changeList.push({ field: f, label: FIELD_LABELS[f] || f, from: fmtVal(f, before), to: fmtVal(f, after) });
    }
  }

  const costEntries = [];
  if (data.new_cost) {
    await db.prepare('INSERT INTO vehicle_costs (vehicle_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)').run(
      id, data.new_cost.type, data.new_cost.amount, data.new_cost.description || null,
      data.new_cost.date || new Date().toISOString()
    );
    costEntries.push({ field: 'cost', label: 'Custo adicionado', to: `${data.new_cost.type}: €${Number(data.new_cost.amount).toLocaleString('pt-PT')}` });
  }

  // Record history entry if anything meaningful changed
  const allChanges = [...changeList, ...costEntries];
  if (allChanges.length > 0) {
    await db.prepare(`
      INSERT INTO vehicle_history (vehicle_id, changed_by, changed_by_name, action, changes, created_at)
      VALUES (?, ?, ?, 'updated', ?, datetime('now'))
    `).run(id, user.id, user.name, JSON.stringify(allChanges));
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
  await db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}

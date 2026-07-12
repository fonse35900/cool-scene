import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addWeeks(d, n) {
  return addDays(d, n * 7);
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const selectedUsers = searchParams.get('users')?.split(',').map(Number).filter(Boolean) || [];

  if (!dateFrom || !dateTo) return NextResponse.json({ error: 'date_from e date_to são obrigatórios' }, { status: 400 });

  // Resolve user IDs for scoping
  let userIds;
  if (user.role === 'comercial') {
    userIds = [user.id];
  } else if (user.role === 'director') {
    const team = db.prepare('SELECT id FROM users WHERE director_id = ? OR id = ?').all(user.id, user.id).map(u => u.id);
    userIds = selectedUsers.length ? selectedUsers.filter(id => team.includes(id)) : team;
  } else {
    const all = db.prepare('SELECT id FROM users').all().map(u => u.id);
    userIds = selectedUsers.length ? selectedUsers.filter(id => all.includes(id)) : all;
  }

  const placeholders = userIds.map(() => '?').join(',');

  const excludeInvestors = searchParams.get('exclude_investors') === '1';

  // Fetch all stock vehicles with their costs
  const investorCond = excludeInvestors ? ' AND v.investor_id IS NULL' : '';
  const vehicles = db.prepare(`
    SELECT
      DATE(v.created_at) as created_date,
      DATE(v.updated_at) as updated_date,
      v.status,
      v.purchase_price,
      v.sale_price,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs
    FROM vehicles v
    WHERE v.vehicle_type = 'stock' AND v.created_by IN (${placeholders})${investorCond}
  `).all(...userIds);

  // Determine granularity based on range
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

  let granularity, stepFn, labelFn;
  if (diffDays <= 62) {
    granularity = 'day';
    stepFn = (d, i) => addDays(d, i);
    labelFn = d => d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  } else if (diffDays <= 365) {
    granularity = 'week';
    stepFn = (d, i) => addWeeks(d, i);
    labelFn = d => d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  } else {
    granularity = 'month';
    stepFn = (d, i) => addMonths(d, i);
    labelFn = d => d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
  }

  // Generate time points
  const points = [];
  let current = new Date(start);
  while (current <= end) {
    points.push(new Date(current));
    current = stepFn(start, points.length);
  }
  if (toDateStr(points[points.length - 1]) !== toDateStr(end)) points.push(new Date(end));

  // For each point compute snapshot
  const data = points.map(point => {
    const pointStr = toDateStr(point);

    const inStock = vehicles.filter(v =>
      v.created_date <= pointStr &&
      (v.status !== 'vendido' || v.updated_date > pointStr)
    ).length;

    const soldVehicles = vehicles.filter(v =>
      v.status === 'vendido' && v.sale_price != null && v.updated_date <= pointStr
    );
    const soldCount = soldVehicles.length;

    const cumulativeMargin = soldVehicles.reduce((sum, v) =>
      sum + v.sale_price - v.purchase_price - v.total_costs, 0
    );

    return {
      label: labelFn(point),
      date: pointStr,
      inStock,
      sold: soldCount,
      cumulativeMargin: Math.round(cumulativeMargin),
    };
  });

  return NextResponse.json({ data, granularity });
}

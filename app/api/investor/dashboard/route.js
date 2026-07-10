import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);

  let investorId;
  if (user.role === 'investidor') {
    investorId = user.investor_id;
  } else if (user.role === 'director' || user.role === 'admin') {
    investorId = parseInt(searchParams.get('investor_id'));
  }
  if (!investorId) return NextResponse.json({ error: 'Investidor não encontrado' }, { status: 400 });

  const investor = db.prepare('SELECT * FROM investors WHERE id = ?').get(investorId);
  if (!investor) return NextResponse.json({ error: 'Investidor não encontrado' }, { status: 404 });

  // Contributions (money deposited)
  const contributions = db.prepare(
    'SELECT * FROM investor_contributions WHERE investor_id = ? ORDER BY date ASC'
  ).all(investorId);
  const totalContributions = contributions.reduce((s, c) => s + c.amount, 0);

  // Stock vehicles (purchased with investor's money)
  const stockVehicles = db.prepare(`
    SELECT v.*, COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs
    FROM vehicles v WHERE v.investor_id = ? AND v.vehicle_type = 'stock'
    ORDER BY v.created_at ASC
  `).all(investorId);

  const totalPurchased = stockVehicles.reduce((s, v) => s + v.purchase_price, 0);
  const totalStockCosts = stockVehicles.reduce((s, v) => s + v.total_costs, 0);

  const soldVehicles = stockVehicles.filter(v => v.status === 'vendido' && v.sale_price);
  const totalSalesRevenue = soldVehicles.reduce((s, v) => s + v.sale_price, 0);
  const soldPurchaseCost = soldVehicles.reduce((s, v) => s + v.purchase_price + v.total_costs, 0);
  const totalGainLoss = totalSalesRevenue - soldPurchaseCost;

  // Investor-type vehicle expenses (services, not stock)
  const investorVehicles = db.prepare(`
    SELECT v.brand, v.model, v.year, v.license_plate,
      COALESCE((SELECT SUM(amount) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs
    FROM vehicles v WHERE v.investor_id = ? AND v.vehicle_type = 'investidor'
  `).all(investorId);
  const totalInvestorVehicleCosts = investorVehicles.reduce((s, v) => s + v.total_costs, 0);

  // Running balance = contributions - purchases (in stock) - stock costs - investor vehicle costs + sales revenue
  const currentBalance = totalContributions - totalPurchased - totalStockCosts - totalInvestorVehicleCosts + totalSalesRevenue;

  // Timeline of movements for the balance chart
  const movements = [];

  contributions.forEach(c => movements.push({
    date: c.date, type: 'contribuicao', label: c.notes || 'Depósito de capital', amount: c.amount, sign: 1,
  }));

  stockVehicles.forEach(v => {
    movements.push({
      date: v.created_at, type: 'compra', label: `Compra: ${v.brand} ${v.model} (${v.year})`,
      amount: v.purchase_price, sign: -1,
    });
    if (v.total_costs > 0) {
      movements.push({
        date: v.updated_at, type: 'custo_stock', label: `Custos: ${v.brand} ${v.model}`,
        amount: v.total_costs, sign: -1,
      });
    }
    if (v.status === 'vendido' && v.sale_price) {
      movements.push({
        date: v.updated_at, type: 'venda', label: `Venda: ${v.brand} ${v.model} (${v.year})`,
        amount: v.sale_price, sign: 1,
        margin: v.sale_price - v.purchase_price - v.total_costs,
      });
    }
  });

  investorVehicles.forEach(v => {
    if (v.total_costs > 0) {
      movements.push({
        date: new Date().toISOString(), type: 'despesa_viatura', label: `Despesas: ${v.brand} ${v.model} (${v.year})`,
        amount: v.total_costs, sign: -1,
      });
    }
  });

  movements.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Running balance per movement
  let running = 0;
  const timeline = movements.map(m => {
    running += m.sign * m.amount;
    return { ...m, balance: running };
  });

  return NextResponse.json({
    investor,
    summary: {
      totalContributions,
      totalPurchased,
      totalStockCosts,
      totalInvestorVehicleCosts,
      totalSalesRevenue,
      totalGainLoss,
      currentBalance,
    },
    contributions,
    stockVehicles,
    investorVehicles,
    timeline,
  });
}

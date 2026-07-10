'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

function fmt(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

function Card({ label, value, color }) {
  return (
    <div className="bg-octane-card border border-octane-border rounded-xl p-5">
      <p className="text-xs font-medium text-octane-gray uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-octane-white'}`}>{value}</p>
    </div>
  );
}

const typeLabels = {
  contribuicao: 'Depósito',
  compra: 'Compra',
  custo_stock: 'Custo',
  venda: 'Venda',
  despesa_viatura: 'Despesa Viatura',
};

const typeColors = {
  contribuicao: 'text-octane-green',
  venda: 'text-octane-green',
  compra: 'text-octane-red',
  custo_stock: 'text-octane-red',
  despesa_viatura: 'text-octane-red',
};

export default function InvestorPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject())
      .then(u => {
        if (u.role !== 'investidor') { router.push('/dashboard'); return; }
        setUser(u);
      }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/investor/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user || loading) return null;
  if (!data || !data.summary) return (
    <div className="min-h-screen bg-octane-black flex items-center justify-center text-octane-gray">
      Erro ao carregar dados. Verifica que o teu utilizador está associado a um investidor.
    </div>
  );

  const { summary, timeline, stockVehicles, investorVehicles } = data;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-wide mb-1">Portal do Investidor</h1>
          <p className="text-octane-gray text-sm">Bem-vindo, {user.name}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card label="Capital Investido" value={fmt(summary.totalContributions)} color="text-octane-gold" />
          <Card label="Viaturas Adquiridas" value={fmt(summary.totalPurchased)} color="text-octane-red" />
          <Card label="Custos de Stock" value={fmt(summary.totalStockCosts)} color="text-octane-red" />
          <Card label="Despesas Viaturas" value={fmt(summary.totalInvestorVehicleCosts)} color="text-octane-red" />
          <Card label="Receita de Vendas" value={fmt(summary.totalSalesRevenue)} color="text-octane-green" />
          <Card
            label="Saldo Atual"
            value={fmt(summary.currentBalance)}
            color={summary.currentBalance >= 0 ? 'text-octane-green' : 'text-octane-red'}
          />
        </div>

        {/* Gain/Loss highlight */}
        <div className="bg-octane-card border border-octane-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-octane-gray uppercase tracking-wider mb-1">Ganho / Perda em Vendas</p>
            <p className={`text-3xl font-bold ${summary.totalGainLoss >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
              {fmt(summary.totalGainLoss)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-octane-gray">Viaturas vendidas</p>
            <p className="text-2xl font-bold text-octane-white">{stockVehicles.filter(v => v.status === 'vendido').length}</p>
          </div>
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Histórico de Movimentos</h2>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {['Data', 'Tipo', 'Descrição', 'Valor', 'Saldo Acumulado'].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((m, i) => (
                    <tr key={i} className="border-t border-octane-border">
                      <td className="p-3 text-octane-gray whitespace-nowrap">{m.date ? new Date(m.date).toLocaleDateString('pt-PT') : '-'}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColors[m.type] || 'text-octane-white'}`}>
                          {typeLabels[m.type] || m.type}
                        </span>
                      </td>
                      <td className="p-3 text-octane-white">{m.label}</td>
                      <td className={`p-3 font-medium whitespace-nowrap ${m.sign > 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                        {m.sign > 0 ? '+' : '-'}{fmt(m.amount)}
                      </td>
                      <td className={`p-3 font-semibold whitespace-nowrap ${m.balance >= 0 ? 'text-octane-white' : 'text-octane-red'}`}>
                        {fmt(m.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Vehicles */}
        {stockVehicles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Viaturas em Stock / Vendidas</h2>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {['Viatura', 'Estado', 'Compra', 'Custos', 'Venda', 'Margem'].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockVehicles.map(v => {
                    const margin = v.sale_price ? v.sale_price - v.purchase_price - v.total_costs : null;
                    return (
                      <tr key={v.id} className="border-t border-octane-border">
                        <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year})</span></td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green' :
                            v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold' :
                            'bg-octane-gray/10 text-octane-gray'
                          }`}>{v.status}</span>
                        </td>
                        <td className="p-3 text-octane-white">{fmt(v.purchase_price)}</td>
                        <td className="p-3 text-octane-red">{fmt(v.total_costs)}</td>
                        <td className="p-3 text-octane-white">{v.sale_price ? fmt(v.sale_price) : '-'}</td>
                        <td className={`p-3 font-medium ${margin === null ? 'text-octane-gray' : margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                          {margin === null ? '-' : fmt(margin)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Investor Vehicles */}
        {investorVehicles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Despesas de Viaturas</h2>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {['Viatura', 'Total Despesas'].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investorVehicles.map((v, i) => (
                    <tr key={i} className="border-t border-octane-border">
                      <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year}) {v.license_plate}</span></td>
                      <td className="p-3 text-octane-red font-medium">{fmt(v.total_costs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

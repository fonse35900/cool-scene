'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReportsTabs from '@/components/ReportsTabs';

export default function InvestorReportsPage() {
  const [user, setUser] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [report, setReport] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial') { router.push('/reports/viaturas'); return; }
      setUser(u);
      fetch('/api/investors').then(r => r.json()).then(setInvestors);
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams();
      if (selectedInvestor) params.set('investor_id', selectedInvestor);
      fetch(`/api/reports/investidores?${params}`).then(r => r.json()).then(setReport);
    }
  }, [user, selectedInvestor]);

  if (!user) return null;

  const totalSummary = report?.perInvestor.reduce((acc, inv) => ({
    total_vehicles: acc.total_vehicles + inv.total_vehicles,
    in_stock: acc.in_stock + inv.in_stock,
    sold: acc.sold + inv.sold,
    reserved: acc.reserved + inv.reserved,
    total_purchase: acc.total_purchase + inv.total_purchase,
    total_sales: acc.total_sales + inv.total_sales,
    total_costs: acc.total_costs + inv.total_costs,
    gross_margin: acc.gross_margin + inv.gross_margin,
  }), { total_vehicles: 0, in_stock: 0, sold: 0, reserved: 0, total_purchase: 0, total_sales: 0, total_costs: 0, gross_margin: 0 });

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">Relatórios</h1>
        <ReportsTabs userRole={user.role} />

        {investors.length > 0 && (
          <div className="bg-octane-card border border-octane-border p-4 rounded-xl mb-6">
            <h2 className="text-xs text-octane-gray uppercase tracking-wider mb-3">Filtrar por investidor</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedInvestor('')}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  !selectedInvestor
                    ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                    : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                }`}>
                Todos
              </button>
              {investors.map(inv => (
                <button key={inv.id} onClick={() => setSelectedInvestor(String(inv.id))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedInvestor === String(inv.id)
                      ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                      : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                  }`}>
                  {inv.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {report && totalSummary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { l: 'Total Viaturas', v: totalSummary.total_vehicles },
                { l: 'Em Stock', v: totalSummary.in_stock },
                { l: 'Vendidas', v: totalSummary.sold },
                { l: 'Reservadas', v: totalSummary.reserved },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className="text-2xl font-bold text-octane-white">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {[
                { l: 'Total Compras', v: `€${totalSummary.total_purchase.toLocaleString()}`, c: 'text-octane-white' },
                { l: 'Total Vendas', v: `€${totalSummary.total_sales.toLocaleString()}`, c: 'text-octane-gold' },
                { l: 'Total Custos', v: `€${totalSummary.total_costs.toLocaleString()}`, c: 'text-octane-orange' },
                { l: 'Margem Bruta', v: `€${totalSummary.gross_margin.toLocaleString()}`, c: totalSummary.gross_margin >= 0 ? 'text-octane-green' : 'text-octane-red' },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                </div>
              ))}
            </div>

            {report.perInvestor.length > 0 && (
              <>
                <div className="bg-octane-card border border-octane-border rounded-xl mb-6">
                  <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">Resumo por Investidor — Stock Octane</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-octane-border">
                          {['Investidor', 'Viaturas', 'Em Stock', 'Vendidas', 'Reservadas', 'Total Compras', 'Custos', 'Total Vendas', 'Margem'].map(h => (
                            <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.perInvestor.map(inv => (
                          <tr key={inv.id} className="border-t border-octane-border">
                            <td className="p-3 font-medium text-octane-white">{inv.name}</td>
                            <td className="p-3 text-octane-white">{inv.total_vehicles}</td>
                            <td className="p-3 text-octane-green">{inv.in_stock}</td>
                            <td className="p-3 text-octane-white">{inv.sold}</td>
                            <td className="p-3 text-octane-gold">{inv.reserved}</td>
                            <td className="p-3 text-octane-white">€{inv.total_purchase.toLocaleString()}</td>
                            <td className="p-3 text-octane-orange">€{inv.total_costs.toLocaleString()}</td>
                            <td className="p-3 text-octane-gold">€{inv.total_sales.toLocaleString()}</td>
                            <td className={`p-3 font-bold ${inv.gross_margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                              €{inv.gross_margin.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {report.perInvestor.some(inv => inv.total_investor_vehicles > 0) && (
                  <div className="bg-octane-card border border-octane-border rounded-xl mb-6">
                    <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">Despesas de Viaturas de Investidores</h2>
                    <p className="text-octane-gray text-xs px-4 pb-3">Viaturas dos investidores geridas pela Octane — não entram no stock de venda</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-octane-border">
                            {['Investidor', 'Viaturas', 'Total Despesas'].map(h => (
                              <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {report.perInvestor.filter(inv => inv.total_investor_vehicles > 0).map(inv => (
                            <tr key={inv.id} className="border-t border-octane-border">
                              <td className="p-3 font-medium text-octane-white">{inv.name}</td>
                              <td className="p-3 text-octane-white">{inv.total_investor_vehicles}</td>
                              <td className="p-3 font-bold text-octane-orange">€{inv.investor_vehicle_costs.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {report.salesDetails.length > 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl">
                <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">Detalhe de Vendas</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-octane-border">
                        {['Viatura', 'Investidor', 'Comercial', 'Preço Compra', 'Custos', 'Preço Venda', 'Margem (€)', 'Margem (%)'].map(h => (
                          <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.salesDetails.map(v => (
                        <tr key={v.id} className="border-t border-octane-border">
                          <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} ({v.year})</td>
                          <td className="p-3 text-octane-gold">{v.investor_name}</td>
                          <td className="p-3 text-octane-gray">{v.created_by_name}</td>
                          <td className="p-3 text-octane-white">€{v.purchase_price.toLocaleString()}</td>
                          <td className="p-3 text-octane-orange">€{v.costs.toLocaleString()}</td>
                          <td className="p-3 text-octane-gold">€{v.sale_price.toLocaleString()}</td>
                          <td className={`p-3 font-medium ${v.margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>€{v.margin.toLocaleString()}</td>
                          <td className={`p-3 font-medium ${v.margin_percent >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{v.margin_percent.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.perInvestor.length === 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl p-8 text-center text-octane-gray">
                Nenhum investidor registado. Cria investidores em <a href="/investors" className="text-octane-gold hover:underline">Investidores</a>.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

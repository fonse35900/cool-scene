'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReportsTabs from '@/components/ReportsTabs';

const roleLabel = { director: 'Diretor', comercial: 'Comercial', admin: 'Administrador', investidor: 'Investidor' };

function fmt(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

export default function VehicleReportsPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [drilldown, setDrilldown] = useState(null); // { uid, name, role, investor_id }
  const [drillData, setDrillData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      setUser(u);
      if (u.role !== 'comercial') {
        fetch('/api/users').then(r => r.json()).then(setUsers);
      }
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams();
      if (selectedUsers.length) params.set('users', selectedUsers.join(','));
      fetch(`/api/reports?${params}`).then(r => r.json()).then(setReport);
    }
  }, [user, selectedUsers]);

  function toggleUser(id) {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function openDrilldown(u) {
    if (drilldown?.id === u.id) { setDrilldown(null); setDrillData(null); return; }
    setDrilldown(u);
    setDrillData(null);
    const params = new URLSearchParams({ drilldown_user: u.id });
    if (u.role === 'investidor' && u.investor_id) params.set('drilldown_investor', u.investor_id);
    const res = await fetch(`/api/reports/drilldown?${params}`);
    const data = await res.json();
    setDrillData(data);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">Relatórios</h1>
        <ReportsTabs userRole={user.role} />

        {user.role !== 'comercial' && users.length > 0 && (
          <div className="bg-octane-card border border-octane-border p-4 rounded-xl mb-6">
            <h2 className="text-xs text-octane-gray uppercase tracking-wider mb-3">Filtrar por utilizador</h2>
            <div className="flex flex-wrap gap-2">
              {users.filter(u => u.role !== 'admin' || user.role === 'admin').map(u => (
                <button key={u.id} onClick={() => toggleUser(u.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedUsers.includes(u.id)
                      ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                      : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                  }`}>
                  {u.name}
                </button>
              ))}
              {selectedUsers.length > 0 && (
                <button onClick={() => setSelectedUsers([])} className="px-3 py-1.5 rounded-full text-sm text-octane-red hover:bg-octane-red/10 transition-colors">
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { l: 'Total Viaturas', v: report.summary.totalVehicles },
                { l: 'Em Stock', v: report.summary.inStock },
                { l: 'Vendidas', v: report.summary.sold },
                { l: 'Reservadas', v: report.summary.reserved },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className="text-2xl font-bold text-octane-white">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {[
                { l: 'Total Compras', v: `€${report.summary.totalPurchase.toLocaleString()}`, c: 'text-octane-white' },
                { l: 'Total Vendas', v: `€${report.summary.totalSales.toLocaleString()}`, c: 'text-octane-gold' },
                { l: 'Total Custos', v: `€${report.summary.totalCosts.toLocaleString()}`, c: 'text-octane-orange' },
                { l: 'Margem Bruta', v: `€${report.summary.grossMargin.toLocaleString()}`, c: report.summary.grossMargin >= 0 ? 'text-octane-green' : 'text-octane-red' },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                </div>
              ))}
            </div>

            {user.role !== 'comercial' && report.perUser.length > 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl mb-6 overflow-x-auto">
                <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">Por Utilizador</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-octane-border">
                      {['Nome', 'Papel', 'Total Viaturas', 'Vendidas', 'Receita', 'Margem (€)', 'Margem (%)'].map(h => (
                        <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.perUser.map(u => {
                      const isOpen = drilldown?.id === u.id;
                      return (
                        <>
                          <tr key={u.id}
                            className={`border-t border-octane-border cursor-pointer transition-colors ${isOpen ? 'bg-octane-gold/5' : 'hover:bg-octane-dark/60'}`}
                            onClick={() => openDrilldown(u)}>
                            <td className="p-3 font-medium text-octane-white flex items-center gap-2">
                              <span className="text-octane-gold text-xs">{isOpen ? '▼' : '▶'}</span>
                              {u.name}
                            </td>
                            <td className="p-3 text-octane-gray">{roleLabel[u.role] || u.role}</td>
                            <td className="p-3 text-octane-white">{u.total_vehicles}</td>
                            <td className="p-3 text-octane-white">{u.sold}</td>
                            <td className="p-3 font-medium text-octane-gold">{fmt(u.revenue)}</td>
                            <td className={`p-3 font-medium ${u.margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{fmt(u.margin ?? 0)}</td>
                            <td className={`p-3 font-medium ${u.margin_percent >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{(u.margin_percent ?? 0).toFixed(1)}%</td>
                          </tr>
                          {isOpen && (
                            <tr key={`${u.id}-dd`} className="border-t border-octane-border bg-octane-dark/40">
                              <td colSpan={7} className="p-4">
                                {!drillData ? (
                                  <p className="text-octane-gray text-sm">A carregar...</p>
                                ) : drillData.vehicles.length === 0 ? (
                                  <p className="text-octane-gray text-sm">Nenhuma viatura registada.</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-octane-border/50">
                                        {['Viatura', 'Matrícula', 'Estado', 'Data', 'Compra', 'Custos', 'Venda', 'Margem (€)', 'Margem (%)'].map(h => (
                                          <th key={h} className="text-left pb-2 pr-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {drillData.vehicles.map(v => {
                                        const cost = v.purchase_price + v.costs;
                                        const margin = v.sale_price ? v.sale_price - cost : null;
                                        const pct = margin !== null && cost > 0 ? (margin / cost * 100) : null;
                                        return (
                                          <tr key={v.id} className="border-t border-octane-border/30">
                                            <td className="py-2 pr-3 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year})</span></td>
                                            <td className="py-2 pr-3 text-octane-gray">{v.license_plate || '-'}</td>
                                            <td className="py-2 pr-3">
                                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green' :
                                                v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold' :
                                                'bg-octane-gray/10 text-octane-gray'}`}>{v.status}</span>
                                            </td>
                                            <td className="py-2 pr-3 text-octane-gray whitespace-nowrap">{v.date ? new Date(v.date).toLocaleDateString('pt-PT') : '-'}</td>
                                            <td className="py-2 pr-3 text-octane-white">{fmt(v.purchase_price)}</td>
                                            <td className="py-2 pr-3 text-octane-red">{fmt(v.costs)}</td>
                                            <td className="py-2 pr-3 text-octane-white">{v.sale_price ? fmt(v.sale_price) : '-'}</td>
                                            <td className={`py-2 pr-3 font-medium ${margin === null ? 'text-octane-gray' : margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{margin === null ? '-' : fmt(margin)}</td>
                                            <td className={`py-2 font-medium ${pct === null ? 'text-octane-gray' : pct >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{pct === null ? '-' : `${pct.toFixed(1)}%`}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {report.salesDetails.length > 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl">
                <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">Detalhe de Vendas</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-octane-border">
                        {['Viatura', 'Comercial', 'Preço Compra', 'Custos', 'Preço Venda', 'Margem (€)', 'Margem (%)'].map(h => (
                          <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.salesDetails.map(v => (
                        <tr key={v.id} className="border-t border-octane-border">
                          <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} ({v.year})</td>
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
          </>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReportsTabs from '@/components/ReportsTabs';

export default function VehicleReportsPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [report, setReport] = useState(null);
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
              <div className="bg-octane-card border border-octane-border rounded-xl mb-6">
                <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">Por Utilizador</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-octane-border">
                      {['Nome', 'Papel', 'Total Viaturas', 'Vendidas', 'Receita'].map(h => (
                        <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.perUser.map(u => (
                      <tr key={u.id} className="border-t border-octane-border">
                        <td className="p-3 font-medium text-octane-white">{u.name}</td>
                        <td className="p-3 text-octane-gray">{u.role === 'director' ? 'Diretor' : 'Comercial'}</td>
                        <td className="p-3 text-octane-white">{u.total_vehicles}</td>
                        <td className="p-3 text-octane-white">{u.sold}</td>
                        <td className="p-3 font-medium text-octane-gold">€{u.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
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

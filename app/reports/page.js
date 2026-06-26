'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ReportsPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [report, setReport] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(setUser).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user && user.role !== 'comercial') {
      fetch('/api/users').then(r => r.json()).then(setUsers);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const params = selectedUsers.length ? `?users=${selectedUsers.join(',')}` : '';
      fetch(`/api/reports${params}`).then(r => r.json()).then(setReport);
    }
  }, [user, selectedUsers]);

  function toggleUser(id) {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  if (!user) return null;

  return (
    <div>
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Relatórios</h1>

        {user.role !== 'comercial' && users.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h2 className="font-semibold mb-3 text-sm">Filtrar por utilizador:</h2>
            <div className="flex flex-wrap gap-2">
              {users.filter(u => u.role !== 'admin' || user.role === 'admin').map(u => (
                <button key={u.id} onClick={() => toggleUser(u.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    selectedUsers.includes(u.id) ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'
                  }`}>
                  {u.name}
                </button>
              ))}
              {selectedUsers.length > 0 && (
                <button onClick={() => setSelectedUsers([])} className="px-3 py-1 rounded-full text-sm text-red-600 hover:bg-red-50">
                  Limpar filtros
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
                <div key={s.l} className="bg-white p-4 rounded-xl shadow">
                  <p className="text-sm text-gray-500">{s.l}</p>
                  <p className="text-2xl font-bold">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-sm text-gray-500">Total Compras</p>
                <p className="text-xl font-bold">€{report.summary.totalPurchase.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-sm text-gray-500">Total Vendas</p>
                <p className="text-xl font-bold text-green-600">€{report.summary.totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-sm text-gray-500">Total Custos</p>
                <p className="text-xl font-bold text-orange-600">€{report.summary.totalCosts.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-sm text-gray-500">Margem Bruta</p>
                <p className={`text-xl font-bold ${report.summary.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{report.summary.grossMargin.toLocaleString()}
                </p>
              </div>
            </div>

            {user.role !== 'comercial' && report.perUser.length > 0 && (
              <div className="bg-white rounded-xl shadow mb-6">
                <h2 className="font-semibold p-4 pb-0">Desempenho por Utilizador</h2>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Nome', 'Papel', 'Total Viaturas', 'Vendidas', 'Receita'].map(h => (
                        <th key={h} className="text-left p-3 font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.perUser.map(u => (
                      <tr key={u.id} className="border-t">
                        <td className="p-3 font-medium">{u.name}</td>
                        <td className="p-3">{u.role === 'director' ? 'Diretor' : 'Comercial'}</td>
                        <td className="p-3">{u.total_vehicles}</td>
                        <td className="p-3">{u.sold}</td>
                        <td className="p-3 font-medium">€{u.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {report.salesDetails.length > 0 && (
              <div className="bg-white rounded-xl shadow">
                <h2 className="font-semibold p-4 pb-0">Detalhe de Vendas</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Viatura', 'Comercial', 'Preço Compra', 'Custos', 'Preço Venda', 'Margem (€)', 'Margem (%)'].map(h => (
                          <th key={h} className="text-left p-3 font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.salesDetails.map(v => (
                        <tr key={v.id} className="border-t">
                          <td className="p-3 font-medium">{v.brand} {v.model} ({v.year})</td>
                          <td className="p-3">{v.created_by_name}</td>
                          <td className="p-3">€{v.purchase_price.toLocaleString()}</td>
                          <td className="p-3">€{v.costs.toLocaleString()}</td>
                          <td className="p-3">€{v.sale_price.toLocaleString()}</td>
                          <td className={`p-3 font-medium ${v.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            €{v.margin.toLocaleString()}
                          </td>
                          <td className={`p-3 font-medium ${v.margin_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {v.margin_percent.toFixed(1)}%
                          </td>
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

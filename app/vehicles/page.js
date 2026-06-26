'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const statusLabels = { em_stock: 'Em Stock', vendido: 'Vendido', reservado: 'Reservado' };
const statusColors = { em_stock: 'bg-green-100 text-green-800', vendido: 'bg-purple-100 text-purple-800', reservado: 'bg-yellow-100 text-yellow-800' };

export default function VehiclesPage() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(setUser).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) {
      const url = filter ? `/api/vehicles?status=${filter}` : '/api/vehicles';
      fetch(url).then(r => r.json()).then(setVehicles);
    }
  }, [user, filter]);

  if (!user) return null;

  return (
    <div>
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Viaturas</h1>
          <div className="flex gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="em_stock">Em Stock</option>
              <option value="vendido">Vendido</option>
              <option value="reservado">Reservado</option>
            </select>
            <button onClick={() => router.push('/vehicles/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
              + Nova Viatura
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Marca', 'Modelo', 'Ano', 'Matrícula', 'Preço Compra', 'Preço Venda', 'Custos', 'Estado', 'Comercial'].map(h => (
                  <th key={h} className="text-left p-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/vehicles/${v.id}`)}>
                  <td className="p-3 font-medium">{v.brand}</td>
                  <td className="p-3">{v.model}</td>
                  <td className="p-3">{v.year}</td>
                  <td className="p-3">{v.license_plate || '-'}</td>
                  <td className="p-3">€{v.purchase_price?.toLocaleString()}</td>
                  <td className="p-3">{v.sale_price ? `€${v.sale_price.toLocaleString()}` : '-'}</td>
                  <td className="p-3">€{v.total_costs?.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[v.status]}`}>
                      {statusLabels[v.status]}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{v.created_by_name}</td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-gray-400">Nenhuma viatura encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VehiclesTabs from '@/components/VehiclesTabs';

const statusLabels = { em_stock: 'Em Stock', vendido: 'Vendido', reservado: 'Reservado' };
const statusColors = {
  em_stock: 'bg-octane-green/15 text-octane-green border border-octane-green/30',
  vendido: 'bg-octane-purple/15 text-octane-purple border border-octane-purple/30',
  reservado: 'bg-octane-gold/15 text-octane-gold border border-octane-gold/30',
};

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
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">Viaturas</h1>
        <VehiclesTabs userRole={user.role} />
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex gap-3">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-octane-card border border-octane-border rounded-lg px-3 py-2 text-sm text-octane-white">
              <option value="">Todos</option>
              <option value="em_stock">Em Stock</option>
              <option value="vendido">Vendido</option>
              <option value="reservado">Reservado</option>
            </select>
            <button onClick={() => router.push('/vehicles/new')}
              className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">
              + Nova Viatura
            </button>
          </div>
        </div>

        <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-octane-border">
                {['Marca', 'Modelo', 'Ano', 'Matrícula', 'Preço Compra', 'Preço Venda', 'Custos', 'Estado', 'Comercial'].map(h => (
                  <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-t border-octane-border hover:bg-octane-dark/50 cursor-pointer transition-colors" onClick={() => router.push(`/vehicles/${v.id}`)}>
                  <td className="p-3 font-semibold text-octane-white">{v.brand}</td>
                  <td className="p-3 text-octane-white">{v.model}</td>
                  <td className="p-3 text-octane-gray">{v.year}</td>
                  <td className="p-3 text-octane-gray">{v.license_plate || '-'}</td>
                  <td className="p-3 text-octane-white">€{v.purchase_price?.toLocaleString()}</td>
                  <td className="p-3 text-octane-gold">{v.sale_price ? `€${v.sale_price.toLocaleString()}` : '-'}</td>
                  <td className="p-3 text-octane-orange">€{v.total_costs?.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[v.status]}`}>
                      {statusLabels[v.status]}
                    </span>
                  </td>
                  <td className="p-3 text-octane-gray">{v.created_by_name}</td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-octane-gray">Nenhuma viatura encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

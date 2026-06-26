'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(setUser).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) fetch('/api/reports').then(r => r.json()).then(d => setStats(d.summary));
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Viaturas', value: stats.totalVehicles, color: 'bg-blue-500' },
              { label: 'Em Stock', value: stats.inStock, color: 'bg-green-500' },
              { label: 'Vendidas', value: stats.sold, color: 'bg-purple-500' },
              { label: 'Reservadas', value: stats.reserved, color: 'bg-yellow-500' },
              { label: 'Total Compras', value: `€${stats.totalPurchase.toLocaleString()}`, color: 'bg-red-500' },
              { label: 'Total Vendas', value: `€${stats.totalSales.toLocaleString()}`, color: 'bg-emerald-500' },
              { label: 'Total Custos', value: `€${stats.totalCosts.toLocaleString()}`, color: 'bg-orange-500' },
              { label: 'Margem Bruta', value: `€${stats.grossMargin.toLocaleString()}`, color: stats.grossMargin >= 0 ? 'bg-teal-500' : 'bg-red-600' },
            ].map(s => (
              <div key={s.label} className={`${s.color} text-white p-4 rounded-xl shadow`}>
                <p className="text-sm opacity-80">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

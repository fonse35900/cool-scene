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
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">Dashboard</h1>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Viaturas', value: stats.totalVehicles, accent: false },
              { label: 'Em Stock', value: stats.inStock, accent: false },
              { label: 'Vendidas', value: stats.sold, accent: false },
              { label: 'Reservadas', value: stats.reserved, accent: false },
              { label: 'Total Compras', value: `€${stats.totalPurchase.toLocaleString()}`, accent: false },
              { label: 'Total Vendas', value: `€${stats.totalSales.toLocaleString()}`, accent: true },
              { label: 'Total Custos', value: `€${stats.totalCosts.toLocaleString()}`, accent: false },
              { label: 'Margem Bruta', value: `€${stats.grossMargin.toLocaleString()}`, accent: true, negative: stats.grossMargin < 0 },
            ].map(s => (
              <div key={s.label} className="bg-octane-card border border-octane-border p-5 rounded-xl">
                <p className="text-xs text-octane-gray uppercase tracking-wider mb-2">{s.label}</p>
                <p className={`text-2xl font-bold ${s.negative ? 'text-octane-red' : s.accent ? 'text-octane-gold' : 'text-octane-white'}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";

export default function InvestorsPage() {
  const [user, setUser] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial') { router.push('/dashboard'); return; }
      setUser(u);
    }).catch(() => router.push('/login'));
  }, [router]);

  function loadInvestors() {
    fetch('/api/investors').then(r => r.json()).then(setInvestors);
  }

  useEffect(() => { if (user) loadInvestors(); }, [user]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/investors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', notes: '' });
      loadInvestors();
    } else {
      setError((await res.json()).error);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminar investidor? As viaturas associadas ficarão sem investidor.')) return;
    await fetch('/api/investors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadInvestors();
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-wide">Investidores</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors">
            {showForm ? 'Cancelar' : '+ Novo Investidor'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-octane-card border border-octane-border p-6 rounded-xl mb-6 space-y-4">
            {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Nome *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Telefone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Notas</label>
                <input value={form.notes} onChange={e => set('notes', e.target.value)} className={inputClass} />
              </div>
            </div>
            <button type="submit" className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">Criar</button>
          </form>
        )}

        <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-octane-border">
                {['Nome', 'Email', 'Telefone', 'Notas', ''].map(h => (
                  <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {investors.map(inv => (
                <tr key={inv.id} className="border-t border-octane-border">
                  <td className="p-3 font-medium text-octane-white">{inv.name}</td>
                  <td className="p-3 text-octane-gray">{inv.email || '-'}</td>
                  <td className="p-3 text-octane-gray">{inv.phone || '-'}</td>
                  <td className="p-3 text-octane-gray">{inv.notes || '-'}</td>
                  <td className="p-3">
                    {user.role === 'admin' && (
                      <button onClick={() => handleDelete(inv.id)} className="text-octane-red text-xs hover:underline">Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
              {investors.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-octane-gray">Nenhum investidor registado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

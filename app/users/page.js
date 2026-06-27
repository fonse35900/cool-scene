'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const roleLabels = { admin: 'Administrador', director: 'Diretor', comercial: 'Comercial' };
const roleColors = {
  admin: 'bg-octane-red/15 text-octane-red border border-octane-red/30',
  director: 'bg-octane-gold/15 text-octane-gold border border-octane-gold/30',
  comercial: 'bg-octane-green/15 text-octane-green border border-octane-green/30',
};
const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";

export default function UsersPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'comercial', phone: '', director_id: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial') { router.push('/dashboard'); return; }
      setUser(u);
    }).catch(() => router.push('/login'));
  }, [router]);

  function loadUsers() {
    fetch('/api/users').then(r => r.json()).then(list => {
      setUsers(list);
      setDirectors(list.filter(u => u.role === 'director'));
    });
  }

  useEffect(() => { if (user) loadUsers(); }, [user]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, director_id: form.director_id ? parseInt(form.director_id) : null }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'comercial', phone: '', director_id: '' });
      loadUsers();
    } else {
      setError((await res.json()).error);
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!user) return null;

  const availableRoles = user.role === 'admin' ? ['comercial', 'director', 'admin'] : ['comercial'];

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-wide">Utilizadores</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors">
            {showForm ? 'Cancelar' : '+ Novo Utilizador'}
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
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Password *</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Telefone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Papel</label>
                <select value={form.role} onChange={e => set('role', e.target.value)} className={inputClass}>
                  {availableRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
                </select>
              </div>
              {user.role === 'admin' && form.role === 'comercial' && (
                <div>
                  <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Diretor</label>
                  <select value={form.director_id} onChange={e => set('director_id', e.target.value)} className={inputClass}>
                    <option value="">Sem diretor</option>
                    {directors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button type="submit" className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">Criar</button>
          </form>
        )}

        <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-octane-border">
                {['Nome', 'Email', 'Papel', 'Telefone', 'Data Criação'].map(h => (
                  <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-octane-border">
                  <td className="p-3 font-medium text-octane-white">{u.name}</td>
                  <td className="p-3 text-octane-gray">{u.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="p-3 text-octane-gray">{u.phone || '-'}</td>
                  <td className="p-3 text-octane-gray/60">{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const roleLabels = { admin: 'Administrador', director: 'Diretor', comercial: 'Comercial' };

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
    <div>
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Utilizadores</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            {showForm ? 'Cancelar' : '+ Novo Utilizador'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow mb-6 space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {availableRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
                </select>
              </div>
              {user.role === 'admin' && form.role === 'comercial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diretor</label>
                  <select value={form.director_id} onChange={e => set('director_id', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Sem diretor</option>
                    {directors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">Criar</button>
          </form>
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Nome', 'Email', 'Papel', 'Telefone', 'Data Criação'].map(h => (
                  <th key={h} className="text-left p-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      u.role === 'admin' ? 'bg-red-100 text-red-800' :
                      u.role === 'director' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>{roleLabels[u.role]}</span>
                  </td>
                  <td className="p-3">{u.phone || '-'}</td>
                  <td className="p-3 text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const roleLabels = { admin: 'Administrador', director: 'Diretor', comercial: 'Comercial', investidor: 'Investidor' };
const roleColors = {
  admin: 'bg-octane-red/15 text-octane-red border border-octane-red/30',
  director: 'bg-octane-gold/15 text-octane-gold border border-octane-gold/30',
  comercial: 'bg-octane-green/15 text-octane-green border border-octane-green/30',
  investidor: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
};
const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";

// Frontend mirror of the API authorization rules
function canManage(actor, target) {
  if (actor.id === target.id) return 'self';
  if (actor.role === 'admin') return 'full';
  if (actor.role === 'director') {
    if ((target.role === 'comercial' || target.role === 'investidor') && target.director_id === actor.id) return 'full';
  }
  return false;
}

export default function UsersPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'comercial', phone: '', director_id: '' });
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // user object being edited
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [editError, setEditError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial' || u.role === 'investidor') { router.push('/dashboard'); return; }
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

  function openEdit(u) {
    setEditing(u);
    setEditForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', password: '' });
    setEditError('');
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditError('');
    const body = { name: editForm.name, email: editForm.email, phone: editForm.phone };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/users/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) { setEditing(null); loadUsers(); }
    else setEditError((await res.json()).error);
  }

  async function toggleSuspend(u) {
    const action = u.suspended ? 'reativar' : 'suspender';
    if (!confirm(`Tem a certeza que deseja ${action} ${u.name}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: u.suspended ? 0 : 1 }),
    });
    if (res.ok) loadUsers();
    else alert((await res.json()).error);
  }

  async function handleDelete(u) {
    if (!confirm(`Eliminar permanentemente ${u.name}? Esta ação não pode ser revertida.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (res.ok) loadUsers();
    else alert((await res.json()).error);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  if (!user) return null;

  const availableRoles = user.role === 'admin' ? ['comercial', 'director', 'admin'] : ['comercial'];

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-6xl mx-auto p-6">
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
                {['Nome', 'Email', 'Papel', 'Telefone', 'Estado', 'Ações'].map(h => (
                  <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const perm = canManage(user, u);
                return (
                  <tr key={u.id} className={`border-t border-octane-border ${u.suspended ? 'opacity-50' : ''}`}>
                    <td className="p-3 font-medium text-octane-white">{u.name}</td>
                    <td className="p-3 text-octane-gray">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td className="p-3 text-octane-gray">{u.phone || '-'}</td>
                    <td className="p-3">
                      {u.suspended
                        ? <span className="text-octane-red text-xs font-medium">Suspenso</span>
                        : <span className="text-octane-green text-xs font-medium">Ativo</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        {perm && (
                          <button onClick={() => openEdit(u)}
                            className="text-xs px-2.5 py-1 rounded border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors">
                            Editar
                          </button>
                        )}
                        {perm === 'full' && (
                          <button onClick={() => toggleSuspend(u)}
                            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                              u.suspended
                                ? 'border-octane-green/40 text-octane-green hover:bg-octane-green/10'
                                : 'border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10'
                            }`}>
                            {u.suspended ? 'Reativar' : 'Suspender'}
                          </button>
                        )}
                        {perm === 'full' && (
                          <button onClick={() => handleDelete(u)}
                            className="text-xs px-2.5 py-1 rounded border border-octane-red/40 text-octane-red hover:bg-octane-red/10 transition-colors">
                            Apagar
                          </button>
                        )}
                        {!perm && <span className="text-octane-gray/40 text-xs">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleEditSave} className="bg-octane-card border border-octane-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-octane-border">
              <h2 className="font-bold text-octane-white text-lg">Editar {editing.name}</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-octane-gray hover:text-octane-white text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {editError && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{editError}</div>}
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Nome</label>
                <input value={editForm.name} onChange={e => setE('name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email</label>
                <input type="email" value={editForm.email} onChange={e => setE('email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Telefone</label>
                <input value={editForm.phone} onChange={e => setE('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Nova Password</label>
                <input type="password" value={editForm.password} onChange={e => setE('password', e.target.value)}
                  placeholder="Deixe em branco para manter" className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-octane-border">
              <button type="button" onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg text-sm text-octane-gray hover:text-octane-white transition-colors">Cancelar</button>
              <button type="submit"
                className="bg-octane-gold text-octane-black px-6 py-2 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

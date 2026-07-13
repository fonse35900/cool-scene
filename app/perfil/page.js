'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const roleLabels = { admin: 'Administrador', director: 'Diretor', comercial: 'Comercial', investidor: 'Investidor' };
const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";

export default function PerfilPage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ email: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState(null); // { type: 'ok'|'err', text }
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      setUser(u);
      setForm(f => ({ ...f, email: u.email || '', phone: u.phone || '' }));
    }).catch(() => router.push('/login'));
  }, [router]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave(e) {
    e.preventDefault();
    setMsg(null);

    if (form.newPassword) {
      if (form.newPassword !== form.confirmPassword) {
        setMsg({ type: 'err', text: 'As passwords novas não coincidem' });
        return;
      }
      if (!form.currentPassword) {
        setMsg({ type: 'err', text: 'Introduza a password atual' });
        return;
      }
    }

    const body = { email: form.email, phone: form.phone };
    if (form.newPassword) {
      body.currentPassword = form.currentPassword;
      body.newPassword = form.newPassword;
    }

    const res = await fetch('/api/users/me', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMsg({ type: 'ok', text: 'Dados atualizados com sucesso' });
      setForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } else {
      setMsg({ type: 'err', text: (await res.json()).error });
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold tracking-wide mb-6">O Meu Perfil</h1>

        <div className="bg-octane-card border border-octane-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-octane-white font-semibold text-lg">{user.name}</p>
              <p className="text-octane-gray text-sm">{user.email}</p>
            </div>
            <span className="text-octane-gold text-sm border border-octane-gold/30 bg-octane-gold/5 px-3 py-1 rounded-full">
              {roleLabels[user.role]}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-octane-card border border-octane-border rounded-xl p-6 space-y-5">
          {msg && (
            <div className={`p-3 rounded text-sm border ${
              msg.type === 'ok'
                ? 'bg-octane-green/10 border-octane-green/30 text-octane-green'
                : 'bg-octane-red/10 border-octane-red/30 text-octane-red'
            }`}>{msg.text}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Telefone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
          </div>

          <div className="border-t border-octane-border pt-5">
            <p className="text-sm font-semibold text-octane-white mb-4">Alterar Password</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Password Atual</label>
                <input type="password" value={form.currentPassword} onChange={e => set('currentPassword', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Nova Password</label>
                <input type="password" value={form.newPassword} onChange={e => set('newPassword', e.target.value)}
                  placeholder="Mínimo 6 caracteres" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Confirmar Nova Password</label>
                <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <button type="submit"
            className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">
            Guardar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}

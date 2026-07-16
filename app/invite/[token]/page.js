'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import { useBranding } from '@/lib/BrandingContext';

export default function InvitePage({ params }) {
  const { token } = use(params);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [done, setDone] = useState(false);
  const router = useRouter();
  const { t } = useLang();
  const branding = useBranding();

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error)))
      .then(data => {
        setInvite(data);
        // Reflect the invited company's branding (neutral for a not-yet-configured company)
        if (data.company_id) branding.reload(data.company_id);
      })
      .catch(e => setError(typeof e === 'string' ? e : t('Convite inválido ou já utilizado','Invalid or already used invitation')));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError(t('As passwords não coincidem','The passwords do not match')); return; }
    const res = await fetch(`/api/invitations/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, password: form.password }),
    });
    if (res.ok) {
      const data = await res.json();
      setDone(true);
      setTimeout(() => router.push(data.role === 'director' ? '/dashboard' : '/investor'), 2000);
    }
    else setError((await res.json()).error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-octane-black">
      <div className="bg-octane-dark border border-octane-border p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          {branding.logo
            ? <img src={branding.logo} alt={branding.name} className="h-14 mx-auto mb-4 max-w-[220px] object-contain" />
            : branding.name
              ? <div className="text-2xl font-semibold tracking-wide text-octane-white mb-4">{branding.name}</div>
              : <div className="h-14 mb-4" />}
          <div className="w-12 h-0.5 bg-octane-gold mx-auto mt-3"></div>
        </div>

        {error && (
          <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-4 rounded-lg text-center text-sm">
            {error}
          </div>
        )}

        {done && (
          <div className="bg-octane-green/10 border border-octane-green/30 text-octane-green p-4 rounded-lg text-center text-sm">
            {t('Conta criada com sucesso! A redirecionar...','Account created successfully. Redirecting...')}
          </div>
        )}

        {invite && !done && (
          <>
            <div className="mb-6 text-center">
              <p className="text-octane-gray text-sm">
                {invite.role === 'director' ? t('Convite para Diretor de','Invitation to be Director of') : t('Convite para','Invitation for')}
              </p>
              <p className="text-octane-gold font-semibold">{invite.role === 'director' ? invite.company_name : invite.investor_name}</p>
              <p className="text-octane-gray text-sm mt-1">{invite.email}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('O seu nome','Your name')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white text-sm focus:ring-2 focus:ring-octane-gold focus:outline-none"
                  placeholder={t('Nome completo','Full name')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required
                  className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white text-sm focus:ring-2 focus:ring-octane-gold focus:outline-none"
                  placeholder={t('Mínimo 6 caracteres','Minimum 6 characters')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Confirmar Password','Confirm Password')}</label>
                <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required
                  className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white text-sm focus:ring-2 focus:ring-octane-gold focus:outline-none" />
              </div>
              <button type="submit" className="w-full bg-octane-gold text-octane-black py-3 rounded-lg hover:bg-octane-gold-light font-semibold tracking-wide transition-colors">
                {t('Ativar Conta','Activate Account')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

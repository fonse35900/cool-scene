'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PainelTabs from '@/components/PainelTabs';
import { useLang } from '@/lib/LanguageContext';

const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";

export default function EmpresasPage() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [newName, setNewName] = useState('');
  const [inviteEmail, setInviteEmail] = useState({});
  const [inviteLink, setInviteLink] = useState({});
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role !== 'admin') { router.push('/perfil'); return; }
      setUser(u);
    }).catch(() => router.push('/login'));
  }, [router]);

  function load() {
    fetch('/api/companies').then(r => r.json()).then(setCompanies);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function createCompany(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/companies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) { setNewName(''); load(); }
    else setError((await res.json()).error);
  }

  async function inviteDirector(companyId) {
    setError('');
    const email = inviteEmail[companyId];
    if (!email) return;
    const res = await fetch('/api/companies/invite-director', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, email }),
    });
    const data = await res.json();
    if (res.ok) {
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(prev => ({ ...prev, [companyId]: link }));
      setInviteEmail(prev => ({ ...prev, [companyId]: '' }));
    } else {
      setError(data.error);
    }
  }

  async function toggleSuspend(c) {
    setError('');
    const res = await fetch('/api/companies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, suspended: c.suspended ? 0 : 1 }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  async function deleteCompany(c) {
    if (!confirm(t(`Eliminar a empresa "${c.name}" e todos os seus dados? Esta ação é irreversível.`,
      `Delete the company "${c.name}" and all its data? This action cannot be undone.`))) return;
    setError('');
    const res = await fetch('/api/companies', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold tracking-wide mb-6">{t('Painel', 'Panel')}</h1>
        <PainelTabs userRole={user.role} />

        <h2 className="text-lg font-semibold mb-4">{t('Empresas Cliente', 'Client Companies')}</h2>

        <form onSubmit={createCompany} className="bg-octane-card border border-octane-border rounded-xl p-4 mb-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Nova empresa', 'New company')}</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder={t('Nome da empresa', 'Company name')} className={inputClass} />
          </div>
          <button type="submit" className="bg-octane-gold text-octane-black px-5 py-3 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors whitespace-nowrap">
            {t('+ Criar', '+ Create')}
          </button>
        </form>

        {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm mb-4">{error}</div>}

        <div className="space-y-3">
          {companies.map(c => (
            <div key={c.id} className={`bg-octane-card border rounded-xl p-4 ${c.suspended ? 'border-octane-red/40 opacity-70' : 'border-octane-border'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-3">
                  {c.logo && <img src={c.logo} alt={c.name} className="h-7 max-w-[120px] object-contain" />}
                  <span className="font-semibold text-octane-white">{c.name}</span>
                  <span className="text-octane-gray text-xs">#{c.id}</span>
                  {c.suspended === 1 && (
                    <span className="text-[10px] uppercase tracking-wider bg-octane-red/15 text-octane-red border border-octane-red/30 px-2 py-0.5 rounded-full">
                      {t('Suspensa', 'Suspended')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-octane-gray">
                  {c.director_name
                    ? <span>{t('Diretor', 'Director')}: <span className="text-octane-white">{c.director_name}</span> · {c.users_count} {t('utilizadores', 'users')}</span>
                    : <span className="text-octane-gold">{t('Sem diretor atribuído', 'No director assigned')}</span>}
                </div>
              </div>

              {c.id !== 1 && (
                <div className="flex justify-end gap-2 mb-3">
                  <button onClick={() => toggleSuspend(c)}
                    className="text-xs border border-octane-border text-octane-gray hover:text-octane-white hover:border-octane-gray px-3 py-1.5 rounded transition-colors">
                    {c.suspended ? t('Reativar', 'Reactivate') : t('Suspender', 'Suspend')}
                  </button>
                  <button onClick={() => deleteCompany(c)}
                    className="text-xs border border-octane-red/50 text-octane-red hover:bg-octane-red/10 px-3 py-1.5 rounded transition-colors">
                    {t('Eliminar', 'Delete')}
                  </button>
                </div>
              )}

              {!c.director_name && (
                <div className="border-t border-octane-border pt-3">
                  <p className="text-xs text-octane-gray mb-2">{t('Convidar diretor (por email):', 'Invite director (by email):')}</p>
                  <div className="flex gap-2">
                    <input type="email" value={inviteEmail[c.id] || ''} placeholder={t('email do diretor', 'director email')}
                      onChange={e => setInviteEmail(prev => ({ ...prev, [c.id]: e.target.value }))}
                      className="bg-octane-dark border border-octane-border rounded px-3 py-2 text-sm text-octane-white flex-1" />
                    <button onClick={() => inviteDirector(c.id)}
                      className="border border-octane-gold text-octane-gold px-4 py-2 rounded text-sm font-semibold hover:bg-octane-gold hover:text-octane-black transition-colors whitespace-nowrap">
                      {t('Gerar convite', 'Generate invite')}
                    </button>
                  </div>
                  {inviteLink[c.id] && (
                    <div className="bg-octane-green/10 border border-octane-green/30 rounded-lg p-3 mt-3">
                      <p className="text-xs text-octane-gray mb-1">{t('Link de convite (enviar ao diretor):', 'Invitation link (send to the director):')}</p>
                      <div className="flex items-center gap-2">
                        <code className="text-octane-green text-xs flex-1 break-all">{inviteLink[c.id]}</code>
                        <button onClick={() => navigator.clipboard.writeText(inviteLink[c.id])}
                          className="text-xs border border-octane-green text-octane-green px-2 py-1 rounded hover:bg-octane-green/10 whitespace-nowrap">
                          {t('Copiar', 'Copy')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

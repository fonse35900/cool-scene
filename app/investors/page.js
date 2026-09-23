'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DateInput from '@/components/DateInput';
import PainelTabs from '@/components/PainelTabs';
import { useLang } from '@/lib/LanguageContext';

const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";

function fmt(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

export default function InvestorsPage() {
  const [user, setUser] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [error, setError] = useState('');

  // Expanded investor panels
  const [expanded, setExpanded] = useState({});

  // Inline edit per investor
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Contributions per investor
  const [contributions, setContributions] = useState({});
  const [contribForm, setContribForm] = useState({});
  // Sort state per investor for the capital movements list: { [invId]: {col, dir} }
  const [contribSort, setContribSort] = useState({});

  // Invitations per investor
  const [invitations, setInvitations] = useState({});
  const [inviteEmail, setInviteEmail] = useState({});
  const [inviteLink, setInviteLink] = useState({});

  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial' || u.role === 'investidor') { router.push('/dashboard'); return; }
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

  function startEdit(inv) {
    setEditingId(inv.id);
    setEditForm({ name: inv.name, email: inv.email || '', phone: inv.phone || '', notes: inv.notes || '' });
  }

  async function handleEdit(id) {
    const res = await fetch('/api/investors', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    });
    if (res.ok) { setEditingId(null); loadInvestors(); }
    else alert((await res.json()).error);
  }

  async function handleDelete(id) {
    if (!confirm('Eliminar investidor? As viaturas associadas ficarão sem investidor.')) return;
    await fetch('/api/investors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadInvestors();
  }

  function toggleExpand(id) {
    const next = !expanded[id];
    setExpanded(e => ({ ...e, [id]: next }));
    if (next) {
      loadContributions(id);
      loadInvitations(id);
    }
  }

  function loadContributions(investorId) {
    fetch(`/api/investor/contributions?investor_id=${investorId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setContributions(c => ({ ...c, [investorId]: Array.isArray(data) ? data : [] })))
      .catch(() => setContributions(c => ({ ...c, [investorId]: [] })));
  }

  // direction: 1 = depósito (soma), -1 = levantamento (subtrai). Levantamentos
  // são guardados com valor negativo na mesma tabela.
  async function addMovement(investorId, direction) {
    const f = contribForm[investorId] || {};
    if (!f.amount) { alert('Insira um valor'); return; }
    const signed = Math.abs(parseFloat(f.amount)) * direction;
    const res = await fetch('/api/investor/contributions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investor_id: investorId, amount: signed, notes: f.notes || '', date: f.date || new Date().toISOString().split('T')[0] }),
    });
    if (res.ok) {
      setContribForm(cf => ({ ...cf, [investorId]: {} }));
      loadContributions(investorId);
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || `Erro ${res.status}`);
    }
  }

  async function deleteContribution(investorId, id) {
    await fetch('/api/investor/contributions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    loadContributions(investorId);
  }

  function loadInvitations(investorId) {
    fetch('/api/invitations').then(r => r.ok ? r.json() : []).then(all => {
      const filtered = Array.isArray(all) ? all.filter(i => i.investor_id === investorId) : [];
      setInvitations(inv => ({ ...inv, [investorId]: filtered }));
    }).catch(() => setInvitations(inv => ({ ...inv, [investorId]: [] })));
  }

  async function sendInvite(investorId) {
    const email = inviteEmail[investorId];
    if (!email) { alert('Insira um email'); return; }
    const res = await fetch('/api/invitations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investor_id: investorId, email }),
    });
    if (res.ok) {
      const data = await res.json();
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(l => ({ ...l, [investorId]: link }));
      setInviteEmail(e => ({ ...e, [investorId]: '' }));
      loadInvitations(investorId);
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || `Erro ${res.status}`);
    }
  }

  async function deleteInvite(investorId, id) {
    await fetch('/api/invitations', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    loadInvitations(investorId);
    setInviteLink(l => ({ ...l, [investorId]: null }));
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCF = (investorId, k, v) => setContribForm(cf => ({ ...cf, [investorId]: { ...(cf[investorId] || {}), [k]: v } }));

  function toggleContribSort(investorId, col) {
    setContribSort(s => {
      const cur = s[investorId];
      const dir = cur?.col === col && cur.dir === 'asc' ? 'desc' : 'asc';
      return { ...s, [investorId]: { col, dir } };
    });
  }

  function sortContribs(investorId, items) {
    const s = contribSort[investorId];
    if (!s) return items;
    const val = (c) => {
      switch (s.col) {
        case 'date': return c.date ? new Date(c.date).getTime() : 0;
        case 'type': return c.amount < 0 ? 1 : 0;          // depósito antes de levantamento
        case 'amount': return Math.abs(c.amount);
        case 'notes': return (c.notes || '').toLowerCase();
        default: return 0;
      }
    };
    return [...items].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return s.dir === 'asc' ? -1 : 1;
      if (av > bv) return s.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto p-6">
        <PainelTabs userRole={user.role} />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-wide">{t('Investidores', 'Investors')}</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors">
            {showForm ? t('Cancelar', 'Cancel') : t('+ Novo Investidor', '+ New Investor')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-octane-card border border-octane-border p-6 rounded-xl mb-6 space-y-4">
            {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Nome', 'Name')} *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Telefone', 'Phone')}</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Notas', 'Notes')}</label>
                <input value={form.notes} onChange={e => set('notes', e.target.value)} className={inputClass} />
              </div>
            </div>
            <button type="submit" className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">{t('Criar', 'Create')}</button>
          </form>
        )}

        <div className="space-y-3">
          {investors.length === 0 && (
            <div className="bg-octane-card border border-octane-border rounded-xl p-8 text-center text-octane-gray">{t('Nenhum investidor registado', 'No investors registered')}</div>
          )}
          {investors.map(inv => (
            <div key={inv.id} className="bg-octane-card border border-octane-border rounded-xl overflow-hidden">
              {/* Header row */}
              {editingId === inv.id ? (
                <div className="p-4 space-y-3" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-octane-gray mb-1">{t('Nome', 'Name')} *</label>
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-octane-gray mb-1">Email</label>
                      <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-octane-gray mb-1">{t('Telefone', 'Phone')}</label>
                      <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-octane-gray mb-1">{t('Notas', 'Notes')}</label>
                      <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(inv.id)} className="bg-octane-gold text-octane-black px-4 py-1.5 rounded text-sm font-semibold hover:bg-octane-gold-light transition-colors">{t('Guardar', 'Save')}</button>
                    <button onClick={() => setEditingId(null)} className="border border-octane-border text-octane-gray px-4 py-1.5 rounded text-sm hover:border-octane-gold hover:text-octane-gold transition-colors">{t('Cancelar', 'Cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleExpand(inv.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-octane-white">{inv.name}</span>
                    {inv.email && <span className="text-octane-gray text-sm">{inv.email}</span>}
                    {inv.phone && <span className="text-octane-gray text-sm">{inv.phone}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={e => { e.stopPropagation(); startEdit(inv); }}
                      className="text-octane-gold text-xs hover:underline">{t('Editar', 'Edit')}</button>
                    {user.role === 'admin' && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(inv.id); }}
                        className="text-octane-red text-xs hover:underline">{t('Eliminar', 'Delete')}</button>
                    )}
                    <span className="text-octane-gray text-sm">{expanded[inv.id] ? '▲' : '▼'}</span>
                  </div>
                </div>
              )}

              {expanded[inv.id] && (
                <div className="border-t border-octane-border p-4 space-y-6">

                  {/* Contributions */}
                  {(() => {
                    const items = contributions[inv.id] || [];
                    const totalDep = items.filter(c => c.amount >= 0).reduce((s, c) => s + c.amount, 0);
                    const totalLev = items.filter(c => c.amount < 0).reduce((s, c) => s + Math.abs(c.amount), 0);
                    return (
                  <div>
                    <h3 className="text-sm font-semibold text-octane-gold uppercase tracking-wider mb-3">{t('Capital Investido', 'Invested Capital')}</h3>
                    {items.length > 0 && (() => {
                      const s = contribSort[inv.id];
                      const arrow = (col) => s?.col === col ? (s.dir === 'asc' ? ' ▲' : ' ▼') : '';
                      const SortH = ({ col, label, cls }) => (
                        <button onClick={() => toggleContribSort(inv.id, col)}
                          className={`text-left text-xs uppercase tracking-wider hover:text-octane-gold transition-colors ${s?.col === col ? 'text-octane-gold' : 'text-octane-gray'} ${cls}`}>
                          {label}{arrow(col)}
                        </button>
                      );
                      return (
                        <div className="flex items-center px-3 pb-1 gap-0">
                          <SortH col="date" label={t('Data', 'Date')} cls="w-24" />
                          <SortH col="type" label={t('Tipo', 'Type')} cls="w-28" />
                          <SortH col="amount" label={t('Valor', 'Amount')} cls="w-28 text-right" />
                          <SortH col="notes" label={t('Notas', 'Notes')} cls="flex-1 mx-3" />
                          <span className="w-16" />
                        </div>
                      );
                    })()}
                    <div className="space-y-2 mb-3">
                      {sortContribs(inv.id, items).map(c => {
                        const isWithdrawal = c.amount < 0;
                        return (
                        <div key={c.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm border-l-2 ${isWithdrawal ? 'bg-octane-red/5 border-octane-red' : 'bg-octane-green/5 border-octane-green'}`}>
                          <span className="text-octane-gray w-24">{c.date ? new Date(c.date).toLocaleDateString('pt-PT') : '-'}</span>
                          <span className={`text-xs font-semibold uppercase tracking-wider w-28 ${isWithdrawal ? 'text-octane-red' : 'text-octane-green'}`}>
                            {isWithdrawal ? t('Levantamento', 'Withdrawal') : t('Depósito', 'Deposit')}
                          </span>
                          <span className={`font-medium w-28 text-right ${isWithdrawal ? 'text-octane-red' : 'text-octane-green'}`}>
                            {isWithdrawal ? '−' : '+'}{fmt(Math.abs(c.amount))}
                          </span>
                          <span className="text-octane-gray flex-1 mx-3">{c.notes || ''}</span>
                          <button onClick={() => deleteContribution(inv.id, c.id)} className="text-octane-red text-xs hover:underline">{t('Remover', 'Remove')}</button>
                        </div>
                        );
                      })}
                      {items.length === 0 && (
                        <p className="text-octane-gray text-sm">{t('Sem movimentos registados', 'No movements recorded')}</p>
                      )}
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-octane-green/10 border border-octane-green/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-octane-green uppercase tracking-wider">{t('Total Depósitos', 'Total Deposits')}</p>
                        <p className="text-octane-green font-bold">{fmt(totalDep)}</p>
                      </div>
                      <div className="bg-octane-red/10 border border-octane-red/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-octane-red uppercase tracking-wider">{t('Total Levantamentos', 'Total Withdrawals')}</p>
                        <p className="text-octane-red font-bold">{fmt(totalLev)}</p>
                      </div>
                      <div className="bg-octane-dark border border-octane-border rounded-lg px-3 py-2">
                        <p className="text-xs text-octane-gray uppercase tracking-wider">{t('Saldo', 'Balance')}</p>
                        <p className="text-octane-white font-bold">{fmt(totalDep - totalLev)}</p>
                      </div>
                    </div>

                    {/* Add movement */}
                    <div className="flex gap-2 items-end">
                      <div>
                        <label className="block text-xs text-octane-gray mb-1">{t('Data', 'Date')}</label>
                        <DateInput
                          value={(contribForm[inv.id] || {}).date || ''}
                          onChange={v => setCF(inv.id, 'date', v)}
                          className="bg-octane-black border border-octane-border rounded px-3 py-2 text-sm text-octane-white w-36" />
                      </div>
                      <div>
                        <label className="block text-xs text-octane-gray mb-1">{t('Valor (€)', 'Amount (€)')}</label>
                        <input type="number" step="0.01" placeholder="0.00" value={(contribForm[inv.id] || {}).amount || ''}
                          onChange={e => setCF(inv.id, 'amount', e.target.value)}
                          className="bg-octane-black border border-octane-border rounded px-3 py-2 text-sm text-octane-white w-32" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-octane-gray mb-1">{t('Notas', 'Notes')}</label>
                        <input placeholder={t('Observações...', 'Notes...')} value={(contribForm[inv.id] || {}).notes || ''}
                          onChange={e => setCF(inv.id, 'notes', e.target.value)}
                          className="bg-octane-black border border-octane-border rounded px-3 py-2 text-sm text-octane-white w-full" />
                      </div>
                      <button onClick={() => addMovement(inv.id, 1)}
                        className="bg-octane-green text-octane-black px-4 py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                        {t('+ Depósito', '+ Deposit')}
                      </button>
                      <button onClick={() => addMovement(inv.id, -1)}
                        className="bg-octane-red text-octane-white px-4 py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                        {t('− Levantamento', '− Withdrawal')}
                      </button>
                    </div>
                  </div>
                    );
                  })()}

                  {/* Invitations */}
                  <div>
                    <h3 className="text-sm font-semibold text-octane-gold uppercase tracking-wider mb-3">{t('Acesso do Investidor', 'Investor Access')}</h3>
                    {(invitations[inv.id] || []).map(i => (
                      <div key={i.id} className="flex items-center justify-between bg-octane-dark rounded-lg px-3 py-2 text-sm mb-2">
                        <span className="text-octane-white">{i.email}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${i.accepted_at ? 'bg-octane-green/10 text-octane-green' : 'bg-octane-gold/10 text-octane-gold'}`}>
                          {i.accepted_at ? t('Ativo', 'Active') : t('Pendente', 'Pending')}
                        </span>
                        {!i.accepted_at && (
                          <button onClick={() => deleteInvite(inv.id, i.id)} className="text-octane-red text-xs hover:underline ml-3">{t('Cancelar', 'Cancel')}</button>
                        )}
                      </div>
                    ))}

                    {inviteLink[inv.id] && (
                      <div className="bg-octane-green/10 border border-octane-green/30 rounded-lg p-3 mb-3">
                        <p className="text-xs text-octane-gray mb-1">{t('Link de convite (copiar e enviar ao investidor):', 'Invitation link (copy and send to the investor):')}</p>
                        <div className="flex items-center gap-2">
                          <code className="text-octane-green text-xs flex-1 break-all">{inviteLink[inv.id]}</code>
                          <button onClick={() => navigator.clipboard.writeText(inviteLink[inv.id])}
                            className="text-xs border border-octane-green text-octane-green px-2 py-1 rounded hover:bg-octane-green/10 whitespace-nowrap">
                            {t('Copiar', 'Copy')}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input type="email" placeholder={t('Email do investidor', 'Investor email')} value={inviteEmail[inv.id] || ''}
                        onChange={e => setInviteEmail(ie => ({ ...ie, [inv.id]: e.target.value }))}
                        className="bg-octane-black border border-octane-border rounded px-3 py-2 text-sm text-octane-white flex-1" />
                      <button onClick={() => sendInvite(inv.id)}
                        className="border border-octane-gold text-octane-gold px-4 py-2 rounded text-sm font-semibold hover:bg-octane-gold hover:text-octane-black transition-colors whitespace-nowrap">
                        {t('Gerar Convite', 'Generate Invite')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

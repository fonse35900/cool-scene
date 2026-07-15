'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useLang } from '@/lib/LanguageContext';

function fmtDateTime(s) {
  if (!s) return '-';
  const d = new Date(s.includes('T') || s.includes(' ') ? s.replace(' ', 'T') + 'Z' : s);
  if (isNaN(d)) return s;
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LogsPage() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState(null);
  const router = useRouter();
  const { t } = useLang();

  const entityLabels = {
    vehicles: t('Viatura', 'Vehicle'),
    vehicle_costs: t('Custo', 'Cost'),
    investors: t('Investidor', 'Investor'),
    investor_contributions: t('Contribuição', 'Contribution'),
    users: t('Utilizador', 'User'),
    invitations: t('Convite', 'Invitation'),
  };
  const actionLabels = {
    insert: t('Inserção', 'Insert'),
    update: t('Alteração', 'Update'),
    delete: t('Eliminação', 'Delete'),
    undo: t('Anulação', 'Undo'),
  };
  const actionColors = {
    insert: 'bg-octane-green/15 text-octane-green',
    update: 'bg-blue-500/15 text-blue-400',
    delete: 'bg-octane-red/15 text-octane-red',
    undo: 'bg-octane-gray/20 text-octane-gray',
  };

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial' || u.role === 'investidor') { router.push('/dashboard'); return; }
      setUser(u);
    }).catch(() => router.push('/login'));
  }, [router]);

  function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (entity) p.set('entity', entity);
    if (action) p.set('action', action);
    fetch(`/api/logs?${p}`).then(r => r.json()).then(d => { setItems(d.items || []); setLoading(false); });
  }

  useEffect(() => { if (user) load(); }, [user, entity, action]);

  async function undo(item) {
    if (!confirm(t(
      `Anular esta operação (${actionLabels[item.action]} · ${item.label})? O estado anterior será reposto.`,
      `Undo this operation (${actionLabels[item.action]} · ${item.label})? The previous state will be restored.`
    ))) return;
    setBusy(true);
    const res = await fetch(`/api/logs/${item.id}/undo`, { method: 'POST' });
    setBusy(false);
    if (res.ok) load();
    else alert((await res.json()).error);
  }

  function fmtVal(v) {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold tracking-wide mb-6">{t('Registo de Atividade', 'Activity Log')}</h1>

        <div className="flex flex-wrap gap-3 mb-6">
          <select value={entity} onChange={e => setEntity(e.target.value)}
            className="bg-octane-card border border-octane-border rounded-lg px-3 py-2 text-sm text-octane-white">
            <option value="">{t('Todas as entidades', 'All entities')}</option>
            {Object.entries(entityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={action} onChange={e => setAction(e.target.value)}
            className="bg-octane-card border border-octane-border rounded-lg px-3 py-2 text-sm text-octane-white">
            <option value="">{t('Todas as ações', 'All actions')}</option>
            {['insert', 'update', 'delete', 'undo'].map(a => <option key={a} value={a}>{actionLabels[a]}</option>)}
          </select>
          <button onClick={load} className="text-sm px-3 py-2 rounded-lg border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors">
            {t('Atualizar', 'Refresh')}
          </button>
        </div>

        {loading ? (
          <p className="text-octane-gray">{t('A carregar...', 'Loading...')}</p>
        ) : items.length === 0 ? (
          <div className="bg-octane-card border border-octane-border rounded-xl p-8 text-center text-octane-gray">
            {t('Sem registos.', 'No records.')}
          </div>
        ) : (
          <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-octane-border text-octane-gray text-xs uppercase tracking-wider">
                  <th className="text-left p-3">{t('Data', 'Date')}</th>
                  <th className="text-left p-3">{t('Ação', 'Action')}</th>
                  <th className="text-left p-3">{t('Entidade', 'Entity')}</th>
                  <th className="text-left p-3">{t('Registo', 'Record')}</th>
                  <th className="text-left p-3">{t('Utilizador', 'User')}</th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <React.Fragment key={item.id}>
                    <tr className={`border-t border-octane-border/60 hover:bg-octane-dark/40 ${item.undone ? 'opacity-50' : ''}`}>
                      <td className="p-3 text-octane-gray whitespace-nowrap text-xs">{fmtDateTime(item.created_at)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColors[item.action]}`}>
                          {actionLabels[item.action] || item.action}
                        </span>
                        {item.undone && <span className="text-octane-gray text-xs ml-2">({t('anulado', 'undone')})</span>}
                      </td>
                      <td className="p-3 text-octane-gray">{entityLabels[item.entity] || item.entity}</td>
                      <td className="p-3 text-octane-white font-medium">{item.label || `#${item.entity_id}`}</td>
                      <td className="p-3 text-octane-gray text-xs">{item.actor_name || '—'}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {item.action === 'update' && item.changes?.length > 0 && (
                          <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                            className="text-xs px-2.5 py-1 rounded border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors mr-2">
                            {expanded === item.id ? t('Fechar', 'Close') : t('Detalhe', 'Detail')}
                          </button>
                        )}
                        {item.action !== 'undo' && !item.undone && (
                          <button onClick={() => undo(item)} disabled={busy}
                            className="text-xs px-2.5 py-1 rounded border border-octane-gold text-octane-gold hover:bg-octane-gold hover:text-octane-black transition-colors disabled:opacity-40">
                            {t('Anular', 'Undo')}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === item.id && item.changes?.length > 0 && (
                      <tr className="bg-octane-dark/30">
                        <td colSpan={6} className="p-4">
                          <ul className="space-y-1">
                            {item.changes.map((c, i) => (
                              <li key={i} className="text-xs text-octane-gray">
                                <span className="text-octane-white font-medium">{c.field}:</span>{' '}
                                <span className="text-octane-red/80 line-through">{fmtVal(c.from)}</span>
                                {' → '}
                                <span className="text-octane-green">{fmtVal(c.to)}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-octane-gray/60 mt-4">
          {t(
            'Anular repõe o estado anterior deste registo. Eliminações em cascata (ex.: custos de uma viatura apagada) podem precisar de ser anuladas individualmente.',
            'Undo restores the previous state of this record. Cascading deletes (e.g. costs of a deleted vehicle) may need to be undone individually.'
          )}
        </p>
      </div>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PainelTabs from '@/components/PainelTabs';
import { useLang } from '@/lib/LanguageContext';

function fmtDateTime(s) {
  if (!s) return '-';
  const d = new Date(s.includes('T') || s.includes(' ') ? s.replace(' ', 'T') + 'Z' : s);
  if (isNaN(d)) return s;
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BackupsPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null); // expanded backup detail
  const [showInserted, setShowInserted] = useState(false);
  const router = useRouter();
  const { t } = useLang();

  const tableLabels = {
    users: t('Utilizadores', 'Users'),
    investors: t('Investidores', 'Investors'),
    vehicles: t('Viaturas', 'Vehicles'),
    vehicle_costs: t('Custos', 'Costs'),
    investor_contributions: t('Contribuições', 'Contributions'),
    invitations: t('Convites', 'Invitations'),
    vehicle_history: t('Histórico', 'History'),
  };

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial' || u.role === 'investidor') { router.push('/dashboard'); return; }
      setUser(u);
    }).catch(() => router.push('/login'));
  }, [router]);

  function load() {
    setLoading(true);
    fetch('/api/backups').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function backupNow() {
    setBusy(true);
    await fetch('/api/backups', { method: 'POST' });
    setBusy(false);
    load();
  }

  async function openDetail(id) {
    if (detail?.id === id) { setDetail(null); return; }
    setDetail({ id, loading: true });
    const d = await fetch(`/api/backups/${id}`).then(r => r.json());
    setDetail({ id, ...d, loading: false });
  }

  async function restore(point) {
    const label = point.day;
    if (!confirm(t(
      `ATENÇÃO: Vai substituir TODOS os dados atuais pelos dados de ${label}. É criado um backup de segurança antes. Continuar?`,
      `WARNING: This will replace ALL current data with the data from ${label}. A safety backup is created first. Continue?`
    ))) return;
    setBusy(true);
    const res = await fetch(`/api/backups/${point.id}/restore`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      alert(t('Dados repostos com sucesso.', 'Data restored successfully.'));
      load();
    } else {
      alert((await res.json()).error);
    }
  }

  if (!user) return null;

  const inserted = data?.inserted;
  const addedTotal = inserted?.added
    ? Object.values(inserted.added).reduce((s, arr) => s + arr.length, 0)
    : 0;

  function RestoreTable({ title, points }) {
    if (!points || points.length === 0) return null;
    return (
      <div className="bg-octane-card border border-octane-border rounded-xl overflow-hidden mb-6">
        <h2 className="font-semibold p-4 pb-3 text-octane-gold text-sm uppercase tracking-wider">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-octane-border text-octane-gray text-xs uppercase tracking-wider">
                <th className="text-left p-3">{t('Dia', 'Day')}</th>
                <th className="text-left p-3">{t('Criado', 'Created')}</th>
                <th className="text-right p-3">{t('Viaturas', 'Vehicles')}</th>
                <th className="text-right p-3">{t('Custos', 'Costs')}</th>
                <th className="text-right p-3">{t('Investidores', 'Investors')}</th>
                <th className="text-right p-3">{t('Utilizadores', 'Users')}</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {points.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="border-t border-octane-border/60 hover:bg-octane-dark/40">
                    <td className="p-3 font-medium text-octane-white">{p.day}</td>
                    <td className="p-3 text-octane-gray text-xs">{fmtDateTime(p.created_at)}</td>
                    <td className="p-3 text-right text-octane-white">{p.summary.vehicles ?? 0}</td>
                    <td className="p-3 text-right text-octane-gray">{p.summary.vehicle_costs ?? 0}</td>
                    <td className="p-3 text-right text-octane-gray">{p.summary.investors ?? 0}</td>
                    <td className="p-3 text-right text-octane-gray">{p.summary.users ?? 0}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => openDetail(p.id)}
                        className="text-xs px-2.5 py-1 rounded border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors mr-2">
                        {detail?.id === p.id ? t('Fechar', 'Close') : t('Detalhe', 'Detail')}
                      </button>
                      <button onClick={() => restore(p)} disabled={busy}
                        className="text-xs px-2.5 py-1 rounded border border-octane-gold text-octane-gold hover:bg-octane-gold hover:text-octane-black transition-colors disabled:opacity-40">
                        {t('Repor', 'Restore')}
                      </button>
                    </td>
                  </tr>
                  {detail?.id === p.id && (
                    <tr className="bg-octane-dark/30">
                      <td colSpan={7} className="p-4">
                        {detail.loading ? (
                          <p className="text-octane-gray text-sm">{t('A carregar...', 'Loading...')}</p>
                        ) : detail.hasPrevious ? (
                          <div>
                            <p className="text-xs uppercase tracking-wider text-octane-gold font-semibold mb-2">
                              {t('Inserido face ao dia anterior', 'Inserted vs previous day')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(detail.added).map(([tbl, rows]) => rows.length > 0 && (
                                <span key={tbl} className="text-xs bg-octane-card border border-octane-border rounded-full px-3 py-1 text-octane-white">
                                  {tableLabels[tbl] || tbl}: <span className="text-octane-green font-semibold">+{rows.length}</span>
                                </span>
                              ))}
                              {Object.values(detail.added).every(r => r.length === 0) && (
                                <span className="text-octane-gray text-sm">{t('Sem novos registos.', 'No new records.')}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-octane-gray text-sm">{t('Sem dia anterior para comparar.', 'No previous day to compare.')}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-6xl mx-auto p-6">
        <PainelTabs userRole={user.role} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-wide">{t('Backups', 'Backups')}</h1>
          <button onClick={backupNow} disabled={busy}
            className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors disabled:opacity-40">
            {busy ? t('A processar...', 'Working...') : t('Backup agora', 'Backup now')}
          </button>
        </div>

        {/* Summary vs previous day */}
        {inserted && (
          <div className="bg-octane-card border border-octane-border rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowInserted(s => !s)}>
              <div>
                <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{t('Dados inseridos face ao dia anterior', 'Data inserted vs previous day')}</p>
                <p className="text-2xl font-bold text-octane-white">
                  {inserted.hasPrevious ? <><span className="text-octane-green">+{addedTotal}</span> {t('registos', 'records')}</> : t('Sem dia anterior', 'No previous day')}
                </p>
              </div>
              {inserted.hasPrevious && addedTotal > 0 && (
                <span className="text-octane-gold text-sm">{showInserted ? t('▲ Ocultar', '▲ Hide') : t('▼ Drill-down', '▼ Drill-down')}</span>
              )}
            </div>
            {showInserted && inserted.hasPrevious && (
              <div className="mt-4 space-y-4 border-t border-octane-border pt-4">
                {Object.entries(inserted.added).map(([tbl, rows]) => rows.length > 0 && (
                  <div key={tbl}>
                    <p className="text-sm font-semibold text-octane-gold mb-2">{tableLabels[tbl] || tbl} <span className="text-octane-green">+{rows.length}</span></p>
                    <div className="flex flex-wrap gap-2">
                      {rows.slice(0, 40).map(r => (
                        <span key={r.id} className="text-xs bg-octane-dark border border-octane-border rounded px-2 py-1 text-octane-gray">
                          {r.brand ? `${r.brand} ${r.model}` : r.name ? r.name : r.type ? `${r.type} €${r.amount}` : `#${r.id}`}
                        </span>
                      ))}
                      {rows.length > 40 && <span className="text-xs text-octane-gray">+{rows.length - 40}…</span>}
                    </div>
                  </div>
                ))}
                {addedTotal === 0 && <p className="text-octane-gray text-sm">{t('Sem novos registos desde ontem.', 'No new records since yesterday.')}</p>}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-octane-gray">{t('A carregar...', 'Loading...')}</p>
        ) : (
          <>
            <RestoreTable title={t('Últimos 30 dias', 'Last 30 days')} points={data?.points?.daily} />
            <RestoreTable title={t('Último dia de cada mês (6 meses)', 'Last day of each month (6 months)')} points={data?.points?.monthly} />
            {data?.points?.manual?.length > 0 && (
              <RestoreTable title={t('Backups manuais e de segurança', 'Manual and safety backups')} points={data.points.manual} />
            )}
          </>
        )}

        <p className="text-xs text-octane-gray/60 mt-4">
          {t(
            'O backup diário é criado automaticamente no primeiro acesso de cada dia. O restauro cria sempre um backup de segurança antes de substituir os dados.',
            'The daily backup is created automatically on the first access each day. Restoring always creates a safety backup before replacing the data.'
          )}
        </p>
      </div>
    </div>
  );
}

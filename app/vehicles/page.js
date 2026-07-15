'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VehiclesTabs from '@/components/VehiclesTabs';
import { useLang } from '@/lib/LanguageContext';
const statusColors = {
  em_stock: 'bg-octane-green/15 text-octane-green border border-octane-green/30',
  vendido: 'bg-octane-purple/15 text-octane-purple border border-octane-purple/30',
  reservado: 'bg-octane-gold/15 text-octane-gold border border-octane-gold/30',
};

function fmtDateTime(s) {
  if (!s) return '-';
  const d = new Date(s.includes('T') || s.includes(' ') ? s.replace(' ', 'T') : s);
  if (isNaN(d)) return s;
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function HistoryPanel({ vehicleId }) {
  const [history, setHistory] = useState(null);
  const { t } = useLang();

  useEffect(() => {
    fetch(`/api/vehicles/${vehicleId}`).then(r => r.json()).then(d => setHistory(d.history || []));
  }, [vehicleId]);

  if (history === null) return <div className="p-4 text-octane-gray text-sm">{t('A carregar histórico...', 'Loading history...')}</div>;
  if (history.length === 0) return <div className="p-4 text-octane-gray text-sm">{t('Sem alterações registadas.', 'No changes recorded.')}</div>;

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs uppercase tracking-wider text-octane-gold font-semibold mb-2">{t('Histórico de Alterações', 'Change History')}</p>
      {history.map((h, idx) => {
        let changes = [];
        try { changes = h.changes ? JSON.parse(h.changes) : []; } catch { changes = []; }
        const isLatest = idx === 0;
        return (
          <div key={h.id} className={`border rounded-lg p-3 ${isLatest ? 'border-octane-gold/40 bg-octane-gold/5' : 'border-octane-border bg-octane-dark/40'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.action === 'created' ? 'bg-octane-green/15 text-octane-green' : 'bg-blue-500/15 text-blue-400'}`}>
                  {h.action === 'created' ? t('Registo', 'Created') : t('Alteração', 'Change')}
                </span>
                {isLatest && <span className="text-xs text-octane-gold font-medium">● {t('Atual (contabilizada)', 'Current (accounted)')}</span>}
              </div>
              <span className="text-xs text-octane-gray">
                {h.changed_by_name || t('Sistema', 'System')} · {fmtDateTime(h.created_at)}
              </span>
            </div>
            {Array.isArray(changes) && changes.length > 0 && typeof changes[0] === 'object' ? (
              <ul className="mt-2 space-y-1">
                {changes.map((c, i) => (
                  <li key={i} className="text-xs text-octane-gray">
                    <span className="text-octane-white font-medium">{c.label}:</span>{' '}
                    {c.from !== undefined ? (
                      <>
                        <span className="text-octane-red/80 line-through">{c.from}</span>
                        {' → '}
                        <span className="text-octane-green">{c.to}</span>
                      </>
                    ) : (
                      <span className="text-octane-green">{c.to}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-octane-gray mt-1">{h.changes || 'Viatura registada'}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VehiclesPage() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const router = useRouter();
  const { t } = useLang();
  const statusLabels = { em_stock: t('Em Stock', 'In Stock'), vendido: t('Vendido', 'Sold'), reservado: t('Reservado', 'Reserved') };

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(setUser).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) {
      const url = filter ? `/api/vehicles?status=${filter}` : '/api/vehicles';
      fetch(url).then(r => r.json()).then(setVehicles);
    }
  }, [user, filter]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">{t('Viaturas', 'Vehicles')}</h1>
        <VehiclesTabs userRole={user.role} />
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex gap-3">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-octane-card border border-octane-border rounded-lg px-3 py-2 text-sm text-octane-white">
              <option value="">{t('Todos', 'All')}</option>
              <option value="em_stock">{t('Em Stock', 'In Stock')}</option>
              <option value="vendido">{t('Vendido', 'Sold')}</option>
              <option value="reservado">{t('Reservado', 'Reserved')}</option>
            </select>
            <button onClick={() => router.push('/vehicles/new')}
              className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">
              {t('+ Nova Viatura', '+ New Vehicle')}
            </button>
          </div>
        </div>

        <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-octane-border">
                {['', t('Marca', 'Make'), t('Modelo', 'Model'), t('Ano', 'Year'), t('Matrícula', 'Plate'), t('Preço Compra', 'Purchase Price'), t('Preço Venda', 'Sale Price'), t('Custos', 'Costs'), t('Estado', 'Status'), t('Comercial', 'Salesperson'), ''].map((h, i) => (
                  <th key={i} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <React.Fragment key={v.id}>
                  <tr className="border-t border-octane-border hover:bg-octane-dark/50 transition-colors">
                    <td className="p-3">
                      <button
                        onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                        className="text-octane-gray hover:text-octane-gold w-6 h-6 flex items-center justify-center rounded transition-colors"
                        title={t('Ver histórico', 'View history')}>
                        <span className={`inline-block transition-transform ${expanded === v.id ? 'rotate-90' : ''}`}>▸</span>
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-octane-white cursor-pointer" onClick={() => router.push(`/vehicles/${v.id}`)}>{v.brand}</td>
                    <td className="p-3 text-octane-white cursor-pointer" onClick={() => router.push(`/vehicles/${v.id}`)}>{v.model}</td>
                    <td className="p-3 text-octane-gray">{v.year}</td>
                    <td className="p-3 text-octane-gray">{v.license_plate || '-'}</td>
                    <td className="p-3 text-octane-white">€{v.purchase_price?.toLocaleString()}</td>
                    <td className="p-3 text-octane-gold">{v.sale_price ? `€${v.sale_price.toLocaleString()}` : '-'}</td>
                    <td className="p-3 text-octane-orange">€{v.total_costs?.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[v.status]}`}>
                        {statusLabels[v.status]}
                      </span>
                    </td>
                    <td className="p-3 text-octane-gray">{v.created_by_name}</td>
                    <td className="p-3">
                      <button onClick={() => router.push(`/vehicles/${v.id}?edit=1&from=stock`)}
                        className="text-xs px-2.5 py-1 rounded border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors">
                        {t('Editar', 'Edit')}
                      </button>
                    </td>
                  </tr>
                  {expanded === v.id && (
                    <tr className="border-t border-octane-border/50 bg-octane-dark/20">
                      <td colSpan={11}>
                        <HistoryPanel vehicleId={v.id} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {vehicles.length === 0 && (
                <tr><td colSpan={11} className="p-8 text-center text-octane-gray">{t('Nenhuma viatura encontrada', 'No vehicles found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

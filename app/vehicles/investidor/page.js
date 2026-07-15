'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VehiclesTabs from '@/components/VehiclesTabs';
import DateInput from '@/components/DateInput';
import { useLang } from '@/lib/LanguageContext';

const costTypeLabels = { manutencao: 'Manutenção', revisao: 'Revisão', outro: 'Outro' };
const inputClass = "w-full bg-octane-dark border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";
const labelClass = "block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2";

export default function InvestorVehiclesPage() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [filterInvestor, setFilterInvestor] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [vehicleDetail, setVehicleDetail] = useState({});
  const [showCostForm, setShowCostForm] = useState(null);
  const [newCost, setNewCost] = useState({ type: 'manutencao', amount: '', description: '', date: '' });
  const [form, setForm] = useState({ brand: '', model: '', year: new Date().getFullYear(), license_plate: '', vin: '', color: '', mileage: '', fuel_type: 'Gasolina', notes: '', investor_id: '' });
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial') { router.push('/vehicles'); return; }
      setUser(u);
      fetch('/api/investors').then(r => r.json()).then(setInvestors);
    }).catch(() => router.push('/login'));
  }, [router]);

  function loadVehicles() {
    const params = new URLSearchParams({ has_investor: '1' });
    fetch(`/api/vehicles?${params}`).then(r => r.json()).then(data => {
      const filtered = filterInvestor
        ? data.filter(v => String(v.investor_id) === filterInvestor)
        : data;
      setVehicles(filtered);
    });
  }

  useEffect(() => { if (user) loadVehicles(); }, [user, filterInvestor]);

  async function loadDetail(id) {
    const res = await fetch(`/api/vehicles/${id}`);
    const data = await res.json();
    setVehicleDetail(prev => ({ ...prev, [id]: data }));
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!vehicleDetail[id]) loadDetail(id);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, vehicle_type: 'investidor',
        year: parseInt(form.year),
        mileage: form.mileage ? parseInt(form.mileage) : null,
        investor_id: form.investor_id ? parseInt(form.investor_id) : null,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ brand: '', model: '', year: new Date().getFullYear(), license_plate: '', vin: '', color: '', mileage: '', fuel_type: 'Gasolina', notes: '', investor_id: '' });
      loadVehicles();
    } else {
      setError((await res.json()).error);
    }
  }

  async function addCost(vehicleId) {
    if (!newCost.amount) return;
    const detail = vehicleDetail[vehicleId];
    await fetch(`/api/vehicles/${vehicleId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...detail, new_cost: { ...newCost, amount: parseFloat(newCost.amount) } }),
    });
    setNewCost({ type: 'manutencao', amount: '', description: '', date: '' });
    setShowCostForm(null);
    loadDetail(vehicleId);
    loadVehicles();
  }

  async function handleDelete(v) {
    if (!confirm(t(`Apagar a viatura ${v.brand} ${v.model}? Esta ação não pode ser revertida.`, `Delete the vehicle ${v.brand} ${v.model}? This action cannot be undone.`))) return;
    const res = await fetch(`/api/vehicles/${v.id}`, { method: 'DELETE' });
    if (res.ok) {
      if (expanded === v.id) setExpanded(null);
      loadVehicles();
    } else {
      alert((await res.json()).error);
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">{t('Viaturas','Vehicles')}</h1>
        <VehiclesTabs userRole={user.role} />

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <select value={filterInvestor} onChange={e => setFilterInvestor(e.target.value)}
              className="bg-octane-card border border-octane-border rounded-lg px-3 py-2 text-sm text-octane-white">
              <option value="">{t('Todos os investidores','All investors')}</option>
              {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">
            {showForm ? t('Cancelar','Cancel') : t('+ Nova Viatura de Investidor','+ New Investor Vehicle')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-octane-card border border-octane-border p-6 rounded-xl mb-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-octane-gold/15 text-octane-gold border border-octane-gold/30 text-xs px-2 py-1 rounded-full font-medium">{t('Viatura de Investidor','Investor Vehicle')}</span>
              <span className="text-octane-gray text-xs">{t('Não entra no stock Octane','Not part of Octane stock')}</span>
            </div>
            {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className={labelClass}>{t('Investidor','Investor')} *</label>
                <select value={form.investor_id} onChange={e => set('investor_id', e.target.value)} required className={inputClass}>
                  <option value="">{t('Selecionar investidor','Select investor')}</option>
                  {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                </select>
              </div>
              {[
                { k: 'brand', l: t('Marca','Make'), required: true },
                { k: 'model', l: t('Modelo','Model'), required: true },
                { k: 'year', l: t('Ano','Year'), type: 'number', required: true },
                { k: 'license_plate', l: t('Matrícula','Plate') },
                { k: 'vin', l: 'VIN' },
                { k: 'color', l: t('Cor','Colour') },
                { k: 'mileage', l: t('Quilometragem','Mileage'), type: 'number' },
              ].map(f => (
                <div key={f.k}>
                  <label className={labelClass}>{f.l}</label>
                  <input type={f.type || 'text'} value={form[f.k]} onChange={e => set(f.k, e.target.value)}
                    required={f.required} className={inputClass} />
                </div>
              ))}
              <div>
                <label className={labelClass}>{t('Combustível','Fuel')}</label>
                <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={inputClass}>
                  {['Gasolina', 'Gasóleo', 'Híbrido', 'Elétrico', 'GPL'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('Observações','Notes')}</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputClass} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light font-semibold transition-colors">{t('Guardar','Save')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-octane-border text-octane-gray hover:text-octane-white px-6 py-2.5 rounded-lg transition-colors">{t('Cancelar','Cancel')}</button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {vehicles.length === 0 && (
            <div className="bg-octane-card border border-octane-border rounded-xl p-8 text-center text-octane-gray">
              {t('Nenhuma viatura com investidor atribuído.','No vehicles with an investor assigned.')}
            </div>
          )}
          {vehicles.map(v => (
            <div key={v.id} className="bg-octane-card border border-octane-border rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-octane-dark/50 transition-colors"
                onClick={() => toggleExpand(v.id)}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <span className="font-semibold text-octane-white">{v.brand} {v.model}</span>
                    <span className="text-octane-gray ml-2">({v.year})</span>
                    {v.license_plate && <span className="text-octane-gray text-sm ml-2">· {v.license_plate}</span>}
                  </div>
                  <span className="bg-octane-gold/15 text-octane-gold border border-octane-gold/30 text-xs px-2 py-0.5 rounded-full">{v.investor_name}</span>
                  {v.vehicle_type === 'stock' ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green border-octane-green/30' :
                      v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold border-octane-gold/30' :
                      'bg-octane-gray/10 text-octane-gray border-octane-gray/30'
                    }`}>
                      {t('Stock','Stock')} · {v.status === 'em_stock' ? t('Em Stock','In Stock') : v.status === 'vendido' ? t('Vendido','Sold') : t('Reservado','Reserved')}
                    </span>
                  ) : (
                    <span className="bg-octane-orange/10 text-octane-orange border border-octane-orange/30 text-xs px-2 py-0.5 rounded-full">{t('Viatura Pessoal','Personal Vehicle')}</span>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm">
                  {v.vehicle_type === 'stock' && (
                    <div className="text-right">
                      <p className="text-octane-gray text-xs">Compra</p>
                      <p className="text-octane-white font-semibold">€{(v.purchase_price || 0).toLocaleString()}</p>
                    </div>
                  )}
                  {v.vehicle_type === 'stock' && v.sale_price && (
                    <div className="text-right">
                      <p className="text-octane-gray text-xs">{t('Venda','Sale')}</p>
                      <p className="text-octane-gold font-semibold">€{v.sale_price.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-octane-gray text-xs">{t('Custos','Costs')}</p>
                    <p className="text-octane-orange font-semibold">€{v.total_costs.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => router.push(`/vehicles/${v.id}`)}
                      className="text-xs px-2.5 py-1 rounded border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors">
                      {t('Editar','Edit')}
                    </button>
                    <button onClick={() => handleDelete(v)}
                      className="text-xs px-2.5 py-1 rounded border border-octane-red/40 text-octane-red hover:bg-octane-red/10 transition-colors">
                      {t('Apagar','Delete')}
                    </button>
                  </div>
                  <span className="text-octane-gray">{expanded === v.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === v.id && vehicleDetail[v.id] && (
                <div className="border-t border-octane-border p-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs text-octane-gray uppercase tracking-wider mb-3">{t('Dados da Viatura','Vehicle Details')}</h3>
                      <dl className="space-y-2 text-sm">
                        {[
                          ['VIN', v.vin], [t('Cor','Colour'), v.color],
                          [t('Quilometragem','Mileage'), v.mileage ? `${v.mileage.toLocaleString()} km` : null],
                          [t('Combustível','Fuel'), v.fuel_type], [t('Registado por','Registered by'), v.created_by_name],
                          ...(v.vehicle_type === 'stock' ? [
                            [t('Preço Compra','Purchase Price'), `€${(v.purchase_price || 0).toLocaleString()}`],
                            ...(v.sale_price ? [[t('Preço Venda','Sale Price'), `€${v.sale_price.toLocaleString()}`]] : []),
                          ] : []),
                          [t('Observações','Notes'), v.notes],
                        ].filter(([, val]) => val).map(([l, val]) => (
                          <div key={l} className="flex justify-between border-b border-octane-border/30 pb-1">
                            <dt className="text-octane-gray">{l}</dt>
                            <dd className="text-octane-white font-medium">{val}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs text-octane-gray uppercase tracking-wider">{t('Despesas','Expenses')}</h3>
                        <button onClick={() => setShowCostForm(showCostForm === v.id ? null : v.id)}
                          className="text-octane-gold text-sm hover:text-octane-gold-light transition-colors">
                          {t('+ Adicionar Despesa','+ Add Expense')}
                        </button>
                      </div>

                      {showCostForm === v.id && (
                        <div className="bg-octane-dark border border-octane-border p-3 rounded-lg mb-3 space-y-2">
                          <select value={newCost.type} onChange={e => setNewCost(c => ({ ...c, type: e.target.value }))}
                            className="w-full bg-octane-card border border-octane-border rounded px-3 py-2 text-sm text-octane-white">
                            <option value="manutencao">{t('Manutenção','Maintenance')}</option>
                            <option value="revisao">{t('Revisão','Service')}</option>
                            <option value="outro">{t('Outro','Other')}</option>
                          </select>
                          <input type="number" step="0.01" placeholder={t('Valor (€)','Amount (€)')} value={newCost.amount}
                            onChange={e => setNewCost(c => ({ ...c, amount: e.target.value }))}
                            className="w-full bg-octane-card border border-octane-border rounded px-3 py-2 text-sm text-octane-white" />
                          <div>
                            <label className="block text-xs text-octane-gray mb-1">{t('Data','Date')}</label>
                            <DateInput value={newCost.date} onChange={val => setNewCost(c => ({ ...c, date: val }))}
                              className="w-full bg-octane-card border border-octane-border rounded px-3 py-2 text-sm text-octane-white" />
                          </div>
                          <textarea placeholder={t('Descrição / Observações','Description / Notes')} value={newCost.description}
                            onChange={e => setNewCost(c => ({ ...c, description: e.target.value }))}
                            className="w-full bg-octane-card border border-octane-border rounded px-3 py-2 text-sm text-octane-white" rows={2} />
                          <div className="flex gap-2">
                            <button onClick={() => addCost(v.id)}
                              className="bg-octane-gold text-octane-black px-4 py-1.5 rounded text-sm font-semibold hover:bg-octane-gold-light transition-colors">
                              {t('Guardar','Save')}
                            </button>
                            <button onClick={() => setShowCostForm(null)}
                              className="border border-octane-border text-octane-gray px-4 py-1.5 rounded text-sm hover:text-octane-white transition-colors">
                              {t('Cancelar','Cancel')}
                            </button>
                          </div>
                        </div>
                      )}

                      {vehicleDetail[v.id].costs?.length > 0 ? (
                        <div className="space-y-2">
                          {vehicleDetail[v.id].costs.map(c => (
                            <div key={c.id} className="border-b border-octane-border/30 pb-2 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium text-octane-white">{t(costTypeLabels[c.type], { manutencao:'Maintenance', revisao:'Service', outro:'Other' }[c.type])}</span>
                                <span className="font-medium text-octane-orange">€{c.amount.toLocaleString()}</span>
                              </div>
                              {c.description && <p className="text-octane-gray text-xs mt-0.5">{c.description}</p>}
                              <p className="text-octane-gray/50 text-xs">{new Date(c.date).toLocaleDateString('pt-PT')}</p>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold text-sm pt-1">
                            <span className="text-octane-gray">Total</span>
                            <span className="text-octane-orange">€{vehicleDetail[v.id].total_costs.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-octane-gray text-sm">Sem despesas registadas</p>
                      )}
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

'use client';
import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DateInput from '@/components/DateInput';
import { useLang } from '@/lib/LanguageContext';

const costTypeLabels = { manutencao: 'Manutenção', revisao: 'Revisão', outro: 'Outro' };
const inputClass = "w-full bg-octane-card border border-octane-border rounded px-3 py-2 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:outline-none";

export default function VehicleDetailPage({ params }) {
  const { id } = use(params);
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [investors, setInvestors] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newCost, setNewCost] = useState({ type: 'manutencao', amount: '', description: '', date: '' });
  const [showCostForm, setShowCostForm] = useState(false);
  const [editingCost, setEditingCost] = useState(null); // { id, type, amount, description, date }
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      setUser(u);
      if (u.role !== 'comercial') {
        fetch('/api/investors').then(r => r.json()).then(setInvestors);
        fetch('/api/users').then(r => r.json()).then(users => {
          setTeamMembers(users.filter(m => m.role === 'comercial' || m.id === u.id));
        });
      }
    }).catch(() => router.push('/login'));
  }, [router]);

  function loadVehicle() {
    fetch(`/api/vehicles/${id}`).then(r => r.json()).then(v => { setVehicle(v); setForm(v); });
  }

  useEffect(() => { if (user) loadVehicle(); }, [user, id]);

  // Open directly in edit mode when arriving with ?edit=1
  useEffect(() => {
    if (vehicle && searchParams.get('edit') === '1') setEditing(true);
  }, [vehicle, searchParams]);

  async function handleSave() {
    await fetch(`/api/vehicles/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: parseInt(form.year), mileage: form.mileage ? parseInt(form.mileage) : null,
        purchase_price: parseFloat(form.purchase_price), sale_price: form.sale_price ? parseFloat(form.sale_price) : null }),
    });
    setEditing(false);
    // Return to the list the user came from (investor vehicles or stock)
    const from = searchParams.get('from');
    if (from === 'investidor') { router.push('/vehicles/investidor'); return; }
    if (from === 'stock') { router.push('/vehicles'); return; }
    loadVehicle();
  }

  async function addCost() {
    if (!newCost.amount) return;
    await fetch(`/api/vehicles/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vehicle, new_cost: { ...newCost, amount: parseFloat(newCost.amount) } }),
    });
    setNewCost({ type: 'manutencao', amount: '', description: '', date: '' });
    setShowCostForm(false);
    loadVehicle();
  }

  async function saveCostEdit() {
    if (!editingCost) return;
    await fetch(`/api/vehicles/${id}/costs/${editingCost.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: editingCost.type,
        amount: parseFloat(editingCost.amount),
        description: editingCost.description,
        date: editingCost.date,
      }),
    });
    setEditingCost(null);
    loadVehicle();
  }

  async function deleteCost(costId) {
    if (!confirm(t('Apagar este custo?', 'Delete this cost?'))) return;
    await fetch(`/api/vehicles/${id}/costs/${costId}`, { method: 'DELETE' });
    setEditingCost(null);
    loadVehicle();
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!user || !vehicle) return null;

  const totalCost = vehicle.purchase_price + vehicle.total_costs;
  const margin = vehicle.sale_price ? vehicle.sale_price - totalCost : null;
  const marginPercent = margin !== null && totalCost > 0 ? (margin / totalCost * 100) : null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-wide">{vehicle.brand} {vehicle.model} <span className="text-octane-gray">({vehicle.year})</span></h1>
          <div className="flex gap-2">
            {!editing && <button onClick={() => setEditing(true)} className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors">{t('Editar', 'Edit')}</button>}
            {user.role !== 'comercial' && (
              <button onClick={async () => { await fetch(`/api/vehicles/${id}`, { method: 'DELETE' }); router.push('/vehicles'); }}
                className="border border-octane-red text-octane-red px-4 py-2 rounded-lg text-sm hover:bg-octane-red hover:text-white transition-colors">{t('Eliminar', 'Delete')}</button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-octane-card border border-octane-border p-6 rounded-xl">
            <h2 className="font-semibold mb-4 text-octane-gold text-sm uppercase tracking-wider">{t('Dados da Viatura', 'Vehicle Details')}</h2>
            {editing ? (
              <div className="space-y-3">
                {[
                  { k: 'brand', l: t('Marca', 'Make') }, { k: 'model', l: t('Modelo', 'Model') },
                  { k: 'year', l: t('Ano', 'Year'), type: 'number' }, { k: 'license_plate', l: t('Matrícula', 'Plate') },
                  { k: 'vin', l: 'VIN' }, { k: 'color', l: t('Cor', 'Colour') },
                  { k: 'mileage', l: t('Quilometragem', 'Mileage'), type: 'number' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="text-xs text-octane-gray uppercase tracking-wider">{f.l}</label>
                    <input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)}
                      className={inputClass} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Combustível', 'Fuel')}</label>
                  <select value={form.fuel_type || ''} onChange={e => set('fuel_type', e.target.value)} className={inputClass}>
                    {['Gasolina', 'Gasóleo', 'Híbrido', 'Elétrico', 'GPL'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Estado', 'Status')}</label>
                  <select value={form.status || ''} onChange={e => set('status', e.target.value)} className={inputClass}>
                    <option value="em_stock">{t('Em Stock', 'In Stock')}</option>
                    <option value="vendido">{t('Vendido', 'Sold')}</option>
                    <option value="reservado">{t('Reservado', 'Reserved')}</option>
                  </select>
                </div>
                {user.role !== 'comercial' && (
                  <>
                    <div>
                      <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Tipo de Viatura', 'Vehicle Type')}</label>
                      <select value={form.vehicle_type || 'stock'} onChange={e => set('vehicle_type', e.target.value)} className={inputClass}>
                        <option value="stock">{t('Stock', 'Stock')}</option>
                        <option value="investidor">{t('Viatura de Investidor', 'Investor Vehicle')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Responsável', 'Assigned to')}</label>
                      <select value={form.created_by || ''} onChange={e => set('created_by', e.target.value ? parseInt(e.target.value) : null)} className={inputClass}>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}{m.id === user.id ? t(' (eu)', ' (me)') : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Investidor', 'Investor')}</label>
                      <select value={form.investor_id || ''} onChange={e => set('investor_id', e.target.value ? parseInt(e.target.value) : null)} className={inputClass}>
                        <option value="">{t('Sem investidor', 'No investor')}</option>
                        {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Observações', 'Notes')}</label>
                  <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                    className={inputClass} rows={2} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} className="bg-octane-gold text-octane-black px-4 py-2 rounded text-sm font-semibold hover:bg-octane-gold-light transition-colors">{t('Guardar', 'Save')}</button>
                  <button onClick={() => { setEditing(false); setForm(vehicle); }} className="border border-octane-border text-octane-gray px-4 py-2 rounded text-sm hover:text-octane-white transition-colors">{t('Cancelar', 'Cancel')}</button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  [t('Matrícula', 'Plate'), vehicle.license_plate], ['VIN', vehicle.vin], [t('Cor', 'Colour'), vehicle.color],
                  [t('Quilometragem', 'Mileage'), vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : null],
                  [t('Combustível', 'Fuel'), vehicle.fuel_type], [t('Estado', 'Status'), vehicle.status === 'em_stock' ? t('Em Stock', 'In Stock') : vehicle.status === 'vendido' ? t('Vendido', 'Sold') : t('Reservado', 'Reserved')],
                  [t('Comercial', 'Salesperson'), vehicle.created_by_name],
                  ...(user.role !== 'comercial' ? [[t('Investidor', 'Investor'), vehicle.investor_name || t('Sem investidor', 'No investor')]] : []),
                  [t('Observações', 'Notes'), vehicle.notes],
                ].map(([l, v]) => v && (
                  <div key={l} className="flex justify-between border-b border-octane-border/50 pb-2">
                    <dt className="text-octane-gray">{l}</dt>
                    <dd className="font-medium text-octane-white">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-octane-card border border-octane-border p-6 rounded-xl">
              <h2 className="font-semibold mb-4 text-octane-gold text-sm uppercase tracking-wider">{t('Financeiro', 'Financials')}</h2>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Preço Compra (€)', 'Purchase Price (€)')}</label>
                    <input type="number" step="0.01" value={form.purchase_price || ''} onChange={e => set('purchase_price', e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-octane-gray uppercase tracking-wider">{t('Preço Venda (€)', 'Sale Price (€)')}</label>
                    <input type="number" step="0.01" value={form.sale_price || ''} onChange={e => set('sale_price', e.target.value)}
                      className={inputClass} />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-octane-border/50 pb-2">
                    <dt className="text-octane-gray">{t('Preço Compra', 'Purchase Price')}</dt>
                    <dd className="font-medium text-octane-white">€{vehicle.purchase_price?.toLocaleString()}</dd>
                  </div>
                  {vehicle.sale_price && (
                    <div className="flex justify-between border-b border-octane-border/50 pb-2">
                      <dt className="text-octane-gray">{t('Preço Venda', 'Sale Price')}</dt>
                      <dd className="font-medium text-octane-gold">€{vehicle.sale_price?.toLocaleString()}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-octane-border/50 pb-2">
                    <dt className="text-octane-gray">{t('Total Custos', 'Total Costs')}</dt>
                    <dd className="font-medium text-octane-orange">€{vehicle.total_costs?.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between border-b border-octane-border/50 pb-2">
                    <dt className="text-octane-gray">{t('Custo Total', 'Total Cost')}</dt>
                    <dd className="font-bold text-octane-white">€{totalCost.toLocaleString()}</dd>
                  </div>
                  {margin !== null && (
                    <>
                      <div className="flex justify-between border-b border-octane-border/50 pb-2">
                        <dt className="text-octane-gray">{t('Margem (€)', 'Margin (€)')}</dt>
                        <dd className={`font-bold ${margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>€{margin.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-octane-gray">{t('Margem (%)', 'Margin (%)')}</dt>
                        <dd className={`font-bold ${marginPercent >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{marginPercent.toFixed(1)}%</dd>
                      </div>
                    </>
                  )}
                </dl>
              )}
            </div>

            <div className="bg-octane-card border border-octane-border p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-octane-gold text-sm uppercase tracking-wider">{t('Custos', 'Costs')}</h2>
                <button onClick={() => setShowCostForm(true)} className="text-octane-gold text-sm hover:text-octane-gold-light transition-colors">{t('+ Adicionar', '+ Add')}</button>
              </div>
              {showCostForm && (
                <div className="bg-octane-dark border border-octane-border p-4 rounded-lg mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newCost.type} onChange={e => setNewCost(c => ({ ...c, type: e.target.value }))} className={inputClass}>
                      <option value="manutencao">{t('Manutenção', 'Maintenance')}</option>
                      <option value="revisao">{t('Revisão', 'Service')}</option>
                      <option value="outro">{t('Outro', 'Other')}</option>
                    </select>
                    <input type="number" step="0.01" placeholder={t('Valor (€)', 'Amount (€)')} value={newCost.amount}
                      onChange={e => setNewCost(c => ({ ...c, amount: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-octane-gray mb-1">{t('Data', 'Date')}</label>
                    <DateInput value={newCost.date} onChange={v => setNewCost(c => ({ ...c, date: v }))} className={inputClass} />
                  </div>
                  <textarea placeholder={t('Descrição / Observações', 'Description / Notes')} value={newCost.description}
                    onChange={e => setNewCost(c => ({ ...c, description: e.target.value }))}
                    className={inputClass} rows={2} />
                  <div className="flex gap-2">
                    <button onClick={addCost} className="bg-octane-gold text-octane-black px-4 py-2 rounded text-sm font-semibold hover:bg-octane-gold-light transition-colors">{t('Adicionar', 'Add')}</button>
                    <button onClick={() => setShowCostForm(false)} className="border border-octane-border text-octane-gray px-4 py-2 rounded text-sm hover:text-octane-white transition-colors">{t('Cancelar', 'Cancel')}</button>
                  </div>
                </div>
              )}
              {vehicle.costs?.length > 0 ? (
                <div className="space-y-3">
                  {vehicle.costs.map(c => (
                    <div key={c.id} className="border-b border-octane-border/50 pb-3 text-sm">
                      {editingCost && editingCost.id === c.id ? (
                        <div className="space-y-2 bg-octane-dark border border-octane-border p-3 rounded-lg">
                          <div className="grid grid-cols-2 gap-2">
                            <select value={editingCost.type} onChange={e => setEditingCost(ec => ({ ...ec, type: e.target.value }))} className={inputClass}>
                              <option value="manutencao">{t('Manutenção', 'Maintenance')}</option>
                              <option value="revisao">{t('Revisão', 'Service')}</option>
                              <option value="outro">{t('Outro', 'Other')}</option>
                            </select>
                            <input type="number" step="0.01" value={editingCost.amount}
                              onChange={e => setEditingCost(ec => ({ ...ec, amount: e.target.value }))} className={inputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-octane-gray mb-1">{t('Data', 'Date')}</label>
                            <DateInput value={(editingCost.date || '').split('T')[0]} onChange={v => setEditingCost(ec => ({ ...ec, date: v }))} className={inputClass} />
                          </div>
                          <textarea value={editingCost.description || ''} onChange={e => setEditingCost(ec => ({ ...ec, description: e.target.value }))}
                            placeholder={t('Descrição / Observações', 'Description / Notes')} className={inputClass} rows={2} />
                          <div className="flex gap-2">
                            <button onClick={saveCostEdit} className="bg-octane-gold text-octane-black px-3 py-1.5 rounded text-xs font-semibold hover:bg-octane-gold-light transition-colors">{t('Guardar', 'Save')}</button>
                            <button onClick={() => setEditingCost(null)} className="border border-octane-border text-octane-gray px-3 py-1.5 rounded text-xs hover:text-octane-white transition-colors">{t('Cancelar', 'Cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-octane-white">{t(costTypeLabels[c.type], { manutencao: 'Maintenance', revisao: 'Service', outro: 'Other' }[c.type])}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-octane-gold">€{c.amount.toLocaleString()}</span>
                              <button onClick={() => setEditingCost({ id: c.id, type: c.type, amount: c.amount, description: c.description || '', date: c.date })}
                                className="text-octane-gray hover:text-octane-gold text-xs" title={t('Editar', 'Edit')}>✎</button>
                              <button onClick={() => deleteCost(c.id)}
                                className="text-octane-gray hover:text-octane-red text-xs" title={t('Apagar', 'Delete')}>✕</button>
                            </div>
                          </div>
                          {c.description && <p className="text-octane-gray text-xs mt-1">{c.description}</p>}
                          <p className="text-octane-gray/50 text-xs mt-1">{new Date(c.date).toLocaleDateString('pt-PT')}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="text-octane-gray text-sm">{t('Sem custos registados', 'No costs recorded')}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

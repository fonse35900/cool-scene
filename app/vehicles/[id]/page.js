'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DateInput from '@/components/DateInput';

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
  const router = useRouter();

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

  async function handleSave() {
    await fetch(`/api/vehicles/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: parseInt(form.year), mileage: form.mileage ? parseInt(form.mileage) : null,
        purchase_price: parseFloat(form.purchase_price), sale_price: form.sale_price ? parseFloat(form.sale_price) : null }),
    });
    setEditing(false);
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
            {!editing && <button onClick={() => setEditing(true)} className="bg-octane-gold text-octane-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-octane-gold-light transition-colors">Editar</button>}
            {user.role !== 'comercial' && (
              <button onClick={async () => { await fetch(`/api/vehicles/${id}`, { method: 'DELETE' }); router.push('/vehicles'); }}
                className="border border-octane-red text-octane-red px-4 py-2 rounded-lg text-sm hover:bg-octane-red hover:text-white transition-colors">Eliminar</button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-octane-card border border-octane-border p-6 rounded-xl">
            <h2 className="font-semibold mb-4 text-octane-gold text-sm uppercase tracking-wider">Dados da Viatura</h2>
            {editing ? (
              <div className="space-y-3">
                {[
                  { k: 'brand', l: 'Marca' }, { k: 'model', l: 'Modelo' },
                  { k: 'year', l: 'Ano', type: 'number' }, { k: 'license_plate', l: 'Matrícula' },
                  { k: 'vin', l: 'VIN' }, { k: 'color', l: 'Cor' },
                  { k: 'mileage', l: 'Quilometragem', type: 'number' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="text-xs text-octane-gray uppercase tracking-wider">{f.l}</label>
                    <input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)}
                      className={inputClass} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-octane-gray uppercase tracking-wider">Combustível</label>
                  <select value={form.fuel_type || ''} onChange={e => set('fuel_type', e.target.value)} className={inputClass}>
                    {['Gasolina', 'Gasóleo', 'Híbrido', 'Elétrico', 'GPL'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-octane-gray uppercase tracking-wider">Estado</label>
                  <select value={form.status || ''} onChange={e => set('status', e.target.value)} className={inputClass}>
                    <option value="em_stock">Em Stock</option>
                    <option value="vendido">Vendido</option>
                    <option value="reservado">Reservado</option>
                  </select>
                </div>
                {user.role !== 'comercial' && (
                  <>
                    <div>
                      <label className="text-xs text-octane-gray uppercase tracking-wider">Responsável</label>
                      <select value={form.created_by || ''} onChange={e => set('created_by', e.target.value ? parseInt(e.target.value) : null)} className={inputClass}>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}{m.id === user.id ? ' (eu)' : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-octane-gray uppercase tracking-wider">Investidor</label>
                      <select value={form.investor_id || ''} onChange={e => set('investor_id', e.target.value ? parseInt(e.target.value) : null)} className={inputClass}>
                        <option value="">Sem investidor</option>
                        {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-xs text-octane-gray uppercase tracking-wider">Observações</label>
                  <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                    className={inputClass} rows={2} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} className="bg-octane-gold text-octane-black px-4 py-2 rounded text-sm font-semibold hover:bg-octane-gold-light transition-colors">Guardar</button>
                  <button onClick={() => { setEditing(false); setForm(vehicle); }} className="border border-octane-border text-octane-gray px-4 py-2 rounded text-sm hover:text-octane-white transition-colors">Cancelar</button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  ['Matrícula', vehicle.license_plate], ['VIN', vehicle.vin], ['Cor', vehicle.color],
                  ['Quilometragem', vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : null],
                  ['Combustível', vehicle.fuel_type], ['Estado', vehicle.status === 'em_stock' ? 'Em Stock' : vehicle.status === 'vendido' ? 'Vendido' : 'Reservado'],
                  ['Comercial', vehicle.created_by_name],
                  ...(user.role !== 'comercial' ? [['Investidor', vehicle.investor_name || 'Sem investidor']] : []),
                  ['Observações', vehicle.notes],
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
              <h2 className="font-semibold mb-4 text-octane-gold text-sm uppercase tracking-wider">Financeiro</h2>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-octane-gray uppercase tracking-wider">Preço Compra (€)</label>
                    <input type="number" step="0.01" value={form.purchase_price || ''} onChange={e => set('purchase_price', e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-octane-gray uppercase tracking-wider">Preço Venda (€)</label>
                    <input type="number" step="0.01" value={form.sale_price || ''} onChange={e => set('sale_price', e.target.value)}
                      className={inputClass} />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-octane-border/50 pb-2">
                    <dt className="text-octane-gray">Preço Compra</dt>
                    <dd className="font-medium text-octane-white">€{vehicle.purchase_price?.toLocaleString()}</dd>
                  </div>
                  {vehicle.sale_price && (
                    <div className="flex justify-between border-b border-octane-border/50 pb-2">
                      <dt className="text-octane-gray">Preço Venda</dt>
                      <dd className="font-medium text-octane-gold">€{vehicle.sale_price?.toLocaleString()}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-octane-border/50 pb-2">
                    <dt className="text-octane-gray">Total Custos</dt>
                    <dd className="font-medium text-octane-orange">€{vehicle.total_costs?.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between border-b border-octane-border/50 pb-2">
                    <dt className="text-octane-gray">Custo Total</dt>
                    <dd className="font-bold text-octane-white">€{totalCost.toLocaleString()}</dd>
                  </div>
                  {margin !== null && (
                    <>
                      <div className="flex justify-between border-b border-octane-border/50 pb-2">
                        <dt className="text-octane-gray">Margem (€)</dt>
                        <dd className={`font-bold ${margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>€{margin.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-octane-gray">Margem (%)</dt>
                        <dd className={`font-bold ${marginPercent >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{marginPercent.toFixed(1)}%</dd>
                      </div>
                    </>
                  )}
                </dl>
              )}
            </div>

            <div className="bg-octane-card border border-octane-border p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-octane-gold text-sm uppercase tracking-wider">Custos</h2>
                <button onClick={() => setShowCostForm(true)} className="text-octane-gold text-sm hover:text-octane-gold-light transition-colors">+ Adicionar</button>
              </div>
              {showCostForm && (
                <div className="bg-octane-dark border border-octane-border p-4 rounded-lg mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newCost.type} onChange={e => setNewCost(c => ({ ...c, type: e.target.value }))} className={inputClass}>
                      <option value="manutencao">Manutenção</option>
                      <option value="revisao">Revisão</option>
                      <option value="outro">Outro</option>
                    </select>
                    <input type="number" step="0.01" placeholder="Valor (€)" value={newCost.amount}
                      onChange={e => setNewCost(c => ({ ...c, amount: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-octane-gray mb-1">Data</label>
                    <DateInput value={newCost.date} onChange={v => setNewCost(c => ({ ...c, date: v }))} className={inputClass} />
                  </div>
                  <textarea placeholder="Descrição / Observações" value={newCost.description}
                    onChange={e => setNewCost(c => ({ ...c, description: e.target.value }))}
                    className={inputClass} rows={2} />
                  <div className="flex gap-2">
                    <button onClick={addCost} className="bg-octane-gold text-octane-black px-4 py-2 rounded text-sm font-semibold hover:bg-octane-gold-light transition-colors">Adicionar</button>
                    <button onClick={() => setShowCostForm(false)} className="border border-octane-border text-octane-gray px-4 py-2 rounded text-sm hover:text-octane-white transition-colors">Cancelar</button>
                  </div>
                </div>
              )}
              {vehicle.costs?.length > 0 ? (
                <div className="space-y-3">
                  {vehicle.costs.map(c => (
                    <div key={c.id} className="border-b border-octane-border/50 pb-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-octane-white">{costTypeLabels[c.type]}</span>
                        <span className="font-medium text-octane-gold">€{c.amount.toLocaleString()}</span>
                      </div>
                      {c.description && <p className="text-octane-gray text-xs mt-1">{c.description}</p>}
                      <p className="text-octane-gray/50 text-xs mt-1">{new Date(c.date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-octane-gray text-sm">Sem custos registados</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

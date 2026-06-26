'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const costTypeLabels = { manutencao: 'Manutenção', revisao: 'Revisão', outro: 'Outro' };

export default function VehicleDetailPage({ params }) {
  const { id } = use(params);
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [newCost, setNewCost] = useState({ type: 'manutencao', amount: '', description: '' });
  const [showCostForm, setShowCostForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(setUser).catch(() => router.push('/login'));
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
    setNewCost({ type: 'manutencao', amount: '', description: '' });
    setShowCostForm(false);
    loadVehicle();
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!user || !vehicle) return null;

  const totalCost = vehicle.purchase_price + vehicle.total_costs;
  const margin = vehicle.sale_price ? vehicle.sale_price - totalCost : null;
  const marginPercent = margin !== null && totalCost > 0 ? (margin / totalCost * 100) : null;

  return (
    <div>
      <Navbar user={user} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{vehicle.brand} {vehicle.model} ({vehicle.year})</h1>
          <div className="flex gap-2">
            {!editing && <button onClick={() => setEditing(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Editar</button>}
            {user.role !== 'comercial' && (
              <button onClick={async () => { await fetch(`/api/vehicles/${id}`, { method: 'DELETE' }); router.push('/vehicles'); }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">Eliminar</button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold mb-4">Dados da Viatura</h2>
            {editing ? (
              <div className="space-y-3">
                {[
                  { k: 'brand', l: 'Marca' }, { k: 'model', l: 'Modelo' },
                  { k: 'year', l: 'Ano', type: 'number' }, { k: 'license_plate', l: 'Matrícula' },
                  { k: 'vin', l: 'VIN' }, { k: 'color', l: 'Cor' },
                  { k: 'mileage', l: 'Quilometragem', type: 'number' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="text-xs text-gray-500">{f.l}</label>
                    <input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500">Combustível</label>
                  <select value={form.fuel_type || ''} onChange={e => set('fuel_type', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm">
                    {['Gasolina', 'Gasóleo', 'Híbrido', 'Elétrico', 'GPL'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Estado</label>
                  <select value={form.status || ''} onChange={e => set('status', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm">
                    <option value="em_stock">Em Stock</option>
                    <option value="vendido">Vendido</option>
                    <option value="reservado">Reservado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Observações</label>
                  <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm" rows={2} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded text-sm">Guardar</button>
                  <button onClick={() => { setEditing(false); setForm(vehicle); }} className="border px-4 py-1 rounded text-sm">Cancelar</button>
                </div>
              </div>
            ) : (
              <dl className="space-y-2 text-sm">
                {[
                  ['Matrícula', vehicle.license_plate], ['VIN', vehicle.vin], ['Cor', vehicle.color],
                  ['Quilometragem', vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : null],
                  ['Combustível', vehicle.fuel_type], ['Estado', vehicle.status === 'em_stock' ? 'Em Stock' : vehicle.status === 'vendido' ? 'Vendido' : 'Reservado'],
                  ['Comercial', vehicle.created_by_name], ['Observações', vehicle.notes],
                ].map(([l, v]) => v && (
                  <div key={l} className="flex justify-between">
                    <dt className="text-gray-500">{l}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold mb-4">Financeiro</h2>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Preço Compra (€)</label>
                    <input type="number" step="0.01" value={form.purchase_price || ''} onChange={e => set('purchase_price', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Preço Venda (€)</label>
                    <input type="number" step="0.01" value={form.sale_price || ''} onChange={e => set('sale_price', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                </div>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Preço Compra</dt>
                    <dd className="font-medium">€{vehicle.purchase_price?.toLocaleString()}</dd>
                  </div>
                  {vehicle.sale_price && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Preço Venda</dt>
                      <dd className="font-medium">€{vehicle.sale_price?.toLocaleString()}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Total Custos</dt>
                    <dd className="font-medium">€{vehicle.total_costs?.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <dt className="text-gray-500">Custo Total</dt>
                    <dd className="font-bold">€{totalCost.toLocaleString()}</dd>
                  </div>
                  {margin !== null && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Margem (€)</dt>
                        <dd className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>€{margin.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Margem (%)</dt>
                        <dd className={`font-bold ${marginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>{marginPercent.toFixed(1)}%</dd>
                      </div>
                    </>
                  )}
                </dl>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Custos</h2>
                <button onClick={() => setShowCostForm(true)} className="text-blue-600 text-sm hover:underline">+ Adicionar</button>
              </div>
              {showCostForm && (
                <div className="bg-gray-50 p-3 rounded mb-4 space-y-2">
                  <select value={newCost.type} onChange={e => setNewCost(c => ({ ...c, type: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-sm">
                    <option value="manutencao">Manutenção</option>
                    <option value="revisao">Revisão</option>
                    <option value="outro">Outro</option>
                  </select>
                  <input type="number" step="0.01" placeholder="Valor (€)" value={newCost.amount}
                    onChange={e => setNewCost(c => ({ ...c, amount: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-sm" />
                  <textarea placeholder="Descrição / Observações" value={newCost.description}
                    onChange={e => setNewCost(c => ({ ...c, description: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-sm" rows={2} />
                  <div className="flex gap-2">
                    <button onClick={addCost} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Adicionar</button>
                    <button onClick={() => setShowCostForm(false)} className="border px-3 py-1 rounded text-sm">Cancelar</button>
                  </div>
                </div>
              )}
              {vehicle.costs?.length > 0 ? (
                <div className="space-y-2">
                  {vehicle.costs.map(c => (
                    <div key={c.id} className="border-b pb-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{costTypeLabels[c.type]}</span>
                        <span className="font-medium">€{c.amount.toLocaleString()}</span>
                      </div>
                      {c.description && <p className="text-gray-500 text-xs mt-1">{c.description}</p>}
                      <p className="text-gray-400 text-xs">{new Date(c.date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">Sem custos registados</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

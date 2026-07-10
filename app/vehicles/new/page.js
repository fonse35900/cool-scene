'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";
const labelClass = "block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2";

export default function NewVehiclePage() {
  const [user, setUser] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [form, setForm] = useState({
    brand: '', model: '', year: new Date().getFullYear(), license_plate: '', vin: '',
    color: '', mileage: '', fuel_type: 'Gasolina', purchase_price: '', sale_price: '',
    notes: '', investor_id: '', assigned_to: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      setUser(u);
      if (u.role !== 'comercial') {
        fetch('/api/investors').then(r => r.json()).then(setInvestors);
        fetch('/api/users').then(r => r.json()).then(users => {
          const team = users.filter(m => m.role === 'comercial' || m.id === u.id);
          setTeamMembers(team);
          setForm(f => ({ ...f, assigned_to: String(u.id) }));
        });
      }
    }).catch(() => router.push('/login'));
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        year: parseInt(form.year),
        mileage: form.mileage ? parseInt(form.mileage) : null,
        purchase_price: parseFloat(form.purchase_price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        investor_id: form.investor_id ? parseInt(form.investor_id) : null,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
      }),
    });
    if (res.ok) router.push('/vehicles');
    else setError((await res.json()).error);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">Nova Viatura</h1>
        <form onSubmit={handleSubmit} className="bg-octane-card border border-octane-border p-6 rounded-xl space-y-5">
          {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: 'brand', l: 'Marca', required: true },
              { k: 'model', l: 'Modelo', required: true },
              { k: 'year', l: 'Ano', type: 'number', required: true },
              { k: 'license_plate', l: 'Matrícula' },
              { k: 'vin', l: 'VIN' },
              { k: 'color', l: 'Cor' },
              { k: 'mileage', l: 'Quilometragem', type: 'number' },
            ].map(f => (
              <div key={f.k}>
                <label className={labelClass}>{f.l}</label>
                <input type={f.type || 'text'} value={form[f.k]} onChange={e => set(f.k, e.target.value)}
                  required={f.required} className={inputClass} />
              </div>
            ))}
            <div>
              <label className={labelClass}>Combustível</label>
              <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={inputClass}>
                {['Gasolina', 'Gasóleo', 'Híbrido', 'Elétrico', 'GPL'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Preço de Compra (€) *</label>
              <input type="number" step="0.01" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)}
                required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Preço de Venda (€)</label>
              <input type="number" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)}
                className={inputClass} />
            </div>
            {user.role !== 'comercial' && (
              <>
                <div>
                  <label className={labelClass}>Atribuir a</label>
                  <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className={inputClass}>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}{m.id === user.id ? ' (eu)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Investidor</label>
                  <select value={form.investor_id} onChange={e => set('investor_id', e.target.value)} className={inputClass}>
                    <option value="">Sem investidor</option>
                    {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          <div>
            <label className={labelClass}>Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputClass} />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light font-semibold transition-colors">Guardar</button>
            <button type="button" onClick={() => router.back()} className="border border-octane-border text-octane-gray hover:text-octane-white px-6 py-2.5 rounded-lg transition-colors">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

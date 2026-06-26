'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NewVehiclePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    brand: '', model: '', year: new Date().getFullYear(), license_plate: '', vin: '',
    color: '', mileage: '', fuel_type: 'Gasolina', purchase_price: '', sale_price: '', notes: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(setUser).catch(() => router.push('/login'));
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: parseInt(form.year), mileage: form.mileage ? parseInt(form.mileage) : null,
        purchase_price: parseFloat(form.purchase_price), sale_price: form.sale_price ? parseFloat(form.sale_price) : null }),
    });
    if (res.ok) router.push('/vehicles');
    else setError((await res.json()).error);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (!user) return null;

  return (
    <div>
      <Navbar user={user} />
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Nova Viatura</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.l}</label>
                <input type={f.type || 'text'} value={form[f.k]} onChange={e => set(f.k, e.target.value)}
                  required={f.required} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Combustível</label>
              <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['Gasolina', 'Gasóleo', 'Híbrido', 'Elétrico', 'GPL'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Compra (€) *</label>
              <input type="number" step="0.01" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)}
                required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (€)</label>
              <input type="number" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Guardar</button>
            <button type="button" onClick={() => router.back()} className="border px-6 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

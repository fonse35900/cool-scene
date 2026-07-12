'use client';
import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const todayISO = () => new Date().toISOString().split('T')[0];
const nDaysAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const PRESETS = [
  { label: 'Último mês', from: () => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().split('T')[0]; }, to: () => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; } },
  { label: '3 meses', from: () => { const d = new Date(); d.setMonth(d.getMonth() - 3, 1); return d.toISOString().split('T')[0]; }, to: () => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; } },
  { label: '365 dias', from: () => nDaysAgo(365), to: todayISO },
  { label: 'Este ano', from: () => `${new Date().getFullYear()}-01-01`, to: todayISO },
];

function fmt(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-octane-dark border border-octane-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-octane-gold font-semibold mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="mb-1">
          {p.name}: <span className="font-semibold">
            {p.name === 'Margem Acum.' ? fmt(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardChart({ userRole }) {
  const [dateFrom, setDateFrom] = useState(nDaysAgo(90));
  const [dateTo, setDateTo] = useState(todayISO());
  const [activePreset, setActivePreset] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  function applyPreset(p) {
    setDateFrom(p.from());
    setDateTo(p.to());
    setActivePreset(p.label);
  }

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    fetch(`/api/reports/chart?${params}`)
      .then(r => r.json())
      .then(d => { setChartData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const inputClass = "bg-octane-dark border border-octane-border rounded px-3 py-1.5 text-sm text-octane-white focus:ring-1 focus:ring-octane-gold focus:outline-none";
  const todayBtnClass = "text-xs px-2 py-1.5 rounded border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors";

  return (
    <div className="bg-octane-card border border-octane-border rounded-xl p-6 mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <h2 className="font-semibold text-octane-gold text-sm uppercase tracking-wider">Evolução do Stock e Margens</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  activePreset === p.label
                    ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                    : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePreset(null); }} className={inputClass} />
            <button onClick={() => { setDateFrom(todayISO()); setActivePreset(null); }} className={todayBtnClass}>Hoje</button>
            <span className="text-octane-gray text-sm">→</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePreset(null); }} className={inputClass} />
            <button onClick={() => { setDateTo(todayISO()); setActivePreset(null); }} className={todayBtnClass}>Hoje</button>
          </div>
        </div>
      </div>

      {loading && <div className="h-72 flex items-center justify-center text-octane-gray text-sm">A carregar...</div>}

      {!loading && chartData && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#2a2a2a' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={36}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#b8952a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={v => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingTop: 12, color: '#9ca3af' }}
            />
            <Bar yAxisId="left" dataKey="inStock" name="Em Stock" fill="#4b5563" radius={[3, 3, 0, 0]} maxBarSize={40} />
            <Bar yAxisId="left" dataKey="sold" name="Vendidas" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={40} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativeMargin"
              name="Margem Acum."
              stroke="#d4a017"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#d4a017' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {!loading && chartData && chartData.length === 0 && (
        <div className="h-72 flex items-center justify-center text-octane-gray text-sm">
          Sem dados para o período selecionado.
        </div>
      )}
    </div>
  );
}

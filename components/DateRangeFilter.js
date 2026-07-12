'use client';

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function toISO(d) {
  return d.toISOString().split('T')[0];
}

const PRESETS = [
  {
    label: 'Último mês',
    range() {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: toISO(startOfMonth(first)), to: toISO(endOfMonth(first)) };
    },
  },
  {
    label: 'Últimos 3 meses',
    range() {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      return { from: toISO(startOfMonth(first)), to: toISO(lastMonthEnd) };
    },
  },
  {
    label: 'Últimos 365 dias',
    range() {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 365);
      return { from: toISO(from), to: toISO(now) };
    },
  },
];

export default function DateRangeFilter({ value, onChange }) {
  const { from, to, preset } = value;

  function applyPreset(p) {
    const r = p.range();
    onChange({ from: r.from, to: r.to, preset: p.label });
  }

  function clearFilter() {
    onChange({ from: '', to: '', preset: null });
  }

  const active = from || to;

  return (
    <div className="bg-octane-card border border-octane-border p-4 rounded-xl mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs text-octane-gray uppercase tracking-wider mb-2">Intervalo de datas</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={e => onChange({ from: e.target.value, to, preset: null })}
              className="bg-octane-dark border border-octane-border rounded px-3 py-1.5 text-sm text-octane-white focus:ring-1 focus:ring-octane-gold focus:outline-none"
            />
            <span className="text-octane-gray text-sm">até</span>
            <input
              type="date"
              value={to}
              onChange={e => onChange({ from, to: e.target.value, preset: null })}
              className="bg-octane-dark border border-octane-border rounded px-3 py-1.5 text-sm text-octane-white focus:ring-1 focus:ring-octane-gold focus:outline-none"
            />
            {active && (
              <button onClick={clearFilter}
                className="text-octane-red text-xs hover:bg-octane-red/10 px-2 py-1.5 rounded transition-colors">
                ✕ Limpar
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-octane-gray uppercase tracking-wider mb-2">Períodos rápidos</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  preset === p.label
                    ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                    : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {active && (
          <div className="text-xs text-octane-gold border border-octane-gold/30 bg-octane-gold/5 px-3 py-1.5 rounded-full">
            {from && to ? `${from} → ${to}` : from ? `a partir de ${from}` : `até ${to}`}
          </div>
        )}
      </div>
    </div>
  );
}

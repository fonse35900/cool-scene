'use client';

const fmt = n => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const pct = n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

export default function MargemDrilldown({ items, grossMargin, onClose }) {
  const total = {
    purchase: items.reduce((s, v) => s + v.purchase_price, 0),
    costs: items.reduce((s, v) => s + v.costs, 0),
    sales: items.reduce((s, v) => s + v.sale_price, 0),
    margin: items.reduce((s, v) => s + v.margin, 0),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-16 overflow-y-auto">
      <div className="bg-octane-card border border-octane-border rounded-2xl w-full max-w-5xl shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-octane-border">
          <div>
            <h2 className="font-bold text-octane-white text-lg">Composição da Margem Bruta</h2>
            <p className="text-xs text-octane-gray mt-0.5">{items.length} viaturas vendidas com preço de venda registado</p>
          </div>
          <button onClick={onClose} className="text-octane-gray hover:text-octane-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 border-b border-octane-border">
          {[
            { label: 'Total Compras', value: fmt(total.purchase), color: 'text-octane-white' },
            { label: 'Total Custos', value: fmt(total.costs), color: 'text-octane-white' },
            { label: 'Total Vendas', value: fmt(total.sales), color: 'text-octane-gold' },
            { label: 'Margem Bruta', value: fmt(total.margin), color: total.margin >= 0 ? 'text-octane-gold' : 'text-red-400' },
          ].map(t => (
            <div key={t.label} className="bg-octane-dark rounded-xl px-4 py-3">
              <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{t.label}</p>
              <p className={`text-lg font-bold ${t.color}`}>{t.value}</p>
            </div>
          ))}
        </div>

        {/* formula note */}
        <div className="px-6 py-2 border-b border-octane-border bg-octane-dark/40">
          <p className="text-xs text-octane-gray">
            Fórmula por viatura: <span className="text-octane-white font-mono">Margem = Venda − Compra − Custos</span>
          </p>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-octane-gray text-xs uppercase tracking-wider border-b border-octane-border">
                <th className="text-left px-6 py-3">Viatura</th>
                <th className="text-right px-4 py-3">Compra</th>
                <th className="text-right px-4 py-3">Custos</th>
                <th className="text-right px-4 py-3">Venda</th>
                <th className="text-right px-4 py-3">Margem</th>
                <th className="text-right px-4 py-3">%</th>
                <th className="text-left px-4 py-3">Responsável</th>
                <th className="text-left px-4 py-3">Investidor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v, i) => (
                <tr key={v.id} className={`border-b border-octane-border/50 hover:bg-octane-dark/60 transition-colors ${i % 2 === 0 ? '' : 'bg-octane-dark/20'}`}>
                  <td className="px-6 py-3 font-medium text-octane-white whitespace-nowrap">
                    {v.brand} {v.model}
                    {v.year && <span className="text-octane-gray text-xs ml-1">({v.year})</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-octane-gray">{fmt(v.purchase_price)}</td>
                  <td className="px-4 py-3 text-right text-octane-gray">{fmt(v.costs)}</td>
                  <td className="px-4 py-3 text-right text-octane-gold">{fmt(v.sale_price)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${v.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmt(v.margin)}
                  </td>
                  <td className={`px-4 py-3 text-right text-xs ${v.margin_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pct(v.margin_percent)}
                  </td>
                  <td className="px-4 py-3 text-octane-gray whitespace-nowrap">{v.created_by_name}</td>
                  <td className="px-4 py-3 text-octane-gray whitespace-nowrap">{v.investor_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-octane-border text-xs font-bold">
                <td className="px-6 py-3 text-octane-gray uppercase tracking-wider">Total ({items.length})</td>
                <td className="px-4 py-3 text-right text-octane-white">{fmt(total.purchase)}</td>
                <td className="px-4 py-3 text-right text-octane-white">{fmt(total.costs)}</td>
                <td className="px-4 py-3 text-right text-octane-gold">{fmt(total.sales)}</td>
                <td className={`px-4 py-3 text-right ${total.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(total.margin)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

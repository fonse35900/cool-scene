'use client';

const fmt = n => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const pct = n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const STATUS_LABEL = { vendido: 'Vendida', em_stock: 'Em Stock', reservado: 'Reservada' };
const STATUS_COLOR = { vendido: 'text-green-400', em_stock: 'text-octane-gray', reservado: 'text-yellow-400' };

export default function MargemDrilldown({ items, grossMargin, onClose }) {
  const sold    = items.filter(v => v.status === 'vendido');
  const unsold  = items.filter(v => v.status !== 'vendido');

  const total = {
    purchase: items.reduce((s, v) => s + v.purchase_price, 0),
    costs:    items.reduce((s, v) => s + v.costs, 0),
    sales:    sold.reduce((s, v) => s + (v.sale_price ?? 0), 0),
    margin:   items.reduce((s, v) => s + v.margin, 0),
  };

  function VehicleRow({ v }) {
    const isSold = v.status === 'vendido';
    return (
      <tr className="border-b border-octane-border/40 hover:bg-octane-dark/60 transition-colors">
        <td className="px-4 py-2.5 font-medium text-octane-white whitespace-nowrap">
          {v.brand} {v.model}
          {v.year && <span className="text-octane-gray text-xs ml-1">({v.year})</span>}
        </td>
        <td className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap ${STATUS_COLOR[v.status]}`}>
          {STATUS_LABEL[v.status]}
        </td>
        <td className="px-3 py-2.5 text-right text-octane-gray">{fmt(v.purchase_price)}</td>
        <td className="px-3 py-2.5 text-right text-octane-gray">{fmt(v.costs)}</td>
        <td className="px-3 py-2.5 text-right text-octane-gold">
          {isSold && v.sale_price != null ? fmt(v.sale_price) : <span className="text-octane-gray/50">—</span>}
        </td>
        <td className={`px-3 py-2.5 text-right font-semibold ${v.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {fmt(v.margin)}
        </td>
        <td className="px-3 py-2.5 text-octane-gray text-xs whitespace-nowrap">{v.created_by_name}</td>
        <td className="px-3 py-2.5 text-octane-gray text-xs whitespace-nowrap">{v.investor_name ?? '—'}</td>
      </tr>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-12 overflow-y-auto">
      <div className="bg-octane-card border border-octane-border rounded-2xl w-full max-w-6xl shadow-2xl mb-8">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-octane-border">
          <div>
            <h2 className="font-bold text-octane-white text-lg">Composição da Margem Bruta</h2>
            <p className="text-xs text-octane-gray mt-0.5">
              {items.length} viaturas · {sold.length} vendidas · {unsold.length} em carteira
            </p>
          </div>
          <button onClick={onClose} className="text-octane-gray hover:text-octane-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 border-b border-octane-border">
          {[
            { label: 'Total Compras', value: fmt(total.purchase), sub: 'todas as viaturas', color: 'text-octane-white' },
            { label: 'Total Custos', value: fmt(total.costs), sub: 'todas as viaturas', color: 'text-octane-white' },
            { label: 'Total Vendas', value: fmt(total.sales), sub: 'apenas vendidas', color: 'text-octane-gold' },
            { label: 'Margem Bruta', value: fmt(total.margin), sub: 'vendas − compras − custos', color: total.margin >= 0 ? 'text-octane-gold' : 'text-red-400' },
          ].map(t => (
            <div key={t.label} className="bg-octane-dark rounded-xl px-4 py-3">
              <p className="text-xs text-octane-gray uppercase tracking-wider mb-0.5">{t.label}</p>
              <p className="text-xs text-octane-gray/60 mb-1">{t.sub}</p>
              <p className={`text-lg font-bold ${t.color}`}>{t.value}</p>
            </div>
          ))}
        </div>

        {/* formula */}
        <div className="px-6 py-2 border-b border-octane-border bg-octane-dark/40">
          <p className="text-xs text-octane-gray">
            Fórmula: <span className="text-octane-white font-mono">Margem Bruta = Total Vendas − Total Compras (todas) − Total Custos (todas)</span>
            <span className="ml-2 text-octane-gray/60">— viaturas não vendidas reduzem a margem até serem alienadas</span>
          </p>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-octane-gray text-xs uppercase tracking-wider border-b border-octane-border bg-octane-dark/30">
                <th className="text-left px-4 py-3">Viatura</th>
                <th className="text-left px-3 py-3">Estado</th>
                <th className="text-right px-3 py-3">Compra</th>
                <th className="text-right px-3 py-3">Custos</th>
                <th className="text-right px-3 py-3">Venda</th>
                <th className="text-right px-3 py-3">Contribuição</th>
                <th className="text-left px-3 py-3">Responsável</th>
                <th className="text-left px-3 py-3">Investidor</th>
              </tr>
            </thead>
            <tbody>
              {sold.length > 0 && (
                <tr className="bg-green-900/10">
                  <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-green-400 uppercase tracking-wider">
                    Vendidas ({sold.length})
                  </td>
                </tr>
              )}
              {sold.map(v => <VehicleRow key={v.id} v={v} />)}

              {unsold.length > 0 && (
                <tr className="bg-red-900/10">
                  <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-red-400 uppercase tracking-wider">
                    Em Carteira — capital imobilizado ({unsold.length})
                  </td>
                </tr>
              )}
              {unsold.map(v => <VehicleRow key={v.id} v={v} />)}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-octane-border text-xs font-bold bg-octane-dark/40">
                <td colSpan={2} className="px-4 py-3 text-octane-gray uppercase tracking-wider">Total ({items.length})</td>
                <td className="px-3 py-3 text-right text-octane-white">{fmt(total.purchase)}</td>
                <td className="px-3 py-3 text-right text-octane-white">{fmt(total.costs)}</td>
                <td className="px-3 py-3 text-right text-octane-gold">{fmt(total.sales)}</td>
                <td className={`px-3 py-3 text-right ${total.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(total.margin)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

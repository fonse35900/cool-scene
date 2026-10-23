'use client';
import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/LanguageContext';

const todayISO = () => new Date().toISOString().split('T')[0];
const nDaysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

const PRESETS = [
  { id: 'last_month', label: 'Último mês', labelEn: 'Last month', from: () => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().split('T')[0]; }, to: () => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; } },
  { id: 'm3', label: '3 meses', labelEn: '3 months', from: () => { const d = new Date(); d.setMonth(d.getMonth() - 3, 1); return d.toISOString().split('T')[0]; }, to: () => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; } },
  { id: 'd365', label: '365 dias', labelEn: '365 days', from: () => nDaysAgo(365), to: todayISO },
  { id: 'ytd', label: 'Este ano', labelEn: 'This year', from: () => `${new Date().getFullYear()}-01-01`, to: todayISO },
];

function fmtEur(n) {
  if (Math.abs(n) >= 1000000) return `€${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `€${(n / 1000).toFixed(0)}k`;
  return `€${n}`;
}

function fmtFull(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const W = 800, H = 280, PAD = { top: 16, right: 80, bottom: 36, left: 44 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;
const GOLD = '#d4a017', GREEN = '#22c55e', GRAY = '#4b5563';

export default function DashboardChart() {
  const [dateFrom, setDateFrom]           = useState(nDaysAgo(90));
  const [dateTo, setDateTo]               = useState(todayISO());
  const [preset, setPreset]               = useState(null);
  const [excludeInvestors, setExcludeInvestors] = useState(false);
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [tooltip, setTooltip]             = useState(null);
  const svgRef = useRef(null);

  const { t } = useLang();
  function applyPreset(p) { setDateFrom(p.from()); setDateTo(p.to()); setPreset(p.id); }

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    fetch(`/api/reports/chart?date_from=${dateFrom}&date_to=${dateTo}${excludeInvestors ? '&exclude_investors=1' : ''}`)
      .then(r => r.json()).then(d => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dateFrom, dateTo, excludeInvestors]);

  const inputCls = "bg-octane-dark border border-octane-border rounded px-3 py-1.5 text-sm text-octane-white focus:ring-1 focus:ring-octane-gold focus:outline-none";
  const todayCls = "text-xs px-2 py-1.5 rounded border border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold transition-colors";

  // ---- scales ----
  let chart = null;
  if (data && data.length > 0) {
    const maxCount = Math.max(...data.map(d => Math.max(d.inStock, d.sold)), 1);
    const maxMargin = Math.max(...data.map(d => Math.abs(d.cumulativeMargin)), 1);
    const minMargin = Math.min(...data.map(d => d.cumulativeMargin), 0);
    const n = data.length;
    const barW = Math.max(4, Math.min(28, CW / (n * 2.5)));
    const gap  = CW / n;

    const scaleY  = v => CH - (v / maxCount) * CH;
    const scaleM  = v => CH - ((v - minMargin) / (maxMargin - minMargin || 1)) * CH;

    // tick marks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: Math.round(maxCount * f), y: scaleY(maxCount * f) }));
    const mTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: Math.round(minMargin + (maxMargin - minMargin) * f), y: scaleM(minMargin + (maxMargin - minMargin) * f) }));

    // x labels — show at most 8
    const step = Math.ceil(n / 8);
    const xLabels = data.map((d, i) => i % step === 0 || i === n - 1 ? { label: d.label, x: gap * i + gap / 2 } : null).filter(Boolean);

    // line path for margin
    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${(gap * i + gap / 2).toFixed(1)},${scaleM(d.cumulativeMargin).toFixed(1)}`).join(' ');

    chart = { maxCount, maxMargin, minMargin, n, barW, gap, scaleY, scaleM, yTicks, mTicks, xLabels, linePath };
  }

  function handleMouseMove(e) {
    if (!chart || !data) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX - PAD.left;
    const idx = Math.round(mx / chart.gap - 0.5);
    if (idx >= 0 && idx < data.length) setTooltip({ idx, x: chart.gap * idx + chart.gap / 2 });
    else setTooltip(null);
  }

  return (
    <div className="bg-octane-card border border-octane-border rounded-xl p-6 mt-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-octane-gold text-sm uppercase tracking-wider">{t('Evolução do Stock e Margens', 'Stock and Margin Evolution')}</h2>
          <button
            onClick={() => setExcludeInvestors(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors ${
              excludeInvestors
                ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
            }`}>
            {excludeInvestors ? '✓' : '○'} {t('Excluir Investidores', 'Exclude Investors')}
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${preset === p.id
                  ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                  : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'}`}>
                {t(p.label, p.labelEn)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreset(null); }} className={inputCls} />
            <button onClick={() => { setDateFrom(todayISO()); setPreset(null); }} className={todayCls}>{t('Hoje', 'Today')}</button>
            <span className="text-octane-gray text-sm">→</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreset(null); }} className={inputCls} />
            <button onClick={() => { setDateTo(todayISO()); setPreset(null); }} className={todayCls}>{t('Hoje', 'Today')}</button>
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="flex gap-5 mb-4 text-xs text-octane-gray">
        <span className="flex items-center gap-1.5"><span style={{ background: GRAY }} className="w-3 h-3 rounded-sm inline-block" />{t('Em Stock', 'In Stock')}</span>
        <span className="flex items-center gap-1.5"><span style={{ background: GREEN }} className="w-3 h-3 rounded-sm inline-block" />{t('Vendidas', 'Sold')}</span>
        <span className="flex items-center gap-1.5"><span style={{ background: GOLD, height: 2 }} className="w-5 h-0.5 inline-block rounded" />{t('Margem Acum.', 'Cum. Margin')}</span>
      </div>

      {loading && <div className="h-72 flex items-center justify-center text-octane-gray text-sm">{t('A carregar...', 'Loading...')}</div>}
      {!loading && data?.length === 0 && <div className="h-72 flex items-center justify-center text-octane-gray text-sm">{t('Sem dados para o período selecionado.', 'No data for the selected period.')}</div>}

      {!loading && chart && data && (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}>

            <g transform={`translate(${PAD.left},${PAD.top})`}>
              {/* grid */}
              {chart.yTicks.map((t, i) => (
                <line key={i} x1={0} x2={CW} y1={t.y} y2={t.y} stroke="#1f1f1f" strokeWidth={1} />
              ))}

              {/* left axis ticks */}
              {chart.yTicks.map((t, i) => (
                <text key={i} x={-6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#6b7280">{t.v}</text>
              ))}

              {/* right axis ticks */}
              {chart.mTicks.map((t, i) => (
                <text key={i} x={CW + 6} y={t.y + 4} textAnchor="start" fontSize={10} fill="#9a7010">{fmtEur(t.v)}</text>
              ))}

              {/* bars */}
              {data.map((d, i) => {
                const cx = chart.gap * i + chart.gap / 2;
                const bw = chart.barW;
                const stockH = CH - chart.scaleY(d.inStock);
                const soldH  = CH - chart.scaleY(d.sold);
                return (
                  <g key={i}>
                    <rect x={cx - bw - 1} y={chart.scaleY(d.inStock)} width={bw} height={stockH} fill={GRAY} opacity={0.7} rx={2} />
                    <rect x={cx + 1}      y={chart.scaleY(d.sold)}    width={bw} height={soldH}  fill={GREEN} opacity={0.8} rx={2} />
                  </g>
                );
              })}

              {/* margin line */}
              <path d={chart.linePath} fill="none" stroke={GOLD} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

              {/* dots on hover */}
              {tooltip && data[tooltip.idx] && (
                <>
                  <line x1={tooltip.x} x2={tooltip.x} y1={0} y2={CH} stroke="#ffffff" strokeOpacity={0.08} strokeWidth={1} />
                  <circle cx={tooltip.x} cy={chart.scaleM(data[tooltip.idx].cumulativeMargin)} r={4} fill={GOLD} />
                </>
              )}

              {/* x labels */}
              {chart.xLabels.map(l => (
                <text key={l.label + l.x} x={l.x} y={CH + 20} textAnchor="middle" fontSize={10} fill="#6b7280">{l.label}</text>
              ))}
            </g>
          </svg>

          {/* tooltip */}
          {tooltip && data[tooltip.idx] && (() => {
            const d = data[tooltip.idx];
            const svgEl = svgRef.current;
            const rect = svgEl?.getBoundingClientRect();
            const relX = (tooltip.x + PAD.left) / W;
            return (
              <div
                className="absolute top-4 pointer-events-none bg-octane-dark border border-octane-border rounded-lg px-3 py-2 text-xs shadow-xl z-10"
                style={{ left: relX > 0.6 ? undefined : `${relX * 100}%`, right: relX > 0.6 ? `${(1 - relX) * 100}%` : undefined, transform: 'translateX(-50%)' }}>
                <p className="text-octane-gold font-semibold mb-1.5">{d.label}</p>
                <p className="text-octane-gray mb-0.5">{t('Em Stock', 'In Stock')}: <span className="text-octane-white font-semibold">{d.inStock}</span></p>
                <p className="text-octane-gray mb-0.5">{t('Vendidas', 'Sold')}: <span style={{ color: GREEN }} className="font-semibold">{d.sold}</span></p>
                <p className="text-octane-gray">{t('Margem Acum.', 'Cum. Margin')}: <span style={{ color: GOLD }} className="font-semibold">{fmtFull(d.cumulativeMargin)}</span></p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

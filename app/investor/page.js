'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useLang } from '@/lib/LanguageContext';

function fmt(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

function Card({ label, value, color }) {
  return (
    <div className="bg-octane-card border border-octane-border rounded-xl p-5">
      <p className="text-xs font-medium text-octane-gray uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-octane-white'}`}>{value}</p>
    </div>
  );
}

const typeLabels = {
  contribuicao: 'Depósito',
  levantamento: 'Levantamento',
  compra: 'Compra',
  custo_stock: 'Custo',
  venda: 'Venda',
  despesa_viatura: 'Despesa Viatura',
};

const typeColors = {
  contribuicao: 'text-octane-green',
  venda: 'text-octane-green',
  levantamento: 'text-octane-red',
  compra: 'text-octane-red',
  custo_stock: 'text-octane-red',
  despesa_viatura: 'text-octane-red',
};

const inputCls = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:outline-none";

// Movement groups for the transaction-history filter.
const HIST_GROUPS = {
  capital: ['contribuicao', 'levantamento'],
  viaturas: ['compra', 'venda', 'custo_stock', 'despesa_viatura'],
};

export default function InvestorPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ email: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsErr, setSettingsErr] = useState('');
  // Transaction history: filter group ('all' | 'capital' | 'viaturas') and sort.
  const [histFilter, setHistFilter] = useState('all');
  const [histSort, setHistSort] = useState({ col: 'date', dir: 'asc' });
  // Tab between the movement history and the vehicles table; vehicle sort.
  const [activeTab, setActiveTab] = useState('historico');
  const [vehSort, setVehSort] = useState({ col: '_vehicle', dir: 'asc' });
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject())
      .then(u => {
        if (u.role !== 'investidor') { router.push('/dashboard'); return; }
        setUser(u);
      }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) setSettingsForm(f => ({ ...f, email: user.email || '', phone: user.phone || '' }));
  }, [user]);

  async function handleSettings(e) {
    e.preventDefault();
    setSettingsErr(''); setSettingsMsg('');
    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmPassword) {
      setSettingsErr('As passwords não coincidem'); return;
    }
    const body = { email: settingsForm.email, phone: settingsForm.phone };
    if (settingsForm.newPassword) {
      body.currentPassword = settingsForm.currentPassword;
      body.newPassword = settingsForm.newPassword;
    }
    const res = await fetch('/api/users/me', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setSettingsMsg('Dados atualizados com sucesso');
      setSettingsForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } else {
      setSettingsErr((await res.json()).error);
    }
  }

  useEffect(() => {
    if (!user) return;
    fetch('/api/investor/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const histView = useMemo(() => {
    const tl = data?.timeline ?? [];
    const filtered = histFilter === 'all' ? tl : tl.filter(m => HIST_GROUPS[histFilter].includes(m.type));
    const signed = m => m.sign * m.amount;
    const val = m => {
      switch (histSort.col) {
        case 'date': return m.date ? new Date(m.date).getTime() : 0;
        case 'type': return m.type;
        case 'label': return (m.label || '').toLowerCase();
        case 'amount': return signed(m);
        case 'balance': return m.balance;
        default: return 0;
      }
    };
    const sorted = [...filtered].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return histSort.dir === 'asc' ? -1 : 1;
      if (av > bv) return histSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    const byDate = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    return {
      sorted,
      count: filtered.length,
      totalAmount: filtered.reduce((s, m) => s + signed(m), 0),
      finalBalance: byDate.length ? byDate[byDate.length - 1].balance : 0,
    };
  }, [data, histFilter, histSort]);

  const vehView = useMemo(() => {
    const rows = (data?.stockVehicles ?? []).map(v => {
      const cost = v.purchase_price + v.total_costs;
      const margin = v.sale_price ? v.sale_price - v.purchase_price - v.total_costs : null;
      const marginPct = (margin !== null && cost > 0) ? margin / cost * 100 : null;
      const start = v.purchase_date || v.created_at;
      const end = v.sale_date || v.updated_at;
      let days = null;
      const parse = (x) => { const d = new Date(x); return isNaN(d) ? null : d; };
      if (v.status === 'vendido' && start && end) {
        const a = parse(start), b = parse(end);
        if (a && b) { const d = Math.round((b - a) / 86400000); days = d >= 0 ? d : null; }
      } else if (start) {
        const a = parse(start);
        if (a) { const d = Math.round((Date.now() - a) / 86400000); days = d >= 0 ? d : null; }
      }
      const tan = (marginPct !== null && days && days > 0) ? marginPct * (365 / days) : null;
      return { ...v, _vehicle: `${v.brand} ${v.model}`, _margin: margin, _marginPct: marginPct, _days: days, _tan: tan };
    });
    const num = (x) => (x == null ? -Infinity : x);
    const val = (v) => {
      switch (vehSort.col) {
        case '_vehicle': return v._vehicle.toLowerCase();
        case 'status': return v.status;
        case 'purchase_price': return v.purchase_price;
        case 'total_costs': return v.total_costs;
        case 'sale_price': return num(v.sale_price);
        case '_margin': return num(v._margin);
        case '_marginPct': return num(v._marginPct);
        case '_days': return num(v._days);
        case '_tan': return num(v._tan);
        default: return 0;
      }
    };
    const sorted = [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return vehSort.dir === 'asc' ? -1 : 1;
      if (av > bv) return vehSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    const sold = rows.filter(v => v._margin !== null);
    const tPurchase = rows.reduce((s, v) => s + v.purchase_price, 0);
    const tCosts = rows.reduce((s, v) => s + v.total_costs, 0);
    const tSale = rows.filter(v => v.sale_price).reduce((s, v) => s + v.sale_price, 0);
    const tMargin = sold.reduce((s, v) => s + v._margin, 0);
    const soldCostBase = sold.reduce((s, v) => s + v.purchase_price + v.total_costs, 0);
    const tMarginPct = soldCostBase > 0 ? tMargin / soldCostBase * 100 : null;
    const daysRows = rows.filter(v => v._days != null);
    const avgDays = daysRows.length ? daysRows.reduce((s, v) => s + v._days, 0) / daysRows.length : null;
    const tanRows = rows.filter(v => v._tan != null);
    const avgTan = tanRows.length ? tanRows.reduce((s, v) => s + v._tan, 0) / tanRows.length : null;
    return { sorted, count: rows.length, tPurchase, tCosts, tSale, tMargin, tMarginPct, avgDays, avgTan };
  }, [data, vehSort]);

  if (!user || loading) return null;
  if (!data || !data.summary) return (
    <div className="min-h-screen bg-octane-black flex items-center justify-center text-octane-gray">
      {t('Erro ao carregar dados. Verifica que o teu utilizador está associado a um investidor.', 'Error loading data. Check that your user is linked to an investor.')}
    </div>
  );

  const { summary, timeline, stockVehicles, investorVehicles } = data;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide mb-1">{t('Portal do Investidor', 'Investor Portal')}</h1>
            <p className="text-octane-gray text-sm">{t('Bem-vindo', 'Welcome')}, {user.name}</p>
          </div>
          <button onClick={() => setShowSettings(s => !s)}
            className="border border-octane-border text-octane-gray px-4 py-2 rounded-lg text-sm hover:border-octane-gold hover:text-octane-gold transition-colors">
            {showSettings ? t('Fechar', 'Close') : t('Definições', 'Settings')}
          </button>
        </div>

        {showSettings && (
          <div className="bg-octane-card border border-octane-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-octane-gold uppercase tracking-wider mb-4">{t('As Minhas Definições', 'My Settings')}</h2>
            {settingsErr && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm mb-3">{settingsErr}</div>}
            {settingsMsg && <div className="bg-octane-green/10 border border-octane-green/30 text-octane-green p-3 rounded text-sm mb-3">{settingsMsg}</div>}
            <form onSubmit={handleSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email</label>
                  <input type="email" value={settingsForm.email} onChange={e => setSettingsForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Telefone', 'Phone')}</label>
                  <input value={settingsForm.phone} onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="border-t border-octane-border pt-4">
                <p className="text-xs font-medium text-octane-gray uppercase tracking-wider mb-3">{t('Alterar Password (opcional)', 'Change Password (optional)')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-octane-gray mb-2">{t('Password Atual', 'Current Password')}</label>
                    <input type="password" value={settingsForm.currentPassword} onChange={e => setSettingsForm(f => ({ ...f, currentPassword: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-octane-gray mb-2">{t('Nova Password', 'New Password')}</label>
                    <input type="password" value={settingsForm.newPassword} onChange={e => setSettingsForm(f => ({ ...f, newPassword: e.target.value }))} className={inputCls} placeholder={t('Mín. 6 caracteres', 'Min. 6 characters')} />
                  </div>
                  <div>
                    <label className="block text-xs text-octane-gray mb-2">{t('Confirmar Password', 'Confirm Password')}</label>
                    <input type="password" value={settingsForm.confirmPassword} onChange={e => setSettingsForm(f => ({ ...f, confirmPassword: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              </div>
              <button type="submit" className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors">
                {t('Guardar Alterações', 'Save Changes')}
              </button>
            </form>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card label={t('Capital Investido', 'Invested Capital')} value={fmt(summary.totalContributions)} color="text-octane-gold" />
          <Card label={t('Viaturas Adquiridas', 'Vehicles Acquired')} value={fmt(summary.totalPurchased)} color="text-octane-red" />
          <Card label={t('Custos de Stock', 'Stock Costs')} value={fmt(summary.totalStockCosts)} color="text-octane-red" />
          <Card label={t('Despesas Viaturas', 'Vehicle Expenses')} value={fmt(summary.totalInvestorVehicleCosts)} color="text-octane-red" />
          <Card label={t('Receita de Vendas', 'Sales Revenue')} value={fmt(summary.totalSalesRevenue)} color="text-octane-green" />
          <Card
            label={t('Saldo Atual', 'Current Balance')}
            value={fmt(summary.currentBalance)}
            color={summary.currentBalance >= 0 ? 'text-octane-green' : 'text-octane-red'}
          />
        </div>

        {/* Gain/Loss highlight */}
        <div className="bg-octane-card border border-octane-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-octane-gray uppercase tracking-wider mb-1">{t('Ganho / Perda em Vendas', 'Gain / Loss on Sales')}</p>
            <p className={`text-3xl font-bold ${summary.totalGainLoss >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
              {fmt(summary.totalGainLoss)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-octane-gray">{t('Viaturas vendidas', 'Vehicles sold')}</p>
            <p className="text-2xl font-bold text-octane-white">{stockVehicles.filter(v => v.status === 'vendido').length}</p>
          </div>
        </div>

        {/* Tabs: history vs. vehicles */}
        {(timeline.length > 0 || stockVehicles.length > 0) && (
          <div className="flex gap-1 border-b border-octane-border">
            {[
              { k: 'historico', l: t('Histórico de Movimentos', 'Transaction History') },
              { k: 'viaturas', l: t('Viaturas em Stock / Vendidas', 'Vehicles In Stock / Sold') },
            ].map(tab => (
              <button key={tab.k} onClick={() => setActiveTab(tab.k)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.k
                    ? 'border-octane-gold text-octane-gold'
                    : 'border-transparent text-octane-gray hover:text-octane-white'
                }`}>
                {tab.l}
              </button>
            ))}
          </div>
        )}

        {/* Timeline */}
        {activeTab === 'historico' && timeline.length > 0 && (() => {
          const arrow = (col) => histSort.col === col ? (histSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
          const toggleSort = (col) => setHistSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
          const cols = [
            { col: 'date', label: t('Data', 'Date') },
            { col: 'type', label: t('Tipo', 'Type') },
            { col: 'label', label: t('Descrição', 'Description') },
            { col: 'amount', label: t('Valor', 'Amount') },
            { col: 'balance', label: t('Saldo Acumulado', 'Running Balance') },
          ];
          return (
          <div>
            <div className="flex flex-wrap items-center justify-end gap-3 mb-3">
              <div className="flex gap-2">
                {[
                  { k: 'all', l: t('Todos', 'All') },
                  { k: 'viaturas', l: t('Compra e Venda', 'Purchases & Sales') },
                  { k: 'capital', l: t('Depósitos e Levantamentos', 'Deposits & Withdrawals') },
                ].map(o => (
                  <button key={o.k} onClick={() => setHistFilter(o.k)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      histFilter === o.k
                        ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                        : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                    }`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {cols.map(c => (
                      <th key={c.col} className="text-left p-3 font-medium text-xs uppercase tracking-wider">
                        <button onClick={() => toggleSort(c.col)}
                          className={`hover:text-octane-gold transition-colors ${histSort.col === c.col ? 'text-octane-gold' : 'text-octane-gray'}`}>
                          {c.label}{arrow(c.col)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {histView.sorted.map((m, i) => (
                    <tr key={i} className="border-t border-octane-border">
                      <td className="p-3 text-octane-gray whitespace-nowrap">{m.date ? new Date(m.date).toLocaleDateString('pt-PT') : '-'}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColors[m.type] || 'text-octane-white'}`}>
                          {(t(typeLabels[m.type], { contribuicao: 'Deposit', levantamento: 'Withdrawal', compra: 'Purchase', custo_stock: 'Cost', venda: 'Sale', despesa_viatura: 'Vehicle Expense' }[m.type])) || m.type}
                        </span>
                      </td>
                      <td className="p-3 text-octane-white">{m.label}</td>
                      <td className={`p-3 font-medium whitespace-nowrap ${m.sign > 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                        {m.sign > 0 ? '+' : '-'}{fmt(m.amount)}
                      </td>
                      <td className={`p-3 font-semibold whitespace-nowrap ${m.balance >= 0 ? 'text-octane-white' : 'text-octane-red'}`}>
                        {fmt(m.balance)}
                      </td>
                    </tr>
                  ))}
                  {histView.count === 0 && (
                    <tr className="border-t border-octane-border"><td colSpan={5} className="p-4 text-center text-octane-gray">{t('Sem movimentos neste filtro', 'No movements in this filter')}</td></tr>
                  )}
                </tbody>
                {histView.count > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-octane-gold/40 bg-octane-dark font-bold">
                      <td className="p-3 text-octane-white uppercase text-xs tracking-wider whitespace-nowrap">{t('Total', 'Total')} ({histView.count})</td>
                      <td className="p-3"></td>
                      <td className="p-3"></td>
                      <td className={`p-3 whitespace-nowrap ${histView.totalAmount >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                        {histView.totalAmount >= 0 ? '+' : '-'}{fmt(Math.abs(histView.totalAmount))}
                      </td>
                      <td className={`p-3 whitespace-nowrap ${histView.finalBalance >= 0 ? 'text-octane-white' : 'text-octane-red'}`}>{fmt(histView.finalBalance)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          );
        })()}

        {/* Stock Vehicles */}
        {activeTab === 'viaturas' && stockVehicles.length > 0 && (() => {
          const arrow = (col) => vehSort.col === col ? (vehSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
          const toggleSort = (col) => setVehSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
          const cols = [
            { col: '_vehicle', label: t('Viatura', 'Vehicle') },
            { col: 'status', label: t('Estado', 'Status') },
            { col: 'purchase_price', label: t('Compra', 'Purchase') },
            { col: 'total_costs', label: t('Custos', 'Costs') },
            { col: 'sale_price', label: t('Venda', 'Sale') },
            { col: '_margin', label: t('Margem', 'Margin') },
            { col: '_marginPct', label: t('Margem %', 'Margin %') },
            { col: '_days', label: t('Dias em Stock', 'Days in Stock') },
            { col: '_tan', label: t('TAN %', 'Nominal %') },
          ];
          return (
          <div>
            <p className="text-octane-gray text-xs mb-2">{t('TAN = margem % anualizada face aos dias em stock. Dias em stock: até à venda, ou até hoje se ainda em stock.', 'Nominal rate = margin % annualised over days in stock. Days: until sale, or until today if still in stock.')}</p>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {cols.map(c => (
                      <th key={c.col} className="text-left p-3 font-medium text-xs uppercase tracking-wider">
                        <button onClick={() => toggleSort(c.col)}
                          className={`hover:text-octane-gold transition-colors ${vehSort.col === c.col ? 'text-octane-gold' : 'text-octane-gray'}`}>
                          {c.label}{arrow(c.col)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehView.sorted.map(v => (
                    <tr key={v.id} className="border-t border-octane-border">
                      <td className="p-3 font-medium text-octane-white whitespace-nowrap">{v.brand} {v.model} <span className="text-octane-gray">({v.year})</span></td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green' :
                          v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold' :
                          'bg-octane-gray/10 text-octane-gray'
                        }`}>{({ vendido: t('Vendido','Sold'), reservado: t('Reservado','Reserved'), em_stock: t('Em Stock','In Stock') })[v.status] || v.status}</span>
                      </td>
                      <td className="p-3 text-octane-white whitespace-nowrap">{fmt(v.purchase_price)}</td>
                      <td className="p-3 text-octane-red whitespace-nowrap">{fmt(v.total_costs)}</td>
                      <td className="p-3 text-octane-white whitespace-nowrap">{v.sale_price ? fmt(v.sale_price) : '-'}</td>
                      <td className={`p-3 font-medium whitespace-nowrap ${v._margin === null ? 'text-octane-gray' : v._margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                        {v._margin === null ? '-' : fmt(v._margin)}
                      </td>
                      <td className={`p-3 font-medium whitespace-nowrap ${v._marginPct === null ? 'text-octane-gray' : v._marginPct >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                        {v._marginPct === null ? '-' : `${v._marginPct.toFixed(1)}%`}
                      </td>
                      <td className="p-3 text-octane-white whitespace-nowrap">{v._days != null ? v._days : '-'}</td>
                      <td className={`p-3 font-medium whitespace-nowrap ${v._tan == null ? 'text-octane-gray' : v._tan >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                        {v._tan != null ? `${v._tan.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-octane-gold/40 bg-octane-dark font-bold">
                    <td className="p-3 text-octane-white uppercase text-xs tracking-wider whitespace-nowrap">{t('Total','Total')} ({vehView.count})</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-octane-white whitespace-nowrap">{fmt(vehView.tPurchase)}</td>
                    <td className="p-3 text-octane-red whitespace-nowrap">{fmt(vehView.tCosts)}</td>
                    <td className="p-3 text-octane-white whitespace-nowrap">{fmt(vehView.tSale)}</td>
                    <td className={`p-3 whitespace-nowrap ${vehView.tMargin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{fmt(vehView.tMargin)}</td>
                    <td className={`p-3 whitespace-nowrap ${vehView.tMarginPct == null ? 'text-octane-gray' : vehView.tMarginPct >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{vehView.tMarginPct != null ? `${vehView.tMarginPct.toFixed(1)}%` : '-'}</td>
                    <td className="p-3 text-octane-white whitespace-nowrap">{vehView.avgDays != null ? `${Math.round(vehView.avgDays)} ${t('méd.','avg')}` : '-'}</td>
                    <td className={`p-3 whitespace-nowrap ${vehView.avgTan == null ? 'text-octane-gray' : vehView.avgTan >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{vehView.avgTan != null ? `${vehView.avgTan.toFixed(1)}% ${t('méd.','avg')}` : '-'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          );
        })()}

        {/* Investor Vehicles */}
        {investorVehicles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">{t('Despesas de Viaturas', 'Vehicle Expenses')}</h2>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {[t('Viatura', 'Vehicle'), t('Total Despesas', 'Total Expenses')].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investorVehicles.map((v, i) => (
                    <tr key={i} className="border-t border-octane-border">
                      <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year}) {v.license_plate}</span></td>
                      <td className="p-3 text-octane-red font-medium">{fmt(v.total_costs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

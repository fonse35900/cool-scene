'use client';
import { useState, useEffect } from 'react';
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
  compra: 'Compra',
  custo_stock: 'Custo',
  venda: 'Venda',
  despesa_viatura: 'Despesa Viatura',
};

const typeColors = {
  contribuicao: 'text-octane-green',
  venda: 'text-octane-green',
  compra: 'text-octane-red',
  custo_stock: 'text-octane-red',
  despesa_viatura: 'text-octane-red',
};

const inputCls = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:outline-none";

export default function InvestorPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ email: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsErr, setSettingsErr] = useState('');
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

        {/* Timeline */}
        {timeline.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">{t('Histórico de Movimentos', 'Transaction History')}</h2>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {[t('Data', 'Date'), t('Tipo', 'Type'), t('Descrição', 'Description'), t('Valor', 'Amount'), t('Saldo Acumulado', 'Running Balance')].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((m, i) => (
                    <tr key={i} className="border-t border-octane-border">
                      <td className="p-3 text-octane-gray whitespace-nowrap">{m.date ? new Date(m.date).toLocaleDateString('pt-PT') : '-'}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColors[m.type] || 'text-octane-white'}`}>
                          {(t(typeLabels[m.type], { contribuicao: 'Deposit', compra: 'Purchase', custo_stock: 'Cost', venda: 'Sale', despesa_viatura: 'Vehicle Expense' }[m.type])) || m.type}
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
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Vehicles */}
        {stockVehicles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">{t('Viaturas em Stock / Vendidas', 'Vehicles In Stock / Sold')}</h2>
            <div className="bg-octane-card border border-octane-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-octane-border">
                    {[t('Viatura', 'Vehicle'), t('Estado', 'Status'), t('Compra', 'Purchase'), t('Custos', 'Costs'), t('Venda', 'Sale'), t('Margem', 'Margin')].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockVehicles.map(v => {
                    const margin = v.sale_price ? v.sale_price - v.purchase_price - v.total_costs : null;
                    return (
                      <tr key={v.id} className="border-t border-octane-border">
                        <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year})</span></td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green' :
                            v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold' :
                            'bg-octane-gray/10 text-octane-gray'
                          }`}>{({ vendido: t('Vendido','Sold'), reservado: t('Reservado','Reserved'), em_stock: t('Em Stock','In Stock') })[v.status] || v.status}</span>
                        </td>
                        <td className="p-3 text-octane-white">{fmt(v.purchase_price)}</td>
                        <td className="p-3 text-octane-red">{fmt(v.total_costs)}</td>
                        <td className="p-3 text-octane-white">{v.sale_price ? fmt(v.sale_price) : '-'}</td>
                        <td className={`p-3 font-medium ${margin === null ? 'text-octane-gray' : margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                          {margin === null ? '-' : fmt(margin)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

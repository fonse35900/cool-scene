'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReportsTabs from '@/components/ReportsTabs';
import { useSort, Th, SmallTh } from '@/components/useSort';
import DateRangeFilter from '@/components/DateRangeFilter';
import { useLang } from '@/lib/LanguageContext';

function fmt(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

export default function VehicleReportsPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [drilldown, setDrilldown] = useState(null);
  const [drillData, setDrillData] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '', preset: null });
  const router = useRouter();
  const { t } = useLang();
  const roleLabel = { director: t('Diretor', 'Director'), comercial: t('Comercial', 'Sales'), admin: t('Administrador', 'Administrator'), investidor: t('Investidor', 'Investor') };

  const perUserSort = useSort(report?.perUser, 'name');
  const salesSort = useSort(report?.salesDetails, 'brand');
  const drillSort = useSort(
    useMemo(() => drillData?.vehicles?.map(v => {
      const cost = v.purchase_price + v.costs;
      const margin = v.sale_price ? v.sale_price - cost : null;
      const pct = margin !== null && cost > 0 ? margin / cost * 100 : null;
      return { ...v, _vehicle: `${v.brand} ${v.model}`, _margin: margin, _pct: pct };
    }) ?? null, [drillData]),
    '_vehicle'
  );

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      setUser(u);
      if (u.role !== 'comercial') {
        fetch('/api/users').then(r => r.json()).then(setUsers);
      }
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams();
      if (selectedUsers.length) params.set('users', selectedUsers.join(','));
      if (dateRange.from) params.set('date_from', dateRange.from);
      if (dateRange.to) params.set('date_to', dateRange.to);
      fetch(`/api/reports?${params}`).then(r => r.json()).then(setReport);
    }
  }, [user, selectedUsers, dateRange]);

  function toggleUser(id) {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function openDrilldown(u) {
    if (drilldown?.id === u.id) { setDrilldown(null); setDrillData(null); return; }
    setDrilldown(u);
    setDrillData(null);
    const params = new URLSearchParams({ drilldown_user: u.id });
    if (u.role === 'investidor' && u.investor_id) params.set('drilldown_investor', u.investor_id);
    const res = await fetch(`/api/reports/drilldown?${params}`);
    const data = await res.json();
    setDrillData(data);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">{t('Relatórios', 'Reports')}</h1>
        <ReportsTabs userRole={user.role} />

        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {user.role !== 'comercial' && users.length > 0 && (
          <div className="bg-octane-card border border-octane-border p-4 rounded-xl mb-6">
            <h2 className="text-xs text-octane-gray uppercase tracking-wider mb-3">{t('Filtrar por utilizador', 'Filter by user')}</h2>
            <div className="flex flex-wrap gap-2">
              {users.filter(u => u.role !== 'admin' || user.role === 'admin').map(u => (
                <button key={u.id} onClick={() => toggleUser(u.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedUsers.includes(u.id)
                      ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                      : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                  }`}>
                  {u.name}
                </button>
              ))}
              {selectedUsers.length > 0 && (
                <button onClick={() => setSelectedUsers([])} className="px-3 py-1.5 rounded-full text-sm text-octane-red hover:bg-octane-red/10 transition-colors">
                  {t('Limpar', 'Clear')}
                </button>
              )}
            </div>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { l: t('Total Viaturas', 'Total Vehicles'), v: report.summary.totalVehicles },
                { l: t('Em Stock', 'In Stock'), v: report.summary.inStock },
                { l: t('Vendidas', 'Sold'), v: report.summary.sold },
                { l: t('Reservadas', 'Reserved'), v: report.summary.reserved },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className="text-2xl font-bold text-octane-white">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {[
                { l: t('Total Compras', 'Total Purchases'), v: `€${report.summary.totalPurchase.toLocaleString()}`, c: 'text-octane-white' },
                { l: t('Total Vendas', 'Total Sales'), v: `€${report.summary.totalSales.toLocaleString()}`, c: 'text-octane-gold' },
                { l: t('Total Custos', 'Total Costs'), v: `€${report.summary.totalCosts.toLocaleString()}`, c: 'text-octane-orange' },
                { l: t('Margem Bruta', 'Gross Margin'), v: `€${report.summary.grossMargin.toLocaleString()}`, c: report.summary.grossMargin >= 0 ? 'text-octane-green' : 'text-octane-red' },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                </div>
              ))}
            </div>

            {user.role !== 'comercial' && report.perUser.length > 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl mb-6 overflow-x-auto">
                <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">{t('Por Utilizador', 'By User')}</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-octane-border">
                      <Th label={t('Nome', 'Name')} col="name" sort={perUserSort.sort} toggle={perUserSort.toggle} />
                      <Th label={t('Papel', 'Role')} col="role" sort={perUserSort.sort} toggle={perUserSort.toggle} />
                      <Th label={t('Total Viaturas', 'Total Vehicles')} col="total_vehicles" sort={perUserSort.sort} toggle={perUserSort.toggle} />
                      <Th label={t('Vendidas', 'Sold')} col="sold" sort={perUserSort.sort} toggle={perUserSort.toggle} />
                      <Th label={t('Receita', 'Revenue')} col="revenue" sort={perUserSort.sort} toggle={perUserSort.toggle} />
                      <Th label={t('Margem (€)', 'Margin (€)')} col="margin" sort={perUserSort.sort} toggle={perUserSort.toggle} />
                      <Th label={t('Margem (%)', 'Margin (%)')} col="margin_percent" sort={perUserSort.sort} toggle={perUserSort.toggle} />
                    </tr>
                  </thead>
                  <tbody>
                    {perUserSort.sorted?.map(u => {
                      const isOpen = drilldown?.id === u.id;
                      return (
                        <React.Fragment key={u.id}>
                          <tr
                            className={`border-t border-octane-border cursor-pointer transition-colors ${isOpen ? 'bg-octane-gold/5' : 'hover:bg-octane-dark/60'}`}
                            onClick={() => openDrilldown(u)}>
                            <td className="p-3 font-medium text-octane-white flex items-center gap-2">
                              <span className="text-octane-gold text-xs">{isOpen ? '▼' : '▶'}</span>
                              {u.name}
                            </td>
                            <td className="p-3 text-octane-gray">{roleLabel[u.role] || u.role}</td>
                            <td className="p-3 text-octane-white">{u.total_vehicles}</td>
                            <td className="p-3 text-octane-white">{u.sold}</td>
                            <td className="p-3 font-medium text-octane-gold">{fmt(u.revenue)}</td>
                            <td className={`p-3 font-medium ${u.margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{fmt(u.margin ?? 0)}</td>
                            <td className={`p-3 font-medium ${u.margin_percent >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{(u.margin_percent ?? 0).toFixed(1)}%</td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-octane-border bg-octane-dark/40">
                              <td colSpan={7} className="p-4">
                                {!drillData ? (
                                  <p className="text-octane-gray text-sm">A carregar...</p>
                                ) : drillSort.sorted?.length === 0 ? (
                                  <p className="text-octane-gray text-sm">{t('Nenhuma viatura registada.', 'No vehicles registered.')}</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-octane-border/50">
                                        <SmallTh label={t('Viatura', 'Vehicle')} col="_vehicle" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Matrícula', 'Plate')} col="license_plate" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Estado', 'Status')} col="status" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Data', 'Date')} col="date" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Compra', 'Purchase')} col="purchase_price" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Custos', 'Costs')} col="costs" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Venda', 'Sale')} col="sale_price" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Margem (€)', 'Margin (€)')} col="_margin" sort={drillSort.sort} toggle={drillSort.toggle} />
                                        <SmallTh label={t('Margem (%)', 'Margin (%)')} col="_pct" sort={drillSort.sort} toggle={drillSort.toggle} />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {drillSort.sorted?.map(v => (
                                        <tr key={v.id} className="border-t border-octane-border/30">
                                          <td className="py-2 pr-3 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year})</span></td>
                                          <td className="py-2 pr-3 text-octane-gray">{v.license_plate || '-'}</td>
                                          <td className="py-2 pr-3">
                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                              v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green' :
                                              v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold' :
                                              'bg-octane-gray/10 text-octane-gray'}`}>{({ vendido: t('Vendido','Sold'), reservado: t('Reservado','Reserved'), em_stock: t('Em Stock','In Stock') })[v.status] || v.status}</span>
                                          </td>
                                          <td className="py-2 pr-3 text-octane-gray whitespace-nowrap">{v.date ? new Date(v.date).toLocaleDateString('pt-PT') : '-'}</td>
                                          <td className="py-2 pr-3 text-octane-white">{fmt(v.purchase_price)}</td>
                                          <td className="py-2 pr-3 text-octane-red">{fmt(v.costs)}</td>
                                          <td className="py-2 pr-3 text-octane-white">{v.sale_price ? fmt(v.sale_price) : '-'}</td>
                                          <td className={`py-2 pr-3 font-medium ${v._margin === null ? 'text-octane-gray' : v._margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{v._margin === null ? '-' : fmt(v._margin)}</td>
                                          <td className={`py-2 font-medium ${v._pct === null ? 'text-octane-gray' : v._pct >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{v._pct === null ? '-' : `${v._pct.toFixed(1)}%`}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {report.salesDetails.length > 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl">
                <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">{t('Detalhe de Vendas', 'Sales Detail')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-octane-border">
                        <Th label={t('Viatura', 'Vehicle')} col="brand" sort={salesSort.sort} toggle={salesSort.toggle} />
                        <Th label={t('Comercial', 'Salesperson')} col="created_by_name" sort={salesSort.sort} toggle={salesSort.toggle} />
                        <Th label={t('Preço Compra', 'Purchase Price')} col="purchase_price" sort={salesSort.sort} toggle={salesSort.toggle} />
                        <Th label={t('Custos', 'Costs')} col="costs" sort={salesSort.sort} toggle={salesSort.toggle} />
                        <Th label={t('Preço Venda', 'Sale Price')} col="sale_price" sort={salesSort.sort} toggle={salesSort.toggle} />
                        <Th label={t('Margem (€)', 'Margin (€)')} col="margin" sort={salesSort.sort} toggle={salesSort.toggle} />
                        <Th label={t('Margem (%)', 'Margin (%)')} col="margin_percent" sort={salesSort.sort} toggle={salesSort.toggle} />
                      </tr>
                    </thead>
                    <tbody>
                      {salesSort.sorted?.map(v => (
                        <tr key={v.id} className="border-t border-octane-border">
                          <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} ({v.year})</td>
                          <td className="p-3 text-octane-gray">{v.created_by_name}</td>
                          <td className="p-3 text-octane-white">€{v.purchase_price.toLocaleString()}</td>
                          <td className="p-3 text-octane-orange">€{v.costs.toLocaleString()}</td>
                          <td className="p-3 text-octane-gold">€{v.sale_price.toLocaleString()}</td>
                          <td className={`p-3 font-medium ${v.margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>€{v.margin.toLocaleString()}</td>
                          <td className={`p-3 font-medium ${v.margin_percent >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{v.margin_percent.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReportsTabs from '@/components/ReportsTabs';
import { useSort, Th } from '@/components/useSort';
import DateRangeFilter from '@/components/DateRangeFilter';
import { useLang } from '@/lib/LanguageContext';

function fmt(n) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

export default function InvestorReportsPage() {
  const [user, setUser] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [report, setReport] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '', preset: null });
  const router = useRouter();
  const { t } = useLang();

  const perInvestorSort = useSort(report?.perInvestor, 'name');
  const invVehicleCostSort = useSort(
    useMemo(() => report?.perInvestor?.filter(inv => inv.total_investor_vehicles > 0) ?? null, [report]),
    'name'
  );
  const semInvestidorSort = useSort(
    useMemo(() => report?.semInvestidor?.stockVehicles?.map(v => {
      const cost = v.purchase_price + v.total_costs;
      const pct = v.margin !== null && cost > 0 ? v.margin / cost * 100 : null;
      return { ...v, _vehicle: `${v.brand} ${v.model}`, _pct: pct };
    }) ?? null, [report]),
    '_vehicle'
  );
  const salesSort = useSort(report?.salesDetails, 'brand');

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role === 'comercial') { router.push('/reports/viaturas'); return; }
      setUser(u);
      fetch('/api/investors').then(r => r.json()).then(setInvestors);
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams();
      if (selectedInvestor) params.set('investor_id', selectedInvestor);
      if (dateRange.from) params.set('date_from', dateRange.from);
      if (dateRange.to) params.set('date_to', dateRange.to);
      fetch(`/api/reports/investidores?${params}`).then(r => r.json()).then(setReport);
    }
  }, [user, selectedInvestor, dateRange]);

  if (!user) return null;

  const totalSummary = report?.perInvestor.reduce((acc, inv) => ({
    total_vehicles: acc.total_vehicles + inv.total_vehicles,
    in_stock: acc.in_stock + inv.in_stock,
    sold: acc.sold + inv.sold,
    reserved: acc.reserved + inv.reserved,
    total_purchase: acc.total_purchase + inv.total_purchase,
    total_sales: acc.total_sales + inv.total_sales,
    total_costs: acc.total_costs + inv.total_costs,
    gross_margin: acc.gross_margin + inv.gross_margin,
  }), { total_vehicles: 0, in_stock: 0, sold: 0, reserved: 0, total_purchase: 0, total_sales: 0, total_costs: 0, gross_margin: 0 });

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">{t('Relatórios', 'Reports')}</h1>
        <ReportsTabs userRole={user.role} />

        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {investors.length > 0 && (
          <div className="bg-octane-card border border-octane-border p-4 rounded-xl mb-6">
            <h2 className="text-xs text-octane-gray uppercase tracking-wider mb-3">{t('Filtrar por investidor', 'Filter by investor')}</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedInvestor('')}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  !selectedInvestor
                    ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                    : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                }`}>
                {t('Todos', 'All')}
              </button>
              {investors.map(inv => (
                <button key={inv.id} onClick={() => setSelectedInvestor(String(inv.id))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedInvestor === String(inv.id)
                      ? 'bg-octane-gold text-octane-black border-octane-gold font-semibold'
                      : 'border-octane-border text-octane-gray hover:border-octane-gold hover:text-octane-gold'
                  }`}>
                  {inv.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {report && totalSummary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { l: t('Total Viaturas','Total Vehicles'), v: totalSummary.total_vehicles },
                { l: t('Em Stock','In Stock'), v: totalSummary.in_stock },
                { l: t('Vendidas','Sold'), v: totalSummary.sold },
                { l: t('Reservadas','Reserved'), v: totalSummary.reserved },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className="text-2xl font-bold text-octane-white">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {[
                { l: t('Total Compras','Total Purchases'), v: `€${totalSummary.total_purchase.toLocaleString()}`, c: 'text-octane-white' },
                { l: t('Total Vendas','Total Sales'), v: `€${totalSummary.total_sales.toLocaleString()}`, c: 'text-octane-gold' },
                { l: t('Total Custos','Total Costs'), v: `€${totalSummary.total_costs.toLocaleString()}`, c: 'text-octane-orange' },
                { l: t('Margem Bruta','Gross Margin'), v: `€${totalSummary.gross_margin.toLocaleString()}`, c: totalSummary.gross_margin >= 0 ? 'text-octane-green' : 'text-octane-red' },
              ].map(s => (
                <div key={s.l} className="bg-octane-card border border-octane-border p-4 rounded-xl">
                  <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                  <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                </div>
              ))}
            </div>

            {report.perInvestor.length > 0 && (
              <>
                <div className="bg-octane-card border border-octane-border rounded-xl mb-6">
                  <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">{t('Resumo por Investidor: Stock', 'Summary by Investor: Stock')}</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-octane-border">
                          <Th label={t('Investidor', 'Investor')} col="name" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Viaturas', 'Vehicles')} col="total_vehicles" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Em Stock', 'In Stock')} col="in_stock" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Vendidas', 'Sold')} col="sold" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Reservadas', 'Reserved')} col="reserved" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Total Compras', 'Total Purchases')} col="total_purchase" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Custos', 'Costs')} col="total_costs" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Total Vendas', 'Total Sales')} col="total_sales" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                          <Th label={t('Margem', 'Margin')} col="gross_margin" sort={perInvestorSort.sort} toggle={perInvestorSort.toggle} />
                        </tr>
                      </thead>
                      <tbody>
                        {perInvestorSort.sorted?.map(inv => (
                          <tr key={inv.id} className="border-t border-octane-border">
                            <td className="p-3 font-medium text-octane-white">{inv.name}</td>
                            <td className="p-3 text-octane-white">{inv.total_vehicles}</td>
                            <td className="p-3 text-octane-green">{inv.in_stock}</td>
                            <td className="p-3 text-octane-white">{inv.sold}</td>
                            <td className="p-3 text-octane-gold">{inv.reserved}</td>
                            <td className="p-3 text-octane-white">€{inv.total_purchase.toLocaleString()}</td>
                            <td className="p-3 text-octane-orange">€{inv.total_costs.toLocaleString()}</td>
                            <td className="p-3 text-octane-gold">€{inv.total_sales.toLocaleString()}</td>
                            <td className={`p-3 font-bold ${inv.gross_margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>
                              €{inv.gross_margin.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {report.perInvestor.some(inv => inv.total_investor_vehicles > 0) && (
                  <div className="bg-octane-card border border-octane-border rounded-xl mb-6">
                    <h2 className="font-semibold p-4 pb-0 text-octane-gold text-sm uppercase tracking-wider">{t('Despesas de Viaturas de Investidores', 'Investor Vehicle Expenses')}</h2>
                    <p className="text-octane-gray text-xs px-4 pb-3">{t('Viaturas dos investidores geridas pela empresa, não entram no stock de venda', 'Investor vehicles managed by the company, not part of the sales stock')}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-octane-border">
                            <Th label={t('Investidor', 'Investor')} col="name" sort={invVehicleCostSort.sort} toggle={invVehicleCostSort.toggle} />
                            <Th label={t('Viaturas', 'Vehicles')} col="total_investor_vehicles" sort={invVehicleCostSort.sort} toggle={invVehicleCostSort.toggle} />
                            <Th label={t('Total Despesas', 'Total Expenses')} col="investor_vehicle_costs" sort={invVehicleCostSort.sort} toggle={invVehicleCostSort.toggle} />
                          </tr>
                        </thead>
                        <tbody>
                          {invVehicleCostSort.sorted?.map(inv => (
                            <tr key={inv.id} className="border-t border-octane-border">
                              <td className="p-3 font-medium text-octane-white">{inv.name}</td>
                              <td className="p-3 text-octane-white">{inv.total_investor_vehicles}</td>
                              <td className="p-3 font-bold text-octane-orange">€{inv.investor_vehicle_costs.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Sem Investidor */}
            {report.semInvestidor?.stockVehicles?.length > 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl mb-6">
                <div className="flex items-center justify-between p-4 pb-3">
                  <h2 className="font-semibold text-octane-gray text-sm uppercase tracking-wider">{t('Sem Investidor Atribuído', 'No Investor Assigned')}</h2>
                  <div className="flex gap-4 text-xs">
                    <span className="text-octane-gray">{t('Em Stock','In Stock')}: <span className="text-octane-white font-medium">{report.semInvestidor.inStock}</span></span>
                    <span className="text-octane-gray">{t('Vendidas','Sold')}: <span className="text-octane-white font-medium">{report.semInvestidor.sold}</span></span>
                    <span className="text-octane-gray">{t('Compras','Purchases')}: <span className="text-octane-white font-medium">{fmt(report.semInvestidor.totalPurchase)}</span></span>
                    <span className="text-octane-gray">{t('Custos','Costs')}: <span className="text-octane-red font-medium">{fmt(report.semInvestidor.totalCosts)}</span></span>
                    <span className="text-octane-gray">{t('Vendas','Sales')}: <span className="text-octane-gold font-medium">{fmt(report.semInvestidor.totalSales)}</span></span>
                    <span className="text-octane-gray">{t('Margem','Margin')}: <span className={`font-medium ${report.semInvestidor.grossMargin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{fmt(report.semInvestidor.grossMargin)}</span></span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-octane-border">
                        <Th label={t('Viatura', 'Vehicle')} col="_vehicle" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Matrícula', 'Plate')} col="license_plate" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Comercial', 'Salesperson')} col="created_by_name" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Estado', 'Status')} col="status" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Compra', 'Purchase')} col="purchase_price" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Custos', 'Costs')} col="total_costs" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Venda', 'Sale')} col="sale_price" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Margem (€)', 'Margin (€)')} col="margin" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                        <Th label={t('Margem (%)', 'Margin (%)')} col="_pct" sort={semInvestidorSort.sort} toggle={semInvestidorSort.toggle} />
                      </tr>
                    </thead>
                    <tbody>
                      {semInvestidorSort.sorted?.map(v => (
                        <tr key={v.id} className="border-t border-octane-border">
                          <td className="p-3 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year})</span></td>
                          <td className="p-3 text-octane-gray">{v.license_plate || '-'}</td>
                          <td className="p-3 text-octane-gray">{v.created_by_name}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green' :
                              v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold' :
                              'bg-octane-gray/10 text-octane-gray'}`}>{({ vendido: t('Vendido','Sold'), reservado: t('Reservado','Reserved'), em_stock: t('Em Stock','In Stock') })[v.status] || v.status}</span>
                          </td>
                          <td className="p-3 text-octane-white">{fmt(v.purchase_price)}</td>
                          <td className="p-3 text-octane-red">{fmt(v.total_costs)}</td>
                          <td className="p-3 text-octane-white">{v.sale_price ? fmt(v.sale_price) : '-'}</td>
                          <td className={`p-3 font-medium ${v.margin === null ? 'text-octane-gray' : v.margin >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{v.margin === null ? '-' : fmt(v.margin)}</td>
                          <td className={`p-3 font-medium ${v._pct === null ? 'text-octane-gray' : v._pct >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{v._pct === null ? '-' : `${v._pct.toFixed(1)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        <Th label={t('Investidor', 'Investor')} col="investor_name" sort={salesSort.sort} toggle={salesSort.toggle} />
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
                          <td className="p-3 text-octane-gold">{v.investor_name}</td>
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

            {/* {t('Posição Financeira por Investidor', 'Financial Position by Investor')} */}
            {report.posicaoFinanceira?.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 text-octane-gold uppercase tracking-wider text-sm">{t('Posição Financeira por Investidor', 'Financial Position by Investor')}</h2>
                <div className="space-y-4">
                  {report.posicaoFinanceira.map(inv => (
                    <div key={inv.id} className="bg-octane-card border border-octane-border rounded-xl overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between p-4 border-b border-octane-border gap-4">
                        <h3 className="font-semibold text-octane-white text-base">{inv.name}</h3>
                        <div className={`text-xl font-bold px-4 py-1 rounded-lg ${inv.balance >= 0 ? 'bg-octane-green/10 text-octane-green' : 'bg-octane-red/10 text-octane-red'}`}>
                          {t('Saldo','Balance')}: {fmt(inv.balance)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-octane-border border-b border-octane-border">
                        {[
                          { l: 'Capital Investido', v: inv.contributions, c: 'text-octane-gold' },
                          { l: 'Viaturas Compradas', v: -inv.totalPurchased, c: 'text-octane-red' },
                          { l: 'Custos de Stock', v: -inv.totalStockCosts, c: 'text-octane-red' },
                          { l: t('Despesas Viaturas','Vehicle Expenses'), v: -inv.totalInvestorCosts, c: 'text-octane-red' },
                          { l: t('Receita Vendas','Sales Revenue'), v: inv.totalSalesRevenue, c: 'text-octane-green' },
                        ].map(s => (
                          <div key={s.l} className="p-3 text-center">
                            <p className="text-xs text-octane-gray uppercase tracking-wider mb-1">{s.l}</p>
                            <p className={`font-semibold ${s.c}`}>{fmt(Math.abs(s.v))}</p>
                          </div>
                        ))}
                      </div>

                      {inv.stockVehicles.length > 0 && (
                        <div className="p-4">
                          <p className="text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Viaturas de Stock', 'Stock Vehicles')}</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-octane-border">
                                  {['Viatura', 'Matrícula', 'Estado', 'Compra', 'Custos', 'Venda', 'Resultado'].map(h => (
                                    <th key={h} className="text-left pb-2 pr-4 font-medium text-octane-gray text-xs uppercase tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {inv.stockVehicles.map(v => {
                                  const resultado = v.status === 'vendido' && v.sale_price
                                    ? v.sale_price - v.purchase_price - v.total_costs
                                    : -(v.purchase_price + v.total_costs);
                                  return (
                                    <tr key={v.id} className="border-t border-octane-border/50">
                                      <td className="py-2 pr-4 font-medium text-octane-white">{v.brand} {v.model} <span className="text-octane-gray">({v.year})</span></td>
                                      <td className="py-2 pr-4 text-octane-gray">{v.license_plate || '-'}</td>
                                      <td className="py-2 pr-4">
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                          v.status === 'vendido' ? 'bg-octane-green/10 text-octane-green' :
                                          v.status === 'reservado' ? 'bg-octane-gold/10 text-octane-gold' :
                                          'bg-octane-gray/10 text-octane-gray'
                                        }`}>{({ vendido: t('Vendido','Sold'), reservado: t('Reservado','Reserved'), em_stock: t('Em Stock','In Stock') })[v.status] || v.status}</span>
                                      </td>
                                      <td className="py-2 pr-4 text-octane-white">{fmt(v.purchase_price)}</td>
                                      <td className="py-2 pr-4 text-octane-red">{fmt(v.total_costs)}</td>
                                      <td className="py-2 pr-4 text-octane-white">{v.sale_price ? fmt(v.sale_price) : '-'}</td>
                                      <td className={`py-2 font-semibold ${resultado >= 0 ? 'text-octane-green' : 'text-octane-red'}`}>{fmt(resultado)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {inv.investorVehicles.length > 0 && (
                        <div className="px-4 pb-4 border-t border-octane-border pt-3">
                          <p className="text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Viaturas de Manutenção (não stock)', 'Maintenance Vehicles (non-stock)')}</p>
                          <div className="flex flex-wrap gap-3">
                            {inv.investorVehicles.map(v => (
                              <div key={v.id} className="bg-octane-dark rounded-lg px-3 py-2 text-sm">
                                <span className="text-octane-white">{v.brand} {v.model} ({v.year})</span>
                                {v.license_plate && <span className="text-octane-gray ml-2">{v.license_plate}</span>}
                                <span className="text-octane-red ml-3 font-medium">{fmt(v.total_costs)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.perInvestor.length === 0 && (
              <div className="bg-octane-card border border-octane-border rounded-xl p-8 text-center text-octane-gray">
                {t('Nenhum investidor registado. Cria investidores em', 'No investors registered. Create investors in')} <a href="/investors" className="text-octane-gold hover:underline">Investidores</a>.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

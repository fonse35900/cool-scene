'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useLang } from '@/lib/LanguageContext';

// ---- ISV / IUC calculation (Portugal, tabelas 2024) ----

function isvCilindradaGasolina(cc) {
  if (cc <= 1000) return cc * 1.00;
  if (cc <= 1250) return 1000 * 1.00 + (cc - 1000) * 1.07;
  if (cc <= 1500) return 1000 * 1.00 + 250 * 1.07 + (cc - 1250) * 1.14;
  if (cc <= 1750) return 1000 * 1.00 + 250 * 1.07 + 250 * 1.14 + (cc - 1500) * 4.87;
  if (cc <= 2000) return 1000 * 1.00 + 250 * 1.07 + 250 * 1.14 + 250 * 4.87 + (cc - 1750) * 6.44;
  if (cc <= 2500) return 1000 * 1.00 + 250 * 1.07 + 250 * 1.14 + 250 * 4.87 + 250 * 6.44 + (cc - 2000) * 10.32;
  return 1000 * 1.00 + 250 * 1.07 + 250 * 1.14 + 250 * 4.87 + 250 * 6.44 + 500 * 10.32 + (cc - 2500) * 16.62;
}
function isvCilindradaDiesel(cc) { return isvCilindradaGasolina(cc) * 1.10; }

function isvCO2Gasolina(co2) {
  if (co2 <= 99) return co2 * 4.34;
  if (co2 <= 115) return 99 * 4.34 + (co2 - 99) * 7.57;
  if (co2 <= 145) return 99 * 4.34 + 16 * 7.57 + (co2 - 115) * 49.16;
  if (co2 <= 175) return 99 * 4.34 + 16 * 7.57 + 30 * 49.16 + (co2 - 145) * 55.34;
  if (co2 <= 195) return 99 * 4.34 + 16 * 7.57 + 30 * 49.16 + 30 * 55.34 + (co2 - 175) * 143.44;
  return 99 * 4.34 + 16 * 7.57 + 30 * 49.16 + 30 * 55.34 + 20 * 143.44 + (co2 - 195) * 199.28;
}
function isvCO2Diesel(co2) { return isvCO2Gasolina(co2) * 1.10; }

function reducaoIdade(anoMatricula) {
  const idade = new Date().getFullYear() - anoMatricula;
  if (idade <= 0) return 1.00;
  if (idade === 1) return 0.90;
  if (idade === 2) return 0.80;
  if (idade === 3) return 0.70;
  if (idade === 4) return 0.60;
  if (idade === 5) return 0.52;
  if (idade === 6) return 0.44;
  if (idade === 7) return 0.37;
  if (idade === 8) return 0.31;
  if (idade === 9) return 0.25;
  return 0.20;
}

function calcularIUC(cc, co2, combustivel, anoMatricula) {
  if (combustivel === 'eletrico') return 0;
  if (anoMatricula < 2007) {
    if (cc <= 1000) return 19.90;
    if (cc <= 1300) return 39.55;
    if (cc <= 1750) return 62.40;
    if (cc <= 2600) return 158.31;
    if (cc <= 3500) return 287.49;
    return 512.23;
  }
  let parcCil = 0;
  if (cc <= 1250) parcCil = 28.43;
  else if (cc <= 1750) parcCil = 56.98;
  else if (cc <= 2500) parcCil = 113.38;
  else parcCil = 387.81;

  let parcCO2 = 0;
  if (co2 <= 120) parcCO2 = 60.44;
  else if (co2 <= 180) parcCO2 = 90.49;
  else if (co2 <= 250) parcCO2 = 207.80;
  else parcCO2 = 363.25;

  const agravDiesel = combustivel.includes('diesel') ? 1.10 : 1.00;
  return (parcCil + parcCO2) * agravDiesel;
}

function formatMoney(val) {
  return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SimuladorPage() {
  const [user, setUser] = useState(null);
  const [origem, setOrigem] = useState('ue');
  const [combustivel, setCombustivel] = useState('gasolina');
  const [tipoVeiculo, setTipoVeiculo] = useState('ligeiro_passageiros');
  const [cilindrada, setCilindrada] = useState('');
  const [co2, setCo2] = useState('');
  const [anoMatricula, setAnoMatricula] = useState(String(new Date().getFullYear()));
  const [valorAquisicao, setValorAquisicao] = useState('');
  const [resultado, setResultado] = useState(null);
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject())
      .then(u => { if (u.role === 'investidor') { router.replace('/investor'); } else { setUser(u); } })
      .catch(() => router.push('/login'));
  }, [router]);

  const isEletrico = combustivel === 'eletrico';
  const anos = [];
  for (let a = new Date().getFullYear(); a >= 2000; a--) anos.push(a);

  function calcular() {
    const cc = parseInt(cilindrada) || 0;
    const emissoes = parseInt(co2) || 0;
    const ano = parseInt(anoMatricula);
    const valor = parseFloat(valorAquisicao) || 0;

    const linhas = [];
    linhas.push({ nome: t('Valor de aquisição do veículo', 'Vehicle purchase price'), valor });

    let direitosAduaneiros = 0;
    if (origem === 'fora_ue') {
      direitosAduaneiros = valor * 0.065;
      linhas.push({ nome: t('Direitos aduaneiros (6,5%)', 'Customs duties (6.5%)'), valor: direitosAduaneiros, info: t('Aplicável a importações fora da UE', 'Applies to non-EU imports') });
    }

    let iva = 0;
    if (origem === 'fora_ue') {
      iva = (valor + direitosAduaneiros) * 0.23;
      linhas.push({ nome: t('IVA (23%)', 'VAT (23%)'), valor: iva, info: t('Sobre valor + direitos aduaneiros', 'On price + customs duties') });
    }

    let isv = 0;
    if (!isEletrico) {
      let compCilindrada = combustivel.includes('diesel') ? isvCilindradaDiesel(cc) : isvCilindradaGasolina(cc);
      let compCO2 = combustivel.includes('diesel') ? isvCO2Diesel(emissoes) : isvCO2Gasolina(emissoes);

      if (combustivel.startsWith('hibrido') && emissoes <= 50) compCO2 *= 0.25;

      isv = Math.max(0, compCilindrada + compCO2);
      const fatorIdade = reducaoIdade(ano);
      isv = isv * fatorIdade;

      linhas.push({ nome: t('ISV — Componente cilindrada', 'ISV — Engine size component'), valor: compCilindrada * fatorIdade, info: cc + ' cm³' });
      linhas.push({ nome: t('ISV — Componente ambiental (CO2)', 'ISV — Environmental component (CO2)'), valor: compCO2 * fatorIdade, info: emissoes + ' g/km' });
      linhas.push({
        nome: t(`ISV Total (com redução ${Math.round((1 - fatorIdade) * 100)}% pela idade)`, `Total ISV (with ${Math.round((1 - fatorIdade) * 100)}% age reduction)`),
        valor: isv, destaque: true,
        info: t(`Redução por veículo de ${new Date().getFullYear() - ano} ano(s)`, `Reduction for a ${new Date().getFullYear() - ano}-year-old vehicle`),
      });
    } else {
      linhas.push({ nome: 'ISV', valor: 0, info: t('Veículos elétricos isentos de ISV', 'Electric vehicles are ISV-exempt') });
    }

    const transporte = origem === 'fora_ue' ? 1500 : 600;
    linhas.push({ nome: t('Transporte estimado', 'Estimated transport'), valor: transporte, info: origem === 'fora_ue' ? t('Estimativa fora da UE', 'Non-EU estimate') : t('Estimativa dentro da UE', 'EU estimate') });

    const despachante = 350;
    linhas.push({ nome: t('Despachante / Legalização (estimativa)', 'Customs agent / Registration (estimate)'), valor: despachante });

    const inspecao = 120;
    linhas.push({ nome: t('Inspeção e homologação (estimativa)', 'Inspection and homologation (estimate)'), valor: inspecao });

    const iuc = calcularIUC(cc, emissoes, combustivel, ano);
    const total = valor + direitosAduaneiros + iva + isv + transporte + despachante + inspecao;

    setResultado({ linhas, iuc, total });
    setTimeout(() => document.getElementById('sim-resultados')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  if (!user) return null;

  const inputClass = "px-3 py-2.5 bg-octane-card border border-octane-border rounded-lg text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";
  const labelClass = "text-xs font-semibold text-octane-gray uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-octane-black">
      <Navbar user={user} />
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wide mb-1">{t('Simulador de Importação de Viaturas', 'Vehicle Import Simulator')}</h1>
          <p className="text-octane-gray text-sm">{t('Calcule os custos de importação de veículos para Portugal', 'Estimate the cost of importing vehicles into Portugal')}</p>
        </div>

        <div className="bg-octane-card border border-octane-border rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-octane-border">{t('Dados do Veículo', 'Vehicle Details')}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:col-span-2">
              <label className={labelClass}>{t('Origem da importação', 'Import origin')}</label>
              <div className="flex rounded-lg overflow-hidden border border-octane-border">
                {[['ue', t('União Europeia', 'European Union')], ['fora_ue', t('Fora da UE', 'Outside the EU')]].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setOrigem(val)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${origem === val ? 'bg-octane-gold text-octane-black' : 'bg-octane-card text-octane-gray hover:text-octane-white'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>{t('Tipo de combustível', 'Fuel type')}</label>
              <select value={combustivel} onChange={e => setCombustivel(e.target.value)} className={inputClass}>
                <option value="gasolina">{t('Gasolina', 'Petrol')}</option>
                <option value="diesel">{t('Gasóleo (Diesel)', 'Diesel')}</option>
                <option value="hibrido_gasolina">{t('Híbrido (Gasolina)', 'Hybrid (Petrol)')}</option>
                <option value="hibrido_diesel">{t('Híbrido (Gasóleo)', 'Hybrid (Diesel)')}</option>
                <option value="eletrico">{t('Elétrico', 'Electric')}</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>{t('Tipo de veículo', 'Vehicle type')}</label>
              <select value={tipoVeiculo} onChange={e => setTipoVeiculo(e.target.value)} className={inputClass}>
                <option value="ligeiro_passageiros">{t('Ligeiro de passageiros', 'Passenger car')}</option>
                <option value="ligeiro_mercadorias">{t('Ligeiro de mercadorias', 'Light commercial')}</option>
              </select>
            </div>

            {!isEletrico && (
              <div className="flex flex-col">
                <label className={labelClass}>{t('Cilindrada (cm³)', 'Engine size (cc)')}</label>
                <input type="number" value={cilindrada} onChange={e => setCilindrada(e.target.value)} placeholder="Ex: 1598" min="0" max="20000" className={inputClass} />
              </div>
            )}

            {!isEletrico && (
              <div className="flex flex-col">
                <label className={labelClass}>{t('Emissões CO2 (g/km) — NEDC', 'CO2 emissions (g/km) — NEDC')}</label>
                <input type="number" value={co2} onChange={e => setCo2(e.target.value)} placeholder="Ex: 120" min="0" max="500" className={inputClass} />
              </div>
            )}

            <div className="flex flex-col">
              <label className={labelClass}>{t('Ano da 1ª matrícula', 'Year of first registration')}</label>
              <select value={anoMatricula} onChange={e => setAnoMatricula(e.target.value)} className={inputClass}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>{t('Valor de aquisição (€)', 'Purchase price (€)')}</label>
              <input type="number" value={valorAquisicao} onChange={e => setValorAquisicao(e.target.value)} placeholder="Ex: 15000" min="0" className={inputClass} />
            </div>
          </div>

          <button onClick={calcular}
            className="w-full mt-5 py-3.5 bg-octane-gold text-octane-black rounded-lg font-semibold hover:bg-octane-gold-light transition-colors">
            {t('Calcular custos de importação', 'Calculate import costs')}
          </button>
        </div>

        {resultado && (
          <div id="sim-resultados" className="bg-octane-card border border-octane-border rounded-xl p-6">
            <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-octane-border">{t('Resultados da Simulação', 'Simulation Results')}</h2>
            <div className="text-center mb-6">
              <div className="text-xs text-octane-gray uppercase tracking-wider mb-1">{t('Custo total estimado de importação', 'Total estimated import cost')}</div>
              <div className="text-4xl font-bold text-octane-gold">€ {formatMoney(resultado.total)}</div>
            </div>

            <div className="flex flex-col gap-2.5">
              {resultado.linhas.map((l, i) => (
                <div key={i} className={`flex justify-between items-center px-4 py-3 rounded-lg ${l.destaque ? 'bg-octane-gold/10 border border-octane-gold/30' : 'bg-octane-dark'}`}>
                  <div>
                    <div className="text-sm text-octane-white">{l.nome}</div>
                    {l.info && <div className="text-xs text-octane-gray mt-0.5">{l.info}</div>}
                  </div>
                  <div className={`font-semibold text-sm whitespace-nowrap ml-3 ${l.destaque ? 'text-octane-gold' : 'text-octane-white'}`}>€ {formatMoney(l.valor)}</div>
                </div>
              ))}

              <div className="h-px bg-octane-border my-1" />

              <div className="flex justify-between items-center px-4 py-3 rounded-lg bg-octane-dark">
                <div>
                  <div className="text-sm text-octane-white">{t('IUC anual estimado', 'Estimated annual road tax (IUC)')}</div>
                  <div className="text-xs text-octane-gray mt-0.5">{t('Imposto Único de Circulação (pago anualmente)', 'Annual circulation tax')}</div>
                </div>
                <div className="font-semibold text-sm whitespace-nowrap ml-3 text-octane-white">€ {formatMoney(resultado.iuc)}</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-octane-dark rounded-lg text-xs text-octane-gray leading-relaxed">
              <strong className="text-octane-white">{t('Nota:', 'Note:')}</strong>{' '}
              {t('Os valores apresentados são estimativas baseadas nas tabelas do ISV e IUC em vigor. Os valores reais podem variar consoante a avaliação da Autoridade Tributária e Aduaneira. Para veículos usados, o ISV beneficia de uma redução conforme a idade do veículo. Consulte sempre um despachante oficial para valores definitivos.',
                'These values are estimates based on the current ISV and IUC tables. Actual amounts may vary according to the Tax and Customs Authority assessment. For used vehicles, ISV benefits from an age-based reduction. Always consult an official customs agent for final figures.')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

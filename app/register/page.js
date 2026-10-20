'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import { BRAND } from '@/lib/brand';

const SALES_EMAIL = 'francisco@kyrga.com';

export default function RegisterPage() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/register-company', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || t('Erro ao criar conta', 'Error creating account'));
    }
  }

  const plans = [
    {
      id: 'free', name: t('Free', 'Free'), price: '€0', unit: t('/ 14 dias de avaliação', '/ 14-day trial'),
      tagline: t('Para um stand a começar. Avaliação de 14 dias com dados demo.', 'For a single stand getting started. 14-day trial with demo data.'),
      features: [
        t('1 empresa (email da empresa)', '1 company (company email)'),
        t('Até 2 utilizadores', 'Up to 2 users'),
        t('Até 25 viaturas', 'Up to 25 vehicles'),
        t('Dados demo + cores KYRGA', 'Demo data + KYRGA colours'),
        t('Português e Inglês', 'Portuguese & English'),
      ],
      cta: t('Começar grátis', 'Start free'), action: 'free', highlight: false,
    },
    {
      id: 'pro', name: t('Pro', 'Pro'), price: '€19', unit: t('/ utilizador / mês', '/ user / month'),
      tagline: t('Tudo para gerir e crescer o negócio.', 'Everything to run and grow the business.'),
      features: [
        t('Viaturas e investidores ilimitados', 'Unlimited vehicles & investors'),
        t('Relatórios, registo de auditoria e anulação', 'Reports, audit log & undo'),
        t('Simulador de custos de importação', 'Import cost simulator'),
        t('Marca branca e paletas', 'White-label branding & palettes'),
        t('Convites de equipa e papéis', 'Team invitations & roles'),
        t('Suporte por email', 'Email support'),
      ],
      cta: t('Iniciar teste 14 dias', 'Start 14-day trial'), action: 'sales', highlight: true,
    },
    {
      id: 'enterprise', name: t('Enterprise', 'Enterprise'), price: 'Custom', unit: '',
      tagline: t('Para grupos e revendedores white-label.', 'For groups and white-label resellers.'),
      features: [
        t('Várias empresas, dados isolados', 'Multiple companies, isolated data'),
        t('Implementação white-label dedicada', 'Dedicated white-label deployment'),
        t('Onboarding e importação de dados', 'Onboarding & data import'),
        t('Suporte prioritário e SLA', 'Priority support & SLA'),
        t('Domínio próprio', 'Custom domain'),
      ],
      cta: t('Falar com vendas', 'Talk to sales'), action: 'sales', highlight: false,
    },
  ];

  function choose(plan) {
    if (plan.action === 'free') { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else {
      window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`${BRAND.name} — ${plan.name}`)}`;
    }
  }

  return (
    <div className="min-h-screen bg-octane-black py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <img src={BRAND.logo} alt={BRAND.name} className="h-14 mx-auto mb-4 max-w-[220px] object-contain" />
          <div className="w-12 h-0.5 bg-octane-gold mx-auto mb-5"></div>
          <div className="flex justify-center mb-4">
            <div className="flex items-center border border-octane-border rounded-full overflow-hidden text-xs">
              <button type="button" onClick={() => setLang('pt')}
                className={`px-3 py-1.5 font-medium transition-colors ${lang === 'pt' ? 'bg-octane-gold text-octane-black' : 'text-octane-gray hover:text-octane-white'}`}>PT</button>
              <button type="button" onClick={() => setLang('en')}
                className={`px-3 py-1.5 font-medium transition-colors ${lang === 'en' ? 'bg-octane-gold text-octane-black' : 'text-octane-gray hover:text-octane-white'}`}>EN</button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-octane-white">{t('Criar conta', 'Create account')}</h1>
          <p className="text-octane-gray text-sm mt-1">{t('Escolha um plano para começar.', 'Choose a plan to get started.')}</p>
        </div>

        {showForm && (
          <div className="bg-octane-dark border border-octane-border rounded-2xl p-6 md:p-8 max-w-md mx-auto mb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-octane-white">{t('Conta Free', 'Free account')}</h2>
              <button onClick={() => setShowForm(false)} className="text-octane-gray hover:text-octane-white text-sm">{t('Ver planos', 'See plans')}</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Nome da empresa', 'Company name')}</label>
                <input value={form.company_name} onChange={e => set('company_name', e.target.value)} required
                  className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('O seu nome', 'Your name')}</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required
                  className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                  className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none" />
                <p className="text-[11px] text-octane-gray mt-1">{t('Use o email da empresa (não são aceites gmail, outlook, etc.). O domínio identifica a empresa.', 'Use your company email (gmail, outlook, etc. are not accepted). The domain identifies the company.')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Password</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6}
                  placeholder={t('Mínimo 6 caracteres', 'Minimum 6 characters')}
                  className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none placeholder-octane-gray/50" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-octane-gold text-octane-black py-3 rounded-lg hover:bg-octane-gold-light font-semibold tracking-wide transition-colors disabled:opacity-60">
                {loading ? t('A criar...', 'Creating...') : t('Criar conta grátis', 'Create free account')}
              </button>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map(p => (
            <div key={p.id}
              className={`relative bg-octane-card border rounded-2xl p-6 flex flex-col ${p.highlight ? 'border-octane-gold shadow-lg' : 'border-octane-border'}`}>
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-octane-gold text-octane-black text-xs font-semibold px-3 py-1 rounded-full">{t('Mais popular', 'Most popular')}</span>
              )}
              <p className="text-xs font-semibold text-octane-gray uppercase tracking-widest mb-3">{p.name}</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-octane-white">{p.price}</span>
                {p.unit && <span className="text-octane-gray text-sm mb-1">{p.unit}</span>}
              </div>
              <p className="text-octane-gray text-sm mb-5 min-h-[40px]">{p.tagline}</p>
              <button onClick={() => choose(p)}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors mb-5 ${
                  p.highlight
                    ? 'bg-octane-gold text-octane-black hover:bg-octane-gold-light'
                    : 'border border-octane-border text-octane-white hover:border-octane-gold hover:text-octane-gold'
                }`}>
                {p.cta}
              </button>
              <ul className="space-y-2.5 text-sm">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-octane-white">
                    <span className="text-octane-gold mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-octane-gray mt-10">
          {t('Já tem conta?', 'Already have an account?')}{' '}
          <a href="/login" className="text-octane-gold font-semibold hover:underline">{t('Entrar', 'Sign in')}</a>
        </p>
      </div>
    </div>
  );
}

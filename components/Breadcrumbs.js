'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';

// Clickable breadcrumbs + a back button, shown on every authenticated page.
export default function Breadcrumbs({ role }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();

  const home = role === 'investidor'
    ? { label: t('Portal do Investidor', 'Investor Portal'), href: '/investor' }
    : { label: t('Dashboard', 'Dashboard'), href: '/dashboard' };
  const V = { label: t('Viaturas', 'Vehicles'), href: '/vehicles' };
  const R = { label: t('Relatórios', 'Reports'), href: '/reports' };
  const P = { label: t('Painel', 'Panel'), href: '/perfil' };

  function build() {
    const cur = (label) => ({ label, href: null });
    const chains = {
      '/dashboard': [cur(home.label)],
      '/investor': [cur(home.label)],
      '/vehicles': [home, cur(V.label)],
      '/vehicles/new': [home, V, cur(t('Nova Viatura', 'New Vehicle'))],
      '/vehicles/investidor': [home, V, cur(t('Viaturas de Investidores', 'Investor Vehicles'))],
      '/reports': [home, cur(R.label)],
      '/reports/viaturas': [home, R, cur(t('Viaturas', 'Vehicles'))],
      '/reports/investidores': [home, R, cur(t('Investidores', 'Investors'))],
      '/simulador': [home, cur(t('Simulador', 'Simulator'))],
      '/perfil': [home, cur(P.label)],
      '/users': [home, P, cur(t('Utilizadores', 'Users'))],
      '/investors': [home, P, cur(t('Investidores', 'Investors'))],
      '/empresa': [home, P, cur(t('Empresa', 'Company'))],
      '/empresas': [home, P, cur(t('Empresas', 'Companies'))],
      '/logs': [home, P, cur(t('Registo', 'Log'))],
      '/backups': [home, P, cur(t('Backups', 'Backups'))],
    };
    if (chains[pathname]) return chains[pathname];
    // Vehicle detail: /vehicles/<id>
    if (/^\/vehicles\/[^/]+$/.test(pathname)) return [home, V, cur(t('Viatura', 'Vehicle'))];
    return [home];
  }

  const crumbs = build();

  return (
    <div className="bg-octane-dark border-b border-octane-border">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="flex items-center gap-1 text-xs text-octane-gray hover:text-octane-white border border-octane-border hover:border-octane-gold rounded-md px-2.5 py-1 transition-colors"
          aria-label={t('Voltar', 'Back')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {t('Voltar', 'Back')}
        </button>
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs flex-wrap min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-octane-gray/50">/</span>}
              {c.href
                ? <a href={c.href} className="text-octane-gray hover:text-octane-gold transition-colors">{c.label}</a>
                : <span className="text-octane-white font-medium">{c.label}</span>}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}

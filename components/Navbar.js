'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import { useBranding } from '@/lib/BrandingContext';

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const branding = useBranding();

  const roleLabels = {
    admin: t('Administrador', 'Administrator'),
    director: t('Diretor', 'Director'),
    comercial: t('Comercial', 'Sales'),
    investidor: t('Investidor', 'Investor'),
  };

  async function logout() {
    await fetch('/api/users/me', { method: 'POST' });
    router.push('/login');
  }

  const links = user.role === 'investidor' ? [
    { href: '/investor', label: t('Portal do Investidor', 'Investor Portal') },
    { href: '/perfil', label: t('Painel', 'Panel') },
  ] : [
    { href: '/dashboard', label: t('Dashboard', 'Dashboard') },
    { href: '/vehicles', label: t('Viaturas', 'Vehicles') },
    { href: '/reports', label: t('Relatórios', 'Reports') },
    { href: '/perfil', label: t('Painel', 'Panel') },
  ];

  const painelPaths = ['/perfil', '/users', '/investors', '/empresa', '/empresas', '/backups', '/logs'];
  const isActive = (href) => pathname === href || (href === '/perfil' && painelPaths.includes(pathname));

  const LangToggle = () => (
    <div className="flex items-center border border-octane-border rounded-full overflow-hidden text-xs">
      <button onClick={() => setLang('pt')}
        className={`px-2.5 py-1 font-medium transition-colors ${lang === 'pt' ? 'bg-octane-gold text-octane-black' : 'text-octane-gray hover:text-octane-white'}`}>
        PT
      </button>
      <button onClick={() => setLang('en')}
        className={`px-2.5 py-1 font-medium transition-colors ${lang === 'en' ? 'bg-octane-gold text-octane-black' : 'text-octane-gray hover:text-octane-white'}`}>
        EN
      </button>
    </div>
  );

  return (
    <nav className="bg-octane-dark border-b border-octane-border">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href={user.role === 'investidor' ? '/investor' : '/dashboard'}>
            <img src={branding.logo} alt={branding.name} className="h-8 max-w-[200px] object-contain" />
          </a>
          <div className="hidden md:flex gap-1">
            {links.map(l => (
              <a key={l.href} href={l.href}
                className={`px-3 py-2 rounded text-sm font-medium tracking-wide transition-colors ${
                  isActive(l.href)
                    ? 'text-octane-gold border-b-2 border-octane-gold'
                    : 'text-octane-gray hover:text-octane-white'
                }`}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LangToggle />
          <span className="text-sm text-octane-gray hidden sm:inline">
            {user.name} <span className="text-octane-gold">({roleLabels[user.role]})</span>
          </span>
          <button onClick={logout} className="text-sm border border-octane-gold text-octane-gold hover:bg-octane-gold hover:text-octane-black px-3 py-1 rounded transition-colors">
            {t('Sair', 'Log out')}
          </button>
        </div>
      </div>
      <div className="md:hidden flex gap-1 px-4 pb-2 flex-wrap">
        {links.map(l => (
          <a key={l.href} href={l.href}
            className={`px-3 py-1 rounded text-xs font-medium ${
              isActive(l.href) ? 'text-octane-gold' : 'text-octane-gray hover:text-octane-white'
            }`}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

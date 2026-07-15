'use client';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';

export default function PainelTabs({ userRole }) {
  const pathname = usePathname();
  const { t } = useLang();

  const tabs = [
    { href: '/perfil', label: t('Perfil', 'Profile') },
    ...(userRole === 'admin' || userRole === 'director' ? [
      { href: '/users', label: t('Utilizadores', 'Users') },
      { href: '/investors', label: t('Investidores', 'Investors') },
      { href: '/empresa', label: t('Empresa', 'Company') },
      { href: '/backups', label: t('Backups', 'Backups') },
      { href: '/logs', label: t('Registo', 'Log') },
    ] : []),
  ];

  return (
    <div className="flex gap-1 border-b border-octane-border mb-6">
      {tabs.map(tab => (
        <a key={tab.href} href={tab.href}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            pathname === tab.href
              ? 'border-octane-gold text-octane-gold'
              : 'border-transparent text-octane-gray hover:text-octane-white'
          }`}>
          {tab.label}
        </a>
      ))}
    </div>
  );
}

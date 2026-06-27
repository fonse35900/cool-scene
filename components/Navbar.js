'use client';
import { useRouter, usePathname } from 'next/navigation';

const roleLabels = { admin: 'Administrador', director: 'Diretor', comercial: 'Comercial' };

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/users/me', { method: 'POST' });
    router.push('/login');
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/vehicles', label: 'Viaturas' },
    ...(user.role !== 'comercial' ? [{ href: '/users', label: 'Utilizadores' }] : []),
    { href: '/reports', label: 'Relatórios' },
  ];

  return (
    <nav className="bg-octane-dark border-b border-octane-border">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/dashboard">
            <img src="/logo-octane.jpeg" alt="OCTANE" className="h-8" />
          </a>
          <div className="hidden md:flex gap-1">
            {links.map(l => (
              <a key={l.href} href={l.href}
                className={`px-3 py-2 rounded text-sm font-medium tracking-wide transition-colors ${
                  pathname === l.href
                    ? 'text-octane-gold border-b-2 border-octane-gold'
                    : 'text-octane-gray hover:text-octane-white'
                }`}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-octane-gray">
            {user.name} <span className="text-octane-gold">({roleLabels[user.role]})</span>
          </span>
          <button onClick={logout} className="text-sm border border-octane-gold text-octane-gold hover:bg-octane-gold hover:text-octane-black px-3 py-1 rounded transition-colors">
            Sair
          </button>
        </div>
      </div>
      <div className="md:hidden flex gap-1 px-4 pb-2">
        {links.map(l => (
          <a key={l.href} href={l.href}
            className={`px-3 py-1 rounded text-xs font-medium ${
              pathname === l.href ? 'text-octane-gold' : 'text-octane-gray hover:text-octane-white'
            }`}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

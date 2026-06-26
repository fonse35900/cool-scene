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
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold">🚗 Gestão Viaturas</span>
          <div className="hidden md:flex gap-1">
            {links.map(l => (
              <a key={l.href} href={l.href}
                className={`px-3 py-2 rounded text-sm ${pathname === l.href ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            {user.name} <span className="text-slate-400">({roleLabels[user.role]})</span>
          </span>
          <button onClick={logout} className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded">Sair</button>
        </div>
      </div>
      <div className="md:hidden flex gap-1 px-4 pb-2">
        {links.map(l => (
          <a key={l.href} href={l.href}
            className={`px-3 py-1 rounded text-xs ${pathname === l.href ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

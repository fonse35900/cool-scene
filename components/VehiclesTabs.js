'use client';
import { usePathname } from 'next/navigation';

export default function VehiclesTabs({ userRole }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/vehicles', label: 'Stock Octane' },
    ...(userRole !== 'comercial' ? [{ href: '/vehicles/investidor', label: 'Viaturas de Investidores' }] : []),
  ];

  return (
    <div className="flex gap-1 border-b border-octane-border mb-6">
      {tabs.map(t => (
        <a key={t.href} href={t.href}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            pathname === t.href
              ? 'border-octane-gold text-octane-gold'
              : 'border-transparent text-octane-gray hover:text-octane-white'
          }`}>
          {t.label}
        </a>
      ))}
    </div>
  );
}

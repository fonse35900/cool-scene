'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import { useBranding } from '@/lib/BrandingContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const branding = useBranding();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      branding.reload();
      const me = await res.json();
      router.push(me.role === 'investidor' ? '/investor' : '/dashboard');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-octane-black">
      <div className="bg-octane-dark border border-octane-border p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <img src={branding.logo} alt={branding.name} className="h-16 mx-auto mb-4 max-w-[240px] object-contain" />
          <div className="w-12 h-0.5 bg-octane-gold mx-auto"></div>
        </div>
        <div className="flex justify-center mb-6">
          <div className="flex items-center border border-octane-border rounded-full overflow-hidden text-xs">
            <button type="button" onClick={() => setLang('pt')}
              className={`px-3 py-1.5 font-medium transition-colors ${lang === 'pt' ? 'bg-octane-gold text-octane-black' : 'text-octane-gray hover:text-octane-white'}`}>PT</button>
            <button type="button" onClick={() => setLang('en')}
              className={`px-3 py-1.5 font-medium transition-colors ${lang === 'en' ? 'bg-octane-gold text-octane-black' : 'text-octane-gray hover:text-octane-white'}`}>EN</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Email', 'Email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none placeholder-octane-gray/50"
              placeholder={t('seu@email.pt', 'you@email.com')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Password', 'Password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none placeholder-octane-gray/50"
              placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full bg-octane-gold text-octane-black py-3 rounded-lg hover:bg-octane-gold-light font-semibold tracking-wide transition-colors">
            {t('Entrar', 'Sign in')}
          </button>
        </form>
      </div>
    </div>
  );
}

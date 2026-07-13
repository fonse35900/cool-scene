'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push('/dashboard');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-octane-black">
      <div className="bg-octane-dark border border-octane-border p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-octane.jpeg" alt="OCTANE - Car Dealer & Collector" className="h-16 mx-auto mb-4" />
          <div className="w-12 h-0.5 bg-octane-gold mx-auto"></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-octane-red/10 border border-octane-red/30 text-octane-red p-3 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none placeholder-octane-gray/50"
              placeholder="seu@email.pt" />
          </div>
          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none placeholder-octane-gray/50"
              placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full bg-octane-gold text-octane-black py-3 rounded-lg hover:bg-octane-gold-light font-semibold tracking-wide transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

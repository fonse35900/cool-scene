'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PainelTabs from '@/components/PainelTabs';
import { useLang } from '@/lib/LanguageContext';
import { useBranding } from '@/lib/BrandingContext';
import { PALETTES, paletteCss } from '@/lib/palettes';

const inputClass = "w-full bg-octane-card border border-octane-border rounded-lg px-4 py-3 text-sm text-octane-white focus:ring-2 focus:ring-octane-gold focus:border-octane-gold focus:outline-none";

export default function EmpresaPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [palette, setPalette] = useState('octane');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { t, lang } = useLang();
  const branding = useBranding();

  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role !== 'admin' && u.role !== 'director') { router.push('/perfil'); return; }
      setUser(u);
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(list => {
      // Own company (director sees only theirs; admin gets the one matching their company_id)
      const own = Array.isArray(list) ? (list.find(c => c.id === (user?.company_id)) || list[0]) : null;
      if (own) { setName(own.name || ''); setLogo(own.logo || ''); setPalette(own.palette || 'octane'); }
    });
  }, [user]);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setMsg({ type: 'err', text: t('Ficheiro demasiado grande (máx. 1MB).', 'File too large (max 1MB).') });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const res = await fetch('/api/companies', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, logo, palette }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ type: 'ok', text: t('Guardado com sucesso.', 'Saved successfully.') });
      branding.reload();
    } else {
      setMsg({ type: 'err', text: (await res.json()).error });
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-octane-black">
      {/* Live preview of the selected palette across the app */}
      <style dangerouslySetInnerHTML={{ __html: paletteCss(palette) }} />
      <Navbar user={user} />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold tracking-wide mb-6">{t('Painel', 'Panel')}</h1>
        <PainelTabs userRole={user.role} />

        <form onSubmit={save} className="bg-octane-card border border-octane-border rounded-xl p-6 space-y-6">
          {msg && (
            <div className={`p-3 rounded text-sm border ${
              msg.type === 'ok'
                ? 'bg-octane-green/10 border-octane-green/30 text-octane-green'
                : 'bg-octane-red/10 border-octane-red/30 text-octane-red'
            }`}>{msg.text}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Nome da Empresa', 'Company Name')}</label>
            <input value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-2">{t('Logótipo', 'Logo')}</label>
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-octane-dark border border-octane-border rounded-lg p-3 h-20 flex items-center justify-center min-w-[160px]">
                {logo
                  ? <img src={logo} alt={t('Pré-visualização', 'Preview')} className="max-h-14 max-w-[220px] object-contain" />
                  : <span className="text-octane-gray text-xs">{t('Sem logótipo', 'No logo')}</span>}
              </div>
              <div>
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onFile}
                  className="block text-sm text-octane-gray file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-octane-gold file:text-octane-black file:text-sm file:font-semibold hover:file:bg-octane-gold-light file:cursor-pointer" />
                <p className="text-xs text-octane-gray/60 mt-2">{t('PNG, JPG, SVG ou WEBP. Máx. 1MB.', 'PNG, JPG, SVG or WEBP. Max 1MB.')}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-octane-gray uppercase tracking-wider mb-3">{t('Palete de Cores', 'Color Palette')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.values(PALETTES).map(p => (
                <button type="button" key={p.id} onClick={() => setPalette(p.id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    palette === p.id ? 'border-octane-gold ring-2 ring-octane-gold/40' : 'border-octane-border hover:border-octane-gray'
                  }`}>
                  <div className="flex gap-1.5 mb-2">
                    {p.swatch.map((c, i) => (
                      <span key={i} className="w-6 h-6 rounded-full border border-black/20" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs text-octane-white block leading-tight">{lang === 'pt' ? p.name_pt : p.name_en}</span>
                  {palette === p.id && <span className="text-[10px] text-octane-gold uppercase tracking-wider">{t('Selecionada', 'Selected')}</span>}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={busy}
            className="bg-octane-gold text-octane-black px-6 py-2.5 rounded-lg hover:bg-octane-gold-light text-sm font-semibold transition-colors disabled:opacity-40">
            {busy ? t('A guardar...', 'Saving...') : t('Guardar Alterações', 'Save Changes')}
          </button>
        </form>

        <p className="text-xs text-octane-gray/60 mt-4">
          {t('O nome, o logótipo e a palete de cores são aplicados em toda a aplicação (menu, login e convites).', 'The name, logo and color palette are applied across the whole app (menu, login and invitations).')}
        </p>
      </div>
    </div>
  );
}

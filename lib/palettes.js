// Color palettes selectable per company. Each palette overrides the octane-*
// CSS variables that Tailwind's utilities reference, so switching one reskins
// the whole app at runtime. The variable names must match the @theme tokens in
// globals.css.

export const PALETTES = {
  octane: {
    id: 'octane',
    name_pt: 'Azul',
    name_en: 'Blue',
    swatch: ['#0A0C12', '#2348E8', '#F5F7FA'],
    vars: {
      '--color-octane-black': '#0D0D0D',
      '--color-octane-dark': '#1A1A1A',
      '--color-octane-card': '#222222',
      '--color-octane-border': '#333333',
      '--color-octane-gold': '#C8A86E',
      '--color-octane-gold-light': '#D4BA82',
      '--color-octane-gold-dark': '#A88B4A',
      '--color-octane-white': '#F5F5F0',
      '--color-octane-gray': '#999999',
      '--color-octane-green': '#4CAF50',
      '--color-octane-red': '#E53935',
      '--color-octane-orange': '#FF9800',
      '--color-octane-purple': '#9C7CBA',
    },
  },

  blue: {
    id: 'blue',
    name_pt: 'Azuis e branco',
    name_en: 'Blues and white',
    swatch: ['#0B1220', '#3B82F6', '#F5F8FF'],
    vars: {
      '--color-octane-black': '#0B1220',
      '--color-octane-dark': '#111C2E',
      '--color-octane-card': '#16233A',
      '--color-octane-border': '#274069',
      '--color-octane-gold': '#3B82F6',
      '--color-octane-gold-light': '#60A5FA',
      '--color-octane-gold-dark': '#2563EB',
      '--color-octane-white': '#F5F8FF',
      '--color-octane-gray': '#93A4C0',
      '--color-octane-green': '#22C55E',
      '--color-octane-red': '#EF4444',
      '--color-octane-orange': '#F59E0B',
      '--color-octane-purple': '#818CF8',
    },
  },

  rainbow: {
    id: 'rainbow',
    name_pt: 'Arco-íris',
    name_en: 'Rainbow',
    swatch: ['#141019', '#E23DBE', '#22C55E'],
    vars: {
      '--color-octane-black': '#141019',
      '--color-octane-dark': '#1D1726',
      '--color-octane-card': '#271E33',
      '--color-octane-border': '#3E3150',
      '--color-octane-gold': '#E23DBE',
      '--color-octane-gold-light': '#F26FD4',
      '--color-octane-gold-dark': '#B92E9C',
      '--color-octane-white': '#FDF7FF',
      '--color-octane-gray': '#A79BB5',
      '--color-octane-green': '#22C55E',
      '--color-octane-red': '#EF4444',
      '--color-octane-orange': '#F59E0B',
      '--color-octane-purple': '#8B5CF6',
    },
  },

  mono: {
    id: 'mono',
    name_pt: 'Pretos, cinzentos e brancos',
    name_en: 'Blacks, greys and whites',
    swatch: ['#0A0A0A', '#B5B5B5', '#FAFAFA'],
    vars: {
      '--color-octane-black': '#0A0A0A',
      '--color-octane-dark': '#171717',
      '--color-octane-card': '#1F1F1F',
      '--color-octane-border': '#333333',
      '--color-octane-gold': '#D4D4D4',
      '--color-octane-gold-light': '#F0F0F0',
      '--color-octane-gold-dark': '#A3A3A3',
      '--color-octane-white': '#FAFAFA',
      '--color-octane-gray': '#8A8A8A',
      '--color-octane-green': '#8A8A8A',
      '--color-octane-red': '#E5E5E5',
      '--color-octane-orange': '#C4C4C4',
      '--color-octane-purple': '#B5B5B5',
    },
  },
};

export const DEFAULT_PALETTE = 'octane';

// The default palette injects nothing, so each build's own @theme colors
// (which differ per white-label brand) remain authoritative. Only the other
// palettes emit an override.
export function paletteCss(paletteId) {
  if (!paletteId || paletteId === DEFAULT_PALETTE) return '';
  const p = PALETTES[paletteId];
  if (!p || p.id === DEFAULT_PALETTE) return '';
  const body = Object.entries(p.vars).map(([k, v]) => `${k}:${v};`).join('');
  return `:root{${body}}`;
}

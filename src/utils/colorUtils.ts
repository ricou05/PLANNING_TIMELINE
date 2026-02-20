import { ManagedColor } from '../types';

export const DEFAULT_MANAGED_COLORS: ManagedColor[] = [
  { id: 'jaune', hex: '#F4C300', label: 'St Pierre' },
  { id: 'rouge', hex: '#CC0605', label: 'Boucherie' },
  { id: 'bleu', hex: '#063971', label: 'ELS' },
  { id: 'vert', hex: '#317F43', label: 'F&L' },
  { id: 'bleu ciel', hex: '#87CEEB', label: 'Caisse 1' },
  { id: 'orange', hex: '#FF7F00', label: 'Caisse 2' },
  { id: 'violet', hex: '#A03472', label: 'Caisse 3' },
];

export const isLightColor = (hex: string): boolean => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
};

export const getTextColorForHex = (hex: string): string => {
  return isLightColor(hex) ? '#000000' : '#FFFFFF';
};

const COLOR_ALIASES: Record<string, string[]> = {
  'bleu': ['bleu fonce', 'bleu foncé', 'bleu-fonce', 'blue dark', 'dark blue'],
  'bleu ciel': ['bleu clair', 'bleu-clair', 'light blue', 'cyan', 'bleu-ciel'],
  'rouge': ['red'],
  'vert': ['green'],
  'jaune': ['yellow'],
  'orange': ['orange'],
  'violet': ['purple', 'rose'],
};

export const normalizeColorId = (input: string, colors: ManagedColor[]): string => {
  const normalized = input.trim().toLowerCase();
  const exact = colors.find(c => c.id === normalized);
  if (exact) return exact.id;

  for (const [id, aliases] of Object.entries(COLOR_ALIASES)) {
    if (aliases.includes(normalized)) {
      const exists = colors.find(c => c.id === id);
      if (exists) return id;
    }
  }

  for (const color of colors) {
    if (color.label.toLowerCase() === normalized) return color.id;
  }

  return input;
};

export const findManagedColor = (colors: ManagedColor[], colorId?: string): ManagedColor | undefined => {
  if (!colorId) return undefined;
  const resolved = normalizeColorId(colorId, colors);
  return colors.find(c => c.id === resolved);
};

export const generateColorId = (label: string): string => {
  return label.toLowerCase().trim().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
};

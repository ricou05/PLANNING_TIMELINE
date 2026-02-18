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

export const findManagedColor = (colors: ManagedColor[], colorId?: string): ManagedColor | undefined => {
  if (!colorId) return undefined;
  return colors.find(c => c.id === colorId);
};

export const generateColorId = (label: string): string => {
  return label.toLowerCase().trim().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
};

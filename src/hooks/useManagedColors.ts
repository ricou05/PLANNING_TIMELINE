import { useState, useCallback } from 'react';
import { ManagedColor } from '../types';
import { DEFAULT_MANAGED_COLORS } from '../utils/colorUtils';

const STORAGE_KEY = 'managedColors';

const loadFromStorage = (): ManagedColor[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_MANAGED_COLORS;
};

export const useManagedColors = () => {
  const [managedColors, setManagedColors] = useState<ManagedColor[]>(loadFromStorage);

  const saveColors = useCallback((colors: ManagedColor[]) => {
    setManagedColors(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, []);

  const updateLabel = useCallback((colorId: string, label: string) => {
    setManagedColors(prev => {
      const updated = prev.map(c => c.id === colorId ? { ...c, label } : c);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { managedColors, saveColors, updateLabel };
};

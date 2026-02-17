import { useState, useCallback } from 'react';
import { ManagedColor } from '../types';
import { DEFAULT_MANAGED_COLORS } from '../utils/colorUtils';

const MANUAL_KEY = 'colors_manual_save';
const AUTO_KEY = 'colors_autosave';
const LEGACY_KEY = 'managedColors';

interface AutoSaveData {
  colors: ManagedColor[];
  timestamp: string;
}

const tryParse = (raw: string | null): unknown => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const loadFromStorage = (): ManagedColor[] => {
  const manual = tryParse(localStorage.getItem(MANUAL_KEY));
  if (Array.isArray(manual) && manual.length > 0) return manual;

  const auto = tryParse(localStorage.getItem(AUTO_KEY)) as AutoSaveData | null;
  if (auto?.colors && Array.isArray(auto.colors) && auto.colors.length > 0) return auto.colors;

  const legacy = tryParse(localStorage.getItem(LEGACY_KEY));
  if (Array.isArray(legacy) && legacy.length > 0) return legacy;

  return DEFAULT_MANAGED_COLORS;
};

const getLastAutoSaveTime = (): string | null => {
  const auto = tryParse(localStorage.getItem(AUTO_KEY)) as AutoSaveData | null;
  return auto?.timestamp || null;
};

export const useManagedColors = () => {
  const [managedColors, setManagedColors] = useState<ManagedColor[]>(loadFromStorage);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(getLastAutoSaveTime);

  const saveColors = useCallback((colors: ManagedColor[]) => {
    setManagedColors(colors);
    localStorage.setItem(MANUAL_KEY, JSON.stringify(colors));
  }, []);

  const autoSaveColors = useCallback((colors: ManagedColor[]) => {
    const now = new Date().toISOString();
    const data: AutoSaveData = { colors, timestamp: now };
    localStorage.setItem(AUTO_KEY, JSON.stringify(data));
    setLastAutoSave(now);
  }, []);

  return { managedColors, saveColors, autoSaveColors, lastAutoSave };
};

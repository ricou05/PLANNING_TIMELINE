import { useState, useCallback } from 'react';
import { ShiftTemplate } from '../types';

const STORAGE_KEY = 'shift_templates';

export const DEFAULT_SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: 'ouverture', label: 'Ouverture', morningStart: '06:30', morningEnd: '13:00', afternoonStart: '', afternoonEnd: '' },
  { id: 'fermeture', label: 'Fermeture', morningStart: '', morningEnd: '', afternoonStart: '13:00', afternoonEnd: '20:00' },
  { id: 'coupure', label: 'Journée coupée', morningStart: '09:00', morningEnd: '12:00', afternoonStart: '14:00', afternoonEnd: '18:00' },
];

const loadTemplates = (): ShiftTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHIFT_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return DEFAULT_SHIFT_TEMPLATES;
  } catch {
    return DEFAULT_SHIFT_TEMPLATES;
  }
};

export const useShiftTemplates = () => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>(loadTemplates);

  const saveTemplates = useCallback((next: ShiftTemplate[]) => {
    setTemplates(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { templates, saveTemplates };
};

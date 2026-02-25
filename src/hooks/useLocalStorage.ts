import { useState, useCallback } from 'react';
import { SavedSchedule } from '../types';

const STORAGE_KEY = 'localSchedules';

export const useLocalStorage = () => {
  const [error, setError] = useState<string | null>(null);

  const getLocalSchedules = useCallback(async (): Promise<SavedSchedule[]> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      setError('Erreur lors de la lecture des sauvegardes locales');
      return [];
    }
  }, []);

  const saveLocalSchedule = useCallback(async (schedule: SavedSchedule): Promise<void> => {
    try {
      const schedules = await getLocalSchedules();
      schedules.push(schedule);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
    } catch {
      setError('Erreur lors de la sauvegarde locale');
    }
  }, [getLocalSchedules]);

  return {
    getLocalSchedules,
    saveLocalSchedule,
    error
  };
};

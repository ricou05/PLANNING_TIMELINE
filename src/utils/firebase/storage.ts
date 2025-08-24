import { SavedSchedule } from '../../types';

const STORAGE_KEY = 'localSchedules';

export const saveLocalSchedule = async (schedule: SavedSchedule): Promise<void> => {
  const schedules = await getLocalSchedules();
  schedules.push(schedule);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
};

export const getLocalSchedules = async (): Promise<SavedSchedule[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};
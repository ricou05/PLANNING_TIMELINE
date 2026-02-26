import { SavedSchedule } from '../../types';
import { Timestamp } from 'firebase/firestore';

const STORAGE_KEY = 'localSchedules';
type StoredTimestamp = Timestamp | { seconds: number; nanoseconds?: number } | number | null | undefined;
type StoredSchedule = Omit<SavedSchedule, 'createdAt' | 'updatedAt'> & {
  createdAt?: StoredTimestamp;
  updatedAt?: StoredTimestamp;
};

export const saveLocalSchedule = async (schedule: SavedSchedule): Promise<void> => {
  try {
    const schedules = await getLocalSchedules();
    schedules.push(schedule);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (error) {
    console.error('Error saving to local storage:', error);
    throw error;
  }
};

export const updateLocalSchedule = async (id: string, updatedSchedule: SavedSchedule): Promise<void> => {
  try {
    const schedules = await getLocalSchedules();
    const index = schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      updatedSchedule.updatedAt = Timestamp.now();
      schedules[index] = updatedSchedule;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
    }
  } catch (error) {
    console.error('Error updating in local storage:', error);
    throw error;
  }
};

export const deleteLocalSchedule = async (id: string): Promise<void> => {
  try {
    const schedules = await getLocalSchedules();
    const filtered = schedules.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting from local storage:', error);
    throw error;
  }
};

export const getLocalSchedules = async (): Promise<SavedSchedule[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const schedules = JSON.parse(stored) as StoredSchedule[];
    return schedules.map((schedule) => ({
      ...schedule,
      createdAt: createTimestamp(schedule.createdAt),
      updatedAt: createTimestamp(schedule.updatedAt || schedule.createdAt)
    }));
  } catch (error) {
    console.error('Error reading from local storage:', error);
    return [];
  }
};

// Fonction utilitaire pour créer un Timestamp valide
function createTimestamp(timestamp: StoredTimestamp): Timestamp {
  if (!timestamp) {
    return Timestamp.now();
  }

  if (timestamp instanceof Timestamp) {
    return timestamp;
  }

  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds || 0);
  }

  if (typeof timestamp === 'number') {
    return Timestamp.fromMillis(timestamp);
  }

  return Timestamp.now();
}

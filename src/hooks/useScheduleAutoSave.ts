import { useEffect, useRef, useState } from 'react';
import { Employee, Schedule } from '../types';

const AUTOSAVE_KEY = 'schedule_autosave';
const DEBOUNCE_MS = 1500;

export interface ScheduleAutoSaveData {
  schedules: Record<string, Schedule>;
  employees: Employee[];
  weekNumber: number;
  year: number;
  timestamp: string;
}

export const loadScheduleAutoSave = (): ScheduleAutoSaveData | null => {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.employees?.length > 0 && data?.weekNumber && data?.year) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

export const clearScheduleAutoSave = () => {
  localStorage.removeItem(AUTOSAVE_KEY);
};

export const useScheduleAutoSave = (
  schedules: Record<string, Schedule>,
  employees: Employee[],
  weekNumber: number,
  year: number
) => {
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(() => {
    const saved = loadScheduleAutoSave();
    return saved?.timestamp || null;
  });
  const [showIndicator, setShowIndicator] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const now = new Date().toISOString();
      const data: ScheduleAutoSaveData = {
        schedules,
        employees,
        weekNumber,
        year,
        timestamp: now,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      setLastAutoSave(now);
      setShowIndicator(true);

      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      indicatorTimerRef.current = setTimeout(() => setShowIndicator(false), 2500);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [schedules, employees, weekNumber, year]);

  useEffect(() => {
    return () => {
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    };
  }, []);

  return { lastAutoSave, showIndicator };
};

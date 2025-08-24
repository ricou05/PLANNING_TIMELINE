import { Schedule } from '../types';

export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const calculatePeriodHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return (endMinutes - startMinutes) / 60;
};

export const calculateDailyHours = (schedule?: Schedule): number => {
  if (!schedule) return 0;
  const { morningStart, morningEnd, afternoonStart, afternoonEnd } = schedule;
  
  const morningHours = calculatePeriodHours(morningStart, morningEnd);
  const afternoonHours = calculatePeriodHours(afternoonStart, afternoonEnd);
  
  return morningHours + afternoonHours;
};
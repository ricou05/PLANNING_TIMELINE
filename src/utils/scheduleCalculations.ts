import { Schedule } from '../types';
import { timeToMinutes } from './timeUtils';

export const calculatePeriodHours = (start: string, end: string): number => {
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

export const calculateWeeklyHours = (schedules: Record<string, Schedule>, employeeId: number): number => {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  return days
    .map((day) => calculateDailyHours(schedules[`${employeeId}-${day}`]))
    .reduce((total, hours) => total + hours, 0);
};
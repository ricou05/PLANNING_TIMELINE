import { Schedule } from '../types';
import { calculateDailyHours } from './timeCalculations';

export interface DailyTotals {
  [key: string]: number;
}

export const calculateDayTotal = (schedules: Record<string, Schedule>, day: string): number => {
  return Object.entries(schedules)
    .filter(([key]) => key.endsWith(`-${day}`))
    .reduce((total, [_, schedule]) => total + calculateDailyHours(schedule), 0);
};

export const calculateGrandTotal = (schedules: Record<string, Schedule>): number => {
  return Object.values(schedules)
    .reduce((total, schedule) => total + calculateDailyHours(schedule), 0);
};
import { Employee, Schedule } from '../types';
import { calculateDailyHours, calculateWeeklyHours } from './scheduleCalculations';

export interface DailyTotals {
  [key: string]: number;
}

// Les totaux ne comptent que les employés de la liste : le planning peut contenir
// des entrées orphelines (anciens employés supprimés, imports « Remplacer tout »
// antérieurs à la v1.6.1) qui ne doivent pas fausser la ligne TOTAUX
export const calculateDayTotal = (
  schedules: Record<string, Schedule>,
  day: string,
  employees: Employee[]
): number => {
  return employees.reduce(
    (total, emp) => total + calculateDailyHours(schedules[`${emp.id}-${day}`]),
    0
  );
};

export const calculateGrandTotal = (
  schedules: Record<string, Schedule>,
  employees: Employee[]
): number => {
  return employees.reduce(
    (total, emp) => total + calculateWeeklyHours(schedules, emp.id),
    0
  );
};

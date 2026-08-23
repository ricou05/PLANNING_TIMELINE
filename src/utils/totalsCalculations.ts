import { Employee, Schedule } from '../types';
import { calculateDailyHours, calculateWeeklyHours } from './scheduleCalculations';

export interface DailyTotals {
  [key: string]: number;
}

// Les totaux se calculent toujours sur la liste des salariés affichés, jamais
// sur les clés brutes de `schedules`. Ces clés peuvent en effet survivre au
// salarié qu'elles décrivaient (réduction du nombre de salariés, import CSV,
// restauration d'une sauvegarde comptant moins de lignes) : les compter
// gonflait les totaux du tableau hebdomadaire alors que la vue Timeline, qui
// boucle sur les salariés, affichait la valeur juste.
export const calculateDayTotal = (
  schedules: Record<string, Schedule>,
  day: string,
  employees: Employee[]
): number =>
  employees.reduce(
    (total, employee) => total + calculateDailyHours(schedules[`${employee.id}-${day}`]),
    0
  );

export const calculateGrandTotal = (
  schedules: Record<string, Schedule>,
  employees: Employee[]
): number =>
  employees.reduce((total, employee) => total + calculateWeeklyHours(schedules, employee.id), 0);

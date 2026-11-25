// « Reprendre les horaires N-1 » : prérempli la semaine planifiée avec les
// horaires réalisés sur le même poste pendant la semaine de référence, jour
// par jour (lundi N-1 → lundi). Seules les cases vides sont remplies ; les
// absences N-1 (congés, maladie…) sont personnelles et ne sont pas reprises,
// les jours de repos le sont.
import { Employee, Schedule } from '../../types';
import { clampTime } from '../timeUtils';
import { HistoryEntry, HistoryWeek } from './types';
import { Correspondences, resolveSuccessor, missingSuccessors, namesOfWeek } from './correspondences';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const isEmptyDay = (s?: Schedule): boolean =>
  !s ||
  (!s.morningStart &&
    !s.morningEnd &&
    !s.afternoonStart &&
    !s.afternoonEnd &&
    !s.isRestDay &&
    !s.absence &&
    !s.morningAbsence &&
    !s.afternoonAbsence);

const splitSlot = (slot: string | null): [string, string] => {
  if (!slot) return ['', ''];
  const [start, end] = slot.split('-').map(clampTime);
  return start < end ? [start, end] : ['', ''];
};

const scheduleFromEntry = (entry: HistoryEntry): Schedule | null => {
  const [morningStart, morningEnd] = splitSlot(entry.morning);
  const [afternoonStart, afternoonEnd] = splitSlot(entry.afternoon);
  if (morningStart || afternoonStart) {
    return { morningStart, morningEnd, afternoonStart, afternoonEnd };
  }
  if (entry.label === 'Repos') {
    return { morningStart: '', morningEnd: '', afternoonStart: '', afternoonEnd: '', isRestDay: true };
  }
  return null;
};

export interface PrefillResult {
  schedules: Record<string, Schedule>;
  /** Journées remplies */
  filled: number;
  /** Journées N-1 non reprises car la case est déjà remplie */
  kept: number;
  /** Salariés sans poste N-1 cette semaine-là */
  withoutReference: Employee[];
  /** Salariés prévus dans la table mais pas encore dans le planning (poste N-1 présent cette semaine-là) */
  missing: { name: string; predecessors: string[] }[];
}

export function prefillFromReference(
  schedules: Record<string, Schedule>,
  week: HistoryWeek,
  employees: Employee[],
  c: Correspondences
): PrefillResult {
  const updated = { ...schedules };
  let filled = 0;
  let kept = 0;
  const withReference = new Set<number>();

  week.days.forEach((day, i) => {
    // Pour chaque salarié N, la meilleure journée N-1 de son poste (celle qui
    // a le plus d'heures, si deux personnes N-1 ont tenu le poste ce jour-là)
    const best = new Map<number, Schedule>();
    const bestHours = new Map<number, number>();
    day.entries.forEach((entry) => {
      const successor = resolveSuccessor(entry.name, c, employees).employee;
      if (!successor) return;
      withReference.add(successor.id);
      const schedule = scheduleFromEntry(entry);
      if (!schedule) return;
      const previous = bestHours.get(successor.id);
      if (previous === undefined || entry.hours > previous) {
        best.set(successor.id, schedule);
        bestHours.set(successor.id, entry.hours);
      }
    });

    best.forEach((schedule, employeeId) => {
      const key = `${employeeId}-${DAYS[i]}`;
      if (isEmptyDay(updated[key])) {
        // On garde les couleurs éventuellement déjà posées sur la case
        updated[key] = { ...updated[key], ...schedule };
        filled++;
      } else {
        kept++;
      }
    });
  });

  return {
    schedules: updated,
    filled,
    kept,
    withoutReference: employees.filter((e) => !withReference.has(e.id)),
    missing: missingSuccessors(c, employees, namesOfWeek(week)),
  };
}

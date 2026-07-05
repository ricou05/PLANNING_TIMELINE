import { Schedule } from '../types';
import { timeToMinutes } from './timeUtils';
import { calculateDailyHours } from './scheduleCalculations';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Seuils indicatifs du droit du travail français (commerce de détail)
export const COMPLIANCE_LIMITS = {
  MAX_DAILY_HOURS: 10,
  MAX_WEEKLY_HOURS: 48,
  MAX_CONTINUOUS_HOURS: 6,
};

export interface ComplianceIssue {
  day?: string;
  message: string;
}

const formatH = (h: number): string => {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h${mins.toString().padStart(2, '0')}` : `${hrs}h`;
};

// Blocs de travail continus de la journée (matin et après-midi fusionnés s'ils se touchent)
const getContinuousBlocks = (schedule: Schedule): Array<{ start: number; end: number }> => {
  const blocks: Array<{ start: number; end: number }> = [];
  const { morningStart, morningEnd, afternoonStart, afternoonEnd } = schedule;

  if (morningStart && morningEnd) {
    blocks.push({ start: timeToMinutes(morningStart), end: timeToMinutes(morningEnd) });
  }
  if (afternoonStart && afternoonEnd) {
    const start = timeToMinutes(afternoonStart);
    const end = timeToMinutes(afternoonEnd);
    const last = blocks[blocks.length - 1];
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
    } else {
      blocks.push({ start, end });
    }
  }
  return blocks;
};

export const getEmployeeComplianceIssues = (
  schedules: Record<string, Schedule>,
  employeeId: number
): ComplianceIssue[] => {
  const issues: ComplianceIssue[] = [];
  let weeklyHours = 0;
  let workedDays = 0;

  DAYS.forEach(day => {
    const schedule = schedules[`${employeeId}-${day}`];
    if (!schedule || schedule.isRestDay || schedule.absence) return;

    const daily = calculateDailyHours(schedule);
    if (daily <= 0) return;

    workedDays++;
    weeklyHours += daily;

    if (daily > COMPLIANCE_LIMITS.MAX_DAILY_HOURS) {
      issues.push({ day, message: `${day} : ${formatH(daily)} — dépasse ${COMPLIANCE_LIMITS.MAX_DAILY_HOURS}h/jour` });
    }

    getContinuousBlocks(schedule).forEach(block => {
      const hours = (block.end - block.start) / 60;
      if (hours > COMPLIANCE_LIMITS.MAX_CONTINUOUS_HOURS) {
        issues.push({ day, message: `${day} : ${formatH(hours)} d'affilée sans pause (max ${COMPLIANCE_LIMITS.MAX_CONTINUOUS_HOURS}h)` });
      }
    });
  });

  if (weeklyHours > COMPLIANCE_LIMITS.MAX_WEEKLY_HOURS) {
    issues.push({ message: `Semaine : ${formatH(weeklyHours)} — dépasse ${COMPLIANCE_LIMITS.MAX_WEEKLY_HOURS}h/semaine` });
  }

  if (workedDays === 7) {
    issues.push({ message: '7 jours travaillés — aucun jour de repos hebdomadaire' });
  }

  return issues;
};

import { Schedule, ColorLabel } from '../types';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface SaveData {
  schedules: Record<string, Schedule>;
  employees: any[];
  weekNumber: number;
  year: number;
  colorLabels: ColorLabel[];
}

export function validateSaveData(data: SaveData): ValidationResult {
  // Validation des données requises
  if (!data.schedules || !data.employees || !data.weekNumber || !data.year) {
    return {
      isValid: false,
      error: 'Données de sauvegarde incomplètes'
    };
  }

  // Validation du numéro de semaine
  if (data.weekNumber < 1 || data.weekNumber > 53) {
    return {
      isValid: false,
      error: 'Numéro de semaine invalide'
    };
  }

  // Validation de l'année
  const currentYear = new Date().getFullYear();
  if (data.year < currentYear - 1 || data.year > currentYear + 1) {
    return {
      isValid: false,
      error: 'Année invalide'
    };
  }

  // Validation des employés
  if (!Array.isArray(data.employees) || data.employees.length === 0) {
    return {
      isValid: false,
      error: 'Liste des employés invalide'
    };
  }

  // Validation des horaires
  for (const key in data.schedules) {
    const schedule = data.schedules[key];
    if (!validateSchedule(schedule)) {
      return {
        isValid: false,
        error: 'Horaires invalides détectés'
      };
    }
  }

  return { isValid: true };
}

function validateSchedule(schedule: Schedule): boolean {
  // Validation des horaires du matin
  if (schedule.morningStart && schedule.morningEnd) {
    if (!isValidTimeFormat(schedule.morningStart) || !isValidTimeFormat(schedule.morningEnd)) {
      return false;
    }
    if (!isValidTimeRange(schedule.morningStart, schedule.morningEnd)) {
      return false;
    }
  }

  // Validation des horaires de l'après-midi
  if (schedule.afternoonStart && schedule.afternoonEnd) {
    if (!isValidTimeFormat(schedule.afternoonStart) || !isValidTimeFormat(schedule.afternoonEnd)) {
      return false;
    }
    if (!isValidTimeRange(schedule.afternoonStart, schedule.afternoonEnd)) {
      return false;
    }
  }

  return true;
}

function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

function isValidTimeRange(start: string, end: string): boolean {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  
  const startTime = startHours * 60 + startMinutes;
  const endTime = endHours * 60 + endMinutes;
  
  return startTime < endTime;
}
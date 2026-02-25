import { Employee, Schedule, ManagedColor } from '../types';
import { normalizeColorId } from './colorUtils';

interface CSVParseResult {
  employees: Employee[];
  schedules: Record<string, Schedule>;
  errors: string[];
  importedCount: number;
  employeeCount: number;
  hasColors: boolean;
}

const detectColorColumns = (subHeaderCells: string[]): boolean => {
  return subHeaderCells.some(cell => cell.trim().toUpperCase() === 'COULEUR');
};

export const parseCSV = (
  csvContent: string,
  existingEmployees: Employee[] = [],
  replaceAll: boolean = false,
  importColors: boolean = true,
  managedColors: ManagedColor[] = []
): CSVParseResult => {
  const result: CSVParseResult = {
    employees: replaceAll ? [] : [...existingEmployees],
    schedules: {},
    errors: [],
    importedCount: 0,
    employeeCount: 0,
    hasColors: false
  };

  const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 3) {
    result.errors.push('Le fichier CSV ne contient pas assez de lignes');
    return result;
  }

  const subHeaderCells = lines[1].split(';');
  const hasColorColumns = detectColorColumns(subHeaderCells);
  result.hasColors = hasColorColumns;

  const colsPerDay = hasColorColumns ? 3 : 2;


  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  let currentEmployeeId: number | null = null;
  let currentEmployeeName: string = '';
  let employeeCounter = 0;

  let nextEmployeeId = 1;
  if (result.employees.length > 0) {
    nextEmployeeId = Math.max(...result.employees.map(e => e.id)) + 1;
  }

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(';');

    const employeeName = cells[0].trim();
    const periodType = cells[1].trim().toLowerCase();

    if (employeeName) {
      currentEmployeeName = employeeName;

      const existingEmployee = result.employees.find(e => e.name === currentEmployeeName);
      if (existingEmployee) {
        currentEmployeeId = existingEmployee.id;
      } else {
        currentEmployeeId = nextEmployeeId++;
        result.employees.push({
          id: currentEmployeeId,
          name: currentEmployeeName
        });
        employeeCounter++;
      }
    }

    if (!currentEmployeeId) {
      result.errors.push(`Impossible de determiner l'employe pour la ligne ${i + 1}`);
      continue;
    }

    if (periodType === 'matin' || periodType === 'apres-midi') {
      const period = periodType === 'matin' ? 'morning' : 'afternoon';

      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];
        const startIndex = 2 + (dayIndex * colsPerDay);
        const endIndex = 3 + (dayIndex * colsPerDay);
        const colorIndex = hasColorColumns ? 4 + (dayIndex * colsPerDay) : -1;

        if (startIndex < cells.length && endIndex < cells.length) {
          const startTime = cells[startIndex].trim();
          const endTime = cells[endIndex].trim();
          const colorValue = (hasColorColumns && importColors && colorIndex < cells.length)
            ? cells[colorIndex].trim()
            : '';

          if (startTime && endTime &&
              (startTime !== '00:00' || endTime !== '00:00') &&
              startTime !== endTime) {

            const scheduleKey = `${currentEmployeeId}-${day}`;

            if (!result.schedules[scheduleKey]) {
              result.schedules[scheduleKey] = {
                morningStart: '',
                morningEnd: '',
                afternoonStart: '',
                afternoonEnd: '',
                morningColor: 'bleu',
                afternoonColor: 'vert'
              };
            }

            result.schedules[scheduleKey][`${period}Start`] = startTime;
            result.schedules[scheduleKey][`${period}End`] = endTime;

            if (hasColorColumns && importColors && colorValue) {
              result.schedules[scheduleKey][`${period}Color`] = managedColors.length > 0
                ? normalizeColorId(colorValue, managedColors)
                : colorValue;
            }

            result.importedCount++;
          }
        }
      }
    }
  }

  result.employeeCount = employeeCounter;
  return result;
};

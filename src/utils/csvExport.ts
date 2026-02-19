import { Employee, Schedule } from '../types';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const generateCSV = (
  employees: Employee[],
  schedules: Record<string, Schedule>,
  weekNumber: number,
  year: number
): string => {
  const lines: string[] = [];

  const headerCells = ['EMPLOYES', ''];
  DAYS.forEach(day => {
    headerCells.push(day, '');
  });
  lines.push(headerCells.join(';'));

  const subHeaderCells = ['', ''];
  DAYS.forEach(() => {
    subHeaderCells.push('DEBUT', 'FIN');
  });
  lines.push(subHeaderCells.join(';'));

  employees.forEach(emp => {
    const morningCells = [emp.name, 'Matin'];
    const afternoonCells = ['', 'Apres-Midi'];

    DAYS.forEach(day => {
      const key = `${emp.id}-${day}`;
      const schedule = schedules[key];

      if (schedule) {
        morningCells.push(schedule.morningStart || '00:00', schedule.morningEnd || '00:00');
        afternoonCells.push(schedule.afternoonStart || '00:00', schedule.afternoonEnd || '00:00');
      } else {
        morningCells.push('00:00', '00:00');
        afternoonCells.push('00:00', '00:00');
      }
    });

    lines.push(morningCells.join(';'));
    lines.push(afternoonCells.join(';'));
  });

  return lines.join('\n');
};

export const downloadCSV = (
  employees: Employee[],
  schedules: Record<string, Schedule>,
  weekNumber: number,
  year: number
): void => {
  const csv = generateCSV(employees, schedules, weekNumber, year);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `planning_semaine${weekNumber}_${year}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

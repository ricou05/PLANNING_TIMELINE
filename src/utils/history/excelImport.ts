// Lecture du fichier Excel « Heures employés » (onglets par année : 2025,
// 2026…). Chaque mois y est un bloc : une ligne d'en-tête « Date | Jour |
// Heures équipe… », la ligne au-dessus porte les prénoms, puis un tableau de
// 8 colonnes par salarié : Jour, Date, Arrivée, Départ, Arrivée, Départ,
// Total, Note. Les heures sont tapées en décimal (8,5 = 8h30) ; des mots
// (off, CP, arrêt…) peuvent remplacer les horaires.
//
// Le fichier est lu uniquement dans le navigateur : rien n'est envoyé tant
// que l'utilisateur n'a pas validé l'import.
import type { WorkSheet } from 'xlsx';
import { HistoryDay, HistoryEntry, HistoryWeek, weekIdOf } from './types';
import { toIsoDay } from '../calendarInfo';
import { getWeekDates } from '../dateUtils';

/** Période reprise de l'Excel : de la semaine S48 2025 à la semaine S47 2026 incluses */
export const HISTORY_FIRST_WEEK = { year: 2025, week: 48 };
export const HISTORY_LAST_WEEK = { year: 2026, week: 47 };

export interface ExcelImportResult {
  weeks: HistoryWeek[];
  /** Prénoms rencontrés (après remise en forme) */
  names: string[];
  totalHours: number;
  /** Semaines de la période sans aucune donnée dans le fichier */
  missingWeeks: string[];
}

// Semaine ISO d'une date (le jeudi de la semaine donne l'année)
export const isoWeekOf = (date: Date): { year: number; week: number } => {
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: thursday.getFullYear(), week };
};

export const compareWeeks = (a: { year: number; week: number }, b: { year: number; week: number }) =>
  a.year !== b.year ? a.year - b.year : a.week - b.week;

// Numéro de série Excel → date locale (jour seul)
const excelSerialToDate = (serial: number): Date => {
  const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
};

// 8,5 → « 08:30 » (arrondi à la minute)
const decimalToTime = (value: unknown): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 24) return null;
  const minutes = Math.round(value * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

const slotOf = (start: unknown, end: unknown): string | null => {
  const s = decimalToTime(start);
  const e = decimalToTime(end);
  return s && e && s < e ? `${s}-${e}` : null;
};

const slotHours = (start: unknown, end: unknown): number =>
  typeof start === 'number' && typeof end === 'number' && end > start ? end - start : 0;

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Mots tapés à la place des horaires → libellé lisible
const LABELS: Record<string, string> = {
  off: 'Repos',
  repos: 'Repos',
  cp: 'Congés',
  conge: 'Congés',
  conges: 'Congés',
  arret: 'Arrêt',
  mal: 'Maladie',
  malade: 'Maladie',
  maladie: 'Maladie',
  abs: 'Absence',
  'fin de contrat': 'Fin de contrat',
};

const normalizeLabel = (words: string[]): string | null => {
  const raw = words.join(' ').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  const known = LABELS[stripAccents(raw.toLowerCase())];
  return known ?? raw.charAt(0).toUpperCase() + raw.slice(1);
};

// « CALVIN », « calvin », « Calvin RIHET » → « Calvin »
const normalizeName = (raw: unknown): string => {
  const first = String(raw ?? '').trim().split(/\s+/)[0] || '?';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

export async function parseHoursWorkbook(data: ArrayBuffer): Promise<ExcelImportResult> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(data, { type: 'array', cellDates: false });

  const days = new Map<string, HistoryEntry[]>();

  const yearSheets = workbook.SheetNames.filter((n) => /^\d{4}$/.test(n.trim()));
  if (yearSheets.length === 0) {
    throw new Error("Aucun onglet d'année (2025, 2026…) dans ce fichier.");
  }

  for (const sheetName of yearSheets) {
    const ws: WorkSheet = workbook.Sheets[sheetName];
    if (!ws['!ref']) continue;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const cell = (r: number, c: number): unknown => ws[XLSX.utils.encode_cell({ r, c })]?.v ?? null;

    // Blocs de salariés du mois en cours : colonne « Jour » → prénom
    let blocks: { col: number; name: string }[] = [];

    for (let r = range.s.r; r <= range.e.r; r++) {
      // Ligne d'en-tête d'un mois : « Heures équipe » en colonne F
      if (cell(r, 5) === 'Heures équipe') {
        blocks = [];
        for (let c = 6; c <= range.e.c; c++) {
          const name = cell(r - 1, c);
          if (cell(r, c) === 'Jour' && cell(r, c + 2) === 'Arrivée' && name) {
            blocks.push({ col: c, name: normalizeName(name) });
          }
        }
        continue;
      }

      const serial = cell(r, 3);
      if (blocks.length === 0 || typeof serial !== 'number') continue;
      const date = excelSerialToDate(serial);
      const week = isoWeekOf(date);
      if (compareWeeks(week, HISTORY_FIRST_WEEK) < 0 || compareWeeks(week, HISTORY_LAST_WEEK) > 0) continue;

      const entries: HistoryEntry[] = [];
      for (const { col, name } of blocks) {
        const times = [cell(r, col + 2), cell(r, col + 3), cell(r, col + 4), cell(r, col + 5)];
        const total = cell(r, col + 6);
        const words = times.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
        const computed = slotHours(times[0], times[1]) + slotHours(times[2], times[3]);
        const hours = Math.max(0, typeof total === 'number' ? total : computed);
        const entry: HistoryEntry = {
          name,
          morning: slotOf(times[0], times[1]),
          afternoon: slotOf(times[2], times[3]),
          hours: Math.round(hours * 100) / 100,
          label: normalizeLabel(words),
        };
        if (entry.morning || entry.afternoon || entry.label || entry.hours > 0) entries.push(entry);
      }
      days.set(toIsoDay(date), entries);
    }
  }

  // Regroupement en semaines ISO complètes (lundi → dimanche)
  const weeks: HistoryWeek[] = [];
  const missingWeeks: string[] = [];
  const names = new Set<string>();
  let totalHours = 0;

  // Lundi de la première semaine de la période
  const monday = getWeekDates(HISTORY_FIRST_WEEK.week, HISTORY_FIRST_WEEK.year)[0];

  for (let w = isoWeekOf(monday); compareWeeks(w, HISTORY_LAST_WEEK) <= 0; w = isoWeekOf(monday)) {
    const weekDays: HistoryDay[] = [];
    let found = false;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const iso = toIsoDay(d);
      const entries = days.get(iso);
      if (entries) found = true;
      weekDays.push({ date: iso, entries: entries ?? [] });
    }
    const id = weekIdOf(w.year, w.week);
    if (found) {
      weekDays.forEach((day) =>
        day.entries.forEach((e) => {
          names.add(e.name);
          totalHours += e.hours;
        })
      );
      weeks.push({ id, year: w.year, week: w.week, monday: toIsoDay(monday), days: weekDays });
    } else {
      missingWeeks.push(id);
    }
    monday.setDate(monday.getDate() + 7);
  }

  return {
    weeks,
    names: [...names].sort((a, b) => a.localeCompare(b, 'fr')),
    totalHours,
    missingWeeks,
  };
}

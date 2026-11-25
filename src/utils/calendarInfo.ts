// Informations de calendrier affichées au-dessus des vues hebdomadaires :
// vacances scolaires par zone (bandeau A/B/C) et jours fériés (en-tête du jour).
import { SCHOOL_HOLIDAYS, SchoolHolidayKind, SchoolZone } from '../data/vacancesScolaires';

export const SCHOOL_ZONES: SchoolZone[] = ['A', 'B', 'C'];

/** Zone du magasin (Nice) : mise en avant dans le bandeau */
export const LOCAL_ZONE: SchoolZone = 'B';

// Date locale au format AAAA-MM-JJ (comparable aux dates du calendrier
// scolaire sans décalage de fuseau horaire)
export const toIsoDay = (date: Date): string => {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
};

const frDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const HOLIDAY_LABELS: Record<SchoolHolidayKind, { long: string; short: string }> = {
  Toussaint: { long: 'Vacances de la Toussaint', short: 'Toussaint' },
  Noël: { long: 'Vacances de Noël', short: 'Noël' },
  Hiver: { long: "Vacances d'hiver", short: 'Hiver' },
  Printemps: { long: 'Vacances de printemps', short: 'Printemps' },
  'Pont Ascension': { long: "Pont de l'Ascension", short: 'Pont' },
  Été: { long: "Vacances d'été", short: 'Été' },
};

/** Segment du bandeau : suite de jours consécutifs de la semaine dans le même état */
export interface HolidaySegment {
  /** Index du premier jour (0 = lundi) */
  start: number;
  /** Nombre de jours couverts */
  span: number;
  /** null = pas de vacances pour cette zone sur ces jours */
  holiday: { label: string; shortLabel: string; title: string } | null;
}

/**
 * Découpe la semaine en segments pour une zone : les jours de vacances
 * consécutifs (même période) sont fusionnés, les jours sans vacances restent
 * séparés pour garder les traits de colonnes.
 */
export function getZoneSegments(weekDates: Date[], zone: SchoolZone): HolidaySegment[] {
  const periods = SCHOOL_HOLIDAYS.filter((p) => p.zone === zone);
  const periodOf = (date: Date) => {
    const iso = toIsoDay(date);
    return periods.find((p) => p.start <= iso && iso <= p.end) ?? null;
  };

  const segments: HolidaySegment[] = [];
  let i = 0;
  while (i < weekDates.length) {
    const period = periodOf(weekDates[i]);
    if (!period) {
      segments.push({ start: i, span: 1, holiday: null });
      i++;
      continue;
    }
    let span = 1;
    while (i + span < weekDates.length && periodOf(weekDates[i + span]) === period) span++;
    const labels = HOLIDAY_LABELS[period.kind];
    segments.push({
      start: i,
      span,
      holiday: {
        label: labels.long,
        shortLabel: labels.short,
        title: `Zone ${zone}${zone === LOCAL_ZONE ? ' (Nice)' : ''} · ${labels.long} du ${frDate(period.start)} au ${frDate(period.end)}`,
      },
    });
    i += span;
  }
  return segments;
}

/** Vrai si au moins une zone est en vacances un jour de la semaine */
export function weekHasSchoolHolidays(weekDates: Date[]): boolean {
  return weekDates.some((date) => {
    const iso = toIsoDay(date);
    return SCHOOL_HOLIDAYS.some((p) => p.start <= iso && iso <= p.end);
  });
}

// ----- Jours fériés (France métropolitaine) -----

// Dimanche de Pâques (algorithme de Meeus / Jones / Butcher)
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const addDays = (date: Date, n: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const publicHolidaysCache = new Map<number, Map<string, string>>();

function publicHolidaysOf(year: number): Map<string, string> {
  const cached = publicHolidaysCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const list: [Date, string][] = [
    [new Date(year, 0, 1), "Jour de l'an"],
    [addDays(easter, 1), 'Lundi de Pâques'],
    [new Date(year, 4, 1), 'Fête du Travail'],
    [new Date(year, 4, 8), 'Victoire 1945'],
    [addDays(easter, 39), 'Ascension'],
    [addDays(easter, 50), 'Lundi de Pentecôte'],
    [new Date(year, 6, 14), 'Fête nationale'],
    [new Date(year, 7, 15), 'Assomption'],
    [new Date(year, 10, 1), 'Toussaint'],
    [new Date(year, 10, 11), 'Armistice'],
    [new Date(year, 11, 25), 'Noël'],
  ];
  const map = new Map(list.map(([d, name]) => [toIsoDay(d), name]));
  publicHolidaysCache.set(year, map);
  return map;
}

/** Nom du jour férié, ou null */
export function getPublicHoliday(date: Date): string | null {
  return publicHolidaysOf(date.getFullYear()).get(toIsoDay(date)) ?? null;
}

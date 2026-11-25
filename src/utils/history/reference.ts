// Choix de la semaine de référence de l'an passé (« N-1 ») pour la semaine
// à planifier. Les vacances scolaires changent de place d'une année à
// l'autre : on compare donc, jour par jour, la situation des vacances et des
// jours fériés, et on retient la semaine la plus ressemblante autour de
// « la même semaine l'an passé » (52 semaines plus tôt, même jour de semaine).
import { SCHOOL_HOLIDAYS, SchoolZone } from '../../data/vacancesScolaires';
import { LOCAL_ZONE, SCHOOL_ZONES, getPublicHoliday, toIsoDay } from '../calendarInfo';
import { getWeekDates } from '../dateUtils';
import { isoWeekOf, compareWeeks, HISTORY_FIRST_WEEK, HISTORY_LAST_WEEK } from './excelImport';
import { weekIdOf } from './types';

/** Écart maximal (en semaines) autour de la même semaine l'an passé */
const SEARCH_RADIUS = 2;

export interface ReferenceCandidate {
  id: string;
  year: number;
  week: number;
  /** Dates lundi → dimanche */
  dates: Date[];
  /** Décalage en semaines par rapport à la même semaine l'an passé */
  offset: number;
  /** Plus le score est bas, plus les vacances ressemblent */
  score: number;
}

export interface ReferenceSuggestion {
  /** Semaines possibles, de la plus ancienne à la plus récente */
  candidates: ReferenceCandidate[];
  /** Semaine aux mêmes dates l'an passé (52 semaines plus tôt, même jour de semaine) */
  sameWeek: ReferenceCandidate;
  /** Semaine suggérée d'après les vacances */
  suggested: ReferenceCandidate;
}

const zonesOn = (date: Date): Set<SchoolZone> => {
  const iso = toIsoDay(date);
  return new Set(SCHOOL_HOLIDAYS.filter((p) => p.start <= iso && iso <= p.end).map((p) => p.zone));
};

// Affluence attendue un jour donné : une zone en vacances compte 1, la zone
// du magasin (Nice) compte double
const affluence = (zones: Set<SchoolZone>): number =>
  [...zones].reduce((sum, z) => sum + (z === LOCAL_ZONE ? 2 : 1), 0);

/**
 * Écart entre deux semaines (0 = identiques) :
 *  - différence d'affluence jour par jour ;
 *  - + 1 par jour où la zone de Nice n'est pas dans la même situation ;
 *  - + 0,5 par jour férié en plus ou en moins dans la semaine (un férié qui
 *    change de jour d'une année à l'autre ne compte pas).
 */
export const holidayDistance = (a: Date[], b: Date[]): number => {
  const countPublicHolidays = (dates: Date[]) => dates.filter((d) => getPublicHoliday(d)).length;
  const days = a.reduce((sum, day, i) => {
    const za = zonesOn(day);
    const zb = zonesOn(b[i]);
    const local = za.has(LOCAL_ZONE) !== zb.has(LOCAL_ZONE) ? 1 : 0;
    return sum + Math.abs(affluence(za) - affluence(zb)) + local;
  }, 0);
  return days + 0.5 * Math.abs(countPublicHolidays(a) - countPublicHolidays(b));
};

const shiftDays = (dates: Date[], days: number): Date[] =>
  dates.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));

export function suggestReferenceWeek(weekNumber: number, year: number): ReferenceSuggestion {
  const target = getWeekDates(weekNumber, year);
  const candidates: ReferenceCandidate[] = [];
  for (let offset = -SEARCH_RADIUS; offset <= SEARCH_RADIUS; offset++) {
    const dates = shiftDays(target, -364 + offset * 7);
    const { year: y, week: w } = isoWeekOf(dates[0]);
    candidates.push({ id: weekIdOf(y, w), year: y, week: w, dates, offset, score: holidayDistance(target, dates) });
  }
  const sameWeek = candidates.find((c) => c.offset === 0)!;
  // On ne suggère que des semaines présentes dans l'historique importé, quand
  // c'est possible ; meilleur score, et à égalité la plus proche des mêmes dates
  const inHistory = candidates.filter(
    (c) => compareWeeks(c, HISTORY_FIRST_WEEK) >= 0 && compareWeeks(c, HISTORY_LAST_WEEK) <= 0
  );
  const suggested = [...(inHistory.length > 0 ? inHistory : candidates)].sort((a, b) => a.score - b.score || Math.abs(a.offset) - Math.abs(b.offset))[0];
  return { candidates, sameWeek, suggested };
}

/** Résumé des vacances d'une semaine : « A 7 j · B 2 j · C — » */
export const describeHolidays = (dates: Date[]): string =>
  SCHOOL_ZONES.map((zone) => {
    const n = dates.filter((d) => zonesOn(d).has(zone)).length;
    return `${zone} ${n > 0 ? `${n} j` : '—'}`;
  }).join(' · ');

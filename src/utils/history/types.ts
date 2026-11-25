// Historique des plannings réalisés (repris du fichier Excel « Heures
// employés »), stocké dans Firestore : collection `historique`, un document
// par semaine ISO nommé `AAAA-Sxx` (même format que les semaines de l'app).

/** Une journée d'un salarié telle qu'elle a été réalisée */
export interface HistoryEntry {
  /** Prénom tel qu'il apparaît dans l'Excel, remis en forme (« CALVIN » → « Calvin ») */
  name: string;
  /** Créneau du matin « HH:MM-HH:MM », ou null */
  morning: string | null;
  /** Créneau de l'après-midi « HH:MM-HH:MM », ou null */
  afternoon: string | null;
  /** Heures comptées ce jour-là (colonne Total de l'Excel) */
  hours: number;
  /** Mention écrite à la place des horaires (Repos, Congés, Maladie…), ou null */
  label: string | null;
}

export interface HistoryDay {
  /** AAAA-MM-JJ */
  date: string;
  entries: HistoryEntry[];
}

export interface HistoryWeek {
  /** AAAA-Sxx */
  id: string;
  year: number;
  week: number;
  /** Lundi de la semaine, AAAA-MM-JJ */
  monday: string;
  /** Lundi → dimanche (toujours 7 jours) */
  days: HistoryDay[];
}

export const weekIdOf = (year: number, week: number): string =>
  `${year}-S${String(week).padStart(2, '0')}`;

/** Total d'heures et nombre de salariés ayant travaillé, pour une journée */
export const summarizeDay = (day: HistoryDay): { hours: number; staff: number } => ({
  hours: day.entries.reduce((sum, e) => sum + e.hours, 0),
  staff: day.entries.filter((e) => e.hours > 0).length,
});

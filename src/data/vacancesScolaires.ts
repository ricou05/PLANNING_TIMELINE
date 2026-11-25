// Vacances scolaires officielles (data.education.gouv.fr), reprises du fichier
// « Heures employés » — onglet « Vacances scolaires ».
// Convention : premier jour = samedi après les cours, dernier jour = veille de
// la reprise (dates incluses, au format AAAA-MM-JJ).
// Zone A : Lyon, Bordeaux… · Zone B : Nice, Marseille… · Zone C : Paris, Montpellier…
// À compléter chaque année dès la publication du calendrier suivant.

export type SchoolZone = 'A' | 'B' | 'C';

export type SchoolHolidayKind =
  | 'Toussaint'
  | 'Noël'
  | 'Hiver'
  | 'Printemps'
  | 'Pont Ascension'
  | 'Été';

export interface SchoolHolidayPeriod {
  zone: SchoolZone;
  kind: SchoolHolidayKind;
  start: string;
  end: string;
}

const allZones = (kind: SchoolHolidayKind, start: string, end: string): SchoolHolidayPeriod[] =>
  (['A', 'B', 'C'] as SchoolZone[]).map((zone) => ({ zone, kind, start, end }));

export const SCHOOL_HOLIDAYS: SchoolHolidayPeriod[] = [
  // ----- Année scolaire 2025-2026 -----
  ...allZones('Toussaint', '2025-10-18', '2025-11-02'),
  ...allZones('Noël', '2025-12-20', '2026-01-04'),
  { zone: 'A', kind: 'Hiver', start: '2026-02-07', end: '2026-02-22' },
  { zone: 'B', kind: 'Hiver', start: '2026-02-14', end: '2026-03-01' },
  { zone: 'C', kind: 'Hiver', start: '2026-02-21', end: '2026-03-08' },
  { zone: 'A', kind: 'Printemps', start: '2026-04-04', end: '2026-04-19' },
  { zone: 'B', kind: 'Printemps', start: '2026-04-11', end: '2026-04-26' },
  { zone: 'C', kind: 'Printemps', start: '2026-04-18', end: '2026-05-03' },
  ...allZones('Pont Ascension', '2026-05-14', '2026-05-17'),
  ...allZones('Été', '2026-07-04', '2026-08-31'),

  // ----- Année scolaire 2026-2027 -----
  ...allZones('Toussaint', '2026-10-17', '2026-11-01'),
  ...allZones('Noël', '2026-12-19', '2027-01-03'),
  { zone: 'C', kind: 'Hiver', start: '2027-02-06', end: '2027-02-21' },
  { zone: 'A', kind: 'Hiver', start: '2027-02-13', end: '2027-02-28' },
  { zone: 'B', kind: 'Hiver', start: '2027-02-20', end: '2027-03-07' },
  { zone: 'C', kind: 'Printemps', start: '2027-04-03', end: '2027-04-18' },
  { zone: 'A', kind: 'Printemps', start: '2027-04-10', end: '2027-04-25' },
  { zone: 'B', kind: 'Printemps', start: '2027-04-17', end: '2027-05-02' },
  ...allZones('Pont Ascension', '2027-05-07', '2027-05-07'),
  ...allZones('Été', '2027-07-03', '2027-09-01'),

  // ----- Année scolaire 2027-2028 (début) -----
  ...allZones('Toussaint', '2027-10-23', '2027-11-07'),
  ...allZones('Noël', '2027-12-18', '2028-01-02'),
];

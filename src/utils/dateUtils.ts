// Calculs de semaines selon la norme ISO 8601 (celle des calendriers français) :
// la semaine 1 est celle qui contient le premier jeudi de l'année (donc le 4 janvier).

export function getWeekDates(weekNumber: number, year: number = new Date().getFullYear()): Date[] {
  // Le lundi de la semaine ISO 1 est le lundi de la semaine contenant le 4 janvier
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // 1 = lundi ... 7 = dimanche
  const mondayWeek1 = new Date(year, 0, 4 - (jan4Day - 1));

  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (weekNumber - 1) * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
}

// Jeudi de la semaine courante : détermine à la fois le numéro et l'année ISO
function getCurrentWeekThursday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return d;
}

export function getCurrentWeekNumber(): number {
  const thursday = getCurrentWeekThursday();
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Année ISO de la semaine courante (peut différer de l'année civile fin décembre / début janvier)
export function getCurrentWeekYear(): number {
  return getCurrentWeekThursday().getFullYear();
}

// Nombre de semaines ISO dans l'année (52 ou 53) : le 28 décembre est toujours
// dans la dernière semaine de l'année ISO
export function getWeeksInYear(year: number): number {
  const dec28 = new Date(year, 11, 28);
  const thursday = new Date(dec28);
  thursday.setDate(dec28.getDate() + 4 - (dec28.getDay() || 7));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

type SupportedTimestamp = Date | { toDate?: () => Date } | { seconds: number; nanoseconds?: number } | null | undefined;

const FR_DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export function formatTimestamp(timestamp: SupportedTimestamp): string {
  if (!timestamp) return '';

  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString('fr-FR', FR_DATETIME_FORMAT);
  }

  // Timestamp Firestore
  if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString('fr-FR', FR_DATETIME_FORMAT);
  }

  // Objet { seconds } (compatibilité avec le stockage local)
  if ('seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', FR_DATETIME_FORMAT);
  }

  return '';
}

// ---------------------------------------------------------------------------
// Nommage normalisé des sauvegardes
// ---------------------------------------------------------------------------
//
// Format imposé : AAAA-Sxx-vN
//   AAAA  année ISO de la semaine du PLANNING (pas celle du jour de travail)
//   Sxx   numéro de semaine du planning sur 2 chiffres
//   vN    version de cette semaine (chaque enregistrement crée la suivante)

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Jeudi de la semaine ISO demandée : porte le mois et l'année de la semaine. */
export function getWeekReferenceDate(weekNumber: number, year: number): Date {
  return getWeekDates(weekNumber, year)[3];
}

/**
 * Nom d'une sauvegarde : année et semaine ISO du planning, puis numéro de
 * version de cette semaine (« 2026-S48-v3 »). La date et l'heure de
 * l'enregistrement sont affichées à part, dans la liste « Ouvrir ».
 */
export function buildScheduleName(weekNumber: number, year: number, version: number): string {
  return `${year}-S${pad2(weekNumber)}-v${version}`;
}

const SCHEDULE_NAME_PATTERN = /^(\d{4})-S(\d{2})-v(\d+)$/;

/** Année, semaine et version lues dans un nom au format « 2026-S48-v3 », sinon null */
export function parseScheduleName(name: string): { year: number; weekNumber: number; version: number } | null {
  const m = SCHEDULE_NAME_PATTERN.exec(name.trim());
  return m ? { year: Number(m[1]), weekNumber: Number(m[2]), version: Number(m[3]) } : null;
}

export function isCanonicalScheduleName(name: string): boolean {
  return SCHEDULE_NAME_PATTERN.test(name.trim());
}

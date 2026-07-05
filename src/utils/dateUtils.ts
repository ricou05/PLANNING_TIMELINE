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

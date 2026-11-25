// Historique des plannings réalisés : collection Firestore `historique`.
// Lecture réservée aux utilisateurs autorisés, écriture aux administrateurs
// (voir rules.txt). Les noms et horaires des salariés ne sont jamais mis dans
// le code de l'application, qui est publié en clair sur GitHub Pages.
import { doc, getDoc, getDocs, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { HistoryWeek } from '../history/types';

const COLLECTION = 'historique';

// Firestore limite un lot d'écritures à 500 opérations
const BATCH_SIZE = 400;

/** Semaines déjà lues pendant la session (null = pas de données) */
const cache = new Map<string, HistoryWeek | null>();
/** Liste complète déjà lue (ou juste importée) */
let allWeeks: HistoryWeek[] | null = null;

/** Événement émis après un import, pour que les écrans relisent l'historique */
export const HISTORY_UPDATED_EVENT = 'historique-mis-a-jour';

export const getHistoryWeek = async (id: string): Promise<HistoryWeek | null> => {
  if (cache.has(id)) return cache.get(id) ?? null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  const data = snapshot.exists() ? (snapshot.data() as Omit<HistoryWeek, 'id'>) : null;
  const week = data ? { id, year: data.year, week: data.week, monday: data.monday, days: data.days } : null;
  cache.set(id, week);
  return week;
};

/** Toutes les semaines importées (une seule lecture groupée), par ordre chronologique. */
export const getAllHistoryWeeks = async (): Promise<HistoryWeek[]> => {
  if (allWeeks) return allWeeks;
  const snapshot = await getDocs(collection(db, COLLECTION));
  const weeks = snapshot.docs.map((d) => {
    const data = d.data() as Omit<HistoryWeek, 'id'>;
    const week: HistoryWeek = { id: d.id, year: data.year, week: data.week, monday: data.monday, days: data.days };
    cache.set(d.id, week);
    return week;
  });
  allWeeks = weeks.sort((a, b) => a.monday.localeCompare(b.monday));
  return allWeeks;
};

/** Enregistre (ou remplace) les semaines importées. */
export const saveHistoryWeeks = async (weeks: HistoryWeek[]): Promise<void> => {
  for (let i = 0; i < weeks.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    weeks.slice(i, i + BATCH_SIZE).forEach((week) => {
      batch.set(doc(db, COLLECTION, week.id), {
        year: week.year,
        week: week.week,
        monday: week.monday,
        days: week.days,
        importedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
  rememberHistoryWeeks(weeks);
};

/**
 * Met en mémoire des semaines déjà connues (juste importées) : les écrans les
 * affichent aussitôt, sans relire la base.
 */
export const rememberHistoryWeeks = (weeks: HistoryWeek[]): void => {
  cache.clear();
  weeks.forEach((week) => cache.set(week.id, week));
  allWeeks = [...weeks].sort((a, b) => a.monday.localeCompare(b.monday));
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
};

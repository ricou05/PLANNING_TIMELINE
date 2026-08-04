import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { getLocalSchedules, deleteLocalSchedule } from '../storage/localSchedules';
import { handleFirebaseError, withTimeout, TIMED_OUT } from './error-handling';

const SYNC_TIMEOUT_MS = 8000;

export interface SyncResult {
  /** Sauvegardes locales envoyées en ligne puis retirées du stockage local. */
  synced: number;
  /** Sauvegardes restées locales (toujours visibles dans « Ouvrir »). */
  pending: number;
  error?: string;
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Remonte vers Firestore les sauvegardes tombées en stockage local (id
 * `local_*`, créées quand l'accès en ligne avait échoué).
 *
 * Chaque sauvegarde locale porte un `remoteId` réservé à sa création :
 * l'écriture se fait avec setDoc sur cet id précis, donc rejouer la
 * synchronisation ne crée jamais de doublon. La copie locale n'est
 * supprimée qu'une fois l'écriture confirmée par le serveur.
 */
const runSync = async (): Promise<SyncResult> => {
  const locals = await getLocalSchedules();
  if (locals.length === 0) {
    return { synced: 0, pending: 0 };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, pending: locals.length };
  }

  let synced = 0;
  let pending = 0;
  let error: string | undefined;

  for (const schedule of locals) {
    try {
      const targetId = schedule.remoteId || doc(collection(db, 'schedules')).id;
      const result = await withTimeout(
        setDoc(doc(db, 'schedules', targetId), {
          name: schedule.name,
          schedules: schedule.schedules,
          employees: schedule.employees,
          weekNumber: schedule.weekNumber,
          year: schedule.year,
          colorLabels: schedule.colorLabels || [],
          createdAt: schedule.createdAt || Timestamp.now(),
          updatedAt: schedule.updatedAt || schedule.createdAt || Timestamp.now(),
        }),
        SYNC_TIMEOUT_MS
      );

      // Écriture encore en file d'attente : on garde la copie locale, la
      // prochaine synchronisation réessaiera sur le même id.
      if (result === TIMED_OUT) {
        pending++;
        continue;
      }

      await deleteLocalSchedule(schedule.id);
      synced++;
    } catch (syncError) {
      console.warn('Synchronisation impossible pour', schedule.name, syncError);
      pending++;
      error = handleFirebaseError(syncError);
    }
  }

  return { synced, pending, error };
};

/** Une seule synchronisation à la fois (démarrage + retour du réseau). */
export const syncLocalSchedules = async (): Promise<SyncResult> => {
  if (inFlight) return inFlight;

  inFlight = runSync().catch((error) => {
    console.error('Erreur de synchronisation:', error);
    return { synced: 0, pending: 0, error: handleFirebaseError(error) };
  });

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

/** Nombre de sauvegardes encore locales, pour l'affichage. */
export const countLocalSchedules = async (): Promise<number> => {
  const locals = await getLocalSchedules();
  return locals.length;
};

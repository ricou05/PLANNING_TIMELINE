import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import { Schedule, ColorLabel, SavedSchedule, Employee } from '../../types';
import { saveLocalSchedule, updateLocalSchedule, getLocalSchedules, deleteLocalSchedule } from '../storage/localSchedules';
import { handleFirebaseError, withTimeout, TIMED_OUT } from './error-handling';

/** Au-delà, on considère que l'écriture est partie dans la file d'attente hors ligne. */
const WRITE_TIMEOUT_MS = 8000;
/** La relecture anti-écrasement ne doit jamais bloquer une sauvegarde. */
const READ_TIMEOUT_MS = 5000;

export interface WriteResult {
  id: string;
  /** Horodatage réellement écrit : sert de référence pour la prochaine sauvegarde. */
  updatedAt?: Timestamp;
  error?: string;
  /** Écriture acceptée mais pas encore confirmée par le serveur (hors ligne). */
  queued?: boolean;
  /** Le planning a été modifié ailleurs depuis son ouverture : rien n'a été écrit. */
  conflict?: { remoteUpdatedAt: Timestamp | null };
}

export interface UpdateOptions {
  /**
   * Horodatage connu par l'appelant. S'il ne correspond plus à celui du
   * serveur, la sauvegarde est refusée au lieu d'écraser le travail d'un
   * autre poste. Laisser vide pour désactiver le contrôle.
   */
  expectedUpdatedAt?: Timestamp | null;
  /** Écraser malgré le conflit (après confirmation de l'utilisateur). */
  force?: boolean;
}

const buildPayload = (
  name: string,
  schedules: Record<string, Schedule>,
  employees: Employee[],
  weekNumber: number,
  year: number,
  colorLabels: ColorLabel[]
) => ({
  name,
  schedules,
  employees,
  weekNumber,
  year,
  colorLabels,
});

export const saveSchedule = async (
  name: string,
  schedules: Record<string, Schedule>,
  employees: Employee[],
  weekNumber: number,
  year: number,
  colorLabels: ColorLabel[]
): Promise<WriteResult> => {
  // L'identifiant est réservé côté client : si l'écriture n'aboutit pas et
  // qu'on bascule en local, la synchronisation réutilisera ce même id et ne
  // créera donc pas de doublon.
  const scheduleRef = doc(collection(db, 'schedules'));
  const createdAt = Timestamp.now();

  try {
    const result = await withTimeout(
      setDoc(scheduleRef, {
        ...buildPayload(name, schedules, employees, weekNumber, year, colorLabels),
        createdAt,
        updatedAt: createdAt,
      }),
      WRITE_TIMEOUT_MS
    );

    // Hors ligne, l'écriture reste en file d'attente : elle partira toute
    // seule au retour du réseau, inutile d'en faire une copie locale.
    if (result === TIMED_OUT) {
      return {
        id: scheduleRef.id,
        updatedAt: createdAt,
        queued: true,
        error: 'Hors ligne : la sauvegarde partira en ligne dès le retour de la connexion',
      };
    }

    return { id: scheduleRef.id, updatedAt: createdAt };
  } catch (error) {
    // Erreur franche (droits refusés...) : repli sur le stockage local.
    const localId = `local_${Date.now()}`;
    await saveLocalSchedule({
      id: localId,
      remoteId: scheduleRef.id,
      name,
      schedules,
      employees,
      weekNumber,
      year,
      colorLabels,
      createdAt,
      updatedAt: createdAt,
    });

    return {
      id: localId,
      updatedAt: createdAt,
      error: handleFirebaseError(error)
    };
  }
};

export const updateSchedule = async (
  id: string,
  name: string,
  schedules: Record<string, Schedule>,
  employees: Employee[],
  weekNumber: number,
  year: number,
  colorLabels: ColorLabel[],
  options: UpdateOptions = {}
): Promise<WriteResult> => {
  const now = Timestamp.now();

  try {
    if (id.startsWith('local_')) {
      await updateLocalSchedule(id, {
        id,
        name,
        schedules,
        employees,
        weekNumber,
        year,
        colorLabels,
        createdAt: now,
        updatedAt: now,
      });
      return { id, updatedAt: now };
    }

    const scheduleRef = doc(db, 'schedules', id);

    // Garde-fou anti-écrasement : on relit l'horodatage distant avant
    // d'écrire. Si quelqu'un (ou un autre PC) a sauvegardé entre-temps,
    // on rend la main à l'appelant au lieu d'écraser.
    if (!options.force && options.expectedUpdatedAt) {
      const snapshot = await withTimeout(getDoc(scheduleRef), READ_TIMEOUT_MS);
      if (snapshot !== TIMED_OUT && snapshot.exists()) {
        const data = snapshot.data();
        const remoteUpdatedAt: Timestamp | null = data.updatedAt || data.createdAt || null;
        if (remoteUpdatedAt && remoteUpdatedAt.toMillis() !== options.expectedUpdatedAt.toMillis()) {
          return { id, conflict: { remoteUpdatedAt } };
        }
      }
    }

    const result = await withTimeout(
      updateDoc(scheduleRef, {
        ...buildPayload(name, schedules, employees, weekNumber, year, colorLabels),
        updatedAt: now,
      }),
      WRITE_TIMEOUT_MS
    );

    if (result === TIMED_OUT) {
      return {
        id,
        updatedAt: now,
        queued: true,
        error: 'Hors ligne : la sauvegarde partira en ligne dès le retour de la connexion',
      };
    }

    return { id, updatedAt: now };
  } catch (error) {
    return {
      id,
      error: handleFirebaseError(error)
    };
  }
};

export const getSchedules = async (): Promise<{ schedules: SavedSchedule[], warnings?: string[] }> => {
  const warnings: string[] = [];
  let firebaseSchedules: SavedSchedule[] = [];
  let localSchedules: SavedSchedule[] = [];

  try {
    // Récupérer les sauvegardes Firebase
    const schedulesRef = collection(db, 'schedules');
    const q = query(schedulesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    firebaseSchedules = querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      schedules: doc.data().schedules,
      employees: doc.data().employees,
      weekNumber: doc.data().weekNumber,
      year: doc.data().year,
      colorLabels: doc.data().colorLabels || [],
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt || doc.data().createdAt
    }));
  } catch (error) {
    console.warn('Erreur lors de la récupération des sauvegardes Firebase:', error);
    warnings.push('Impossible de charger les sauvegardes en ligne - Mode hors ligne activé');
  }

  try {
    // Récupérer les sauvegardes locales
    localSchedules = await getLocalSchedules();
  } catch (error) {
    console.error('Erreur lors de la récupération des sauvegardes locales:', error);
    warnings.push('Erreur lors du chargement des sauvegardes locales');
  }

  // Une sauvegarde locale déjà synchronisée porte le même id Firestore que
  // sa version en ligne : on ne l'affiche pas deux fois.
  const remoteIds = new Set(firebaseSchedules.map(s => s.id));
  const pendingLocals = localSchedules.filter(s => !s.remoteId || !remoteIds.has(s.remoteId));

  // Fusionner et trier toutes les sauvegardes
  const allSchedules = [...firebaseSchedules, ...pendingLocals]
    .sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;
      return dateB - dateA;
    });

  return {
    schedules: allSchedules,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

export const deleteSchedule = async (id: string): Promise<{ error?: string }> => {
  try {
    if (id.startsWith('local_')) {
      await deleteLocalSchedule(id);
      return {};
    }

    const scheduleRef = doc(db, 'schedules', id);
    await deleteDoc(scheduleRef);
    return {};
  } catch (error) {
    return { error: handleFirebaseError(error) };
  }
};

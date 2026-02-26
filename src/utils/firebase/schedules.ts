import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';
import { Schedule, ColorLabel, SavedSchedule, Employee } from '../../types';
import { saveLocalSchedule, updateLocalSchedule, getLocalSchedules, deleteLocalSchedule } from '../storage/localSchedules';
import { handleFirebaseError } from './error-handling';

export const saveSchedule = async (
  name: string,
  schedules: Record<string, Schedule>,
  employees: Employee[],
  weekNumber: number,
  year: number,
  colorLabels: ColorLabel[]
): Promise<{ id: string; error?: string }> => {
  try {
    const schedulesRef = collection(db, 'schedules');

    const docRef = await addDoc(schedulesRef, {
      name,
      schedules,
      employees,
      weekNumber,
      year,
      colorLabels,
      createdAt: Timestamp.now()
    });

    return { id: docRef.id };
  } catch (error) {
    // Fallback to local storage
    const localId = `local_${Date.now()}`;
    await saveLocalSchedule({
      id: localId,
      name,
      schedules,
      employees,
      weekNumber,
      year,
      colorLabels,
      createdAt: Timestamp.now()
    });
    
    return { 
      id: localId,
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
  colorLabels: ColorLabel[]
): Promise<{ id: string; error?: string }> => {
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
        createdAt: Timestamp.now()
      });
      return { id };
    }

    const scheduleRef = doc(db, 'schedules', id);
    await updateDoc(scheduleRef, {
      name,
      schedules,
      employees,
      weekNumber,
      year,
      colorLabels,
      updatedAt: Timestamp.now()
    });

    return { id };
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

  // Fusionner et trier toutes les sauvegardes
  const allSchedules = [...firebaseSchedules, ...localSchedules]
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

// Table des correspondances N / N-1 : collection Firestore `correspondances`,
// un document par saison de référence (ex. « 2025-2026 »). Lecture par les
// utilisateurs autorisés, modification par les administrateurs (rules.txt).
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { Correspondences, EMPTY_CORRESPONDENCES } from '../history/correspondences';

const COLLECTION = 'correspondances';

export const CORRESPONDENCES_UPDATED_EVENT = 'correspondances-mises-a-jour';

export const getCorrespondences = async (season: string): Promise<Correspondences> => {
  const snapshot = await getDoc(doc(db, COLLECTION, season));
  if (!snapshot.exists()) return EMPTY_CORRESPONDENCES;
  const data = snapshot.data();
  return {
    aliases: (data.aliases as Record<string, string>) ?? {},
    successors: (data.successors as Record<string, string>) ?? {},
  };
};

export const saveCorrespondences = async (season: string, c: Correspondences): Promise<void> => {
  await setDoc(doc(db, COLLECTION, season), {
    aliases: c.aliases,
    successors: c.successors,
    updatedAt: serverTimestamp(),
  });
  window.dispatchEvent(new CustomEvent(CORRESPONDENCES_UPDATED_EVENT, { detail: c }));
};

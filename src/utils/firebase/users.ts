import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { BOOTSTRAP_ADMIN_EMAIL, normalizeEmail } from './auth';

export type UserRole = 'admin' | 'user';

export interface AllowedUser {
  email: string;
  role: UserRole;
  addedAt?: Timestamp;
  addedBy?: string;
}

// Liste blanche des utilisateurs autorisés. L'ID de chaque document est
// l'email en minuscules ; les règles Firestore s'appuient dessus pour
// n'accorder l'accès aux plannings qu'aux emails présents ici.
const allowedUsersRef = () => collection(db, 'allowedUsers');

export const getAllowedUser = async (email: string): Promise<AllowedUser | null> => {
  const snapshot = await getDoc(doc(db, 'allowedUsers', normalizeEmail(email)));
  if (!snapshot.exists()) return null;
  return snapshot.data() as AllowedUser;
};

export const listAllowedUsers = async (): Promise<AllowedUser[]> => {
  const snapshot = await getDocs(query(allowedUsersRef(), orderBy('email')));
  return snapshot.docs.map(d => d.data() as AllowedUser);
};

export const addAllowedUser = async (
  email: string,
  role: UserRole,
  addedBy: string
): Promise<void> => {
  const normalized = normalizeEmail(email);
  await setDoc(doc(db, 'allowedUsers', normalized), {
    email: normalized,
    role,
    addedAt: Timestamp.now(),
    addedBy: normalizeEmail(addedBy),
  });
};

export const removeAllowedUser = async (email: string): Promise<void> => {
  await deleteDoc(doc(db, 'allowedUsers', normalizeEmail(email)));
};

// Crée la fiche de l'admin bootstrap si elle n'existe pas encore, pour
// qu'il apparaisse dans la liste des utilisateurs. Silencieux en cas
// d'échec (hors ligne, etc.) : son accès ne dépend pas de cette fiche.
export const ensureBootstrapAdminDoc = async (): Promise<void> => {
  try {
    const existing = await getAllowedUser(BOOTSTRAP_ADMIN_EMAIL);
    if (!existing) {
      await addAllowedUser(BOOTSTRAP_ADMIN_EMAIL, 'admin', BOOTSTRAP_ADMIN_EMAIL);
    }
  } catch (error) {
    console.warn("Impossible de créer la fiche de l'admin principal:", error);
  }
};

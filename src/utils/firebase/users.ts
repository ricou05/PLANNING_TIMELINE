import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, FIREBASE_PROJECT_ID } from './config';
import { BOOTSTRAP_ADMIN_EMAIL, normalizeEmail } from './auth';
import { withTimeout, TIMED_OUT, isFirebaseError } from './error-handling';
import firestoreRules from './rules.txt?raw';

export type UserRole = 'admin' | 'user';

/** Au-delà, on considère l'écriture bloquée (hors ligne, réseau coupé). */
const WRITE_TIMEOUT_MS = 8000;
const READ_TIMEOUT_MS = 8000;

export interface AllowedUser {
  email: string;
  role: UserRole;
  addedAt?: Timestamp;
  addedBy?: string;
}

/**
 * Résultat d'une vérification d'autorisation. La distinction est capitale :
 * `denied` veut dire « le serveur a répondu : cet email n'est pas dans la
 * liste », alors que `unknown` veut dire « on n'a pas pu vérifier ». Traiter
 * les deux de la même façon refusait l'accès à un utilisateur pourtant
 * autorisé dès que la lecture échouait (cache local vide, réseau lent).
 */
export type AllowedUserLookup =
  | { status: 'allowed'; user: AllowedUser }
  | { status: 'denied' }
  | { status: 'unknown'; reason: string };

// Liste blanche des utilisateurs autorisés. L'ID de chaque document est
// l'email en minuscules ; les règles Firestore s'appuient dessus pour
// n'accorder l'accès aux plannings qu'aux emails présents ici.
const allowedUsersRef = () => collection(db, 'allowedUsers');

/** Message lisible à partir d'une erreur Firestore (code technique inclus). */
export const describeFirestoreError = (error: unknown): string => {
  if (isFirebaseError(error)) {
    switch (error.code) {
      case 'permission-denied':
        return 'Accès refusé par les règles Firestore.';
      case 'unavailable':
        return 'Service Firestore injoignable. Vérifiez votre connexion Internet.';
      case 'unauthenticated':
        return 'Session expirée. Déconnectez-vous puis reconnectez-vous.';
      default:
        return `Erreur Firestore (code : ${error.code}).`;
    }
  }
  return error instanceof Error ? error.message : 'Erreur inattendue.';
};

/**
 * Lit la fiche d'un utilisateur. Une absence constatée depuis le seul cache
 * local ne prouve rien : on redemande alors au serveur avant de conclure.
 */
export const lookupAllowedUser = async (email: string): Promise<AllowedUserLookup> => {
  const ref = doc(db, 'allowedUsers', normalizeEmail(email));
  try {
    const snapshot = await withTimeout(getDoc(ref), READ_TIMEOUT_MS);

    if (snapshot !== TIMED_OUT && snapshot.exists()) {
      return { status: 'allowed', user: snapshot.data() as AllowedUser };
    }

    // Fiche absente du cache (ou lecture trop lente) : seul le serveur peut
    // trancher, notamment pour un utilisateur que l'admin vient d'ajouter.
    if (snapshot === TIMED_OUT || snapshot.metadata.fromCache) {
      const fresh = await withTimeout(getDocFromServer(ref), READ_TIMEOUT_MS);
      if (fresh === TIMED_OUT) {
        return { status: 'unknown', reason: 'Le serveur n’a pas répondu à temps.' };
      }
      return fresh.exists()
        ? { status: 'allowed', user: fresh.data() as AllowedUser }
        : { status: 'denied' };
    }

    return { status: 'denied' };
  } catch (error) {
    // Une lecture refusée sur sa propre fiche = fiche inexistante côté règles
    // seulement si le serveur a répondu ; sinon on reste dans l'incertitude.
    return { status: 'unknown', reason: describeFirestoreError(error) };
  }
};

export const getAllowedUser = async (email: string): Promise<AllowedUser | null> => {
  const result = await lookupAllowedUser(email);
  return result.status === 'allowed' ? result.user : null;
};

export const listAllowedUsers = async (): Promise<AllowedUser[]> => {
  const snapshot = await withTimeout(
    getDocs(query(allowedUsersRef(), orderBy('email'))),
    READ_TIMEOUT_MS
  );
  if (snapshot === TIMED_OUT) {
    throw new Error('La liste des utilisateurs met trop de temps à répondre.');
  }
  return snapshot.docs.map(d => d.data() as AllowedUser);
};

export interface AddUserResult {
  /** Écriture partie mais pas encore confirmée par le serveur (hors ligne). */
  queued?: boolean;
}

export const addAllowedUser = async (
  email: string,
  role: UserRole,
  addedBy: string
): Promise<AddUserResult> => {
  const normalized = normalizeEmail(email);
  // Hors ligne, setDoc ne rejette pas : la promesse reste en attente tant que
  // le serveur n'a pas répondu. Sans ce garde-fou, le bouton « Ajouter »
  // tournait indéfiniment et l'ajout semblait ne « pas fonctionner ».
  const result = await withTimeout(
    setDoc(doc(db, 'allowedUsers', normalized), {
      email: normalized,
      role,
      addedAt: Timestamp.now(),
      addedBy: normalizeEmail(addedBy),
    }),
    WRITE_TIMEOUT_MS
  );
  return result === TIMED_OUT ? { queued: true } : {};
};

export const removeAllowedUser = async (email: string): Promise<AddUserResult> => {
  const result = await withTimeout(
    deleteDoc(doc(db, 'allowedUsers', normalizeEmail(email))),
    WRITE_TIMEOUT_MS
  );
  return result === TIMED_OUT ? { queued: true } : {};
};

/** Texte intégral des règles Firestore à publier dans la console. */
export const FIRESTORE_RULES = firestoreRules;

/** Lien direct vers l'onglet Règles du bon projet Firebase. */
export const FIRESTORE_RULES_CONSOLE_URL =
  `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/rules`;

export interface AccessProbe {
  label: string;
  ok: boolean;
  detail: string;
}

export interface AccessDiagnostic {
  /** Email tel que le fournisseur d'identité le renvoie (casse d'origine). */
  tokenEmail: string;
  /** Le même, normalisé : c'est lui qui sert d'identifiant de document. */
  normalizedEmail: string;
  /** L'application considère ce compte comme l'admin principal. */
  isBootstrapAdmin: boolean;
  projectId: string;
  probes: AccessProbe[];
  /** Toutes les opérations refusées par les règles de sécurité. */
  allDenied: boolean;
  /** Au moins une sonde n'a pas pu joindre Firestore : verdict non concluant. */
  unreachable: boolean;
}

/** Chaque sonde est bornée : un diagnostic qui ne rend jamais la main
 *  n'apprend rien, et Firestore hors ligne ne rejette pas de lui-même. */
const PROBE_TIMEOUT_MS = 6000;

const probe = async (label: string, run: () => Promise<string>): Promise<AccessProbe> => {
  try {
    const detail = await withTimeout(run(), PROBE_TIMEOUT_MS);
    return detail === TIMED_OUT
      ? { label, ok: false, detail: 'aucune réponse du serveur' }
      : { label, ok: true, detail };
  } catch (error) {
    const code = isFirebaseError(error) ? error.code : 'inconnu';
    return { label, ok: false, detail: code };
  }
};

/**
 * Teste une à une les opérations dont dépend la gestion des utilisateurs, pour
 * dire précisément laquelle est refusée plutôt que « accès refusé ». Les trois
 * sondes sont sans effet de bord : la seule écriture réinscrit la fiche de
 * l'admin principal à l'identique (même opération que ensureBootstrapAdminDoc).
 */
export const diagnoseUserAccess = async (): Promise<AccessDiagnostic> => {
  const tokenEmail = auth.currentUser?.email || '';
  const normalized = normalizeEmail(tokenEmail);
  const isBootstrap = normalized === BOOTSTRAP_ADMIN_EMAIL;

  const probes: AccessProbe[] = [];

  // Sans email dans le jeton, aucune règle ne peut accorder quoi que ce soit :
  // inutile d'interroger Firestore, le verdict est déjà connu.
  if (!normalized) {
    return {
      tokenEmail,
      normalizedEmail: normalized,
      isBootstrapAdmin: false,
      projectId: FIREBASE_PROJECT_ID,
      probes: [
        {
          label: 'Compte connecté',
          ok: false,
          detail: "aucun email associé — déconnectez-vous puis reconnectez-vous",
        },
      ],
      allDenied: false,
      unreachable: false,
    };
  }

  probes.push(
    await probe('Lire sa propre fiche (get)', async () => {
      const snapshot = await getDocFromServer(doc(db, 'allowedUsers', normalized));
      return snapshot.exists() ? `fiche présente (rôle ${snapshot.data().role})` : 'aucune fiche';
    })
  );

  probes.push(
    await probe('Lister les utilisateurs (list)', async () => {
      const snapshot = await getDocs(query(allowedUsersRef(), orderBy('email')));
      return `${snapshot.size} fiche(s)`;
    })
  );

  if (isBootstrap) {
    probes.push(
      await probe("Écrire la fiche de l'admin principal (create)", async () => {
        await setDoc(
          doc(db, 'allowedUsers', normalized),
          { email: normalized, role: 'admin', addedAt: Timestamp.now(), addedBy: normalized },
          { merge: true }
        );
        return 'écriture acceptée';
      })
    );
  }

  return {
    tokenEmail,
    normalizedEmail: normalized,
    isBootstrapAdmin: isBootstrap,
    projectId: FIREBASE_PROJECT_ID,
    probes,
    allDenied: probes.every(p => p.detail === 'permission-denied'),
    unreachable: probes.some(p => p.detail === 'aucune réponse du serveur' || p.detail === 'unavailable'),
  };
};

// Crée la fiche de l'admin bootstrap si elle n'existe pas encore, pour
// qu'il apparaisse dans la liste des utilisateurs. Silencieux en cas
// d'échec (hors ligne, etc.) : son accès ne dépend pas de cette fiche.
export const ensureBootstrapAdminDoc = async (): Promise<void> => {
  try {
    const existing = await lookupAllowedUser(BOOTSTRAP_ADMIN_EMAIL);
    if (existing.status === 'denied') {
      await addAllowedUser(BOOTSTRAP_ADMIN_EMAIL, 'admin', BOOTSTRAP_ADMIN_EMAIL);
    }
  } catch (error) {
    console.warn("Impossible de créer la fiche de l'admin principal:", error);
  }
};

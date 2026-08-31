import { FirebaseError } from 'firebase/app';

const SUFFIX = 'Sauvegarde conservée sur ce PC uniquement';

/**
 * Message affiché pour chaque code d'erreur Firestore. Tout ce qui manquait
 * ici retombait sur « Erreur de connexion », ce qui masquait la vraie cause :
 * une donnée refusée ou une session expirée n'ont rien à voir avec le réseau
 * et n'appellent pas la même action de la part de l'utilisateur.
 */
const FIRESTORE_MESSAGES: Record<string, string> = {
  'permission-denied': 'Accès en ligne refusé',
  'unauthenticated': 'Session expirée - reconnectez-vous pour sauvegarder en ligne',
  'unavailable': 'Service indisponible',
  'deadline-exceeded': 'Le serveur met trop de temps à répondre',
  'cancelled': 'Envoi interrompu',
  'not-found': 'Document non trouvé',
  'already-exists': 'Une sauvegarde porte déjà cet identifiant',
  'invalid-argument': 'Données refusées par le serveur',
  'failed-precondition': 'Sauvegarde refusée par le serveur',
  'aborted': 'Sauvegarde interrompue par une modification simultanée',
  'out-of-range': 'Données hors limites',
  'resource-exhausted': 'Quota Firebase atteint',
  'internal': 'Erreur interne du serveur',
  'unknown': 'Erreur inconnue du serveur',
};

export const handleFirebaseError = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    const label = FIRESTORE_MESSAGES[error.code];
    // Le code brut reste affiché quand il n'est pas répertorié : sans lui,
    // impossible de diagnostiquer une panne à distance.
    return `${label || `Erreur Firebase (${error.code})`} - ${SUFFIX}`;
  }

  if (error instanceof Error) {
    return `${error.message} - ${SUFFIX}`;
  }

  return `Erreur inattendue - ${SUFFIX}`;
};

export const isFirebaseError = (error: unknown): error is FirebaseError => {
  return error instanceof FirebaseError;
};

/** Valeur renvoyée par withTimeout quand la promesse n'a pas répondu à temps. */
export const TIMED_OUT: unique symbol = Symbol('timed-out');

/**
 * Hors ligne, les écritures Firestore ne rejettent pas : elles restent en
 * attente indéfiniment dans la file de synchronisation. Sans garde-fou,
 * l'interface resterait bloquée sur « chargement » jusqu'au retour du
 * réseau. On laisse donc l'écriture partir en file d'attente et on rend la
 * main à l'appelant.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
};

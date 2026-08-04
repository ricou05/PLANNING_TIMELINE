import { FirebaseError } from 'firebase/app';

export const handleFirebaseError = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'Accès en ligne refusé - Sauvegarde conservée sur ce PC uniquement';
      case 'unavailable':
        return 'Service indisponible - Sauvegarde conservée sur ce PC uniquement';
      case 'not-found':
        return 'Document non trouvé - Sauvegarde conservée sur ce PC uniquement';
      default:
        return 'Erreur de connexion - Sauvegarde conservée sur ce PC uniquement';
    }
  }

  if (error instanceof Error) {
    return `${error.message} - Sauvegarde conservée sur ce PC uniquement`;
  }

  return 'Erreur inattendue - Sauvegarde conservée sur ce PC uniquement';
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

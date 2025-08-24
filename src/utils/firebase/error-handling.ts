import { FirebaseError } from 'firebase/app';

export const handleFirebaseError = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'Mode hors ligne activé - Les données sont sauvegardées localement';
      case 'unavailable':
        return 'Service temporairement indisponible - Mode local activé';
      case 'not-found':
        return 'Document non trouvé - Mode local activé';
      default:
        return 'Erreur de connexion - Mode local activé';
    }
  }
  
  if (error instanceof Error) {
    return `${error.message} - Mode local activé`;
  }
  
  return 'Erreur inattendue - Mode local activé';
};

export const isFirebaseError = (error: unknown): error is FirebaseError => {
  return error instanceof FirebaseError;
};

export const shouldFallbackToLocal = (error: unknown): boolean => {
  return true; // Toujours utiliser le stockage local en cas d'erreur
};
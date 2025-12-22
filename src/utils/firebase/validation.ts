import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './config';

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateDatabaseIntegrity(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  try {
    // Vérifier la connexion à la base de données
    const schedulesRef = collection(db, 'schedules');
    const snapshot = await getDocs(schedulesRef);

    // Vérifier l'intégrité des données
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Vérifier les champs requis
      if (!data.name || !data.schedules || !data.employees || !data.weekNumber || !data.year) {
        result.errors.push(`Document ${doc.id} : champs requis manquants`);
        result.success = false;
        continue;
      }

      // Vérifier les types de données
      if (typeof data.weekNumber !== 'number' || typeof data.year !== 'number') {
        result.errors.push(`Document ${doc.id} : types de données invalides`);
        result.success = false;
      }

      // Vérifier les timestamps
      if (!data.createdAt || !(data.createdAt instanceof Timestamp)) {
        result.errors.push(`Document ${doc.id} : timestamp invalide`);
        result.success = false;
      }

      // Vérifier la cohérence des données
      if (data.weekNumber < 1 || data.weekNumber > 53) {
        result.warnings.push(`Document ${doc.id} : numéro de semaine suspect (${data.weekNumber})`);
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Erreur de connexion à la base de données: ${error}`);
  }

  return result;
}

export async function validateStorageSpace(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  try {
    // Vérifier l'espace local
    const localStorageUsed = calculateLocalStorageUsage();
    const localStorageLimit = 5 * 1024 * 1024; // 5MB limite typique

    if (localStorageUsed > localStorageLimit * 0.9) {
      result.warnings.push(`Stockage local presque plein (${Math.round(localStorageUsed / 1024 / 1024)}MB / 5MB)`);
    }

    if (localStorageUsed > localStorageLimit) {
      result.errors.push('Stockage local plein');
      result.success = false;
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Erreur lors de la vérification du stockage: ${error}`);
  }

  return result;
}

export async function validateSavePermissions(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  try {
    // Tester l'écriture dans Firebase
    const testRef = collection(db, 'schedules');
    await getDocs(query(testRef, where('test', '==', true)));

    // Vérifier le stockage local
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch {
      result.errors.push('Pas d\'accès au stockage local');
      result.success = false;
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Erreur de permissions: ${error}`);
  }

  return result;
}

function calculateLocalStorageUsage(): number {
  let total = 0;
  Object.keys(localStorage).forEach((key) => {
    const value = localStorage.getItem(key) || '';
    total += (value.length + key.length) * 2; // Approximation en bytes
  });
  return total;
}

import { initializeApp } from 'firebase/app';
import {
  collection,
  getDocs,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA3d27GUFYFZR4-23cD_VkS09l1H70Ef70",
  authDomain: "schedules-c28a2.firebaseapp.com",
  projectId: "schedules-c28a2",
  storageBucket: "schedules-c28a2.firebasestorage.app",
  messagingSenderId: "719002193306",
  appId: "1:719002193306:web:92966bba6c38fcf31a7e23"
};

/** Projet Firebase réellement utilisé — affiché par le diagnostic d'accès :
 *  publier les règles dans un autre projet n'a aucun effet sur l'application. */
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Persistance hors ligne : cache IndexedDB avec gestion multi-onglets.
// Remplace enableIndexedDbPersistence(), déprécié et limité à un seul
// onglet à la fois (le second onglet perdait la persistance).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Authentification (emails de réinitialisation, etc. envoyés en français)
export const auth = getAuth(app);
auth.languageCode = 'fr';

// Test de connexion avec gestion améliorée des erreurs
export const testConnection = async (): Promise<{ online: boolean; error?: string }> => {
  try {
    // Essayer de créer la collection si elle n'existe pas
    const schedulesRef = collection(db, 'schedules');
    await getDocs(schedulesRef);

    console.log('Connexion Firebase réussie');
    return { online: true };
  } catch (error) {
    console.warn('Erreur de connexion Firebase - passage en mode hors ligne:', error);
    return {
      online: false,
      error: 'Mode hors ligne : les sauvegardes restent sur ce PC et seront envoyées en ligne au retour de la connexion'
    };
  }
};

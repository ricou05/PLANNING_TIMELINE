import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA3d27GUFYFZR4-23cD_VkS09l1H70Ef70",
  authDomain: "schedules-c28a2.firebaseapp.com",
  projectId: "schedules-c28a2",
  storageBucket: "schedules-c28a2.firebasestorage.app",
  messagingSenderId: "719002193306",
  appId: "1:719002193306:web:92966bba6c38fcf31a7e23"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Activer la persistance hors ligne
enableIndexedDbPersistence(db).catch((err) => {
  console.warn('Erreur lors de l\'activation de la persistance:', err);
  if (err.code === 'failed-precondition') {
    console.warn('La persistance ne peut être activée que dans un seul onglet à la fois');
  } else if (err.code === 'unimplemented') {
    console.warn('Le navigateur ne supporte pas la persistance');
  }
});

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
      error: 'Mode hors ligne activé - Les données seront synchronisées automatiquement'
    };
  }
};
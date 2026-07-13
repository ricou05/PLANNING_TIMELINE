import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './hooks/useAuth';
import AuthGate from './components/Auth/AuthGate';

// L'application est protégée : AuthGate n'affiche App qu'une fois
// l'utilisateur connecté et présent dans la liste blanche (allowedUsers).
// Note : plus de testConnection au démarrage — les règles Firestore
// refusent toute lecture avant connexion, le test serait donc toujours
// en échec. La gestion hors ligne reste assurée au niveau des requêtes.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>
);

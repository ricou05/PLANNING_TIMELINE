import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './utils/firebase/config';

// Initialisation avec gestion d'erreur améliorée
async function initializeApp() {
  const { online, error } = await testConnection();
  
  if (!online) {
    console.warn('Application starting in offline mode:', error);
  }

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

initializeApp();
import React from 'react';
import { CalendarClock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LoginPage from './LoginPage';
import UnauthorizedScreen from './UnauthorizedScreen';

// Bloque l'accès à l'application tant que l'utilisateur n'est pas
// connecté ET présent dans la liste blanche (allowedUsers).
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center animate-pulse">
          <CalendarClock className="w-8 h-8 text-white" />
        </div>
        <p className="text-blue-100 text-sm font-medium">Chargement…</p>
      </div>
    );
  }

  if (status === 'signedOut') {
    return <LoginPage />;
  }

  if (status === 'unauthorized') {
    return <UnauthorizedScreen />;
  }

  return <>{children}</>;
};

export default AuthGate;

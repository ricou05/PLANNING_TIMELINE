import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  normalizeEmail,
  subscribeToAuthState,
  signOutUser,
  getAllowedUser,
  ensureBootstrapAdminDoc,
} from '../utils/firebase';
import type { UserRole } from '../utils/firebase';

// - loading      : état de connexion en cours de résolution
// - signedOut    : personne n'est connecté → page de login
// - unauthorized : connecté mais email absent de la liste blanche → accès refusé
// - authorized   : connecté et autorisé → application
export type AuthStatus = 'loading' | 'signedOut' | 'unauthorized' | 'authorized';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (cancelled) return;

      if (!firebaseUser || !firebaseUser.email) {
        setUser(null);
        setRole(null);
        setStatus('signedOut');
        return;
      }

      setUser(firebaseUser);
      setStatus('loading');

      const email = normalizeEmail(firebaseUser.email);

      // L'admin principal est toujours autorisé (même si sa fiche
      // allowedUsers n'existe pas encore) : c'est lui qui amorce le système.
      if (email === BOOTSTRAP_ADMIN_EMAIL) {
        ensureBootstrapAdminDoc();
        if (!cancelled) {
          setRole('admin');
          setStatus('authorized');
        }
        return;
      }

      try {
        const allowed = await getAllowedUser(email);
        if (cancelled) return;
        if (allowed) {
          setRole(allowed.role);
          setStatus('authorized');
        } else {
          setRole(null);
          setStatus('unauthorized');
        }
      } catch (error) {
        // Lecture refusée par les règles ou impossible → pas d'accès
        console.warn("Vérification d'autorisation impossible:", error);
        if (!cancelled) {
          setRole(null);
          setStatus('unauthorized');
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, role, isAdmin: role === 'admin', signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  }
  return context;
};

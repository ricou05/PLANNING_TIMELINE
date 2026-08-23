import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  normalizeEmail,
  subscribeToAuthState,
  signOutUser,
  lookupAllowedUser,
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
  /**
   * Renseigné quand le refus vient d'une vérification impossible (réseau,
   * règles Firestore) et non d'une absence avérée de la liste blanche.
   */
  authError: string | null;
  /** Relance la vérification sans avoir à se déconnecter/reconnecter. */
  recheck: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const userRef = useRef<User | null>(null);

  // Vérifie l'appartenance à la liste blanche pour un utilisateur connecté.
  const checkAuthorization = useCallback(async (firebaseUser: User, isStale: () => boolean) => {
    const email = normalizeEmail(firebaseUser.email || '');

    // L'admin principal est toujours autorisé (même si sa fiche
    // allowedUsers n'existe pas encore) : c'est lui qui amorce le système.
    if (email === BOOTSTRAP_ADMIN_EMAIL) {
      ensureBootstrapAdminDoc();
      if (isStale()) return;
      setRole('admin');
      setAuthError(null);
      setStatus('authorized');
      return;
    }

    const result = await lookupAllowedUser(email);
    if (isStale()) return;

    if (result.status === 'allowed') {
      setRole(result.user.role);
      setAuthError(null);
      setStatus('authorized');
      return;
    }

    // « unknown » = la liste blanche n'a pas pu être lue. On refuse l'entrée
    // (les règles Firestore refuseraient de toute façon les données), mais on
    // le dit clairement pour que l'utilisateur puisse réessayer, au lieu de
    // lui annoncer à tort qu'il n'est pas autorisé.
    setRole(null);
    setAuthError(result.status === 'unknown' ? result.reason : null);
    setStatus('unauthorized');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isStale = () => cancelled;

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (cancelled) return;

      if (!firebaseUser || !firebaseUser.email) {
        userRef.current = null;
        setUser(null);
        setRole(null);
        setAuthError(null);
        setStatus('signedOut');
        return;
      }

      userRef.current = firebaseUser;
      setUser(firebaseUser);
      setStatus('loading');
      await checkAuthorization(firebaseUser, isStale);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [checkAuthorization]);

  // Nouvelle tentative déclenchée par l'utilisateur (bouton « Réessayer »),
  // utile juste après qu'un administrateur vient d'ajouter son email.
  useEffect(() => {
    if (attempt === 0) return;
    const current = userRef.current;
    if (!current) return;

    let cancelled = false;
    setStatus('loading');
    checkAuthorization(current, () => cancelled);
    return () => { cancelled = true; };
  }, [attempt, checkAuthorization]);

  const recheck = useCallback(() => setAttempt(n => n + 1), []);

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, user, role, isAdmin: role === 'admin', authError, recheck, signOut }}
    >
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

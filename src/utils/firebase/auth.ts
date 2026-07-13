import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';

// Compte administrateur "racine" : toujours autorisé et toujours admin,
// même si la collection allowedUsers est vide (bootstrap du système).
// Doit rester synchronisé avec l'email codé dans les règles Firestore (rules.txt).
export const BOOTSTRAP_ADMIN_EMAIL = 'eric.isola@gmail.com';

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

// Messages d'erreur Firebase Auth traduits en français
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': "Adresse email invalide.",
  'auth/user-disabled': "Ce compte a été désactivé.",
  'auth/user-not-found': "Aucun compte n'existe avec cet email. Utilisez « Première connexion » pour le créer.",
  'auth/wrong-password': "Mot de passe incorrect.",
  'auth/invalid-credential': "Email ou mot de passe incorrect.",
  'auth/email-already-in-use': "Un compte existe déjà avec cet email. Connectez-vous, ou utilisez « Mot de passe oublié ».",
  'auth/weak-password': "Mot de passe trop faible (6 caractères minimum).",
  'auth/too-many-requests': "Trop de tentatives. Réessayez dans quelques minutes ou réinitialisez votre mot de passe.",
  'auth/network-request-failed': "Erreur réseau. Vérifiez votre connexion Internet.",
  'auth/operation-not-allowed': "La connexion par email/mot de passe n'est pas activée dans la console Firebase (voir GUIDE_AUTHENTIFICATION.md).",
  'auth/missing-password': "Veuillez saisir un mot de passe.",
};

export const getAuthErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  console.error('Erreur Firebase Auth non traduite:', error);
  return "Une erreur est survenue. Veuillez réessayer.";
};

export const signInUser = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return credential.user;
};

// Première connexion : l'utilisateur crée son compte avec l'email que
// l'administrateur a autorisé. Le compte Auth seul ne donne aucun accès
// aux données : les règles Firestore exigent d'être dans la liste blanche.
export const registerUser = async (email: string, password: string): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
  return credential.user;
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, normalizeEmail(email));
};

export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeToAuthState = (callback: (user: User | null) => void): (() => void) =>
  onAuthStateChanged(auth, callback);

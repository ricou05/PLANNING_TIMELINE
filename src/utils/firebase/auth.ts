import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
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
  'auth/configuration-not-found': "L'authentification n'est pas encore activée pour ce projet. Dans la console Firebase : Authentication → Commencer → activer « Adresse e-mail/Mot de passe » (voir GUIDE_AUTHENTIFICATION.md, étape 1).",
  'auth/admin-restricted-operation': "La création de compte est désactivée dans la console Firebase (Authentication → Settings → User actions → réactiver « Create »).",
  'auth/missing-password': "Veuillez saisir un mot de passe.",
  'auth/popup-closed-by-user': "Connexion annulée.",
  'auth/cancelled-popup-request': "Connexion annulée.",
  'auth/popup-blocked': "La fenêtre de connexion Google a été bloquée par le navigateur. Autorisez les popups pour ce site.",
  'auth/unauthorized-domain': "Ce domaine n'est pas autorisé dans la console Firebase (Authentication → Settings → Domaines autorisés).",
  'auth/account-exists-with-different-credential': "Un compte existe déjà avec cet email via un autre mode de connexion.",
};

export const getAuthErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  console.error('Erreur Firebase Auth non traduite:', error);
  // Afficher le code technique aide à diagnostiquer les cas imprévus
  return code
    ? `Une erreur est survenue (code : ${code}). Veuillez réessayer.`
    : "Une erreur est survenue. Veuillez réessayer.";
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

// Connexion via un compte Google (popup). Crée le compte automatiquement
// à la première connexion ; la liste blanche s'applique de la même façon.
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
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

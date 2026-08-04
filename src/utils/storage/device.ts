/**
 * Identité du poste de travail.
 *
 * Sert à distinguer les brouillons synchronisés dans le cloud : quand un
 * brouillon plus récent existe, l'utilisateur doit savoir d'où il vient
 * ("PC bureau", "Portable"...). L'identifiant est stocké localement, il
 * reste donc stable tant qu'on ne vide pas le stockage du navigateur.
 */

const DEVICE_ID_KEY = 'device_id';
const DEVICE_LABEL_KEY = 'device_label';

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

/** Identifiant technique du poste, généré une fois puis mémorisé. */
export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'inconnu';
  }
};

/** Déduit un libellé lisible du navigateur : "Chrome sur Windows". */
const guessDeviceLabel = (): string => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const os =
    /Windows/i.test(ua) ? 'Windows' :
    /Android/i.test(ua) ? 'Android' :
    /iPhone|iPad|iPod/i.test(ua) ? 'iOS' :
    /Mac OS X|Macintosh/i.test(ua) ? 'Mac' :
    /Linux/i.test(ua) ? 'Linux' :
    'PC';

  // L'ordre compte : Edge et Opera contiennent "Chrome" dans leur UA.
  const browser =
    /Edg\//i.test(ua) ? 'Edge' :
    /OPR\/|Opera/i.test(ua) ? 'Opera' :
    /Chrome\//i.test(ua) ? 'Chrome' :
    /Firefox\//i.test(ua) ? 'Firefox' :
    /Safari\//i.test(ua) ? 'Safari' :
    'Navigateur';

  return `${browser} sur ${os}`;
};

/** Nom affiché du poste (personnalisable par l'utilisateur). */
export const getDeviceLabel = (): string => {
  try {
    const stored = localStorage.getItem(DEVICE_LABEL_KEY);
    if (stored) return stored;
    const label = guessDeviceLabel();
    localStorage.setItem(DEVICE_LABEL_KEY, label);
    return label;
  } catch {
    return guessDeviceLabel();
  }
};

export const setDeviceLabel = (label: string): void => {
  try {
    localStorage.setItem(DEVICE_LABEL_KEY, label.trim() || guessDeviceLabel());
  } catch {
    // Stockage indisponible : le libellé sera redeviné au prochain appel.
  }
};

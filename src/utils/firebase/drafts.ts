import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { Employee, Schedule } from '../../types';
import { getDeviceId, getDeviceLabel } from '../storage/device';
import { withTimeout, TIMED_OUT } from './error-handling';

const DRAFTS_COLLECTION = 'drafts';
const WRITE_TIMEOUT_MS = 8000;
const READ_TIMEOUT_MS = 8000;

/**
 * Un document Firestore est limité à 1 Mio. Au-delà de ce seuil on
 * n'envoie que la semaine affichée : mieux vaut un brouillon partiel
 * qu'un brouillon refusé.
 */
const MAX_DRAFT_BYTES = 800_000;

export interface CloudDraft {
  schedules: Record<string, Schedule>;
  employees: Employee[];
  weekNumber: number;
  year: number;
  weeks?: Record<string, Record<string, Schedule>>;
  /** Horodatage ISO de l'auto-sauvegarde (même valeur que la version locale). */
  timestamp: string;
  deviceId: string;
  deviceLabel: string;
  /** Toutes les semaines n'ont pas pu être envoyées (brouillon trop volumineux). */
  truncated?: boolean;
}

export interface SaveDraftResult {
  ok: boolean;
  queued?: boolean;
  error?: string;
}

const byteSize = (value: unknown): number => {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return JSON.stringify(value).length;
  }
};

/** Envoie (ou remplace) le brouillon de travail de l'utilisateur. */
export const saveCloudDraft = async (
  uid: string,
  draft: Omit<CloudDraft, 'deviceId' | 'deviceLabel' | 'truncated'>
): Promise<SaveDraftResult> => {
  try {
    let payload: CloudDraft = {
      ...draft,
      deviceId: getDeviceId(),
      deviceLabel: getDeviceLabel(),
    };

    if (byteSize(payload) > MAX_DRAFT_BYTES) {
      payload = { ...payload, weeks: undefined, truncated: true };
    }

    const result = await withTimeout(
      setDoc(doc(db, DRAFTS_COLLECTION, uid), {
        ...payload,
        weeks: payload.weeks ?? null,
        updatedAt: Timestamp.now(),
      }),
      WRITE_TIMEOUT_MS
    );

    if (result === TIMED_OUT) {
      return { ok: false, queued: true };
    }

    return { ok: true };
  } catch (error) {
    console.warn('Brouillon non synchronisé:', error);
    return { ok: false, error: 'Brouillon non synchronisé en ligne' };
  }
};

/** Récupère le brouillon en ligne, ou null s'il n'y en a pas. */
export const loadCloudDraft = async (uid: string): Promise<CloudDraft | null> => {
  try {
    const snapshot = await withTimeout(getDoc(doc(db, DRAFTS_COLLECTION, uid)), READ_TIMEOUT_MS);
    if (snapshot === TIMED_OUT || !snapshot.exists()) return null;

    const data = snapshot.data();
    if (!data?.employees?.length || !data?.weekNumber || !data?.year || !data?.timestamp) {
      return null;
    }

    return {
      schedules: data.schedules || {},
      employees: data.employees,
      weekNumber: data.weekNumber,
      year: data.year,
      weeks: data.weeks || undefined,
      timestamp: data.timestamp,
      deviceId: data.deviceId || '',
      deviceLabel: data.deviceLabel || 'un autre poste',
      truncated: data.truncated || false,
    };
  } catch (error) {
    console.warn('Lecture du brouillon en ligne impossible:', error);
    return null;
  }
};

export const clearCloudDraft = async (uid: string): Promise<void> => {
  try {
    await withTimeout(deleteDoc(doc(db, DRAFTS_COLLECTION, uid)), WRITE_TIMEOUT_MS);
  } catch (error) {
    console.warn('Suppression du brouillon en ligne impossible:', error);
  }
};

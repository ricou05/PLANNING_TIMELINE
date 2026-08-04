import { useEffect, useRef, useState, useCallback } from 'react';
import { Employee, Schedule } from '../types';
import { saveCloudDraft } from '../utils/firebase/drafts';

const AUTOSAVE_KEY = 'schedule_autosave';
const DEBOUNCE_MS = 1500;
/** Le brouillon en ligne est écrit moins souvent : une écriture Firestore coûte. */
const CLOUD_DEBOUNCE_MS = 8000;

export interface ScheduleAutoSaveData {
  schedules: Record<string, Schedule>;
  employees: Employee[];
  weekNumber: number;
  year: number;
  timestamp: string;
  /** Plannings de toutes les semaines ouvertes, indexés par clé "AAAA-Sxx" */
  weeks?: Record<string, Record<string, Schedule>>;
}

/** État de l'envoi du brouillon vers le cloud (affiché dans la barre du haut). */
export type CloudDraftStatus = 'off' | 'saving' | 'synced' | 'pending' | 'error';

export const loadScheduleAutoSave = (): ScheduleAutoSaveData | null => {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.employees?.length > 0 && data?.weekNumber && data?.year) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

export const clearScheduleAutoSave = () => {
  localStorage.removeItem(AUTOSAVE_KEY);
};

export const useScheduleAutoSave = (
  schedules: Record<string, Schedule>,
  employees: Employee[],
  weekNumber: number,
  year: number,
  weeks?: Record<string, Record<string, Schedule>>,
  /**
   * Identifiant de l'utilisateur connecté. Tant qu'il vaut null, le
   * brouillon reste local : c'est ce qui évite d'écraser le brouillon en
   * ligne d'un autre poste avant que l'utilisateur ait choisi de le
   * récupérer ou non.
   */
  uid?: string | null
) => {
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(() => {
    const saved = loadScheduleAutoSave();
    return saved?.timestamp || null;
  });
  const [showIndicator, setShowIndicator] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudDraftStatus>('off');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isInitialMount = useRef(true);
  // Dernier état connu, pour l'envoi différé et le flush à la fermeture.
  const dataRef = useRef({ schedules, employees, weekNumber, year, weeks });
  dataRef.current = { schedules, employees, weekNumber, year, weeks };
  const timestampRef = useRef<string | null>(lastAutoSave);
  const uidRef = useRef<string | null>(uid ?? null);
  uidRef.current = uid ?? null;
  // Rien à envoyer tant que l'utilisateur n'a rien modifié dans cette session.
  const hasChangesRef = useRef(false);

  const pushCloudDraft = useCallback(async () => {
    const data = dataRef.current;
    const currentUid = uidRef.current;
    if (!currentUid || !hasChangesRef.current) return;

    setCloudStatus('saving');
    const result = await saveCloudDraft(currentUid, {
      schedules: data.schedules,
      employees: data.employees,
      weekNumber: data.weekNumber,
      year: data.year,
      weeks: data.weeks,
      timestamp: timestampRef.current || new Date().toISOString(),
    });

    if (result.ok) setCloudStatus('synced');
    else if (result.queued) setCloudStatus('pending');
    else setCloudStatus('error');
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);

    timerRef.current = setTimeout(() => {
      const now = new Date().toISOString();
      const data: ScheduleAutoSaveData = {
        schedules,
        employees,
        weekNumber,
        year,
        timestamp: now,
        weeks,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      timestampRef.current = now;
      hasChangesRef.current = true;
      setLastAutoSave(now);
      setShowIndicator(true);

      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      indicatorTimerRef.current = setTimeout(() => setShowIndicator(false), 2500);

      if (uidRef.current) {
        cloudTimerRef.current = setTimeout(pushCloudDraft, CLOUD_DEBOUNCE_MS - DEBOUNCE_MS);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [schedules, employees, weekNumber, year, weeks, pushCloudDraft]);

  // L'envoi vers le cloud n'est autorisé qu'après la vérification d'un
  // éventuel brouillon plus récent : si des modifications ont eu lieu
  // pendant ce temps, on les envoie dès l'autorisation obtenue.
  useEffect(() => {
    if (uid && hasChangesRef.current) void pushCloudDraft();
  }, [uid, pushCloudDraft]);

  // Fermeture d'onglet ou mise en arrière-plan : dernière tentative d'envoi
  // pour ne pas perdre les modifications faites juste avant de partir.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && uidRef.current && hasChangesRef.current) {
        if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
        void pushCloudDraft();
      }
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [pushCloudDraft]);

  useEffect(() => {
    return () => {
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
    };
  }, []);

  return { lastAutoSave, showIndicator, cloudStatus };
};

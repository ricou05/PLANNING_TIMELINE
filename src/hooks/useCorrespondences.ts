import { useCallback, useEffect, useState } from 'react';
import { Correspondences, EMPTY_CORRESPONDENCES } from '../utils/history/correspondences';
import {
  getCorrespondences,
  saveCorrespondences,
  CORRESPONDENCES_UPDATED_EVENT,
} from '../utils/firebase/correspondences';
import { HISTORY_FIRST_WEEK, HISTORY_LAST_WEEK } from '../utils/history/excelImport';

/** Saison de référence de l'historique importé (« 2025-2026 ») */
export const REFERENCE_SEASON = `${HISTORY_FIRST_WEEK.year}-${HISTORY_LAST_WEEK.year}`;

export interface CorrespondencesState {
  correspondences: Correspondences;
  /** Message si la table n'a pas pu être lue (on travaille alors sans) */
  error: string | null;
  save: (c: Correspondences) => Promise<void>;
}

/** Table des correspondances N / N-1, lue une fois et partagée par l'app. */
export function useCorrespondences(): CorrespondencesState {
  const [correspondences, setCorrespondences] = useState<Correspondences>(EMPTY_CORRESPONDENCES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCorrespondences(REFERENCE_SEASON)
      .then((c) => {
        if (!cancelled) {
          setCorrespondences(c);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Lecture des correspondances impossible :', err);
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<Correspondences>).detail;
      if (detail) setCorrespondences(detail);
    };
    window.addEventListener(CORRESPONDENCES_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(CORRESPONDENCES_UPDATED_EVENT, onUpdate);
    };
  }, []);

  const save = useCallback(async (c: Correspondences) => {
    await saveCorrespondences(REFERENCE_SEASON, c);
    setCorrespondences(c);
    setError(null);
  }, []);

  return { correspondences, error, save };
}

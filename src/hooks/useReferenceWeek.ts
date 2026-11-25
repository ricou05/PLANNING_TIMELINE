import { useCallback, useEffect, useMemo, useState } from 'react';
import { HistoryWeek, weekIdOf } from '../utils/history/types';
import { suggestReferenceWeek, ReferenceCandidate, ReferenceSuggestion } from '../utils/history/reference';
import { getHistoryWeek, HISTORY_UPDATED_EVENT } from '../utils/firebase/history';
import { describeFirestoreError } from '../utils/firebase';
import { getWeekDates } from '../utils/dateUtils';

// Préférences propres à ce poste (confort d'affichage, rien de critique)
const OPEN_KEY = 'reference_n1_ouvert';
const CHOICES_KEY = 'reference_n1_choix';

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : la préférence n'est simplement pas retenue */
  }
};

export type ReferenceLoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; week: HistoryWeek | null }
  | { kind: 'error'; message: string };

export interface ReferenceWeekState {
  /** Panneau déplié (en-tête au-dessus du planning + lignes sous les totaux) */
  open: boolean;
  toggleOpen: () => void;
  /** Dates de la semaine planifiée */
  targetDates: Date[];
  suggestion: ReferenceSuggestion;
  /** Semaine de l'an passé retenue (suggestion ou choix manuel) */
  reference: ReferenceCandidate;
  isManual: boolean;
  chooseReference: (id: string) => void;
  load: ReferenceLoadState;
  /** Semaine N-1 chargée, ou null (chargement, erreur, pas de données) */
  refWeek: HistoryWeek | null;
}

/**
 * Semaine de référence N-1 de la semaine affichée : suggestion d'après les
 * vacances, choix manuel retenu par semaine, et lecture de l'historique.
 * Partagé entre l'en-tête (au-dessus du planning) et les lignes N-1 (sous les
 * totaux), d'où un hook appelé une seule fois dans App.
 */
export function useReferenceWeek(weekNumber: number, year: number): ReferenceWeekState {
  const [open, setOpen] = useState(() => readStorage(OPEN_KEY, true));
  const [choices, setChoices] = useState<Record<string, string>>(() => readStorage(CHOICES_KEY, {}));
  const [load, setLoad] = useState<ReferenceLoadState>({ kind: 'loading' });
  const [reloadTick, setReloadTick] = useState(0);

  const targetId = weekIdOf(year, weekNumber);
  const suggestion = useMemo(() => suggestReferenceWeek(weekNumber, year), [weekNumber, year]);
  const targetDates = useMemo(() => getWeekDates(weekNumber, year), [weekNumber, year]);
  const reference = suggestion.candidates.find((c) => c.id === choices[targetId]) ?? suggestion.suggested;

  useEffect(() => {
    const onUpdate = () => setReloadTick((n) => n + 1);
    window.addEventListener(HISTORY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoad({ kind: 'loading' });
    getHistoryWeek(reference.id)
      .then((week) => !cancelled && setLoad({ kind: 'ready', week }))
      .catch((err) => {
        console.error("Lecture de l'historique impossible :", err);
        if (!cancelled) setLoad({ kind: 'error', message: describeFirestoreError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [open, reference.id, reloadTick]);

  const toggleOpen = useCallback(() => {
    setOpen((v) => {
      writeStorage(OPEN_KEY, !v);
      return !v;
    });
  }, []);

  const chooseReference = useCallback(
    (id: string) => {
      setChoices((prev) => {
        const next = { ...prev };
        if (id === suggestion.suggested.id) delete next[targetId];
        else next[targetId] = id;
        writeStorage(CHOICES_KEY, next);
        return next;
      });
    },
    [suggestion.suggested.id, targetId]
  );

  return {
    open,
    toggleOpen,
    targetDates,
    suggestion,
    reference,
    isManual: reference.id !== suggestion.suggested.id,
    chooseReference,
    load,
    refWeek: load.kind === 'ready' ? load.week : null,
  };
}

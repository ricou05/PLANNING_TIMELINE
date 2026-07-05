import { useState, useCallback } from 'react';
import { Schedule } from '../types';

type Schedules = Record<string, Schedule>;

const MAX_HISTORY = 50;

interface History {
  past: Schedules[];
  present: Schedules;
  future: Schedules[];
}

// L'historique complet vit dans un seul état et toutes les mises à jour sont
// des fonctions pures : compatible StrictMode (pas d'effet de bord dans les updaters).
export function useUndoRedo(initial: Schedules) {
  const [history, setHistory] = useState<History>({
    past: [],
    present: initial,
    future: [],
  });

  const setSchedules = useCallback(
    (updater: Schedules | ((prev: Schedules) => Schedules)) => {
      setHistory(h => {
        const next = typeof updater === 'function' ? updater(h.present) : updater;
        if (next === h.present) return h;
        return {
          past: [...h.past.slice(-(MAX_HISTORY - 1)), h.present],
          present: next,
          future: [],
        };
      });
    },
    []
  );

  const setSchedulesWithoutHistory = useCallback(
    (updater: Schedules | ((prev: Schedules) => Schedules)) => {
      setHistory(h => ({
        ...h,
        present: typeof updater === 'function' ? updater(h.present) : updater,
      }));
    },
    []
  );

  // Remplace le planning ET vide l'historique (changement de semaine, restauration...)
  const resetSchedules = useCallback((next: Schedules) => {
    setHistory({ past: [], present: next, future: [] });
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [...h.future, h.present],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[h.future.length - 1];
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(0, -1),
      };
    });
  }, []);

  return {
    schedules: history.present,
    setSchedules,
    setSchedulesWithoutHistory,
    resetSchedules,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

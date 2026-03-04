import { useState, useCallback, useRef } from 'react';
import { Schedule } from '../types';

type Schedules = Record<string, Schedule>;

const MAX_HISTORY = 50;

export function useUndoRedo(initial: Schedules) {
  const [schedules, setSchedulesInternal] = useState<Schedules>(initial);
  const pastRef = useRef<Schedules[]>([]);
  const futureRef = useRef<Schedules[]>([]);
  const batchRef = useRef(false);

  const setSchedules = useCallback(
    (updater: Schedules | ((prev: Schedules) => Schedules)) => {
      setSchedulesInternal(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (!batchRef.current) {
          pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
          futureRef.current = [];
        }
        return next;
      });
    },
    []
  );

  const setSchedulesWithoutHistory = useCallback(
    (updater: Schedules | ((prev: Schedules) => Schedules)) => {
      batchRef.current = true;
      setSchedulesInternal(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next;
      });
      batchRef.current = false;
    },
    []
  );

  const undo = useCallback(() => {
    setSchedulesInternal(prev => {
      if (pastRef.current.length === 0) return prev;
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, prev];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setSchedulesInternal(prev => {
      if (futureRef.current.length === 0) return prev;
      const next = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, prev];
      return next;
    });
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return {
    schedules,
    setSchedules,
    setSchedulesWithoutHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

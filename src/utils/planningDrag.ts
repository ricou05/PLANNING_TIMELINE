import React from 'react';

// Type de glisser-déposer d'une journée complète d'un salarié vers un autre
export const DAY_DRAG_TYPE = 'application/schedule-day';

// Types de glisser-déposer internes du planning (repos, modèles de créneaux,
// absences, transfert d'une journée)
const CELL_DRAG_TYPES = [
  'application/rest-day',
  'application/shift-template',
  'application/absence',
  DAY_DRAG_TYPE,
];

export const isPlanningDrag = (e: React.DragEvent) =>
  CELL_DRAG_TYPES.some(t => e.dataTransfer.types.includes(t));

/** Journée d'un salarié : origine ou destination d'un transfert */
export interface DayRef {
  employeeId: number;
  day: string;
}

/** Déplacer (la journée d'origine est vidée) ou copier (elle est conservée) */
export type TransferMode = 'move' | 'copy';

/** Ctrl (ou Cmd sur Mac) enfoncé pendant le dépôt = copie au lieu du déplacement */
export const transferModeOf = (e: { ctrlKey: boolean; metaKey: boolean }): TransferMode =>
  e.ctrlKey || e.metaKey ? 'copy' : 'move';

export const isDayDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(DAY_DRAG_TYPE);

export const setDayDragData = (e: React.DragEvent, source: DayRef) => {
  e.dataTransfer.setData(DAY_DRAG_TYPE, JSON.stringify(source));
  e.dataTransfer.effectAllowed = 'copyMove';
};

export const getDayDragSource = (e: React.DragEvent): DayRef | null => {
  const raw = e.dataTransfer.getData(DAY_DRAG_TYPE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DayRef;
    return typeof parsed?.employeeId === 'number' && typeof parsed?.day === 'string' ? parsed : null;
  } catch {
    return null;
  }
};

/** Une journée n'est transférable que si elle porte quelque chose */
export const hasDayContent = (schedule?: {
  morningStart?: string;
  morningEnd?: string;
  afternoonStart?: string;
  afternoonEnd?: string;
  isRestDay?: boolean;
  absence?: string;
  morningAbsence?: string;
  afternoonAbsence?: string;
}): boolean => {
  if (!schedule) return false;
  return Boolean(
    (schedule.morningStart && schedule.morningEnd) ||
    (schedule.afternoonStart && schedule.afternoonEnd) ||
    schedule.isRestDay ||
    schedule.absence ||
    schedule.morningAbsence ||
    schedule.afternoonAbsence
  );
};

export const DAY_DRAG_HINT =
  'Glisser-déposer cette journée sur un autre salarié pour la déplacer (Ctrl = copier)';

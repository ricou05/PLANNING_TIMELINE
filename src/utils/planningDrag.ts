import React from 'react';

// Types de glisser-déposer internes du planning (repos, modèles de créneaux, absences)
const CELL_DRAG_TYPES = ['application/rest-day', 'application/shift-template', 'application/absence'];

export const isPlanningDrag = (e: React.DragEvent) =>
  CELL_DRAG_TYPES.some(t => e.dataTransfer.types.includes(t));

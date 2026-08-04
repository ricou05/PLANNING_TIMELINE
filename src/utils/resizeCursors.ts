// Curseurs personnalisés de la vue Timeline : quand la souris approche d'une
// extrémité d'un créneau, le pointeur devient une accolade (barre verticale +
// double flèche) pour signaler qu'on peut avancer ou reculer cet horaire.

const cursorSvg = (bracket: 'start' | 'end'): string => {
  // Accolade tournée vers l'intérieur du créneau
  const serif = bracket === 'start' ? 'h4' : 'h-4';
  const paths = [
    `M12 2 v20`,          // barre verticale
    `M12 2 ${serif}`,     // empattement haut
    `M12 22 ${serif}`,    // empattement bas
    `M4 12 H20`,          // hampe de la double flèche
    `M4 12 l3.5 -3.5 M4 12 l3.5 3.5`,   // pointe gauche
    `M20 12 l-3.5 -3.5 M20 12 l-3.5 3.5`, // pointe droite
  ].join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="${paths}" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${paths}" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
};

const cursorValue = (bracket: 'start' | 'end'): string =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(cursorSvg(bracket))}") 12 12, col-resize`;

/** Curseur du bord gauche d'un créneau (déplacer l'heure de début) */
export const RESIZE_START_CURSOR = cursorValue('start');

/** Curseur du bord droit d'un créneau (déplacer l'heure de fin) */
export const RESIZE_END_CURSOR = cursorValue('end');

/** Largeur (px) des zones de préhension aux extrémités d'un créneau */
export const EDGE_GRIP_WIDTH = 10;

import React from 'react';
import { HardDrive } from 'lucide-react';

// Pastille « Local - non synchronise » des sauvegardes restées sur ce seul PC
const LocalBadge: React.FC = () => (
  <span
    className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 whitespace-nowrap"
    title="Cette sauvegarde n'existe que sur ce PC : elle partira en ligne dès que possible"
  >
    <HardDrive className="w-3 h-3" />
    Local - non synchronise
  </span>
);

export default LocalBadge;

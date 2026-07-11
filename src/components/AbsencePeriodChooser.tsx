import React, { useEffect, useRef } from 'react';
import { CalendarOff, X } from 'lucide-react';
import { AbsencePeriod } from '../types';

interface AbsencePeriodChooserProps {
  label: string;
  onChoose: (period: AbsencePeriod) => void;
  onCancel: () => void;
}

// Petit panneau affiché au dépôt d'un chip d'absence sur une journée :
// permet de choisir entre journée entière, matin seul ou après-midi seul
const AbsencePeriodChooser: React.FC<AbsencePeriodChooserProps> = ({ label, onChoose, onCancel }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onCancel]);

  const choiceClass =
    'w-full px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 hover:border-amber-500 transition-colors text-left';

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-20 flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white border border-gray-300 rounded-lg shadow-xl p-2 min-w-[150px] space-y-1">
        <div className="flex items-center justify-between gap-2 px-1 pb-1 border-b border-gray-200">
          <div className="flex items-center gap-1">
            <CalendarOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase">{label}</span>
          </div>
          <button
            onClick={onCancel}
            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Annuler"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <button className={choiceClass} onClick={() => onChoose('full')}>
          Journée entière
        </button>
        <button className={choiceClass} onClick={() => onChoose('morning')}>
          Matin seulement
        </button>
        <button className={choiceClass} onClick={() => onChoose('afternoon')}>
          Après-midi seulement
        </button>
      </div>
    </div>
  );
};

export default AbsencePeriodChooser;

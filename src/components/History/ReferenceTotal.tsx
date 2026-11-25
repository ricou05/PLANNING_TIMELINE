import React from 'react';
import { formatHoursHM } from '../../utils/timeUtils';

export interface ReferenceTotalValue {
  hours: number;
  /** Saisonniers N-1 dont le salarié reprend le poste */
  names: string[];
}

/** Rappel discret, sous le total d'un salarié, des heures de son poste N-1 */
const ReferenceTotal: React.FC<{ value?: ReferenceTotalValue }> = ({ value }) => {
  if (!value) return null;
  return (
    <div
      className="text-[11px] font-normal text-indigo-700 leading-tight"
      title={`Semaine de référence N-1, poste de ${value.names.join(', ')}`}
    >
      N-1 : {value.hours > 0 ? formatHoursHM(value.hours) : '0h'}
      <span className="text-indigo-400"> ({value.names.join(', ')})</span>
    </div>
  );
};

export default ReferenceTotal;

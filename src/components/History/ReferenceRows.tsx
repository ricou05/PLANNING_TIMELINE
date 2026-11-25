import React from 'react';
import { Employee, Schedule } from '../../types';
import { summarizeDay } from '../../utils/history/types';
import { calculateDayTotal } from '../../utils/totalsCalculations';
import { calculateDailyHours } from '../../utils/scheduleCalculations';
import { formatHoursHM } from '../../utils/timeUtils';
import { ReferenceWeekState } from '../../hooks/useReferenceWeek';
import { weekLabel } from '../../utils/history/reference';
import { Correspondences, EMPTY_CORRESPONDENCES, canonicalName } from '../../utils/history/correspondences';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Teinte des lignes N-1, pour ne pas les confondre avec le planning */
const N1_BG = '#eef2ff';

// Écart prévu / N-1 en %, coloré dès 10 % d'écart
const Gap: React.FC<{ planned: number; reference: number }> = ({ planned, reference }) => {
  if (reference <= 0 || planned <= 0) return <span className="text-gray-300">–</span>;
  const pct = Math.round(((planned - reference) / reference) * 100);
  const color = pct <= -10 ? 'text-red-600' : pct >= 10 ? 'text-blue-600' : 'text-gray-500';
  return <span className={`font-semibold ${color}`}>{pct > 0 ? `+${pct}` : pct} %</span>;
};

interface ReferenceRowsProps {
  state: ReferenceWeekState;
  /** Pour compter une seule fois un prénom écrit de deux façons */
  correspondences?: Correspondences;
  employees: Employee[];
  schedules: Record<string, Schedule>;
  /** Classe de bordure des cellules, pour s'accorder au tableau hôte */
  borderClass: string;
  /** Colonnes avant les jours (1, ou 2 en Hebdo 2 avec la colonne « PER. ») */
  labelColSpan?: number;
}

/**
 * Lignes « Référence N-1 » ajoutées sous la ligne des totaux d'une vue
 * hebdomadaire, dans le même tableau : chaque chiffre de l'an passé tombe
 * sous le jour correspondant de la semaine planifiée.
 */
const ReferenceRows: React.FC<ReferenceRowsProps> = ({ state, correspondences = EMPTY_CORRESPONDENCES, employees, schedules, borderClass, labelColSpan = 1 }) => {
  const { open, refWeek, reference } = state;
  if (!open || !refWeek) return null;

  const refDays = refWeek.days.map(summarizeDay);
  const refWeekHours = refDays.reduce((s, d) => s + d.hours, 0);
  const refStaff = new Set(
    refWeek.days.flatMap((d) => d.entries.filter((e) => e.hours > 0).map((e) => canonicalName(e.name, correspondences)))
  ).size;

  // Prévu : mêmes totaux que la ligne « Totaux » juste au-dessus
  const planned = DAYS.map((day) => ({
    hours: calculateDayTotal(schedules, day, employees),
    staff: employees.filter((e) => calculateDailyHours(schedules[`${e.id}-${day}`]) > 0).length,
  }));
  const plannedWeek = planned.reduce((s, d) => s + d.hours, 0);
  const plannedStaff = employees.filter((e) =>
    DAYS.some((day) => calculateDailyHours(schedules[`${e.id}-${day}`]) > 0)
  ).length;

  const bg = { backgroundColor: N1_BG };
  const cell = `${borderClass} px-1 py-0.5 text-center text-xs text-gray-900`;
  const labelCell = `${borderClass} px-2 py-0.5 text-left text-xs font-semibold text-indigo-900 whitespace-nowrap sticky left-0 z-10`;

  const row = (label: string, values: React.ReactNode[], total: React.ReactNode, title?: string) => (
    <tr>
      <td className={labelCell} style={bg} colSpan={labelColSpan}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={cell} style={bg}>
          {v}
        </td>
      ))}
      <td className={`${cell} font-semibold`} style={bg} title={title}>
        {total}
      </td>
    </tr>
  );

  return (
    <>
      {/* Séparation nette avec le planning */}
      <tr>
        <td colSpan={labelColSpan + DAYS.length + 1} className="p-0 h-2 bg-white" style={{ border: 'none' }} />
      </tr>
      {row(
        `N-1 · ${weekLabel(reference)}`,
        reference.dates.map((d, i) => (
          <span key={i} className="font-semibold text-indigo-900">
            {SHORT_DAYS[i]} {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )),
        <span className="text-indigo-900">Semaine</span>
      )}
      {row(
        'Heures N-1',
        refDays.map((d) => (d.hours > 0 ? formatHoursHM(d.hours) : '–')),
        formatHoursHM(refWeekHours)
      )}
      {row(
        'Écart',
        planned.map((d, i) => <Gap key={i} planned={d.hours} reference={refDays[i].hours} />),
        <Gap planned={plannedWeek} reference={refWeekHours} />,
        'Heures prévues (ligne Totaux) comparées à l’an passé'
      )}
      {row(
        'Salariés N-1',
        refDays.map((d) => d.staff || '–'),
        refStaff,
        'Nombre de salariés différents sur la semaine'
      )}
      {row(
        'Salariés prévus',
        planned.map((d) => d.staff || '–'),
        plannedStaff || '–',
        'Nombre de salariés différents sur la semaine'
      )}
    </>
  );
};

export default ReferenceRows;

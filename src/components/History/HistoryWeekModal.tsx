import React from 'react';
import { History, X } from 'lucide-react';
import { HistoryEntry, HistoryWeek, summarizeDay } from '../../utils/history/types';
import { formatHoursHM } from '../../utils/timeUtils';
import SchoolHolidayBand from '../SchoolHolidayBand';
import { getPublicHoliday } from '../../utils/calendarInfo';
import { Employee } from '../../types';
import { Correspondences, canonicalName, resolveSuccessor } from '../../utils/history/correspondences';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const parseIso = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// « 08:30-12:00 » → « 8h30–12h »
const formatSlot = (slot: string): string =>
  slot
    .split('-')
    .map((t) => {
      const [h, m] = t.split(':');
      return `${Number(h)}h${m === '00' ? '' : m}`;
    })
    .join('–');

const EntryCell: React.FC<{ entry?: HistoryEntry }> = ({ entry }) => {
  if (!entry) return <span className="text-gray-300">–</span>;
  const slots = [entry.morning, entry.afternoon].filter((s): s is string => !!s);
  if (slots.length === 0) {
    if (entry.label) {
      return (
        <span className={entry.label === 'Repos' ? 'text-gray-400' : 'text-amber-700 font-medium'}>
          {entry.label}
        </span>
      );
    }
    // Total saisi sans horaires
    return entry.hours > 0 ? <span>{formatHoursHM(entry.hours)}</span> : <span className="text-gray-300">–</span>;
  }
  return (
    <div className="leading-tight">
      {slots.map((s) => (
        <div key={s}>{formatSlot(s)}</div>
      ))}
      {entry.label && <div className="text-[11px] text-amber-700">{entry.label}</div>}
    </div>
  );
};

// Planning réalisé d'une semaine de l'an passé, en lecture seule
interface HistoryWeekModalProps {
  week: HistoryWeek;
  employees: Employee[];
  correspondences: Correspondences;
  onClose: () => void;
}

const HistoryWeekModal: React.FC<HistoryWeekModalProps> = ({ week, employees, correspondences, onClose }) => {
  const dates = week.days.map((d) => parseIso(d.date));
  // Prénoms corrigés (« Isa » et « Isabelle » ne font qu'une ligne)
  const canon = (name: string) => canonicalName(name, correspondences);
  const names = [...new Set(week.days.flatMap((d) => d.entries.map((e) => canon(e.name))))];
  const entryOf = (dayIndex: number, name: string) => {
    const entries = week.days[dayIndex].entries.filter((e) => canon(e.name) === name);
    return entries.sort((a, b) => b.hours - a.hours)[0];
  };
  const successorOf = (name: string) => resolveSuccessor(name, correspondences, employees).employee;
  const weekHoursOf = (name: string) =>
    week.days.reduce((sum, _d, i) => sum + (entryOf(i, name)?.hours ?? 0), 0);
  // Salariés qui ont travaillé cette semaine d'abord, par heures décroissantes
  names.sort((a, b) => weekHoursOf(b) - weekHoursOf(a) || a.localeCompare(b, 'fr'));
  const summaries = week.days.map(summarizeDay);
  const total = summaries.reduce((s, d) => s + d.hours, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-[1100px] max-w-full max-h-[90vh] flex flex-col animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Planning réalisé · S{String(week.week).padStart(2, '0')} {week.year}
          </h2>
          <span className="text-sm text-gray-500">(lecture seule)</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-500" title="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto p-4">
          <table className="w-full border-collapse text-sm table-fixed min-w-[860px]">
            <colgroup>
              <col style={{ width: '11%' }} />
              {DAY_NAMES.map((d) => (
                <col key={d} />
              ))}
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <SchoolHolidayBand weekDates={dates} borderClass="border border-gray-300" />
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left sticky left-0 bg-gray-100" />
                {DAY_NAMES.map((day, i) => {
                  const holiday = getPublicHoliday(dates[i]);
                  return (
                    <th key={day} className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700">
                      <div>{day}</div>
                      <div className="text-xs font-normal text-gray-500">
                        {dates[i].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {holiday && <div className="text-[11px] font-bold text-red-700">Férié · {holiday}</div>}
                    </th>
                  );
                })}
                <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {names.map((name) => (
                <tr key={name}>
                  <td className="border border-gray-300 px-2 py-1 font-medium text-gray-800">
                    {name}
                    {successorOf(name) && (
                      <div className="text-[11px] font-normal text-indigo-700" title="Reprend ce poste cette saison">
                        → {successorOf(name)!.name}
                      </div>
                    )}
                  </td>
                  {DAY_NAMES.map((day, i) => (
                    <td key={day} className="border border-gray-300 px-1 py-1 text-center text-gray-800">
                      <EntryCell entry={entryOf(i, name)} />
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                    {weekHoursOf(name) > 0 ? formatHoursHM(weekHoursOf(name)) : '–'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-300 px-2 py-1">Équipe</td>
                {summaries.map((s, i) => (
                  <td key={i} className="border border-gray-300 px-1 py-1 text-center">
                    {s.hours > 0 ? formatHoursHM(s.hours) : '–'}
                    <div className="text-xs font-normal text-gray-500">
                      {s.staff} salarié{s.staff > 1 ? 's' : ''}
                    </div>
                  </td>
                ))}
                <td className="border border-gray-300 px-2 py-1 text-center">{formatHoursHM(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryWeekModal;

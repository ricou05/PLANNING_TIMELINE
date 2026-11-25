import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, History, Eye, RotateCcw } from 'lucide-react';
import { Employee, Schedule } from '../../types';
import { HistoryWeek, summarizeDay } from '../../utils/history/types';
import { suggestReferenceWeek, describeHolidays, ReferenceCandidate } from '../../utils/history/reference';
import { getHistoryWeek, HISTORY_UPDATED_EVENT } from '../../utils/firebase/history';
import { describeFirestoreError } from '../../utils/firebase';
import { calculateDayTotal } from '../../utils/totalsCalculations';
import { calculateDailyHours } from '../../utils/scheduleCalculations';
import { formatHoursHM } from '../../utils/timeUtils';
import { getWeekDates } from '../../utils/dateUtils';
import { weekIdOf } from '../../utils/history/types';
import SchoolHolidayBand from '../SchoolHolidayBand';
import HistoryWeekModal from './HistoryWeekModal';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Préférences propres à ce poste (confort d'affichage, rien de critique)
const OPEN_KEY = 'reference_n1_ouvert';
const CHOICES_KEY = 'reference_n1_choix';

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : la préférence n'est simplement pas retenue */
  }
};

const shortDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const rangeLabel = (dates: Date[]) =>
  `${shortDate(dates[0])} → ${shortDate(dates[6])} ${dates[6].getFullYear()}`;

const candidateLabel = (c: ReferenceCandidate, suggestedId: string) => {
  const tags = [c.id === suggestedId ? 'suggérée' : null, c.offset === 0 ? 'mêmes dates' : null].filter(Boolean);
  return `S${String(c.week).padStart(2, '0')} ${c.year} · ${rangeLabel(c.dates)} · ${describeHolidays(c.dates)}${
    tags.length ? ` (${tags.join(', ')})` : ''
  }`;
};

// Écart prévu / N-1 en %, coloré dès 10 % d'écart
const Gap: React.FC<{ planned: number; reference: number }> = ({ planned, reference }) => {
  if (reference <= 0) return <span className="text-gray-300">–</span>;
  const pct = Math.round(((planned - reference) / reference) * 100);
  const color = pct <= -10 ? 'text-red-600' : pct >= 10 ? 'text-blue-600' : 'text-gray-500';
  return <span className={`font-semibold ${color}`}>{pct > 0 ? `+${pct}` : pct} %</span>;
};

interface ReferencePanelProps {
  weekNumber: number;
  year: number;
  employees: Employee[];
  schedules: Record<string, Schedule>;
  isAdmin: boolean;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; week: HistoryWeek | null }
  | { kind: 'error'; message: string };

/**
 * Assistant « Référence N-1 » : semaine de l'an passé la plus ressemblante
 * (vacances scolaires, zone de Nice en priorité, jours fériés), avec ses
 * heures et son effectif jour par jour face au planning en cours.
 */
const ReferencePanel: React.FC<ReferencePanelProps> = ({ weekNumber, year, employees, schedules, isAdmin }) => {
  const [open, setOpen] = useState(() => readStorage(OPEN_KEY, true));
  const [choices, setChoices] = useState<Record<string, string>>(() => readStorage(CHOICES_KEY, {}));
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [showWeek, setShowWeek] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const targetId = weekIdOf(year, weekNumber);
  const suggestion = useMemo(() => suggestReferenceWeek(weekNumber, year), [weekNumber, year]);
  const reference =
    suggestion.candidates.find((c) => c.id === choices[targetId]) ?? suggestion.suggested;
  const targetDates = useMemo(() => getWeekDates(weekNumber, year), [weekNumber, year]);

  useEffect(() => {
    const onUpdate = () => setReloadTick((n) => n + 1);
    window.addEventListener(HISTORY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoad({ kind: 'loading' });
    getHistoryWeek(reference.id)
      .then((week) => !cancelled && setLoad({ kind: 'ready', week }))
      .catch((err) => {
        console.error("Lecture de l'historique impossible :", err);
        if (!cancelled) setLoad({ kind: 'error', message: describeFirestoreError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [open, reference.id, reloadTick]);

  const toggleOpen = () => {
    setOpen((v) => {
      writeStorage(OPEN_KEY, !v);
      return !v;
    });
  };

  const chooseReference = (id: string) => {
    const next = { ...choices };
    if (id === suggestion.suggested.id) delete next[targetId];
    else next[targetId] = id;
    setChoices(next);
    writeStorage(CHOICES_KEY, next);
  };

  // Prévu : mêmes totaux que la ligne « Totaux » des vues
  const planned = DAYS.map((day) => ({
    hours: calculateDayTotal(schedules, day, employees),
    staff: employees.filter((e) => calculateDailyHours(schedules[`${e.id}-${day}`]) > 0).length,
  }));
  const plannedWeek = planned.reduce((s, d) => s + d.hours, 0);

  const refWeek = load.kind === 'ready' ? load.week : null;
  const refDays = refWeek ? refWeek.days.map(summarizeDay) : null;
  const refWeekHours = refDays ? refDays.reduce((s, d) => s + d.hours, 0) : 0;
  const refMaxStaff = refWeek ? new Set(refWeek.days.flatMap((d) => d.entries.filter((e) => e.hours > 0).map((e) => e.name))).size : 0;
  const plannedMaxStaff = employees.filter((e) => DAYS.some((day) => calculateDailyHours(schedules[`${e.id}-${day}`]) > 0)).length;

  const isManual = reference.id !== suggestion.suggested.id;
  const cell = 'border border-gray-300 px-2 py-0.5 text-center';
  const labelCell = 'border border-gray-300 px-2 py-0.5 text-left font-medium text-gray-700 whitespace-nowrap';

  return (
    <div className="mx-4 mt-3 border border-indigo-200 rounded-lg bg-indigo-50/40">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 hover:text-indigo-700"
          title={open ? 'Replier' : 'Déplier'}
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <History className="w-4 h-4" />
          Référence N-1 : S{String(reference.week).padStart(2, '0')} {reference.year}
          <span className="font-normal text-indigo-700">({rangeLabel(reference.dates)})</span>
        </button>

        {open && (
          <>
            <select
              value={reference.id}
              onChange={(e) => chooseReference(e.target.value)}
              className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-700 max-w-full"
              title="Changer de semaine de référence"
            >
              {suggestion.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {candidateLabel(c, suggestion.suggested.id)}
                </option>
              ))}
            </select>
            {isManual && (
              <button
                onClick={() => chooseReference(suggestion.suggested.id)}
                className="flex items-center gap-1 text-xs text-indigo-700 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Revenir à la suggestion (S{String(suggestion.suggested.week).padStart(2, '0')})
              </button>
            )}
            {refWeek && (
              <button
                onClick={() => setShowWeek(true)}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50"
              >
                <Eye className="w-3.5 h-3.5" />
                Voir le planning N-1
              </button>
            )}
          </>
        )}
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-xs text-gray-600">
            Vacances cette semaine : <span className="font-medium">{describeHolidays(targetDates)}</span>
            {' · '}en S{String(reference.week).padStart(2, '0')} {reference.year} :{' '}
            <span className="font-medium">{describeHolidays(reference.dates)}</span>
            {!isManual && suggestion.suggested.id !== suggestion.sameWeek.id && (
              <span className="text-indigo-700">
                {' '}— suggérée plutôt que la semaine aux mêmes dates (S{String(suggestion.sameWeek.week).padStart(2, '0')}
                {' : '}{describeHolidays(suggestion.sameWeek.dates)})
              </span>
            )}
          </div>

          {load.kind === 'loading' && <p className="text-xs text-gray-500">Chargement de l'historique…</p>}
          {load.kind === 'error' && (
            <p className="text-xs text-red-600">
              Historique illisible : {load.message}
              {isAdmin && load.message.startsWith('Accès refusé') &&
                ' Les règles Firestore (fichier rules.txt) doivent être republiées dans la console Firebase.'}
            </p>
          )}
          {load.kind === 'ready' && !refWeek && (
            <p className="text-xs text-gray-500">
              Pas d'historique pour S{String(reference.week).padStart(2, '0')} {reference.year}.
              {isAdmin && ' Pour l’ajouter : menu Ouvrir → Importer l’historique Excel.'}
            </p>
          )}

          {refWeek && refDays && (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs bg-white w-full min-w-[760px] table-fixed">
                <colgroup>
                  <col style={{ width: '12%' }} />
                  {DAYS.map((d) => (
                    <col key={d} />
                  ))}
                  <col style={{ width: '9%' }} />
                </colgroup>
                <thead>
                  <SchoolHolidayBand weekDates={reference.dates} borderClass="border border-gray-300" />
                  <tr className="bg-gray-50">
                    <th className={labelCell}>Jour N-1</th>
                    {reference.dates.map((d, i) => (
                      <th key={i} className={`${cell} font-semibold text-gray-700`}>
                        {SHORT_DAYS[i]} {shortDate(d)}
                      </th>
                    ))}
                    <th className={`${cell} font-semibold text-gray-700`}>Semaine</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={labelCell}>Heures N-1</td>
                    {refDays.map((d, i) => (
                      <td key={i} className={`${cell} text-gray-900`}>{d.hours > 0 ? formatHoursHM(d.hours) : '–'}</td>
                    ))}
                    <td className={`${cell} font-semibold`}>{formatHoursHM(refWeekHours)}</td>
                  </tr>
                  <tr>
                    <td className={labelCell}>Prévu</td>
                    {planned.map((d, i) => (
                      <td key={i} className={`${cell} text-gray-900`}>{d.hours > 0 ? formatHoursHM(d.hours) : '–'}</td>
                    ))}
                    <td className={`${cell} font-semibold`}>{plannedWeek > 0 ? formatHoursHM(plannedWeek) : '–'}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className={labelCell}>Écart</td>
                    {planned.map((d, i) => (
                      <td key={i} className={cell}>
                        {d.hours > 0 ? <Gap planned={d.hours} reference={refDays[i].hours} /> : '–'}
                      </td>
                    ))}
                    <td className={cell}>
                      {plannedWeek > 0 ? <Gap planned={plannedWeek} reference={refWeekHours} /> : '–'}
                    </td>
                  </tr>
                  <tr>
                    <td className={labelCell}>Salariés N-1</td>
                    {refDays.map((d, i) => (
                      <td key={i} className={`${cell} text-gray-900`}>{d.staff || '–'}</td>
                    ))}
                    <td className={`${cell} font-semibold`} title="Nombre de salariés différents sur la semaine">
                      {refMaxStaff}
                    </td>
                  </tr>
                  <tr>
                    <td className={labelCell}>Salariés prévus</td>
                    {planned.map((d, i) => (
                      <td key={i} className={`${cell} text-gray-900`}>{d.staff || '–'}</td>
                    ))}
                    <td className={`${cell} font-semibold`} title="Nombre de salariés différents sur la semaine">
                      {plannedMaxStaff || '–'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showWeek && refWeek && <HistoryWeekModal week={refWeek} onClose={() => setShowWeek(false)} />}
    </div>
  );
};

export default ReferencePanel;

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, History, Eye, RotateCcw } from 'lucide-react';
import { describeHolidays, rangeLabel, weekLabel, ReferenceCandidate } from '../../utils/history/reference';
import { ReferenceWeekState } from '../../hooks/useReferenceWeek';
import HistoryWeekModal from './HistoryWeekModal';
import SchoolHolidayBand from '../SchoolHolidayBand';

const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];


const candidateLabel = (c: ReferenceCandidate, suggestedId: string) => {
  const tags = [c.id === suggestedId ? 'suggérée' : null, c.offset === 0 ? 'mêmes dates' : null].filter(Boolean);
  return `${weekLabel(c)} · ${rangeLabel(c.dates)} · ${describeHolidays(c.dates)}${tags.length ? ` (${tags.join(', ')})` : ''}`;
};

interface ReferencePanelProps {
  state: ReferenceWeekState;
  isAdmin: boolean;
}

/**
 * En-tête de l'assistant « Référence N-1 », au-dessus du planning : semaine
 * de l'an passé retenue (suggérée d'après les vacances, zone de Nice en
 * priorité), choix d'une autre semaine et vacances comparées. Les chiffres
 * N-1 s'affichent sous la ligne des totaux du planning (ReferenceRows).
 */
const ReferencePanel: React.FC<ReferencePanelProps> = ({ state, isAdmin }) => {
  const { open, toggleOpen, targetDates, suggestion, reference, isManual, chooseReference, load, refWeek } = state;
  const [showWeek, setShowWeek] = useState(false);

  return (
    <div className="mx-4 mt-3 border border-indigo-200 rounded-lg bg-indigo-50/60 px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 hover:text-indigo-700"
          title={open ? 'Masquer la référence N-1' : 'Afficher la référence N-1'}
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <History className="w-4 h-4" />
          Référence N-1 : {weekLabel(reference)}
          <span className="font-normal text-indigo-700">({rangeLabel(reference.dates)})</span>
        </button>

        {open && (
          <>
            <select
              value={reference.id}
              onChange={(e) => chooseReference(e.target.value)}
              className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white text-gray-700 max-w-full"
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
                Revenir à la suggestion ({weekLabel(suggestion.suggested)})
              </button>
            )}
            <span className="text-xs text-gray-600">
              Vacances cette semaine : <span className="font-medium">{describeHolidays(targetDates)}</span>
              {' · '}en {weekLabel(reference)} : <span className="font-medium">{describeHolidays(reference.dates)}</span>
            </span>
            {refWeek && (
              <button
                onClick={() => setShowWeek(true)}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50"
              >
                <Eye className="w-3.5 h-3.5" />
                Voir le planning N-1
              </button>
            )}
          </>
        )}
      </div>

      {open && (
        <>
          {!isManual && suggestion.suggested.id !== suggestion.sameWeek.id && (
            <p className="text-xs text-indigo-700 mt-0.5">
              Suggérée plutôt que la semaine aux mêmes dates ({weekLabel(suggestion.sameWeek)} :{' '}
              {describeHolidays(suggestion.sameWeek.dates)}).
            </p>
          )}
          {load.kind === 'loading' && <p className="text-xs text-gray-500 mt-0.5">Chargement de l'historique…</p>}
          {load.kind === 'error' && (
            <p className="text-xs text-red-600 mt-0.5">
              Historique illisible : {load.message}
              {isAdmin &&
                load.message.startsWith('Accès refusé') &&
                ' Les règles Firestore (fichier rules.txt) doivent être republiées dans la console Firebase.'}
            </p>
          )}
          {load.kind === 'ready' && !refWeek && (
            <p className="text-xs text-gray-500 mt-0.5">
              Pas d'historique pour {weekLabel(reference)}.
              {isAdmin && ' Pour l’ajouter : menu Ouvrir → Importer l’historique Excel.'}
            </p>
          )}

          {/* Vacances scolaires de la semaine N-1, isolées en haut (les
              chiffres N-1 sont sous la ligne des totaux du planning) */}
          <div className="overflow-x-auto mt-1">
            <table className="border-collapse bg-white w-full min-w-[760px] table-fixed">
              <colgroup>
                <col style={{ width: '12%' }} />
                {reference.dates.map((d) => (
                  <col key={d.getTime()} />
                ))}
                <col style={{ width: '9%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="border border-gray-300 px-1 py-0 text-left text-[11px] font-semibold text-indigo-900 whitespace-nowrap">
                    Vacances N-1
                  </th>
                  {reference.dates.map((d, i) => (
                    <th key={i} className="border border-gray-300 px-1 py-0 text-center text-[11px] font-semibold text-indigo-900">
                      {SHORT_DAYS[i]} {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-1 py-0 text-center text-[11px] font-semibold text-indigo-900">
                    {weekLabel(reference)}
                  </th>
                </tr>
                <SchoolHolidayBand weekDates={reference.dates} borderClass="border border-gray-300" />
              </thead>
            </table>
          </div>
        </>
      )}

      {showWeek && refWeek && <HistoryWeekModal week={refWeek} onClose={() => setShowWeek(false)} />}
    </div>
  );
};

export default ReferencePanel;

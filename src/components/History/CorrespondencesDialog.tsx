import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, RefreshCw, X } from 'lucide-react';
import { Employee } from '../../types';
import { HistoryWeek } from '../../utils/history/types';
import { getAllHistoryWeeks } from '../../utils/firebase/history';
import { describeFirestoreError } from '../../utils/firebase';
import {
  Correspondences,
  canonicalName,
  predecessorsOf,
  resolveSuccessor,
} from '../../utils/history/correspondences';
import { weekLabel } from '../../utils/history/reference';
import { formatHoursHM } from '../../utils/timeUtils';

interface CorrespondencesDialogProps {
  employees: Employee[];
  correspondences: Correspondences;
  onSave: (c: Correspondences) => Promise<void>;
  canEdit: boolean;
  onClose: () => void;
}

interface N1Person {
  name: string;
  hours: number;
  first: HistoryWeek | null;
  last: HistoryWeek | null;
}

const AUTO = '';
const NONE = '__aucun__';

// Table « Correspondances N / N-1 » : pour chaque saisonnier de l'an passé,
// qui reprend son poste cette saison (et corrections de prénoms mal écrits)
const CorrespondencesDialog: React.FC<CorrespondencesDialogProps> = ({
  employees,
  correspondences,
  onSave,
  canEdit,
  onClose,
}) => {
  const [weeks, setWeeks] = useState<HistoryWeek[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Correspondences>(correspondences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getAllHistoryWeeks()
      .then(setWeeks)
      .catch((err) => setLoadError(describeFirestoreError(err)));
  }, []);

  // Saisonniers N-1 : heures sur la saison, première et dernière semaine travaillées
  const people = useMemo<N1Person[]>(() => {
    if (!weeks) return [];
    const map = new Map<string, N1Person>();
    weeks.forEach((week) =>
      week.days.forEach((day) =>
        day.entries.forEach((e) => {
          const p = map.get(e.name) ?? { name: e.name, hours: 0, first: null, last: null };
          p.hours += e.hours;
          if (e.hours > 0) {
            p.first ??= week;
            p.last = week;
          }
          map.set(e.name, p);
        })
      )
    );
    return [...map.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, 'fr'));
  }, [weeks]);

  const n1Names = people.map((p) => p.name);

  const setAlias = (name: string, target: string) => {
    setDraft((d) => {
      const aliases = { ...d.aliases };
      if (target) aliases[name] = target;
      else delete aliases[name];
      return { ...d, aliases };
    });
  };

  const setSuccessor = (name: string, value: string) => {
    setDraft((d) => {
      const successors = { ...d.successors };
      if (value === AUTO) delete successors[name];
      else successors[name] = value === NONE ? '' : value;
      return { ...d, successors };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(draft);
      setMessage({ kind: 'ok', text: 'Correspondances enregistrées.' });
    } catch (err) {
      const text = describeFirestoreError(err);
      setMessage({
        kind: 'error',
        text: text.startsWith('Accès refusé')
          ? `${text} Republiez les règles Firestore (fichier rules.txt) dans la console Firebase.`
          : text,
      });
    } finally {
      setSaving(false);
    }
  };

  const select = 'text-sm border border-gray-300 rounded px-1.5 py-1 bg-white disabled:bg-gray-50 disabled:text-gray-400 w-full';
  const dirty = JSON.stringify(draft) !== JSON.stringify(correspondences);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn p-4">
      <div className="bg-white rounded-lg shadow-xl w-[980px] max-w-full max-h-[90vh] flex flex-col animate-scaleIn">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Correspondances des saisonniers N / N-1</h2>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-500" title="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto p-4 space-y-3 text-sm text-gray-600">
          <p>
            Pour chaque saisonnier de l'an passé, indiquez qui reprend <strong>son poste</strong> cette saison.
            Plusieurs personnes N-1 peuvent mener au même salarié (deux saisonniers qui se sont succédé sur le
            poste). « Automatique » associe les mêmes prénoms, sauf si le salarié a déjà un poste choisi à la main.
            « Même personne que » corrige un prénom écrit autrement dans l'Excel.
          </p>

          {loadError && <p className="text-red-600">Historique illisible : {loadError}</p>}
          {!weeks && !loadError && (
            <p className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" /> Lecture de l'historique…
            </p>
          )}
          {weeks && people.length === 0 && <p>Aucun historique importé.</p>}

          {people.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="border border-gray-200 px-2 py-1 text-left">Saisonnier N-1</th>
                  <th className="border border-gray-200 px-2 py-1 text-right">Heures</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Présent</th>
                  <th className="border border-gray-200 px-2 py-1 text-left w-[22%]">Même personne que</th>
                  <th className="border border-gray-200 px-2 py-1 text-left w-[28%]">Poste repris par (cette saison)</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const alias = draft.aliases[p.name] ?? '';
                  const canon = canonicalName(p.name, draft);
                  const explicit = canon in draft.successors;
                  const resolved = resolveSuccessor(p.name, draft, employees);
                  // Ce que donnerait l'association automatique, sans réglage pour ce prénom
                  const withoutChoice = { ...draft, successors: { ...draft.successors } };
                  delete withoutChoice.successors[canon];
                  const autoResult = resolveSuccessor(p.name, withoutChoice, employees);
                  const value = !explicit ? AUTO : draft.successors[canon] === '' ? NONE : draft.successors[canon];
                  return (
                    <tr key={p.name} className={alias ? 'bg-gray-50 text-gray-500' : ''}>
                      <td className="border border-gray-200 px-2 py-1 font-medium text-gray-800">{p.name}</td>
                      <td className="border border-gray-200 px-2 py-1 text-right whitespace-nowrap">
                        {formatHoursHM(p.hours)}
                      </td>
                      <td className="border border-gray-200 px-2 py-1 whitespace-nowrap text-xs">
                        {p.first && p.last
                          ? p.first.id === p.last.id
                            ? weekLabel(p.first)
                            : `${weekLabel(p.first)} → ${weekLabel(p.last)}`
                          : '—'}
                      </td>
                      <td className="border border-gray-200 px-2 py-1">
                        <select
                          className={select}
                          value={alias}
                          disabled={!canEdit}
                          onChange={(e) => setAlias(p.name, e.target.value)}
                        >
                          <option value="">—</option>
                          {n1Names
                            .filter((n) => n !== p.name && !draft.aliases[n])
                            .map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="border border-gray-200 px-2 py-1">
                        {alias ? (
                          <span className="text-xs">comme {alias} → {resolved.employee?.name ?? 'non repris'}</span>
                        ) : (
                          <select
                            className={select}
                            value={value}
                            disabled={!canEdit}
                            onChange={(e) => setSuccessor(p.name, e.target.value)}
                          >
                            <option value={AUTO}>
                              Automatique : {autoResult.employee?.name ?? 'personne'}
                            </option>
                            <option value={NONE}>Non repris</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.name}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {people.length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <div className="font-medium text-indigo-900 mb-1">Résultat : postes de cette saison</div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-gray-700">
                {employees.map((emp) => {
                  const preds = predecessorsOf(emp, n1Names, draft, employees);
                  return (
                    <li key={emp.id}>
                      <span className="font-medium">{emp.name}</span> ←{' '}
                      {preds.length ? preds.join(', ') : <span className="text-amber-700">aucun poste N-1</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {message && (
            <p className={message.kind === 'ok' ? 'text-green-600 font-medium' : 'text-red-600'}>{message.text}</p>
          )}
          {!canEdit && <p className="text-xs text-gray-500">Seul un administrateur peut modifier ce tableau.</p>}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Fermer
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrespondencesDialog;

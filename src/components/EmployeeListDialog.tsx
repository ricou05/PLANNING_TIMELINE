import React, { useMemo, useState } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { Employee } from '../types';
import {
  parseEmployeeList,
  matchEmployee,
  applyEmployeeList,
  isPlaceholderName,
  EmployeeListPlanItem,
} from '../utils/employeeList';

interface EmployeeListDialogProps {
  employees: Employee[];
  onApply: (employees: Employee[], reordered: boolean) => void;
  onClose: () => void;
}

const NEW = 'nouveau';

// Création / mise à jour des salariés à partir d'une liste collée
const EmployeeListDialog: React.FC<EmployeeListDialogProps> = ({ employees, onApply, onClose }) => {
  const [text, setText] = useState('');
  const [reorder, setReorder] = useState(true);
  /** Réglages modifiés à la main, par nom collé */
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [targets, setTargets] = useState<Record<string, string>>({});

  const parsed = useMemo(() => parseEmployeeList(text), [text]);

  // Association proposée pour chaque ligne cochée (sans réutiliser deux fois un salarié)
  const rows = useMemo(() => {
    const taken = new Set<number>();
    Object.values(targets).forEach((v) => v !== NEW && taken.add(Number(v)));
    return parsed.map((p) => {
      const isIncluded = included[p.name] ?? !p.looksLikeNote;
      let target = targets[p.name];
      if (target === undefined && isIncluded) {
        const match = matchEmployee(p.name, employees, taken);
        target = match ? String(match.id) : NEW;
        if (match) taken.add(match.id);
      }
      return { ...p, isIncluded, target: target ?? NEW };
    });
  }, [parsed, included, targets, employees]);

  const plan: EmployeeListPlanItem[] = rows
    .filter((r) => r.isIncluded)
    .map((r) => ({ name: r.name, targetId: r.target === NEW ? null : Number(r.target) }));
  const renamed = plan.filter((p) => p.targetId !== null).length;
  const created = plan.length - renamed;
  const listedIds = new Set(plan.map((p) => p.targetId));
  const others = employees.filter((e) => !listedIds.has(e.id) && !isPlaceholderName(e.name));

  const handleApply = () => {
    onApply(applyEmployeeList(employees, plan, reorder), reorder);
    onClose();
  };

  const select = 'text-sm border border-gray-300 rounded px-1.5 py-0.5 bg-white w-full disabled:bg-gray-50 disabled:text-gray-400';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn p-4">
      <div className="bg-white rounded-lg shadow-xl w-[820px] max-w-full max-h-[90vh] flex flex-col animate-scaleIn">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Coller une liste de salariés</h2>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-500" title="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto p-4 space-y-3 text-sm text-gray-600">
          <p>
            Collez la liste (une personne par ligne, copiée d'un tableur ou d'un message). Les codes « UTILE 1 » /
            « UTILE 2 » et les lignes vides sont ignorés. Un salarié déjà présent est simplement renommé : ses
            horaires sont conservés.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={'UTILE 1\tPrénom NOM\nUTILE 2\tPrénom NOM'}
            className="w-full font-mono text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {rows.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="border border-gray-200 px-2 py-1 w-8" />
                  <th className="border border-gray-200 px-2 py-1 text-left">Nom dans la liste</th>
                  <th className="border border-gray-200 px-2 py-1 text-left w-[45%]">Dans le planning</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className={r.isIncluded ? '' : 'text-gray-400 bg-gray-50'}>
                    <td className="border border-gray-200 px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={r.isIncluded}
                        onChange={(e) => setIncluded((prev) => ({ ...prev, [r.name]: e.target.checked }))}
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1 font-medium">{r.name}</td>
                    <td className="border border-gray-200 px-2 py-1">
                      <select
                        className={select}
                        value={r.target}
                        disabled={!r.isIncluded}
                        onChange={(e) => setTargets((prev) => ({ ...prev, [r.name]: e.target.value }))}
                      >
                        <option value={NEW}>Nouveau salarié</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={String(emp.id)}>
                            Renommer « {emp.name} »
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {plan.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1 text-gray-700">
              <div>
                <strong>{renamed}</strong> salarié{renamed > 1 ? 's' : ''} renommé{renamed > 1 ? 's' : ''},{' '}
                <strong>{created}</strong> ajouté{created > 1 ? 's' : ''} (les « Employe N » sans nom sont réutilisés en
                premier).
              </div>
              {others.length > 0 && (
                <div className="text-amber-700">
                  Pas dans la liste, gardés tels quels : {others.map((e) => e.name).join(', ')}. Supprimez-les dans le
                  planning si besoin.
                </div>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={reorder} onChange={(e) => setReorder(e.target.checked)} />
                Mettre les salariés dans l'ordre de la liste
              </label>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Annuler
          </button>
          <button
            onClick={handleApply}
            disabled={plan.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeListDialog;

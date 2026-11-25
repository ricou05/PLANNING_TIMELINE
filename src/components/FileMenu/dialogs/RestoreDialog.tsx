import React, { useMemo, useState } from 'react';
import { X, Clock, Save, Cloud, Trash2, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { getWeekDates, parseScheduleName } from '../../../utils/dateUtils';
import { SavedSchedule } from '../../../types';
import { ScheduleAutoSaveData } from '../../../hooks/useScheduleAutoSave';
import { formatAutoSaveTime, formatTimestamp } from '../formatters';
import LocalBadge from '../LocalBadge';

// « Ouvrir » : brouillon automatique et sauvegardes manuelles
interface RestoreDialogProps {
  autoSaveData: ScheduleAutoSaveData | null;
  savedSchedules: SavedSchedule[];
  outdatedNameCount: number;
  renaming: boolean;
  onRestoreAutoSave: (autoSave: ScheduleAutoSaveData) => void;
  onRestore: (schedule: SavedSchedule) => void;
  onAskDelete: (schedule: SavedSchedule) => void;
  onAskRenameAll: () => void;
  onClose: () => void;
}

const createdMillis = (s: SavedSchedule): number => {
  const t = (s.createdAt || s.updatedAt) as { toMillis?: () => number } | undefined;
  return typeof t?.toMillis === 'function' ? t.toMillis() : 0;
};

const weekRange = (weekNumber: number, year: number): string => {
  const dates = getWeekDates(weekNumber, year);
  const f = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${f(dates[0])} → ${f(dates[6])} ${dates[6].getFullYear()}`;
};

interface WeekGroup {
  key: string;
  weekNumber: number;
  year: number;
  /** De la plus récente à la plus ancienne */
  versions: SavedSchedule[];
}

const RestoreDialog: React.FC<RestoreDialogProps> = ({ autoSaveData, savedSchedules, outdatedNameCount, renaming, onRestoreAutoSave, onRestore, onAskDelete, onAskRenameAll, onClose }) => {
  // Sauvegardes regroupées par semaine du planning, semaines les plus récentes en haut
  const groups = useMemo<WeekGroup[]>(() => {
    const map = new Map<string, WeekGroup>();
    savedSchedules.forEach((s) => {
      const key = `${s.year}-${String(s.weekNumber).padStart(2, '0')}`;
      const group = map.get(key) ?? { key, weekNumber: s.weekNumber, year: s.year, versions: [] };
      group.versions.push(s);
      map.set(key, group);
    });
    const versionOf = (s: SavedSchedule) => parseScheduleName(s.name)?.version ?? 0;
    return [...map.values()]
      .map((g) => ({
        ...g,
        versions: g.versions.sort((a, b) => createdMillis(b) - createdMillis(a) || versionOf(b) - versionOf(a)),
      }))
      .sort((a, b) => b.year - a.year || b.weekNumber - a.weekNumber);
  }, [savedSchedules]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const renderVersion = (schedule: SavedSchedule, isLatest: boolean) => (
    <div key={schedule.id} className="flex items-stretch gap-2">
      <button
        onClick={() => onRestore(schedule)}
        className={`flex-1 px-3 py-2 text-left border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-150 ${
          isLatest ? 'border-gray-300' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className={`truncate ${isLatest ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{schedule.name}</span>
            {isLatest && (
              <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
                dernière
              </span>
            )}
          </span>
          {schedule.isLocal ? <LocalBadge /> : (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5 whitespace-nowrap"
              title="Disponible depuis tous vos PC"
            >
              <Cloud className="w-3 h-3" />
              En ligne
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {schedule.createdAt && `Enregistrée le ${formatTimestamp(schedule.createdAt)}`}
          {schedule.savedBy && ` · ${schedule.savedBy.split('@')[0]}`}
          {` · ${schedule.employees?.length || 0} salariés`}
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAskDelete(schedule); }}
        className="flex items-center justify-center px-3 border border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-150"
        title="Supprimer cette version"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
    <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col animate-scaleIn">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Ouvrir un planning</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {autoSaveData && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">Brouillon auto-sauvegarde</span>
            </div>
            <button
              onClick={() => onRestoreAutoSave(autoSaveData)}
              className="w-full p-4 text-left border-2 border-amber-200 bg-amber-50 rounded-lg hover:border-amber-400 hover:bg-amber-100 transition-all duration-150"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">
                  Dernier brouillon en cours
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                  <Clock className="w-3 h-3" />
                  Auto
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Semaine {autoSaveData.weekNumber} - {autoSaveData.year}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">
                  {autoSaveData.employees?.length || 0} employes
                </span>
                <span className="text-xs text-amber-500">
                  Sauvegarde le {formatAutoSaveTime(autoSaveData.timestamp)}
                </span>
              </div>
            </button>
          </div>
        )}

        {savedSchedules.length === 0 && !autoSaveData ? (
          <p className="text-sm text-gray-500 text-center py-8">Aucun planning sauvegarde</p>
        ) : savedSchedules.length > 0 && (
          <div>
            {autoSaveData && (
              <div className="flex items-center gap-2 mb-2">
                <Save className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">Sauvegardes manuelles</span>
              </div>
            )}
            <div className="space-y-3">
              {groups.map((group) => {
                const [latest, ...older] = group.versions;
                const open = expanded[group.key];
                return (
                  <div key={group.key}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">
                        Semaine {group.weekNumber} - {group.year}
                        <span className="font-normal text-gray-500"> · {weekRange(group.weekNumber, group.year)}</span>
                      </span>
                      {older.length > 0 && (
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [group.key]: !open }))}
                          className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                        >
                          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {open ? 'Masquer' : 'Voir'} les {older.length} version{older.length > 1 ? 's' : ''} précédente{older.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {renderVersion(latest, true)}
                      {open && older.map((s) => renderVersion(s, false))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between gap-2">
        {outdatedNameCount > 0 ? (
          <button
            onClick={onAskRenameAll}
            disabled={renaming}
            title="Renommer toutes les sauvegardes au format AAAA-Sxx-vN (versions numérotées dans l'ordre d'enregistrement)"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <Tag className="w-4 h-4" />
            Renommer au format standard ({outdatedNameCount})
          </button>
        ) : (
          <span className="text-xs text-gray-400">Noms au format AAAA-Sxx-vN · 10 versions max par semaine</span>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
);
};

export default RestoreDialog;

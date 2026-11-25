import React from 'react';
import { X } from 'lucide-react';
import { SavedSchedule } from '../../../types';
import LocalBadge from '../LocalBadge';

// « Enregistrer sous » : nouvelle sauvegarde ou écrasement d'une existante
interface SaveAsDialogProps {
  saveName: string;
  onSaveNameChange: (name: string) => void;
  defaultSaveName: string;
  savedSchedules: SavedSchedule[];
  loading: boolean;
  onCreate: () => void;
  onOverwrite: (schedule: SavedSchedule) => void;
  onClose: () => void;
}

const SaveAsDialog: React.FC<SaveAsDialogProps> = ({ saveName, onSaveNameChange, defaultSaveName, savedSchedules, loading, onCreate, onOverwrite, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
    <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[80vh] flex flex-col animate-scaleIn">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Enregistrer sous</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nouvelle sauvegarde
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => onSaveNameChange(e.target.value)}
              placeholder={defaultSaveName}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
              autoFocus
            />
            <button
              onClick={onCreate}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150 whitespace-nowrap"
            >
              Creer
            </button>
          </div>
        </div>

        {savedSchedules.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ou ecraser une sauvegarde existante
            </label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {savedSchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => onOverwrite(schedule)}
                  disabled={loading}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all duration-150 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate">{schedule.name}</span>
                    <span className="text-xs text-orange-600 font-medium">Ecraser</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      Semaine {schedule.weekNumber} - {schedule.year}
                    </span>
                    {schedule.isLocal && <LocalBadge />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
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

export default SaveAsDialog;

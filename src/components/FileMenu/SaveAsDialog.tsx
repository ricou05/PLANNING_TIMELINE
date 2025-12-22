import React, { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { SavedSchedule } from '../../types';
import { formatTimestamp } from '../../utils/dateUtils';

interface SaveAsDialogProps {
  defaultName: string;
  savedSchedules: SavedSchedule[];
  onSave: (name: string, scheduleToUpdate?: SavedSchedule) => void;
  onClose: () => void;
  loading: boolean;
}

const SaveAsDialog: React.FC<SaveAsDialogProps> = ({
  defaultName,
  savedSchedules,
  onSave,
  onClose,
  loading
}) => {
  const [saveName, setSaveName] = useState(defaultName);
  const [isNewSave, setIsNewSave] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSchedule) {
      onSave(selectedSchedule.name, selectedSchedule);
    } else {
      onSave(saveName.trim() || defaultName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sauvegarder comme</h2>
        </div>

        <form onSubmit={handleSaveSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto p-4">
            {isNewSave ? (
              <div className="mb-4">
                <label htmlFor="saveName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la sauvegarde
                </label>
                <input
                  type="text"
                  id="saveName"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nom de la sauvegarde"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-2">
                {savedSchedules.map((schedule) => (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => setSelectedSchedule(schedule)}
                    className={`w-full text-left p-3 rounded hover:bg-gray-50 flex flex-col gap-1 ${
                      selectedSchedule?.id === schedule.id ? 'bg-indigo-50 ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{schedule.name}</span>
                      <span className="text-xs text-gray-500">
                        Créé le {formatTimestamp(schedule.createdAt)}
                      </span>
                    </div>
                    {schedule.updatedAt && schedule.updatedAt !== schedule.createdAt && (
                      <span className="text-xs text-gray-500">
                        Modifié le {formatTimestamp(schedule.updatedAt)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNewSave(!isNewSave)}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                {isNewSave ? 'Sélectionner une sauvegarde existante' : 'Nouvelle sauvegarde'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || (!isNewSave && !selectedSchedule)}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveAsDialog

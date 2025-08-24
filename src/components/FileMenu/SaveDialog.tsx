import React, { useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { SavedSchedule } from '../../types';

interface SaveDialogProps {
  defaultName: string;
  savedSchedules: SavedSchedule[];
  onSave: (name: string, scheduleToUpdate?: SavedSchedule) => void;
  loading: boolean;
}

const SaveDialog: React.FC<SaveDialogProps> = ({ defaultName, savedSchedules, onSave, loading }) => {
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [isNewSave, setIsNewSave] = useState(false);
  const [saveName, setSaveName] = useState(defaultName);

  const handleNewSave = () => {
    setIsNewSave(true);
    setShowSaveOptions(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(saveName.trim() || defaultName);
    setIsNewSave(false);
    setShowSaveOptions(false);
  };

  const handleOverwrite = (schedule: SavedSchedule) => {
    onSave(schedule.name, schedule);
    setShowSaveOptions(false);
  };

  if (isNewSave) {
    return (
      <form onSubmit={handleSaveSubmit} className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
            placeholder="Nom de la sauvegarde"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Sauvegarder
          </button>
          <button
            type="button"
            onClick={() => setIsNewSave(false)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowSaveOptions(!showSaveOptions)}
        disabled={loading}
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        <Save className="w-4 h-4 mr-2" />
        {loading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
      </button>

      {showSaveOptions && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-2">
            <button
              onClick={handleNewSave}
              className="flex items-center w-full px-3 py-2 text-sm text-indigo-600 rounded hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle sauvegarde
            </button>
          </div>

          {savedSchedules.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-t border-b border-gray-200">
                Écraser une sauvegarde existante
              </div>
              <div className="max-h-48 overflow-y-auto">
                {savedSchedules.map((schedule) => (
                  <button
                    key={schedule.id}
                    onClick={() => handleOverwrite(schedule)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span>{schedule.name}</span>
                    <span className="text-xs text-gray-500">
                      {schedule.createdAt.toDate().toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SaveDialog;
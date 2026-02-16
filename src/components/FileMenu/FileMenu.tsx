import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, FilePlus, X, AlertCircle, Check, AlertTriangle } from 'lucide-react';
import { getSchedules, saveSchedule, updateSchedule } from '../../utils/firebase';
import { SavedSchedule } from '../../types';
import { getCurrentWeekNumber } from '../../utils/dateUtils';
import { validateSaveData } from '../../utils/validation';

interface FileMenuProps {
  onRestore: (savedSchedule: SavedSchedule) => void;
  onSave: () => Promise<{
    schedules: any;
    employees: any[];
    weekNumber: number;
    year: number;
    colorLabels: any[];
  }>;
  onNewSchedule?: () => void;
}

const FileMenu: React.FC<FileMenuProps> = ({ onRestore, onSave, onNewSchedule }) => {
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    loadSavedSchedules();
  }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadSavedSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      setWarnings([]);

      const result = await getSchedules();
      setSavedSchedules(result.schedules);

      if (result.warnings) {
        setWarnings(result.warnings);
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
      setError("Erreur lors du chargement des sauvegardes");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (name: string, scheduleToUpdate?: SavedSchedule) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const data = await onSave();
      const validation = validateSaveData(data);

      if (!validation.isValid) {
        setError(validation.error || 'Données invalides');
        return;
      }

      let result;
      if (scheduleToUpdate) {
        result = await updateSchedule(
          scheduleToUpdate.id,
          name,
          data.schedules,
          data.employees,
          data.weekNumber,
          data.year,
          data.colorLabels
        );
        setSelectedSchedule(scheduleToUpdate);
      } else {
        result = await saveSchedule(
          name,
          data.schedules,
          data.employees,
          data.weekNumber,
          data.year,
          data.colorLabels
        );
      }

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Sauvegarde effectuée avec succès');
        await loadSavedSchedules();
      }
    } catch (error) {
      console.error("Error saving:", error);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
      setShowSaveAsDialog(false);
      setSaveName('');
    }
  };

  const handleQuickSave = async () => {
    if (!selectedSchedule) {
      setShowSaveAsDialog(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const data = await onSave();
      const validation = validateSaveData(data);

      if (!validation.isValid) {
        setError(validation.error || 'Données invalides');
        return;
      }

      const result = await updateSchedule(
        selectedSchedule.id,
        selectedSchedule.name,
        data.schedules,
        data.employees,
        data.weekNumber,
        data.year,
        data.colorLabels
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Sauvegarde effectuée avec succès');
        await loadSavedSchedules();
      }
    } catch (error) {
      console.error("Error quick saving:", error);
      setError("Erreur lors de la sauvegarde rapide");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (schedule: SavedSchedule) => {
    setSelectedSchedule(schedule);
    onRestore(schedule);
    setShowRestoreDialog(false);
    setSuccess('Planning restauré avec succès');
  };

  const handleNewSchedule = () => {
    if (onNewSchedule) {
      onNewSchedule();
      setSelectedSchedule(null);
      setSuccess('Nouveau planning créé');
    }
  };

  return (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-[95%] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">Planification des horaires</h1>
            {selectedSchedule && (
              <span className="text-sm text-gray-500 ml-4">
                Planning actuel: <span className="font-medium text-gray-700">{selectedSchedule.name}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewSchedule}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <FilePlus className="w-4 h-4" />
              Nouveau
            </button>

            <button
              onClick={handleQuickSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <Save className="w-4 h-4" />
              {selectedSchedule ? 'Sauvegarder' : 'Sauvegarder sous...'}
            </button>

            <button
              onClick={() => setShowSaveAsDialog(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <Save className="w-4 h-4" />
              Sauvegarder sous...
            </button>

            <button
              onClick={() => setShowRestoreDialog(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <FolderOpen className="w-4 h-4" />
              Ouvrir
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="fixed top-16 left-0 right-0 z-40 px-4">
        <div className="max-w-[95%] mx-auto">
          {error && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-slideIn">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-600">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save As Dialog */}
      {showSaveAsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[480px] animate-scaleIn">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Sauvegarder le planning</h2>
              <button
                onClick={() => setShowSaveAsDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du planning
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`${new Date().getFullYear()}_${getCurrentWeekNumber()}_${savedSchedules.length + 1}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                autoFocus
              />
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setShowSaveAsDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSave(saveName || `${new Date().getFullYear()}_${getCurrentWeekNumber()}_${savedSchedules.length + 1}`)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Dialog */}
      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col animate-scaleIn">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Ouvrir un planning</h2>
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {savedSchedules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucun planning sauvegardé</p>
              ) : (
                <div className="space-y-2">
                  {savedSchedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      onClick={() => handleRestore(schedule)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-150"
                    >
                      <div className="font-medium text-gray-900">{schedule.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Semaine {schedule.weekNumber} - {schedule.year}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {schedule.employees?.length || 0} employés
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileMenu;

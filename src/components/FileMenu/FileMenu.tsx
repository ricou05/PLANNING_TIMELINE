import React, { useState, useEffect } from 'react';
import { Save, Copy, FolderOpen, FilePlus, X, AlertCircle, Check, AlertTriangle, Clock } from 'lucide-react';
import { getSchedules, saveSchedule, updateSchedule } from '../../utils/firebase';
import { SavedSchedule } from '../../types';
import { getCurrentWeekNumber } from '../../utils/dateUtils';
import { validateSaveData } from '../../utils/validation';
import { loadScheduleAutoSave, ScheduleAutoSaveData } from '../../hooks/useScheduleAutoSave';

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
  autoSaveTimestamp: string | null;
  showAutoSaveIndicator: boolean;
}

const formatAutoSaveTime = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} a ${pad(d.getHours())}h${pad(d.getMinutes())}`;
};

const FileMenu: React.FC<FileMenuProps> = ({
  onRestore,
  onSave,
  onNewSchedule,
  autoSaveTimestamp,
  showAutoSaveIndicator,
}) => {
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
        setError(validation.error || 'Donnees invalides');
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
        setSelectedSchedule({ ...scheduleToUpdate, name });
      } else {
        result = await saveSchedule(
          name,
          data.schedules,
          data.employees,
          data.weekNumber,
          data.year,
          data.colorLabels
        );
        if (!result.error) {
          setSelectedSchedule({
            id: result.id,
            name,
            schedules: data.schedules,
            employees: data.employees,
            weekNumber: data.weekNumber,
            year: data.year,
            colorLabels: data.colorLabels,
            createdAt: null as any,
          });
        }
      }

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Sauvegarde effectuee avec succes');
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
        setError(validation.error || 'Donnees invalides');
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
        setSuccess('Sauvegarde effectuee avec succes');
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
    setSuccess('Planning restaure avec succes');
  };

  const handleRestoreAutoSave = (autoSave: ScheduleAutoSaveData) => {
    const pseudoSchedule: SavedSchedule = {
      id: '__autosave__',
      name: 'Brouillon (auto-sauvegarde)',
      schedules: autoSave.schedules,
      employees: autoSave.employees,
      weekNumber: autoSave.weekNumber,
      year: autoSave.year,
      colorLabels: [],
      createdAt: null as any,
    };
    setSelectedSchedule(null);
    onRestore(pseudoSchedule);
    setShowRestoreDialog(false);
    setSuccess('Brouillon auto-sauvegarde restaure');
  };

  const handleNewSchedule = () => {
    if (onNewSchedule) {
      onNewSchedule();
      setSelectedSchedule(null);
      setSuccess('Nouveau planning cree');
    }
  };

  const autoSaveData = showRestoreDialog ? loadScheduleAutoSave() : null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-[95%] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">Planification des horaires</h1>
            {selectedSchedule && (
              <span className="text-sm text-gray-500 truncate">
                Planning actuel: <span className="font-medium text-gray-700">{selectedSchedule.name}</span>
              </span>
            )}

            <div
              className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-all duration-500 ${
                showAutoSaveIndicator
                  ? 'opacity-100 translate-x-0 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1'
                  : autoSaveTimestamp
                    ? 'opacity-70 translate-x-0 text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1'
                    : 'opacity-0 translate-x-2'
              }`}
            >
              {showAutoSaveIndicator ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Sauvegarde auto effectuee
                </>
              ) : autoSaveTimestamp ? (
                <>
                  <Clock className="w-3 h-3" />
                  Sauvegarde auto : {formatAutoSaveTime(autoSaveTimestamp)}
                </>
              ) : null}
            </div>
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
              Sauvegarder
            </button>

            <button
              onClick={() => { loadSavedSchedules(); setShowSaveAsDialog(true); }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <Copy className="w-4 h-4" />
              Enregistrer sous...
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

      {showSaveAsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[80vh] flex flex-col animate-scaleIn">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Enregistrer sous</h2>
              <button
                onClick={() => setShowSaveAsDialog(false)}
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
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder={`${new Date().getFullYear()}_${getCurrentWeekNumber()}_${savedSchedules.length + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave(saveName || `${new Date().getFullYear()}_${getCurrentWeekNumber()}_${savedSchedules.length + 1}`)}
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
                        onClick={() => handleSave(schedule.name, schedule)}
                        disabled={loading}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all duration-150 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{schedule.name}</span>
                          <span className="text-xs text-orange-600 font-medium">Ecraser</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Semaine {schedule.weekNumber} - {schedule.year}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowSaveAsDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

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
              {autoSaveData && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">Brouillon auto-sauvegarde</span>
                  </div>
                  <button
                    onClick={() => handleRestoreAutoSave(autoSaveData)}
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
                          {schedule.employees?.length || 0} employes
                        </div>
                      </button>
                    ))}
                  </div>
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

import React, { useState, useEffect, useCallback } from 'react';
import { getSchedules, saveSchedule, updateSchedule } from '../../utils/firebase';
import { SavedSchedule } from '../../types';
import SaveAsDialog from './SaveAsDialog';
import RestoreDialog from './RestoreDialog';
import { getCurrentWeekNumber } from '../../utils/dateUtils';
import { validateSaveData, SaveData } from '../../utils/validation';
import StatusMessage from './StatusMessage';
import TopBar from '../TopBar/TopBar';

interface FileMenuProps {
  onRestore: (savedSchedule: SavedSchedule) => void;
  onSave: () => Promise<SaveData>;
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

  const loadSavedSchedules = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadSavedSchedules();
  }, [loadSavedSchedules]);

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
      <TopBar
        onNewSave={() => setShowSaveAsDialog(true)}
        onQuickSave={handleQuickSave}
        onRestore={() => setShowRestoreDialog(true)}
        onNewSchedule={handleNewSchedule}
        loading={loading}
        selectedScheduleName={selectedSchedule?.name}
      />

      <div className="mt-16 px-4 py-3">
        <StatusMessage
          error={error}
          success={success}
          warnings={warnings}
        />
      </div>

      {showSaveAsDialog && (
        <SaveAsDialog
          defaultName={`${new Date().getFullYear()}_${getCurrentWeekNumber()}_${savedSchedules.length + 1}`}
          savedSchedules={savedSchedules}
          onSave={handleSave}
          onClose={() => setShowSaveAsDialog(false)}
          loading={loading}
        />
      )}

      {showRestoreDialog && (
        <RestoreDialog
          schedules={savedSchedules}
          onRestore={handleRestore}
          onClose={() => setShowRestoreDialog(false)}
          loading={loading}
        />
      )}
    </>
  );
};

export default FileMenu;

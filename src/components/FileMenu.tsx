import React, { useState, useEffect } from 'react';
import { Save, FolderOpen } from 'lucide-react';
import { getSchedules, saveSchedule } from '../utils/firebase';
import { SavedSchedule } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface FileMenuProps {
  onRestore: (savedSchedule: SavedSchedule) => void;
  onSave: () => Promise<{
    schedules: any;
    employees: any[];
    weekNumber: number;
    year: number;
    colorLabels: any[];
  }>;
}

const FileMenu: React.FC<FileMenuProps> = ({ onRestore, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getLocalSchedules } = useLocalStorage();

  useEffect(() => {
    if (isOpen) {
      loadSavedSchedules();
    }
  }, [isOpen]);

  const loadSavedSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get schedules from Firebase
      const firebaseSchedules = await getSchedules();
      
      // Get local schedules
      const localSchedules = await getLocalSchedules();
      
      // Combine and sort by date
      const allSchedules = [...firebaseSchedules, ...localSchedules]
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      
      setSavedSchedules(allSchedules);
    } catch (error) {
      console.error("Error loading schedules:", error);
      // Fallback to local storage only
      const localSchedules = await getLocalSchedules();
      setSavedSchedules(localSchedules);
      setError("Mode hors ligne - Affichage des sauvegardes locales uniquement");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await onSave();
      
      const result = await saveSchedule(
        data.schedules,
        data.employees,
        data.weekNumber,
        data.year,
        data.colorLabels
      );

      if (result.error) {
        setError(result.error);
      }

      await loadSavedSchedules();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md hover:bg-indigo-800"
      >
        Fichier
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
            </button>

            <div className="px-4 py-2 text-sm text-gray-700 font-medium border-t border-gray-100">
              <div className="flex items-center mb-2">
                <FolderOpen className="w-4 h-4 mr-2" />
                Restaurer
              </div>
              {error && (
                <div className="text-red-500 text-xs mb-2 px-2">
                  {error}
                </div>
              )}
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-2 text-gray-500">Chargement...</div>
                ) : savedSchedules.length === 0 ? (
                  <div className="text-center py-2 text-gray-500">Aucune sauvegarde</div>
                ) : (
                  savedSchedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      onClick={() => {
                        onRestore(schedule);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center justify-between"
                    >
                      <span>{schedule.name}</span>
                      <span className="text-xs text-gray-500">
                        {schedule.createdAt.toDate().toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileMenu;
import React from 'react';
import { SavedSchedule } from '../../types';
import { formatTimestamp } from '../../utils/dateUtils';

interface RestoreDialogProps {
  schedules: SavedSchedule[];
  onRestore: (schedule: SavedSchedule) => void;
  onClose: () => void;
  loading: boolean;
}

const RestoreDialog: React.FC<RestoreDialogProps> = ({
  schedules,
  onRestore,
  onClose,
  loading
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Restaurer une sauvegarde</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Chargement...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Aucune sauvegarde disponible</div>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => onRestore(schedule)}
                  className="w-full text-left p-3 rounded hover:bg-gray-50 flex flex-col gap-1 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{schedule.name}</span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(schedule.createdAt)}
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
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestoreDialog;
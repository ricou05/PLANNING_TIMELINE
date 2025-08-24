import React from 'react';
import { FolderOpen } from 'lucide-react';
import { SavedSchedule } from '../../types';

interface ScheduleListProps {
  schedules: SavedSchedule[];
  loading: boolean;
  error: string | null;
  onSelect: (schedule: SavedSchedule) => void;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({
  schedules,
  loading,
  error,
  onSelect
}) => (
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
      ) : schedules.length === 0 ? (
        <div className="text-center py-2 text-gray-500">Aucune sauvegarde</div>
      ) : (
        schedules.map((schedule) => (
          <button
            key={schedule.id}
            onClick={() => onSelect(schedule)}
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
);
import React from 'react';
import { Plus, Save, History, FileText } from 'lucide-react';

interface TopBarProps {
  onNewSave: () => void;
  onQuickSave: () => void;
  onRestore: () => void;
  onNewSchedule?: () => void;
  loading: boolean;
  selectedScheduleName?: string;
}

const TopBar: React.FC<TopBarProps> = ({
  onNewSave,
  onQuickSave,
  onRestore,
  onNewSchedule,
  loading,
  selectedScheduleName
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Planning Hebdomadaire</h1>
        
        <div className="flex items-center gap-3">
          {/* Nouveau planning */}
          {onNewSchedule && (
            <button
              onClick={onNewSchedule}
              className="h-10 px-4 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <FileText className="w-5 h-5 flex-shrink-0" />
              <span>Nouveau planning</span>
            </button>
          )}
          
          {/* Nouvelle sauvegarde */}
          <button
            onClick={onNewSave}
            disabled={loading}
            className="h-10 px-4 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>Nouvelle sauvegarde</span>
          </button>

          {/* Sauvegarder */}
          <button
            onClick={onQuickSave}
            disabled={loading}
            className="h-10 px-4 text-sm font-medium text-indigo-600 bg-white border-2 border-indigo-200 rounded-md hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            title={selectedScheduleName ? `Mettre à jour "${selectedScheduleName}"` : undefined}
          >
            <Save className="w-5 h-5 flex-shrink-0" />
            <span>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>

          {/* Restaurer */}
          <button
            onClick={onRestore}
            disabled={loading}
            className="h-10 px-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <History className="w-5 h-5 flex-shrink-0" />
            <span>Restaurer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
import React from 'react';
import { SavedSchedule } from '../../../types';

// Confirmation de suppression d'une sauvegarde
interface DeleteScheduleDialogProps {
  schedule: SavedSchedule;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteScheduleDialog: React.FC<DeleteScheduleDialogProps> = ({ schedule, loading, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] animate-fadeIn">
    <div className="bg-white rounded-lg shadow-xl w-[400px] animate-scaleIn">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h2>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600">
          Voulez-vous vraiment supprimer la sauvegarde <span className="font-semibold text-gray-900">"{schedule.name}"</span> ?
        </p>
        <p className="text-xs text-red-500 mt-2">Cette action est irreversible.</p>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
);

export default DeleteScheduleDialog;

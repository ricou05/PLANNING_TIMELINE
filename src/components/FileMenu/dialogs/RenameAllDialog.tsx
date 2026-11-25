import React from 'react';
import { Tag, RefreshCw } from 'lucide-react';

// Renommage en masse des sauvegardes au format standard (action groupée, donc confirmée)
interface RenameAllDialogProps {
  outdatedNameCount: number;
  renaming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const RenameAllDialog: React.FC<RenameAllDialogProps> = ({ outdatedNameCount, renaming, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn">
    <div className="bg-white rounded-lg shadow-xl w-[520px] animate-scaleIn">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <Tag className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900">Renommer les sauvegardes</h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-600">
          {outdatedNameCount === 1
            ? '1 sauvegarde va etre renommee'
            : `${outdatedNameCount} sauvegardes vont etre renommees`}{' '}
          au format <span className="font-mono font-medium text-gray-900">AAAA-MM-sem-SS-HH-MM</span>.
        </p>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 space-y-1">
          <div>
            <span className="font-medium">AAAA-MM</span> : annee et mois de la semaine planifiee
          </div>
          <div>
            <span className="font-medium">sem-SS</span> : numero de la semaine du planning
          </div>
          <div>
            <span className="font-medium">HH-MM</span> : heure de la sauvegarde
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Seuls les noms changent : le contenu des plannings n'est pas touche. Les sauvegardes
          deja au bon format sont ignorees.
        </p>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={renaming}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          disabled={renaming}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-sm transition-all duration-150"
        >
          {renaming && <RefreshCw className="w-4 h-4 animate-spin" />}
          {renaming ? 'Renommage...' : 'Renommer'}
        </button>
      </div>
    </div>
  </div>
);

export default RenameAllDialog;

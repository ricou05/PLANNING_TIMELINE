import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp } from '../formatters';

// Sauvegarde refusée : le planning a été modifié en ligne entre-temps
interface ConflictDialogProps {
  name: string;
  remoteUpdatedAt: Timestamp | null;
  onCancel: () => void;
  onForceSave: () => void;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({ name, remoteUpdatedAt, onCancel, onForceSave }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn">
    <div className="bg-white rounded-lg shadow-xl w-[520px] animate-scaleIn">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-semibold text-gray-900">Modifie ailleurs entre-temps</h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-600">
          La sauvegarde <span className="font-semibold text-gray-900">"{name}"</span> a ete
          modifiee en ligne le {formatTimestamp(remoteUpdatedAt)}, depuis un autre PC ou par
          un autre utilisateur.
        </p>
        <p className="text-sm text-gray-600">
          Ecraser remplacera cette version par celle affichee ici. Pour repartir de la version en
          ligne, annulez puis utilisez <span className="font-medium">Ouvrir</span>.
        </p>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onForceSave}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 active:bg-orange-800 shadow-sm transition-all duration-150"
        >
          Ecraser quand meme
        </button>
      </div>
    </div>
  </div>
);

export default ConflictDialog;

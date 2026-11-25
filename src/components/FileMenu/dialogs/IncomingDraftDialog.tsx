import React from 'react';
import { Laptop } from 'lucide-react';
import { CloudDraft } from '../../../utils/firebase/drafts';
import { formatAutoSaveTime } from '../formatters';

// Brouillon plus récent trouvé en ligne, laissé sur un autre poste
interface IncomingDraftDialogProps {
  draft: CloudDraft;
  onIgnore: () => void;
  onAccept: () => void;
}

const IncomingDraftDialog: React.FC<IncomingDraftDialogProps> = ({ draft, onIgnore, onAccept }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn">
    <div className="bg-white rounded-lg shadow-xl w-[520px] animate-scaleIn">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <Laptop className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-semibold text-gray-900">Brouillon plus recent disponible</h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-600">
          Un brouillon plus recent a ete laisse sur{' '}
          <span className="font-semibold text-gray-900">{draft.deviceLabel}</span>{' '}
          le {formatAutoSaveTime(draft.timestamp)}.
        </p>
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm text-gray-700">
          <div>Semaine {draft.weekNumber} - {draft.year}</div>
          <div className="text-xs text-gray-500 mt-1">
            {draft.employees?.length || 0} employes
            {draft.weeks && ` - ${Object.keys(draft.weeks).length} semaine(s)`}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Le recuperer remplacera le planning actuellement affiche sur ce PC.
        </p>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
        <button
          onClick={onIgnore}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Ignorer
        </button>
        <button
          onClick={onAccept}
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 active:bg-sky-800 shadow-sm transition-all duration-150"
        >
          Recuperer le brouillon
        </button>
      </div>
    </div>
  </div>
);

export default IncomingDraftDialog;

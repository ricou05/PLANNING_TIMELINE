import React, { useState } from 'react';
import { X, Download } from 'lucide-react';

export interface PDFExportOptions {
  showTotalColumn: boolean;
}

interface PDFExportModalProps {
  onConfirm: (options: PDFExportOptions) => void;
  onCancel: () => void;
}

const PDFExportModal: React.FC<PDFExportModalProps> = ({ onConfirm, onCancel }) => {
  const [showTotalColumn, setShowTotalColumn] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <Download className="w-4 h-4 text-blue-600" />
            Options d'export PDF
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Colonnes</p>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={showTotalColumn}
              onChange={e => setShowTotalColumn(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              Afficher la colonne <strong>Total Semaine</strong>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm({ showTotalColumn })}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

      </div>
    </div>
  );
};

export default PDFExportModal;

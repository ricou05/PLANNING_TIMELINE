import React, { useState } from 'react';
import { Upload, AlertCircle, Check } from 'lucide-react';
import { Employee, Schedule } from '../types';
import { parseCSV } from '../utils/csvParser';

interface CSVImportProps {
  onImport: (data: {
    employees: Employee[];
    schedules: Record<string, Schedule>;
  }) => void;
  existingEmployees: Employee[];
}

const CSVImport: React.FC<CSVImportProps> = ({ onImport, existingEmployees }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Le fichier doit être au format CSV');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    try {
      const text = await file.text();
      const result = parseCSV(text, existingEmployees, importMode === 'replace');
      
      if (result.errors.length > 0) {
        setError(`Erreurs lors de l'importation: ${result.errors.join(', ')}`);
        return;
      }

      onImport({
        employees: result.employees,
        schedules: result.schedules
      });

      setSuccess(`Importation réussie: ${result.importedCount} horaires importés pour ${result.employeeCount} employés`);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
        setFile(null);
      }, 2000);
    } catch (err) {
      console.error('Erreur lors de l\'importation:', err);
      setError('Erreur lors de l\'analyse du fichier CSV');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Upload className="w-5 h-5" />
        <span>Importer CSV</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Importer des horaires depuis CSV</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fichier CSV
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Format attendu: CSV avec colonnes pour employés, jours et horaires
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode d'importation
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Fusionner</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Remplacer tout</span>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Fusionner: Ajoute ou met à jour les employés et horaires<br />
                    Remplacer: Supprime toutes les données existantes avant l'import
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-600">{success}</p>
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Format CSV attendu:</h3>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    EMPLOYES;;LUNDI;;MARDI;;...;DIMANCHE;<br />
                    ;;DEBUT;FIN;DEBUT;FIN;...;DEBUT;FIN<br />
                    Nicolas;Matin;07:45;11:00;07:00;12:00;...;08:00;13:00<br />
                    ;Apres-Midi;00:00;00:00;16:00;19:30;...;18:00;19:30<br />
                    Pierre;Matin;...
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CSVImport;
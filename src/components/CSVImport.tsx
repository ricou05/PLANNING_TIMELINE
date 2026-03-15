import React, { useState } from 'react';
import { Upload, AlertCircle, Check } from 'lucide-react';
import { Employee, Schedule, ManagedColor } from '../types';
import { parseCSV } from '../utils/csvParser';

interface CSVImportProps {
  onImport: (data: {
    employees: Employee[];
    schedules: Record<string, Schedule>;
  }) => void;
  existingEmployees: Employee[];
  managedColors: ManagedColor[];
}

const CSVImport: React.FC<CSVImportProps> = ({ onImport, existingEmployees, managedColors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importColors, setImportColors] = useState(true);
  const [fileHasColors, setFileHasColors] = useState<boolean | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Le fichier doit etre au format CSV');
        setFile(null);
        setFileHasColors(null);
        return;
      }
      setFile(selectedFile);
      setError(null);

      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      if (lines.length >= 2) {
        const subHeader = lines[1].split(';');
        const detected = subHeader.some(cell => cell.trim().toUpperCase() === 'COULEUR');
        setFileHasColors(detected);
        setImportColors(detected);
      } else {
        setFileHasColors(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    try {
      const text = await file.text();
      const result = parseCSV(text, existingEmployees, importMode === 'replace', importColors, managedColors);
      
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
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 active:bg-green-800 shadow-sm transition-all duration-150"
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
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
                        className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-150"
                      />
                      <span className="text-sm text-gray-700">Fusionner</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-150"
                      />
                      <span className="text-sm text-gray-700">Remplacer tout</span>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Fusionner: Ajoute ou met a jour les employes et horaires<br />
                    Remplacer: Supprime toutes les donnees existantes avant l'import
                  </p>
                </div>

                {fileHasColors !== null && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importColors}
                        onChange={(e) => setImportColors(e.target.checked)}
                        disabled={!fileHasColors}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 transition-all duration-150"
                      />
                      <span className="text-sm text-gray-700">Importer les couleurs</span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500 ml-6">
                      {fileHasColors
                        ? 'Le fichier contient des codes couleur. Decochez pour les ignorer.'
                        : 'Le fichier ne contient pas de codes couleur.'}
                    </p>
                  </div>
                )}

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
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Spécification du format CSV :</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Séparateur : <b>point-virgule (;)</b>. Encodage : UTF-8 (avec ou sans BOM).
                    Les 7 jours de la semaine doivent être présents dans l'ordre : LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI, SAMEDI, DIMANCHE.
                  </p>

                  <h4 className="text-xs font-semibold text-gray-700 mt-2 mb-1">Structure (sans couleurs) — 2 colonnes par jour :</h4>
                  <p className="text-xs text-gray-500 mb-1">
                    Ligne 1 : en-tête avec nom des jours (les cellules paires entre jours restent vides).<br/>
                    Ligne 2 : sous-en-tête DEBUT;FIN répété pour chaque jour.<br/>
                    Lignes suivantes : 2 lignes par employé (Matin puis Apres-Midi).
                  </p>
                  <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border border-gray-200">
{`EMPLOYES;;LUNDI;;MARDI;;MERCREDI;;JEUDI;;VENDREDI;;SAMEDI;;DIMANCHE;
;;DEBUT;FIN;DEBUT;FIN;DEBUT;FIN;DEBUT;FIN;DEBUT;FIN;DEBUT;FIN;DEBUT;FIN
Nicolas;Matin;07:45;11:00;07:00;12:00;08:00;12:00;07:45;11:00;07:00;12:00;REPOS;;REPOS;
;Apres-Midi;14:00;18:30;16:00;19:30;14:00;18:00;14:00;18:30;16:00;19:30;REPOS;;REPOS;`}
                  </pre>

                  <h4 className="text-xs font-semibold text-gray-700 mt-3 mb-1">Horaires :</h4>
                  <p className="text-xs text-gray-500">
                    Format : <b>HH:MM</b> (ex: 07:45, 14:00). Chaque période a un DEBUT et une FIN.
                    Si un employé ne travaille pas un jour donné, mettre <b>00:00;00:00</b> pour les deux périodes.
                  </p>

                  <h4 className="text-xs font-semibold text-gray-700 mt-3 mb-1">Repos — jour complet ou demi-journée :</h4>
                  <p className="text-xs text-gray-500 mb-1">
                    Écrire <b>REPOS</b> dans la colonne DEBUT de la période concernée (la colonne FIN reste vide).
                    Le marqueur REPOS fonctionne indépendamment sur chaque période :
                  </p>
                  <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border border-gray-200">
{`-- Jour complet de repos (REPOS sur Matin ET Apres-Midi) :
Marie;Matin;REPOS;;...
;Apres-Midi;REPOS;;...

-- Demi-journée : repos le matin, travail l'après-midi :
Marie;Matin;REPOS;;...
;Apres-Midi;14:00;18:00;...

-- Demi-journée : travail le matin, repos l'après-midi :
Marie;Matin;08:00;12:00;...
;Apres-Midi;REPOS;;...`}
                  </pre>

                  <h4 className="text-xs font-semibold text-gray-700 mt-3 mb-1">Avec couleurs — 3 colonnes par jour :</h4>
                  <p className="text-xs text-gray-500 mb-1">
                    Ajouter une colonne COULEUR après chaque paire DEBUT;FIN.
                    Couleurs disponibles : <b>jaune</b>, <b>rouge</b>, <b>bleu</b>, <b>vert</b>, <b>bleu ciel</b>, <b>orange</b>, <b>violet</b>.
                    Laisser vide si aucune couleur souhaitée.
                  </p>
                  <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap bg-white p-2 rounded border border-gray-200">
{`EMPLOYES;;LUNDI;;;MARDI;;;...
;;DEBUT;FIN;COULEUR;DEBUT;FIN;COULEUR;...
Nicolas;Matin;07:45;11:00;bleu;07:00;12:00;vert;...
;Apres-Midi;14:00;18:30;vert;16:00;19:30;bleu;...`}
                  </pre>

                  <h4 className="text-xs font-semibold text-gray-700 mt-3 mb-1">Règles importantes :</h4>
                  <ul className="text-xs text-gray-500 list-disc ml-4 space-y-0.5">
                    <li>Chaque employé occupe exactement <b>2 lignes consécutives</b> : la 1ère avec son nom + "Matin", la 2ème avec une cellule vide + "Apres-Midi"</li>
                    <li>La 2ème colonne doit contenir exactement <b>Matin</b> ou <b>Apres-Midi</b> (sans accent)</li>
                    <li>Le nom de l'employé n'apparaît que sur la ligne Matin ; la ligne Apres-Midi commence par un champ vide</li>
                    <li>Les 7 jours doivent toujours être présents (utiliser 00:00;00:00 ou REPOS; pour les jours sans données)</li>
                  </ul>
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all duration-150"
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
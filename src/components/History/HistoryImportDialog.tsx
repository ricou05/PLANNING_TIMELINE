import React, { useState } from 'react';
import { FileSpreadsheet, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { parseHoursWorkbook, ExcelImportResult, HISTORY_FIRST_WEEK, HISTORY_LAST_WEEK } from '../../utils/history/excelImport';
import { saveHistoryWeeks } from '../../utils/firebase/history';
import { describeFirestoreError } from '../../utils/firebase';
import { formatHoursHM } from '../../utils/timeUtils';

interface HistoryImportDialogProps {
  onClose: () => void;
}

const frDate = (iso: string) => iso.split('-').reverse().join('/');

// Import du fichier Excel « Heures employés » vers l'historique en ligne
// (réservé aux administrateurs). Le fichier est lu dans le navigateur ;
// seules les semaines de la période retenue sont envoyées.
const HistoryImportDialog: React.FC<HistoryImportDialogProps> = ({ onClose }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const period = `S${HISTORY_FIRST_WEEK.week} ${HISTORY_FIRST_WEEK.year} → S${HISTORY_LAST_WEEK.week} ${HISTORY_LAST_WEEK.year}`;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setError(null);
    setDone(false);
    setBusy(true);
    try {
      const parsed = await parseHoursWorkbook(await file.arrayBuffer());
      if (parsed.weeks.length === 0) {
        setError(`Aucune donnée trouvée pour la période ${period}.`);
      } else {
        setResult(parsed);
      }
    } catch (err) {
      console.error('Lecture du fichier Excel impossible :', err);
      setError(err instanceof Error ? err.message : 'Lecture du fichier impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      await saveHistoryWeeks(result.weeks);
      setDone(true);
    } catch (err) {
      console.error("Import de l'historique impossible :", err);
      const message = describeFirestoreError(err);
      setError(
        message.startsWith('Accès refusé')
          ? `${message} Republiez les règles Firestore (fichier rules.txt) dans la console Firebase, puis réessayez.`
          : message
      );
    } finally {
      setBusy(false);
    }
  };

  const first = result?.weeks[0];
  const last = result?.weeks[result.weeks.length - 1];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn p-4">
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-w-full animate-scaleIn">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Importer l'historique Excel</h2>
        </div>

        <div className="p-4 space-y-3 text-sm text-gray-600">
          <p>
            Choisissez le fichier « Heures employés ». Seules les semaines <strong>{period}</strong> sont
            reprises : elles servent de référence pour préparer les plannings de cette année.
          </p>

          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <Upload className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">{fileName ?? 'Choisir le fichier .xlsx'}</span>
            <input
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
          </label>

          {busy && !result && (
            <p className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" /> Lecture du fichier…
            </p>
          )}

          {result && first && last && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1 text-gray-700">
              <div>
                <span className="font-medium">{result.weeks.length} semaines</span> trouvées, du{' '}
                {frDate(first.monday)} ({first.id}) au {frDate(last.days[6].date)} ({last.id})
              </div>
              <div>
                <span className="font-medium">{formatHoursHM(result.totalHours)}</span> travaillées au total
              </div>
              <div>
                <span className="font-medium">{result.names.length} prénoms</span> : {result.names.join(', ')}
              </div>
              {result.missingWeeks.length > 0 && (
                <div className="text-amber-700">Sans données : {result.missingWeeks.join(', ')}</div>
              )}
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-green-600 flex-none mt-0.5" />
            Les données sont rangées dans la base en ligne, lisibles uniquement par les utilisateurs autorisés.
            Elles ne font pas partie du code du site. Un nouvel import remplace les semaines déjà importées.
          </p>

          {error && <p className="text-red-600">{error}</p>}
          {done && <p className="text-green-600 font-medium">Historique importé.</p>}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy && !!result}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            {done ? 'Fermer' : 'Annuler'}
          </button>
          {!done && (
            <button
              onClick={handleImport}
              disabled={!result || busy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-sm transition-all duration-150"
            >
              {busy && result && <RefreshCw className="w-4 h-4 animate-spin" />}
              {busy && result ? 'Envoi…' : 'Importer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryImportDialog;

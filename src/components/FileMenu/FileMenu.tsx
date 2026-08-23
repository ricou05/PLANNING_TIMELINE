import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Copy, FolderOpen, FilePlus, X, AlertCircle, Check, AlertTriangle, Clock, Trash2, Users, LogOut, ShieldCheck, User as UserIcon, Cloud, CloudOff, HardDrive, RefreshCw, Laptop, ChevronDown } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { getSchedules, saveSchedule, updateSchedule, deleteSchedule } from '../../utils/firebase';
import { syncLocalSchedules } from '../../utils/firebase/sync';
import { loadCloudDraft, CloudDraft } from '../../utils/firebase/drafts';
import { getDeviceId } from '../../utils/storage/device';
import { useAuth } from '../../hooks/useAuth';
import UserManagementModal from '../Auth/UserManagementModal';
import { SavedSchedule, Schedule, Employee, ColorLabel } from '../../types';
import { getCurrentWeekNumber } from '../../utils/dateUtils';
import { validateSaveData } from '../../utils/validation';
import { loadScheduleAutoSave, ScheduleAutoSaveData, CloudDraftStatus } from '../../hooks/useScheduleAutoSave';
import { APP_VERSION } from '../../version';

export interface SaveData {
  schedules: Record<string, Schedule>;
  employees: Employee[];
  weekNumber: number;
  year: number;
  colorLabels: ColorLabel[];
}

export type WeeksMap = Record<string, Record<string, Schedule>>;

interface FileMenuProps {
  onRestore: (savedSchedule: SavedSchedule, weeks?: WeeksMap) => void;
  onSave: () => Promise<SaveData>;
  onNewSchedule?: () => void;
  autoSaveTimestamp: string | null;
  showAutoSaveIndicator: boolean;
  /** État de l'envoi du brouillon vers le cloud */
  cloudDraftStatus: CloudDraftStatus;
  /**
   * Appelé une fois la recherche d'un brouillon plus récent terminée
   * (récupéré ou ignoré). Tant qu'il n'a pas été appelé, l'application
   * n'écrase pas le brouillon en ligne.
   */
  onCloudDraftChecked: () => void;
  /**
   * Contrôles de planning (semaine, effectif, annuler/rétablir) affichés dans
   * la barre fixe. Ils vivent dans App, qui détient leur état ; les loger ici
   * évite un bandeau supplémentaire sous l'en-tête.
   */
  children?: React.ReactNode;
}

/** Écart en dessous duquel deux brouillons sont considérés équivalents. */
const DRAFT_TOLERANCE_MS = 5000;

const formatAutoSaveTime = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} a ${pad(d.getHours())}h${pad(d.getMinutes())}`;
};

const formatTimestamp = (timestamp?: Timestamp | null): string => {
  if (!timestamp?.toDate) return 'date inconnue';
  return formatAutoSaveTime(timestamp.toDate().toISOString());
};

const FileMenu: React.FC<FileMenuProps> = ({
  children,
  onRestore,
  onSave,
  onNewSchedule,
  autoSaveTimestamp,
  showAutoSaveIndicator,
  cloudDraftStatus,
  onCloudDraftChecked,
}) => {
  const { user, isAdmin, signOut } = useAuth();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<SavedSchedule | null>(null);
  const [saveName, setSaveName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [pendingLocalCount, setPendingLocalCount] = useState(0);
  // Sauvegarde refusée car le planning a changé en ligne entre-temps
  const [conflict, setConflict] = useState<{
    schedule: SavedSchedule;
    name: string;
    remoteUpdatedAt: Timestamp | null;
  } | null>(null);
  // Brouillon plus récent trouvé en ligne (autre poste)
  const [incomingDraft, setIncomingDraft] = useState<CloudDraft | null>(null);

  const loadSavedSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setWarnings([]);

      const result = await getSchedules();
      setSavedSchedules(result.schedules);
      setPendingLocalCount(result.schedules.filter(s => s.isLocal).length);

      if (result.warnings) {
        setWarnings(result.warnings);
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
      setError("Erreur lors du chargement des sauvegardes");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Remonte en ligne les sauvegardes restées sur ce PC. */
  const runSync = useCallback(async (silent = false) => {
    setSyncing(true);
    try {
      const result = await syncLocalSchedules();
      if (result.synced > 0) {
        setSuccess(
          result.synced === 1
            ? '1 sauvegarde locale envoyée en ligne'
            : `${result.synced} sauvegardes locales envoyées en ligne`
        );
      } else if (!silent && result.pending > 0) {
        setWarnings([
          result.pending === 1
            ? '1 sauvegarde est encore sur ce PC uniquement'
            : `${result.pending} sauvegardes sont encore sur ce PC uniquement`
        ]);
      }
      return result;
    } finally {
      setSyncing(false);
    }
  }, []);

  // Fermeture du menu « Ouvrir » au clic extérieur
  useEffect(() => {
    if (!showFileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setShowFileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFileMenu]);

  // Au démarrage : on synchronise d'abord, puis on affiche la liste (elle
  // reflète ainsi le résultat de la synchronisation).
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      await runSync(true);
      if (!cancelled) await loadSavedSchedules();
    };
    start();
    return () => { cancelled = true; };
  }, [runSync, loadSavedSchedules]);

  // Retour de la connexion : nouvelle tentative d'envoi.
  useEffect(() => {
    const onOnline = async () => {
      const result = await runSync(true);
      if (result.synced > 0) await loadSavedSchedules();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runSync, loadSavedSchedules]);

  // Recherche d'un brouillon plus récent laissé sur un autre poste.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user?.uid) {
        onCloudDraftChecked();
        return;
      }

      const draft = await loadCloudDraft(user.uid);
      if (cancelled) return;

      const local = loadScheduleAutoSave();
      const localTime = local ? new Date(local.timestamp).getTime() : 0;
      const draftTime = draft ? new Date(draft.timestamp).getTime() : 0;
      const fromOtherDevice = !!draft && draft.deviceId !== getDeviceId();
      const isNewer = draftTime > localTime + DRAFT_TOLERANCE_MS;

      if (draft && fromOtherDevice && isNewer) {
        setIncomingDraft(draft);
      } else {
        onCloudDraftChecked();
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user?.uid, onCloudDraftChecked]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  /**
   * Enregistre le planning courant.
   * @param target sauvegarde à écraser, ou null pour en créer une nouvelle
   * @param force  écraser malgré une modification concurrente détectée
   */
  const performSave = async (name: string, target: SavedSchedule | null, force = false) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const data = await onSave();
      const validation = validateSaveData(data);

      if (!validation.isValid) {
        setError(validation.error || 'Donnees invalides');
        return;
      }

      const result = target
        ? await updateSchedule(
            target.id,
            name,
            data.schedules,
            data.employees,
            data.weekNumber,
            data.year,
            data.colorLabels,
            { expectedUpdatedAt: target.updatedAt || target.createdAt, force }
          )
        : await saveSchedule(
            name,
            data.schedules,
            data.employees,
            data.weekNumber,
            data.year,
            data.colorLabels
          );

      // Modifié ailleurs : on demande confirmation au lieu d'écraser.
      if (result.conflict && target) {
        setConflict({ schedule: target, name, remoteUpdatedAt: result.conflict.remoteUpdatedAt });
        return;
      }

      // Une écriture mise en file d'attente hors ligne reste une réussite :
      // seul un échec franc doit remonter en erreur.
      if (result.error && !result.queued) {
        if (!result.id.startsWith('local_')) {
          setError(result.error);
          return;
        }
      }

      setSelectedSchedule({
        id: result.id,
        name,
        schedules: data.schedules,
        employees: data.employees,
        weekNumber: data.weekNumber,
        year: data.year,
        colorLabels: data.colorLabels,
        createdAt: target?.createdAt || result.updatedAt || Timestamp.now(),
        updatedAt: result.updatedAt,
        isLocal: result.id.startsWith('local_'),
      });

      setSuccess(
        result.id.startsWith('local_')
          ? 'Sauvegarde enregistrée sur ce PC'
          : 'Sauvegarde effectuee avec succes'
      );

      await loadSavedSchedules();
      if (result.error) setWarnings(prev => [...prev, result.error!]);
    } catch (error) {
      console.error("Error saving:", error);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
      setShowSaveAsDialog(false);
      setSaveName('');
    }
  };

  const handleSave = (name: string, scheduleToUpdate?: SavedSchedule) =>
    performSave(name, scheduleToUpdate || null);

  const handleQuickSave = () => {
    if (!selectedSchedule) {
      setShowSaveAsDialog(true);
      return;
    }
    return performSave(selectedSchedule.name, selectedSchedule);
  };

  const handleForceSave = () => {
    if (!conflict) return;
    const { schedule, name } = conflict;
    setConflict(null);
    performSave(name, schedule, true);
  };

  const handleRestore = (schedule: SavedSchedule) => {
    setSelectedSchedule(schedule);
    onRestore(schedule);
    setShowRestoreDialog(false);
    setSuccess('Planning restaure avec succes');
  };

  const handleRestoreAutoSave = (autoSave: ScheduleAutoSaveData) => {
    const pseudoSchedule: SavedSchedule = {
      id: '__autosave__',
      name: 'Brouillon (auto-sauvegarde)',
      schedules: autoSave.schedules,
      employees: autoSave.employees,
      weekNumber: autoSave.weekNumber,
      year: autoSave.year,
      colorLabels: [],
      createdAt: Timestamp.now(),
    };
    setSelectedSchedule(null);
    onRestore(pseudoSchedule, autoSave.weeks);
    setShowRestoreDialog(false);
    setSuccess('Brouillon auto-sauvegarde restaure');
  };

  const handleAcceptIncomingDraft = () => {
    if (!incomingDraft) return;
    const pseudoSchedule: SavedSchedule = {
      id: '__cloud_draft__',
      name: `Brouillon de ${incomingDraft.deviceLabel}`,
      schedules: incomingDraft.schedules,
      employees: incomingDraft.employees,
      weekNumber: incomingDraft.weekNumber,
      year: incomingDraft.year,
      colorLabels: [],
      createdAt: Timestamp.now(),
    };
    setSelectedSchedule(null);
    onRestore(pseudoSchedule, incomingDraft.weeks);
    if (incomingDraft.truncated) {
      setWarnings(['Brouillon volumineux : seule la semaine affichée a été récupérée']);
    }
    setIncomingDraft(null);
    onCloudDraftChecked();
    setSuccess('Brouillon récupéré depuis l\'autre poste');
  };

  const handleIgnoreIncomingDraft = () => {
    setIncomingDraft(null);
    onCloudDraftChecked();
  };

  const handleDelete = async (schedule: SavedSchedule) => {
    try {
      setLoading(true);
      setError(null);
      const result = await deleteSchedule(schedule.id);
      if (result.error) {
        setError(result.error);
      } else {
        if (selectedSchedule?.id === schedule.id) {
          setSelectedSchedule(null);
        }
        setSuccess('Sauvegarde supprimee avec succes');
        await loadSavedSchedules();
      }
    } catch (error) {
      console.error("Error deleting:", error);
      setError("Erreur lors de la suppression");
    } finally {
      setLoading(false);
      setScheduleToDelete(null);
    }
  };

  const handleNewSchedule = () => {
    if (onNewSchedule) {
      onNewSchedule();
      setSelectedSchedule(null);
      setSuccess('Nouveau planning cree');
    }
  };

  const autoSaveData = showRestoreDialog ? loadScheduleAutoSave() : null;

  const localBadge = (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 whitespace-nowrap"
      title="Cette sauvegarde n'existe que sur ce PC : elle partira en ligne dès que possible"
    >
      <HardDrive className="w-3 h-3" />
      Local - non synchronise
    </span>
  );

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-[95%] mx-auto px-4 py-2 flex items-center gap-3">
          {/* Identité — réduite au strict nécessaire pour libérer la ligne */}
          <div className="flex items-baseline gap-1.5 flex-none">
            <h1 className="text-base font-semibold text-gray-900 whitespace-nowrap">Planning</h1>
            <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
              v{APP_VERSION}
            </span>
          </div>

          {/* État de sauvegarde : une pastille, le détail dans l'infobulle */}
          <div className="flex items-center gap-1 flex-none">
            <span
              title={
                showAutoSaveIndicator
                  ? 'Sauvegarde auto effectuee'
                  : autoSaveTimestamp
                    ? `Sauvegarde auto : ${formatAutoSaveTime(autoSaveTimestamp)}`
                    : 'Aucune sauvegarde auto pour le moment'
              }
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-500 ${
                showAutoSaveIndicator
                  ? 'text-emerald-600 bg-emerald-50'
                  : autoSaveTimestamp
                    ? 'text-gray-400 bg-gray-50'
                    : 'text-gray-300'
              }`}
            >
              {showAutoSaveIndicator ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            </span>

            {cloudDraftStatus !== 'off' && (
              <span
                title={
                  cloudDraftStatus === 'synced'
                    ? 'Brouillon disponible depuis vos autres PC'
                    : cloudDraftStatus === 'saving'
                      ? 'Envoi du brouillon en cours'
                      : 'Brouillon non envoye : il reste sur ce PC'
                }
                className={`flex items-center justify-center w-6 h-6 rounded-full ${
                  cloudDraftStatus === 'synced'
                    ? 'text-sky-600 bg-sky-50'
                    : cloudDraftStatus === 'saving'
                      ? 'text-gray-500 bg-gray-50'
                      : 'text-amber-600 bg-amber-50'
                }`}
              >
                {cloudDraftStatus === 'synced' ? (
                  <Cloud className="w-3.5 h-3.5" />
                ) : cloudDraftStatus === 'saving' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5" />
                )}
              </span>
            )}

            {pendingLocalCount > 0 && (
              <button
                onClick={async () => { const r = await runSync(); if (r.synced > 0) await loadSavedSchedules(); }}
                disabled={syncing}
                title={`${pendingLocalCount} sauvegarde(s) restée(s) sur ce PC — cliquer pour les envoyer`}
                className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {pendingLocalCount}
              </button>
            )}
          </div>

          {selectedSchedule && (
            <span
              className="hidden 2xl:flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[16rem] flex-none"
              title={`Planning actuel : ${selectedSchedule.name}`}
            >
              <span className="font-medium text-gray-700 truncate">{selectedSchedule.name}</span>
              {selectedSchedule.isLocal && localBadge}
            </span>
          )}

          <div className="w-px h-6 bg-gray-200 flex-none" aria-hidden="true" />

          {/* Contrôles de planning fournis par App (semaine, effectif, historique) */}
          {children}

          <div className="flex-1 min-w-2" />

          {/* Actions fichier */}
          <div className="flex items-center gap-1.5 flex-none">
            <button
              onClick={handleNewSchedule}
              disabled={loading}
              title="Nouveau planning"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <FilePlus className="w-4 h-4" />
              <span className="hidden 2xl:inline">Nouveau</span>
            </button>

            <button
              onClick={handleQuickSave}
              disabled={loading}
              title="Sauvegarder"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <Save className="w-4 h-4" />
              <span className="hidden lg:inline">Sauvegarder</span>
            </button>

            {/* « Ouvrir » et « Enregistrer sous… » partagent un menu : deux
                actions peu fréquentes n'ont pas à occuper deux boutons. */}
            <div className="relative" ref={fileMenuRef}>
              <button
                onClick={() => setShowFileMenu(v => !v)}
                disabled={loading}
                title="Ouvrir ou enregistrer sous un autre nom"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="hidden lg:inline">Ouvrir</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showFileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showFileMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <button
                    onClick={() => { setShowFileMenu(false); setShowRestoreDialog(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    Ouvrir un planning...
                  </button>
                  <button
                    onClick={() => { setShowFileMenu(false); loadSavedSchedules(); setShowSaveAsDialog(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                    Enregistrer sous...
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-200 mx-0.5" aria-hidden="true" />

            {isAdmin && (
              <button
                onClick={() => setShowUserManagement(true)}
                title="Gérer les utilisateurs autorisés"
                className="flex items-center justify-center w-8 h-8 bg-white text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-300 shadow-sm transition-all duration-150"
              >
                <Users className="w-4 h-4" />
              </button>
            )}

            <div
              className="flex items-center gap-1 pl-1.5 pr-1 py-1 bg-gray-50 border border-gray-200 rounded-lg"
              title={user?.email || ''}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${
                  isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
              </span>
              <button
                onClick={signOut}
                title="Se déconnecter"
                className="flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />

      <div className="fixed top-14 left-0 right-0 z-40 px-4">
        <div className="max-w-[95%] mx-auto">
          {error && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-slideIn">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-600">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Brouillon plus récent trouvé sur un autre poste */}
      {incomingDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[520px] animate-scaleIn">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-sky-500" />
              <h2 className="text-lg font-semibold text-gray-900">Brouillon plus recent disponible</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Un brouillon plus recent a ete laisse sur{' '}
                <span className="font-semibold text-gray-900">{incomingDraft.deviceLabel}</span>{' '}
                le {formatAutoSaveTime(incomingDraft.timestamp)}.
              </p>
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm text-gray-700">
                <div>Semaine {incomingDraft.weekNumber} - {incomingDraft.year}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {incomingDraft.employees?.length || 0} employes
                  {incomingDraft.weeks && ` - ${Object.keys(incomingDraft.weeks).length} semaine(s)`}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Le recuperer remplacera le planning actuellement affiche sur ce PC.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={handleIgnoreIncomingDraft}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Ignorer
              </button>
              <button
                onClick={handleAcceptIncomingDraft}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 active:bg-sky-800 shadow-sm transition-all duration-150"
              >
                Recuperer le brouillon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sauvegarde refusée : modification concurrente */}
      {conflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[520px] animate-scaleIn">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">Modifie ailleurs entre-temps</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                La sauvegarde <span className="font-semibold text-gray-900">"{conflict.name}"</span> a ete
                modifiee en ligne le {formatTimestamp(conflict.remoteUpdatedAt)}, depuis un autre PC ou par
                un autre utilisateur.
              </p>
              <p className="text-sm text-gray-600">
                Ecraser remplacera cette version par celle affichee ici. Pour repartir de la version en
                ligne, annulez puis utilisez <span className="font-medium">Ouvrir</span>.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setConflict(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleForceSave}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 active:bg-orange-800 shadow-sm transition-all duration-150"
              >
                Ecraser quand meme
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveAsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[80vh] flex flex-col animate-scaleIn">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Enregistrer sous</h2>
              <button
                onClick={() => setShowSaveAsDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouvelle sauvegarde
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-sem-${String(getCurrentWeekNumber()).padStart(2, '0')}_${String(new Date().getHours()).padStart(2, '0')}-${String(new Date().getMinutes()).padStart(2, '0')}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave(saveName || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-sem-${String(getCurrentWeekNumber()).padStart(2, '0')}_${String(new Date().getHours()).padStart(2, '0')}-${String(new Date().getMinutes()).padStart(2, '0')}`)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150 whitespace-nowrap"
                  >
                    Creer
                  </button>
                </div>
              </div>

              {savedSchedules.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ou ecraser une sauvegarde existante
                  </label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {savedSchedules.map((schedule) => (
                      <button
                        key={schedule.id}
                        onClick={() => handleSave(schedule.name, schedule)}
                        disabled={loading}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all duration-150 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-900 truncate">{schedule.name}</span>
                          <span className="text-xs text-orange-600 font-medium">Ecraser</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            Semaine {schedule.weekNumber} - {schedule.year}
                          </span>
                          {schedule.isLocal && localBadge}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowSaveAsDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[400px] animate-scaleIn">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Voulez-vous vraiment supprimer la sauvegarde <span className="font-semibold text-gray-900">"{scheduleToDelete.name}"</span> ?
              </p>
              <p className="text-xs text-red-500 mt-2">Cette action est irreversible.</p>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(scheduleToDelete)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col animate-scaleIn">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Ouvrir un planning</h2>
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {autoSaveData && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">Brouillon auto-sauvegarde</span>
                  </div>
                  <button
                    onClick={() => handleRestoreAutoSave(autoSaveData)}
                    className="w-full p-4 text-left border-2 border-amber-200 bg-amber-50 rounded-lg hover:border-amber-400 hover:bg-amber-100 transition-all duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">
                        Dernier brouillon en cours
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3" />
                        Auto
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Semaine {autoSaveData.weekNumber} - {autoSaveData.year}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {autoSaveData.employees?.length || 0} employes
                      </span>
                      <span className="text-xs text-amber-500">
                        Sauvegarde le {formatAutoSaveTime(autoSaveData.timestamp)}
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {savedSchedules.length === 0 && !autoSaveData ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucun planning sauvegarde</p>
              ) : savedSchedules.length > 0 && (
                <div>
                  {autoSaveData && (
                    <div className="flex items-center gap-2 mb-2">
                      <Save className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">Sauvegardes manuelles</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {savedSchedules.map((schedule) => (
                      <div key={schedule.id} className="flex items-stretch gap-2">
                        <button
                          onClick={() => handleRestore(schedule)}
                          className="flex-1 p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-150"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-900 truncate">{schedule.name}</span>
                            {schedule.isLocal ? localBadge : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5 whitespace-nowrap"
                                title="Disponible depuis tous vos PC"
                              >
                                <Cloud className="w-3 h-3" />
                                En ligne
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Semaine {schedule.weekNumber} - {schedule.year}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {schedule.employees?.length || 0} employes
                            {schedule.updatedAt && ` - modifie le ${formatTimestamp(schedule.updatedAt)}`}
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setScheduleToDelete(schedule); }}
                          className="flex items-center justify-center px-3 border border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-150"
                          title="Supprimer cette sauvegarde"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileMenu;

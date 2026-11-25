import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, FolderOpen, FilePlus, AlertCircle, Check, AlertTriangle, Clock, Users, LogOut, ShieldCheck, User as UserIcon, Cloud, CloudOff, RefreshCw, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { getSchedules, saveNewVersion, deleteSchedule, renameAllSchedules, MAX_VERSIONS_PER_WEEK } from '../../utils/firebase';
import { syncLocalSchedules } from '../../utils/firebase/sync';
import { loadCloudDraft, CloudDraft } from '../../utils/firebase/drafts';
import { getDeviceId } from '../../utils/storage/device';
import { useAuth } from '../../hooks/useAuth';
import UserManagementModal from '../Auth/UserManagementModal';
import { SavedSchedule, Schedule, Employee, ColorLabel } from '../../types';
import { isCanonicalScheduleName } from '../../utils/dateUtils';
import { validateSaveData } from '../../utils/validation';
import { loadScheduleAutoSave, ScheduleAutoSaveData, CloudDraftStatus } from '../../hooks/useScheduleAutoSave';
import { APP_VERSION } from '../../version';
import { formatAutoSaveTime } from './formatters';
import LocalBadge from './LocalBadge';
import IncomingDraftDialog from './dialogs/IncomingDraftDialog';
import DeleteScheduleDialog from './dialogs/DeleteScheduleDialog';
import RestoreDialog from './dialogs/RestoreDialog';
import RenameAllDialog from './dialogs/RenameAllDialog';
import HistoryImportDialog from '../History/HistoryImportDialog';

export interface SaveData {
  schedules: Record<string, Schedule>;
  employees: Employee[];
  weekNumber: number;
  year: number;
  colorLabels: ColorLabel[];
}

export type WeeksMap = Record<string, Record<string, Schedule>>;

interface FileMenuProps {
  onRestore: (savedSchedule: SavedSchedule, weeks?: WeeksMap, weekEmployees?: Record<string, Employee[]>) => void;
  onSave: () => Promise<SaveData>;
  onNewSchedule?: () => void;
  /**
   * Semaine et année du planning affiché : elles nomment la sauvegarde. Se
   * fier à la date du jour donnait un nom faux dès qu'on préparait une
   * semaine à l'avance ou qu'on reprenait une semaine passée.
   */
  weekNumber: number;
  year: number;
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

const FileMenu: React.FC<FileMenuProps> = ({
  children,
  onRestore,
  onSave,
  onNewSchedule,
  weekNumber,
  year,
  autoSaveTimestamp,
  showAutoSaveIndicator,
  cloudDraftStatus,
  onCloudDraftChecked,
}) => {
  const { user, isAdmin, signOut } = useAuth();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showHistoryImport, setShowHistoryImport] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<SavedSchedule | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingLocalCount, setPendingLocalCount] = useState(0);
  // Brouillon plus récent trouvé en ligne (autre poste)
  const [incomingDraft, setIncomingDraft] = useState<CloudDraft | null>(null);
  // Renommage en masse des anciennes sauvegardes au format standard
  const [showRenameAllDialog, setShowRenameAllDialog] = useState(false);
  const [renaming, setRenaming] = useState(false);

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
   * Enregistre le planning de la semaine affichée comme NOUVELLE version
   * (« 2026-S48-v4 ») : rien n'est jamais écrasé ; au-delà de
   * MAX_VERSIONS_PER_WEEK versions, les plus anciennes sont supprimées.
   */
  const handleQuickSave = async () => {
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

      const result = await saveNewVersion(
        data.schedules,
        data.employees,
        data.weekNumber,
        data.year,
        data.colorLabels,
        user?.email || undefined
      );

      // Une écriture mise en file d'attente hors ligne reste une réussite :
      // seul un échec franc doit remonter en erreur.
      if (result.error && !result.queued && !result.id.startsWith('local_')) {
        setError(result.error);
        return;
      }

      // Une version plus récente que celle ouverte a été enregistrée ailleurs
      // entre-temps : rien n'est perdu (nouvelle version), mais on le signale
      const openedId = openSchedule?.id;
      const savedElsewhere =
        !!result.previousLatest && !!openedId && result.previousLatest.id !== openedId;

      setSelectedSchedule({
        id: result.id,
        name: result.name,
        schedules: data.schedules,
        employees: data.employees,
        weekNumber: data.weekNumber,
        year: data.year,
        colorLabels: data.colorLabels,
        createdAt: result.updatedAt || Timestamp.now(),
        updatedAt: result.updatedAt,
        isLocal: result.id.startsWith('local_'),
        savedBy: user?.email || undefined,
      });

      const where = result.id.startsWith('local_') ? ' sur ce PC' : '';
      const pruned = result.pruned > 0
        ? ` (${result.pruned} ancienne${result.pruned > 1 ? 's' : ''} version${result.pruned > 1 ? 's' : ''} supprimée${result.pruned > 1 ? 's' : ''} : ${MAX_VERSIONS_PER_WEEK} maximum par semaine)`
        : '';
      setSuccess(`${result.name} enregistrée${where}${pruned}`);
      if (savedElsewhere && result.previousLatest) {
        setWarnings(prev => [
          ...prev,
          `${result.previousLatest!.name} avait été enregistrée entre-temps (autre poste) : elle est conservée, votre planning est en ${result.name}.`,
        ]);
      }

      await loadSavedSchedules();
      if (result.error) setWarnings(prev => [...prev, result.error!]);
    } catch (error) {
      console.error("Error saving:", error);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  // La sauvegarde ouverte ne correspond qu'à SA semaine
  const openSchedule =
    selectedSchedule && selectedSchedule.weekNumber === weekNumber && selectedSchedule.year === year
      ? selectedSchedule
      : null;

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
    onRestore(pseudoSchedule, autoSave.weeks, autoSave.weekEmployees);
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
    onRestore(pseudoSchedule, incomingDraft.weeks, incomingDraft.weekEmployees);
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

  /** Aligne toutes les sauvegardes existantes sur le format standard. */
  const handleRenameAll = async () => {
    try {
      setRenaming(true);
      setError(null);
      const result = await renameAllSchedules();

      if (result.renamed > 0) {
        setSuccess(
          result.renamed === 1
            ? '1 sauvegarde renommee au format standard'
            : `${result.renamed} sauvegardes renommees au format standard`
        );
      } else if (result.failed === 0) {
        setSuccess('Toutes les sauvegardes sont deja au format standard');
      }

      if (result.failed > 0) {
        setError(
          `${result.failed} sauvegarde(s) n'ont pas pu etre renommees${result.error ? ` - ${result.error}` : ''}`
        );
      }

      // La sauvegarde ouverte a pu changer de nom : on recharge la liste et
      // on resynchronise le libellé affiché dans la barre.
      const refreshed = await getSchedules();
      setSavedSchedules(refreshed.schedules);
      setPendingLocalCount(refreshed.schedules.filter(s => s.isLocal).length);
      setSelectedSchedule(prev => {
        if (!prev) return prev;
        const match = refreshed.schedules.find(s => s.id === prev.id);
        // `updatedAt` a bouge avec le renommage : sans cette remise a jour,
        // la sauvegarde suivante croirait a une modification concurrente.
        return match ? { ...prev, name: match.name, updatedAt: match.updatedAt } : prev;
      });
    } catch (error) {
      console.error('Error renaming schedules:', error);
      setError('Erreur lors du renommage des sauvegardes');
    } finally {
      setRenaming(false);
      setShowRenameAllDialog(false);
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

  const outdatedNameCount = savedSchedules.filter(s => !isCanonicalScheduleName(s.name)).length;

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

          {openSchedule && (
            <span
              className="hidden 2xl:flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[16rem] flex-none"
              title={`Planning actuel : ${openSchedule.name}`}
            >
              <span className="font-medium text-gray-700 truncate">{openSchedule.name}</span>
              {openSchedule.isLocal && <LocalBadge />}
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
              title="Enregistrer une nouvelle version de cette semaine (AAAA-Sxx-vN)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              <Save className="w-4 h-4" />
              <span className="hidden lg:inline">Sauvegarder</span>
            </button>

            {/* Menu « Ouvrir » (et import de l'historique pour les admins) */}
            <div className="relative" ref={fileMenuRef}>
              <button
                onClick={() => setShowFileMenu(v => !v)}
                disabled={loading}
                title="Ouvrir une sauvegarde"
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
                  {isAdmin && (
                    <button
                      onClick={() => { setShowFileMenu(false); setShowHistoryImport(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Importer l'historique Excel...
                    </button>
                  )}
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

      {showHistoryImport && <HistoryImportDialog onClose={() => setShowHistoryImport(false)} />}

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
        <IncomingDraftDialog
          draft={incomingDraft}
          onIgnore={handleIgnoreIncomingDraft}
          onAccept={handleAcceptIncomingDraft}
        />
      )}

      {scheduleToDelete && (
        <DeleteScheduleDialog
          schedule={scheduleToDelete}
          loading={loading}
          onCancel={() => setScheduleToDelete(null)}
          onConfirm={() => handleDelete(scheduleToDelete)}
        />
      )}

      {showRestoreDialog && (
        <RestoreDialog
          autoSaveData={autoSaveData}
          savedSchedules={savedSchedules}
          outdatedNameCount={outdatedNameCount}
          renaming={renaming}
          onRestoreAutoSave={handleRestoreAutoSave}
          onRestore={handleRestore}
          onAskDelete={setScheduleToDelete}
          onAskRenameAll={() => setShowRenameAllDialog(true)}
          onClose={() => setShowRestoreDialog(false)}
        />
      )}

      {/* Renommage en masse : action groupee, donc confirmee */}
      {showRenameAllDialog && (
        <RenameAllDialog
          outdatedNameCount={outdatedNameCount}
          renaming={renaming}
          onCancel={() => setShowRenameAllDialog(false)}
          onConfirm={handleRenameAll}
        />
      )}
    </>
  );
};

export default FileMenu;

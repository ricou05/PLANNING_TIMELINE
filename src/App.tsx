import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Clock, Calendar, FileSpreadsheet, Download, Plus, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, Undo2, Redo2, CopyPlus } from 'lucide-react';
import WeeklySchedule from './components/WeeklySchedule';
import WeeklyGridView from './components/WeeklyGridView';
import WeeklyVisualView from './components/WeeklyVisualView';
import TimelineView from './components/TimelineView';
import ExcelView from './components/ExcelView';
import FileMenu from './components/FileMenu/FileMenu';
import DisplaySettingsMenu, { DisplaySettings, DEFAULT_DISPLAY_SETTINGS } from './components/DisplaySettingsMenu';
import CSVImport from './components/CSVImport';
import ColorManagementModal from './components/ColorManagementModal';
import ShiftTemplateModal from './components/ShiftTemplateModal';
import { Employee, Schedule, SavedSchedule, ShiftTemplate, AbsencePeriod } from './types';
import { getCurrentWeekNumber, getCurrentWeekYear, getWeekDates, getWeeksInYear, formatDate } from './utils/dateUtils';
import { loadEmployeeOrder, saveEmployeeOrder } from './utils/employeeUtils';
import { useManagedColors } from './hooks/useManagedColors';
import { useShiftTemplates } from './hooks/useShiftTemplates';
import { useScheduleAutoSave, loadScheduleAutoSave } from './hooks/useScheduleAutoSave';
import { useUndoRedo } from './hooks/useUndoRedo';
import { downloadCSV } from './utils/csvExport';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const weekKeyOf = (year: number, weekNumber: number): string =>
  `${year}-S${String(weekNumber).padStart(2, '0')}`;

const autoSaved = loadScheduleAutoSave();

const CSVExportButton: React.FC<{ onExport: (withColors: boolean) => void }> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 active:bg-teal-800 shadow-sm transition-all duration-150"
      >
        <Download className="w-5 h-5" />
        <span>Exporter CSV</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <button
            onClick={() => { onExport(false); setIsOpen(false); }}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            Sans couleurs
          </button>
          <button
            onClick={() => { onExport(true); setIsOpen(false); }}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Avec couleurs
          </button>
        </div>
      )}
    </div>
  );
};

function App() {
  const { schedules, setSchedules, resetSchedules, undo, redo, canUndo, canRedo } = useUndoRedo(autoSaved?.schedules || {});
  const [activeTab, setActiveTab] = useState<'grid' | 'weekly' | 'excel' | string>('grid');
  const [weekNumber, setWeekNumber] = useState(autoSaved?.weekNumber || getCurrentWeekNumber());
  const [year, setYear] = useState(autoSaved?.year || getCurrentWeekYear());
  // Plannings des autres semaines (la semaine affichée vit dans `schedules`)
  const weeksRef = useRef<Record<string, Record<string, Schedule>>>(autoSaved?.weeks || {});
  const [employeeCount, setEmployeeCount] = useState(autoSaved?.employees?.length || 10);
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (autoSaved?.employees?.length) return autoSaved.employees;
    const initialEmployees = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `Employe ${index + 1}`,
    }));
    return loadEmployeeOrder(initialEmployees);
  });
  const { managedColors, saveColors, autoSaveColors, lastAutoSave } = useManagedColors();
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [copiedDay, setCopiedDay] = useState<string | null>(null);
  const [copiedDaySchedules, setCopiedDaySchedules] = useState<Record<string, Schedule> | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  // Options d'affichage (police, largeur de colonnes) : session uniquement, non persistées
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const { templates, saveTemplates } = useShiftTemplates();
  const weekDates = getWeekDates(weekNumber, year);
  const weekKey = weekKeyOf(year, weekNumber);

  // Toutes les semaines, y compris celle en cours d'édition (pour l'auto-sauvegarde)
  const allWeeks = useMemo(
    () => ({ ...weeksRef.current, [weekKey]: schedules }),
    [weekKey, schedules]
  );
  const scheduleAutoSave = useScheduleAutoSave(schedules, employees, weekNumber, year, allWeeks);

  // Change de semaine affichée : mémorise la semaine courante puis charge la nouvelle
  const switchToWeek = useCallback((newWeek: number, newYear: number) => {
    weeksRef.current = { ...weeksRef.current, [weekKeyOf(year, weekNumber)]: schedules };
    resetSchedules(weeksRef.current[weekKeyOf(newYear, newWeek)] || {});
    setWeekNumber(newWeek);
    setYear(newYear);
  }, [schedules, weekNumber, year, resetSchedules]);

  const goToPreviousWeek = () => {
    if (weekNumber > 1) switchToWeek(weekNumber - 1, year);
    else switchToWeek(getWeeksInYear(year - 1), year - 1);
  };

  const goToNextWeek = () => {
    if (weekNumber < getWeeksInYear(year)) switchToWeek(weekNumber + 1, year);
    else switchToWeek(1, year + 1);
  };

  // Copie le planning de la semaine précédente dans la semaine affichée (annulable)
  const duplicatePreviousWeek = () => {
    const prevKey = weekNumber > 1
      ? weekKeyOf(year, weekNumber - 1)
      : weekKeyOf(year - 1, getWeeksInYear(year - 1));
    const prevSchedules = weeksRef.current[prevKey];
    if (!prevSchedules || Object.keys(prevSchedules).length === 0) {
      alert(`Aucune donnée trouvée pour la semaine précédente (${prevKey}).`);
      return;
    }
    if (Object.keys(schedules).length === 0 ||
        window.confirm('Remplacer le planning de cette semaine par celui de la semaine précédente ?')) {
      setSchedules({ ...prevSchedules });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1970 && value <= 2100) {
      switchToWeek(Math.min(weekNumber, getWeeksInYear(value)), value);
    }
  };

  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= getWeeksInYear(year)) {
      switchToWeek(value, year);
    }
  };

  const handleEmployeeCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= 100) {
      setEmployeeCount(value);
      setEmployees(prev => {
        if (value <= prev.length) {
          return prev.slice(0, value);
        }
        const maxId = prev.reduce((max, emp) => Math.max(max, emp.id), 0);
        const added = Array.from({ length: value - prev.length }, (_, index) => ({
          id: maxId + index + 1,
          name: `Employe ${maxId + index + 1}`,
        }));
        return [...prev, ...added];
      });
    }
  };

  const handleAddEmployee = () => {
    const maxId = employees.reduce((max, emp) => Math.max(max, emp.id), 0);
    const newEmployee: Employee = {
      id: maxId + 1,
      name: `Employe ${maxId + 1}`,
    };
    setEmployees(prev => [...prev, newEmployee]);
    setEmployeeCount(prev => prev + 1);
  };

  // Applique plusieurs champs d'un coup : une seule entrée dans l'historique undo/redo.
  // Saisir un horaire sur une demi-journée lève l'absence posée sur cette demi-journée.
  const handleSchedulePatch = useCallback((employeeId: number, day: string, patch: Partial<Schedule>) => {
    setSchedules(prev => {
      const merged = { ...prev[`${employeeId}-${day}`], ...patch };
      if ((patch.morningStart || patch.morningEnd) && !('morningAbsence' in patch)) {
        merged.morningAbsence = undefined;
      }
      if ((patch.afternoonStart || patch.afternoonEnd) && !('afternoonAbsence' in patch)) {
        merged.afternoonAbsence = undefined;
      }
      return { ...prev, [`${employeeId}-${day}`]: merged };
    });
  }, [setSchedules]);

  const handleEmployeeNameChange = (id: number, newName: string) => {
    setEmployees(prev => {
      const newEmployees = prev.map(emp =>
        emp.id === id ? { ...emp, name: newName } : emp
      );
      return newEmployees;
    });
  };

  const handleEmployeeReorder = (reorderedEmployees: Employee[]) => {
    setEmployees(reorderedEmployees);
    saveEmployeeOrder(reorderedEmployees);
  };

  const handleEmployeeDelete = (id: number) => {
    if (!window.confirm(`Etes-vous sur de vouloir supprimer cet employe ?`)) {
      return;
    }

    setEmployees(prev => prev.filter(emp => emp.id !== id));

    setSchedules(prev => {
      const newSchedules = { ...prev };
      Object.keys(newSchedules).forEach(key => {
        if (key.startsWith(`${id}-`)) {
          delete newSchedules[key];
        }
      });
      return newSchedules;
    });
  };

  const handleCSVImport = (data: { employees: Employee[], schedules: Record<string, Schedule> }) => {
    setEmployees(data.employees);
    setSchedules(prev => ({
      ...prev,
      ...data.schedules
    }));
  };

  const handleToggleRestDay = useCallback((employeeId: number, day: string, isRest: boolean) => {
    setSchedules(prev => {
      const key = `${employeeId}-${day}`;
      if (isRest) {
        return {
          ...prev,
          [key]: {
            morningStart: '',
            morningEnd: '',
            afternoonStart: '',
            afternoonEnd: '',
            morningColor: undefined,
            afternoonColor: undefined,
            isRestDay: true,
          }
        };
      }
      const previous = prev[key];
      return {
        ...prev,
        [key]: {
          morningStart: previous?.morningStart ?? '',
          morningEnd: previous?.morningEnd ?? '',
          afternoonStart: previous?.afternoonStart ?? '',
          afternoonEnd: previous?.afternoonEnd ?? '',
          morningColor: previous?.morningColor,
          afternoonColor: previous?.afternoonColor,
          isRestDay: false,
        }
      };
    });
  }, [setSchedules]);

  // Applique un modèle de créneaux sur une journée (fallbackColor = couleur sélectionnée dans la vue)
  const handleApplyTemplate = useCallback((employeeId: number, day: string, template: ShiftTemplate, fallbackColor: string) => {
    const color = template.color || fallbackColor;
    const hasMorning = template.morningStart && template.morningEnd;
    const hasAfternoon = template.afternoonStart && template.afternoonEnd;
    handleSchedulePatch(employeeId, day, {
      morningStart: template.morningStart,
      morningEnd: template.morningEnd,
      afternoonStart: template.afternoonStart,
      afternoonEnd: template.afternoonEnd,
      morningColor: hasMorning ? color : undefined,
      afternoonColor: hasAfternoon ? color : undefined,
      isRestDay: false,
      absence: undefined,
      morningAbsence: undefined,
      afternoonAbsence: undefined,
    });
  }, [handleSchedulePatch]);

  // Marque (ou retire si label null) une absence sur une journée entière ou une demi-journée
  const handleSetAbsence = useCallback((employeeId: number, day: string, label: string | null, period: AbsencePeriod = 'full') => {
    if (label) {
      if (period === 'morning') {
        handleSchedulePatch(employeeId, day, {
          morningStart: '',
          morningEnd: '',
          morningColor: undefined,
          morningAbsence: label,
          absence: undefined,
          isRestDay: false,
        });
      } else if (period === 'afternoon') {
        handleSchedulePatch(employeeId, day, {
          afternoonStart: '',
          afternoonEnd: '',
          afternoonColor: undefined,
          afternoonAbsence: label,
          absence: undefined,
          isRestDay: false,
        });
      } else {
        handleSchedulePatch(employeeId, day, {
          morningStart: '',
          morningEnd: '',
          afternoonStart: '',
          afternoonEnd: '',
          morningColor: undefined,
          afternoonColor: undefined,
          morningAbsence: undefined,
          afternoonAbsence: undefined,
          isRestDay: false,
          absence: label,
        });
      }
    } else if (period === 'morning') {
      handleSchedulePatch(employeeId, day, { morningAbsence: undefined });
    } else if (period === 'afternoon') {
      handleSchedulePatch(employeeId, day, { afternoonAbsence: undefined });
    } else {
      handleSchedulePatch(employeeId, day, { absence: undefined, morningAbsence: undefined, afternoonAbsence: undefined });
    }
  }, [handleSchedulePatch]);

  const handleCopyDay = useCallback((day: string) => {
    const daySchedules: Record<string, Schedule> = {};
    employees.forEach(emp => {
      const key = `${emp.id}-${day}`;
      if (schedules[key]) {
        daySchedules[key] = { ...schedules[key] };
      }
    });
    setCopiedDay(day);
    setCopiedDaySchedules(daySchedules);
  }, [employees, schedules]);

  const handlePasteDay = useCallback((targetDay: string) => {
    if (!copiedDay || !copiedDaySchedules) return;
    setSchedules(prev => {
      const updated = { ...prev };
      employees.forEach(emp => {
        const sourceKey = `${emp.id}-${copiedDay}`;
        const targetKey = `${emp.id}-${targetDay}`;
        const source = copiedDaySchedules[sourceKey];
        if (source) {
          updated[targetKey] = { ...source };
        } else {
          delete updated[targetKey];
        }
      });
      return updated;
    });
  }, [copiedDay, copiedDaySchedules, employees, setSchedules]);

  const handleNewSchedule = () => {
    if (window.confirm("Etes-vous sur de vouloir creer un nouveau planning vide ? Toutes les donnees non sauvegardees (toutes semaines confondues) seront perdues.")) {
      weeksRef.current = {};
      resetSchedules({});
      setEmployees(Array.from({ length: employeeCount }, (_, index) => ({
        id: index + 1,
        name: `Employe ${index + 1}`,
      })));
      setWeekNumber(getCurrentWeekNumber());
      setYear(getCurrentWeekYear());
    }
  };

  const colorLabelsForSave = managedColors.map(mc => ({ color: mc.id, label: mc.label }));

  const renderContent = () => {
    if (activeTab === 'grid') {
      return (
        <WeeklyGridView
          employees={employees}
          days={DAYS}
          dates={weekDates.map(formatDate)}
          schedules={schedules}
          weekNumber={weekNumber}
          year={year}
          managedColors={managedColors}
          onSchedulePatch={handleSchedulePatch}
          onManageColorsClick={() => setIsColorModalOpen(true)}
          onToggleRestDay={handleToggleRestDay}
          copiedDay={copiedDay}
          onCopyDay={handleCopyDay}
          onPasteDay={handlePasteDay}
          shiftTemplates={templates}
          onManageTemplatesClick={() => setIsTemplateModalOpen(true)}
          onApplyTemplate={handleApplyTemplate}
          onSetAbsence={handleSetAbsence}
          displaySettings={displaySettings}
        />
      );
    } else if (activeTab === 'visual') {
      return (
        <WeeklyVisualView
          employees={employees}
          days={DAYS}
          dates={weekDates.map(formatDate)}
          schedules={schedules}
          weekNumber={weekNumber}
          year={year}
          managedColors={managedColors}
          onSchedulePatch={handleSchedulePatch}
          onManageColorsClick={() => setIsColorModalOpen(true)}
          onToggleRestDay={handleToggleRestDay}
          copiedDay={copiedDay}
          onCopyDay={handleCopyDay}
          onPasteDay={handlePasteDay}
          shiftTemplates={templates}
          onManageTemplatesClick={() => setIsTemplateModalOpen(true)}
          onApplyTemplate={handleApplyTemplate}
          onSetAbsence={handleSetAbsence}
        />
      );
    } else if (activeTab === 'weekly') {
      return (
        <WeeklySchedule
          employees={employees}
          days={DAYS}
          dates={weekDates.map(formatDate)}
          schedules={schedules}
          weekNumber={weekNumber}
          year={year}
          onSchedulePatch={handleSchedulePatch}
          onEmployeeNameChange={handleEmployeeNameChange}
          onEmployeeReorder={handleEmployeeReorder}
          onEmployeeDelete={handleEmployeeDelete}
          managedColors={managedColors}
          onManageColorsClick={() => setIsColorModalOpen(true)}
          copiedDay={copiedDay}
          onCopyDay={handleCopyDay}
          onPasteDay={handlePasteDay}
          onToggleRestDay={handleToggleRestDay}
          shiftTemplates={templates}
          onManageTemplatesClick={() => setIsTemplateModalOpen(true)}
          onApplyTemplate={handleApplyTemplate}
          onSetAbsence={handleSetAbsence}
        />
      );
    } else if (activeTab === 'excel') {
      return (
        <ExcelView
          employees={employees}
          days={DAYS}
          dates={weekDates.map(formatDate)}
          schedules={schedules}
          weekNumber={weekNumber}
          year={year}
          onEmployeeNameChange={handleEmployeeNameChange}
          onEmployeeDelete={handleEmployeeDelete}
        />
      );
    } else {
      return (
        <TimelineView
          employees={employees}
          day={activeTab}
          schedules={schedules}
          onSchedulePatch={handleSchedulePatch}
          onEmployeeNameChange={handleEmployeeNameChange}
          onEmployeeReorder={handleEmployeeReorder}
          onEmployeeDelete={handleEmployeeDelete}
          managedColors={managedColors}
          onManageColorsClick={() => setIsColorModalOpen(true)}
          onToggleRestDay={handleToggleRestDay}
          weekNumber={weekNumber}
          year={year}
          dates={weekDates.map(formatDate)}
          shiftTemplates={templates}
          onManageTemplatesClick={() => setIsTemplateModalOpen(true)}
          onApplyTemplate={handleApplyTemplate}
          onSetAbsence={handleSetAbsence}
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FileMenu
        onRestore={(savedSchedule: SavedSchedule) => {
          // Mémorise la semaine affichée puis charge la sauvegarde sur sa semaine
          weeksRef.current = { ...weeksRef.current, [weekKey]: schedules };
          resetSchedules(savedSchedule.schedules);
          setEmployees(savedSchedule.employees);
          setWeekNumber(savedSchedule.weekNumber);
          setYear(savedSchedule.year);
        }}
        onSave={async () => ({
          schedules,
          employees,
          weekNumber,
          year,
          colorLabels: colorLabelsForSave
        })}
        onNewSchedule={handleNewSchedule}
        autoSaveTimestamp={scheduleAutoSave.lastAutoSave}
        showAutoSaveIndicator={scheduleAutoSave.showIndicator}
      />

      <main className="pt-20 max-w-[95%] mx-auto pb-8 animate-fadeIn">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="year" className="text-sm font-medium text-gray-700">
                Annee
              </label>
              <input
                id="year"
                type="number"
                min="1970"
                max="2100"
                value={year}
                onChange={handleYearChange}
                className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="weekNumber" className="text-sm font-medium text-gray-700">
                Semaine N
              </label>
              <button
                onClick={goToPreviousWeek}
                title="Semaine précédente"
                className="flex items-center justify-center w-7 h-7 bg-white text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-300 shadow-sm transition-all duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                id="weekNumber"
                type="number"
                min="1"
                max="53"
                value={weekNumber}
                onChange={handleWeekChange}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
              />
              <button
                onClick={goToNextWeek}
                title="Semaine suivante"
                className="flex items-center justify-center w-7 h-7 bg-white text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-300 shadow-sm transition-all duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={duplicatePreviousWeek}
                title="Reprendre le planning de la semaine précédente"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 border border-gray-300 shadow-sm transition-all duration-150"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                Reprendre S-1
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="employeeCount" className="text-sm font-medium text-gray-700">
                Nombre d'employes:
              </label>
              <input
                id="employeeCount"
                type="number"
                min="1"
                max="100"
                value={employeeCount}
                onChange={handleEmployeeCountChange}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
              />
              <button
                onClick={handleAddEmployee}
                title="Ajouter un employe"
                className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-all duration-150"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Annuler (Ctrl+Z)"
              className="flex items-center justify-center w-9 h-9 bg-white text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-300 shadow-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Rétablir (Ctrl+Y)"
              className="flex items-center justify-center w-9 h-9 bg-white text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-300 shadow-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-5 h-5" />
            </button>
            <CSVImport onImport={handleCSVImport} existingEmployees={employees} managedColors={managedColors} />
            <CSVExportButton
              onExport={(withColors) => downloadCSV(employees, schedules, weekNumber, year, withColors)}
            />
            <DisplaySettingsMenu settings={displaySettings} onChange={setDisplaySettings} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => {
              if (activeTab === 'grid') setActiveTab('weekly');
              else if (activeTab === 'weekly') setActiveTab('visual');
              else setActiveTab('grid');
            }}
            title={
              activeTab === 'grid'
                ? 'Basculer vers Vue Hebdomadaire 2 (édition)'
                : activeTab === 'weekly'
                ? 'Basculer vers Vue Hebdomadaire 3 (visuelle)'
                : activeTab === 'visual'
                ? 'Basculer vers Vue Hebdomadaire 1 (planning)'
                : 'Afficher la vue hebdomadaire'
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150 shadow-sm
              ${activeTab === 'grid' || activeTab === 'weekly' || activeTab === 'visual'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
          >
            {activeTab === 'visual' ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            {activeTab === 'grid'
              ? 'Vue Hebdomadaire 1'
              : activeTab === 'weekly'
              ? 'Vue Hebdomadaire 2'
              : activeTab === 'visual'
              ? 'Vue Hebdomadaire 3'
              : 'Vue Hebdomadaire'}
            {(activeTab === 'grid' || activeTab === 'weekly' || activeTab === 'visual') && (
              <span className="ml-1 text-xs bg-white/25 rounded px-1">
                {activeTab === 'grid' ? '1→2' : activeTab === 'weekly' ? '2→3' : '3→1'}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150 shadow-sm
              ${activeTab === 'excel'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>

          {DAYS.map((day, index) => (
            <button
              key={day}
              onClick={() => setActiveTab(day)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150 shadow-sm
                ${activeTab === day
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
            >
              <Clock className="h-4 w-4" />
              <div className="flex flex-col items-start">
                <span>{day}</span>
                <span className="text-xs opacity-75">{formatDate(weekDates[index])}</span>
              </div>
            </button>
          ))}
        </div>

        <div
          className="display-scope bg-white rounded-lg shadow-xl overflow-hidden animate-scaleIn"
          style={{
            '--font-scale': displaySettings.fontScale / 100,
            '--col-scale': displaySettings.columnScale / 100,
            '--table-border-width': `${displaySettings.borderWidth}px`,
          } as React.CSSProperties}
        >
          {renderContent()}
        </div>
      </main>

      <ColorManagementModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        managedColors={managedColors}
        onSave={saveColors}
        onAutoSave={autoSaveColors}
        lastAutoSave={lastAutoSave}
      />

      <ShiftTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        managedColors={managedColors}
        onSave={saveTemplates}
      />
    </div>
  );
}

export default App;

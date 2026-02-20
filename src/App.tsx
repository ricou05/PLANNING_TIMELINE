import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Clock, Calendar, FileSpreadsheet, Download, Plus, ChevronDown } from 'lucide-react';
import WeeklySchedule from './components/WeeklySchedule';
import TimelineView from './components/TimelineView';
import ExcelView from './components/ExcelView';
import FileMenu from './components/FileMenu/FileMenu';
import CSVImport from './components/CSVImport';
import ColorManagementModal from './components/ColorManagementModal';
import { Employee, Schedule, SavedSchedule } from './types';
import { getCurrentWeekNumber, getWeekDates, formatDate } from './utils/dateUtils';
import { loadEmployeeOrder, saveEmployeeOrder } from './utils/employeeUtils';
import { useManagedColors } from './hooks/useManagedColors';
import { useScheduleAutoSave, loadScheduleAutoSave } from './hooks/useScheduleAutoSave';
import { downloadCSV } from './utils/csvExport';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

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
  const currentYear = new Date().getFullYear();
  const [schedules, setSchedules] = useState<Record<string, Schedule>>(autoSaved?.schedules || {});
  const [activeTab, setActiveTab] = useState<'weekly' | 'excel' | string>('weekly');
  const [weekNumber, setWeekNumber] = useState(autoSaved?.weekNumber || getCurrentWeekNumber());
  const [year, setYear] = useState(autoSaved?.year || currentYear);
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
  const weekDates = getWeekDates(weekNumber, year);
  const scheduleAutoSave = useScheduleAutoSave(schedules, employees, weekNumber, year);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1970 && value <= 2100) {
      setYear(value);
    }
  };

  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= 53) {
      setWeekNumber(value);
    }
  };

  const handleEmployeeCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= 100) {
      setEmployeeCount(value);
      const newEmployees = Array.from({ length: value }, (_, index) => ({
        id: index + 1,
        name: `Employe ${index + 1}`,
      }));
      setEmployees(loadEmployeeOrder(newEmployees));
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

  const handleScheduleChange = (employeeId: number, day: string, period: keyof Schedule, value: string) => {
    setSchedules(prev => ({
      ...prev,
      [`${employeeId}-${day}`]: {
        ...prev[`${employeeId}-${day}`],
        [period]: value
      }
    }));
  };

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
  }, [copiedDay, copiedDaySchedules, employees]);

  const handleNewSchedule = () => {
    if (window.confirm("Etes-vous sur de vouloir creer un nouveau planning vide ? Toutes les donnees non sauvegardees seront perdues.")) {
      setSchedules({});
      setEmployees(Array.from({ length: employeeCount }, (_, index) => ({
        id: index + 1,
        name: `Employe ${index + 1}`,
      })));
      setWeekNumber(getCurrentWeekNumber());
      setYear(currentYear);
    }
  };

  const colorLabelsForSave = managedColors.map(mc => ({ color: mc.id, label: mc.label }));

  const renderContent = () => {
    if (activeTab === 'weekly') {
      return (
        <WeeklySchedule
          employees={employees}
          days={DAYS}
          dates={weekDates.map(formatDate)}
          schedules={schedules}
          weekNumber={weekNumber}
          year={year}
          onScheduleChange={handleScheduleChange}
          onEmployeeNameChange={handleEmployeeNameChange}
          onEmployeeReorder={handleEmployeeReorder}
          onEmployeeDelete={handleEmployeeDelete}
          managedColors={managedColors}
          onManageColorsClick={() => setIsColorModalOpen(true)}
          copiedDay={copiedDay}
          onCopyDay={handleCopyDay}
          onPasteDay={handlePasteDay}
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
          onScheduleChange={handleScheduleChange}
          onEmployeeNameChange={handleEmployeeNameChange}
          onEmployeeReorder={handleEmployeeReorder}
          onEmployeeDelete={handleEmployeeDelete}
          managedColors={managedColors}
          onManageColorsClick={() => setIsColorModalOpen(true)}
          weekNumber={weekNumber}
          year={year}
          dates={weekDates.map(formatDate)}
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FileMenu
        onRestore={(savedSchedule: SavedSchedule) => {
          setSchedules(savedSchedule.schedules);
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
              <input
                id="weekNumber"
                type="number"
                min="1"
                max="53"
                value={weekNumber}
                onChange={handleWeekChange}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
              />
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
            <CSVImport onImport={handleCSVImport} existingEmployees={employees} managedColors={managedColors} />
            <CSVExportButton
              onExport={(withColors) => downloadCSV(employees, schedules, weekNumber, year, withColors)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150 shadow-sm
              ${activeTab === 'weekly'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
          >
            <Calendar className="h-4 w-4" />
            Vue Hebdomadaire
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

        <div className="bg-white rounded-lg shadow-xl overflow-hidden animate-scaleIn">
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
    </div>
  );
}

export default App;

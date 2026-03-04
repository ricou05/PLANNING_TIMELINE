import React, { useState, useRef, useEffect } from 'react';
import { Download, Copy, ClipboardPaste, X } from 'lucide-react';
import TimeInput from './TimeInput';
import { Employee, Schedule, ManagedColor } from '../types';
import ColorPicker from './ColorPicker';
import ColorLegends from './ColorLegends';
import DraggableEmployeeList from './DraggableEmployeeList';
import { findManagedColor, getTextColorForHex } from '../utils/colorUtils';
import { calculateWeeklyHours } from '../utils/scheduleCalculations';
import { calculateDayTotal, calculateGrandTotal } from '../utils/totalsCalculations';
import { exportToPDF } from '../utils/pdfExport';
import PDFExportModal, { PDFExportOptions } from './PDFExportModal';

interface WeeklyScheduleProps {
  employees: Employee[];
  days: string[];
  dates: string[];
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  onScheduleChange: (employeeId: number, day: string, period: keyof Schedule, value: string) => void;
  onEmployeeNameChange: (id: number, newName: string) => void;
  onEmployeeReorder: (reorderedEmployees: Employee[]) => void;
  onEmployeeDelete: (id: number) => void;
  managedColors: ManagedColor[];
  onManageColorsClick: () => void;
  copiedDay: string | null;
  onCopyDay: (day: string) => void;
  onPasteDay: (day: string) => void;
  onToggleRestDay: (employeeId: number, day: string, isRest: boolean) => void;
}

const REST_DAY_STRIPES = `repeating-linear-gradient(
  -45deg,
  transparent,
  transparent 4px,
  rgba(0,0,0,0.06) 4px,
  rgba(0,0,0,0.06) 8px
)`;

interface EditingCell {
  employeeId: number;
  day: string;
  period: 'morning' | 'afternoon';
}

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year,
  onScheduleChange,
  onEmployeeNameChange,
  onEmployeeReorder,
  onEmployeeDelete,
  managedColors,
  onManageColorsClick,
  copiedDay,
  onCopyDay,
  onPasteDay,
  onToggleRestDay,
}) => {
  const [dragOverEmployeeIndex, setDragOverEmployeeIndex] = useState<number | null>(null);
  const [draggedEmployeeIndex, setDraggedEmployeeIndex] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState('bleu');
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [restDayDragOverCell, setRestDayDragOverCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingCell(null);
      }
    };
    if (editingCell) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingCell]);

  const handleExportPDF = async (options: PDFExportOptions) => {
    setShowPDFModal(false);
    try {
      await exportToPDF({ employees, days, dates, schedules, weekNumber, year, managedColors, options });
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de la generation du PDF. Veuillez reessayer.');
    }
  };

  const handleEmployeeDragStart = (index: number) => {
    setDraggedEmployeeIndex(index);
    setDragOverEmployeeIndex(index);
  };

  const handleEmployeeDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedEmployeeIndex === null || draggedEmployeeIndex === index) {
      setDragOverEmployeeIndex(index);
      return;
    }

    const reorderedEmployees = [...employees];
    const [draggedEmployee] = reorderedEmployees.splice(draggedEmployeeIndex, 1);
    reorderedEmployees.splice(index, 0, draggedEmployee);

    onEmployeeReorder(reorderedEmployees);
    setDraggedEmployeeIndex(index);
    setDragOverEmployeeIndex(index);
  };

  const handleEmployeeDrop = () => {
    setDragOverEmployeeIndex(null);
    setDraggedEmployeeIndex(null);
  };

  const handleRestDayDragOver = (e: React.DragEvent, cellKey: string) => {
    if (e.dataTransfer.types.includes('application/rest-day')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setRestDayDragOverCell(cellKey);
    }
  };

  const handleRestDayDragLeave = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/rest-day')) {
      setRestDayDragOverCell(null);
    }
  };

  const handleRestDayDrop = (e: React.DragEvent, employeeId: number, day: string) => {
    if (e.dataTransfer.types.includes('application/rest-day')) {
      e.preventDefault();
      e.stopPropagation();
      setRestDayDragOverCell(null);
      onToggleRestDay(employeeId, day, true);
    }
  };

  const getCellColors = (schedule: Schedule | undefined, period: 'morning' | 'afternoon'): { bg: string; text: string } => {
    if (!schedule) return { bg: '', text: '' };
    const start = schedule[`${period}Start`];
    const end = schedule[`${period}End`];
    const color = schedule[`${period}Color`];
    if (!start || !end || !color) return { bg: '', text: '' };
    const mc = findManagedColor(managedColors, color);
    if (!mc) return { bg: '', text: '' };
    return { bg: mc.hex, text: getTextColorForHex(mc.hex) };
  };

  const handleCellClick = (employeeId: number, day: string, period: 'morning' | 'afternoon') => {
    setEditingCell({ employeeId, day, period });
  };

  const handleDeletePeriod = (e: React.MouseEvent, employeeId: number, day: string, period: 'morning' | 'afternoon') => {
    e.stopPropagation();
    onScheduleChange(employeeId, day, `${period}Start`, '');
    onScheduleChange(employeeId, day, `${period}End`, '');
    onScheduleChange(employeeId, day, `${period}Color`, '');
    setEditingCell(null);
  };

  const isEditing = (employeeId: number, day: string, period: 'morning' | 'afternoon') => {
    return editingCell?.employeeId === employeeId && editingCell?.day === day && editingCell?.period === period;
  };

  const renderScheduleCell = (employee: Employee, day: string, period: 'morning' | 'afternoon') => {
    const schedule = schedules[`${employee.id}-${day}`] || {};
    const startKey = `${period}Start` as keyof Schedule;
    const endKey = `${period}End` as keyof Schedule;
    const start = schedule[startKey] as string || '';
    const end = schedule[endKey] as string || '';
    const colors = getCellColors(schedule, period);
    const hasTime = start && end;
    const editing = isEditing(employee.id, day, period);

    if (editing) {
      return (
        <div
          ref={editRef}
          className="flex gap-1 items-center justify-center h-full py-0.5"
          style={hasTime ? { backgroundColor: colors.bg } : {}}
        >
          <TimeInput
            value={start}
            onChange={(value) => {
              onScheduleChange(employee.id, day, startKey, value);
              if (value && !schedule[`${period}Color`]) {
                onScheduleChange(employee.id, day, `${period}Color`, selectedColor);
              }
            }}
            placeholder=":"
            minTime="06:30"
            maxTime="20:00"
          />
          <span className="text-black font-medium">-</span>
          <TimeInput
            value={end}
            onChange={(value) => {
              onScheduleChange(employee.id, day, endKey, value);
              if (value && !schedule[`${period}Color`]) {
                onScheduleChange(employee.id, day, `${period}Color`, selectedColor);
              }
            }}
            placeholder=":"
            minTime="06:30"
            maxTime="20:00"
          />
          {hasTime && (
            <button
              onClick={(e) => handleDeletePeriod(e, employee.id, day, period)}
              className="p-0.5 rounded hover:bg-red-100 transition-colors"
              title="Supprimer"
            >
              <X className="w-3 h-3 text-red-500" />
            </button>
          )}
        </div>
      );
    }

    if (hasTime) {
      return (
        <div
          className="flex items-center justify-center h-full cursor-pointer group relative"
          style={{ backgroundColor: colors.bg }}
          onClick={() => handleCellClick(employee.id, day, period)}
        >
          <span
            className="text-xs font-semibold whitespace-nowrap"
            style={{ color: colors.text }}
          >
            {start} - {end}
          </span>
          <button
            onClick={(e) => handleDeletePeriod(e, employee.id, day, period)}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-center h-full cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => handleCellClick(employee.id, day, period)}
      >
        <span className="text-xs text-gray-300 font-medium">: - :</span>
      </div>
    );
  };

  const renderRestDayCell = (employeeId: number, day: string) => {
    return (
      <td
        rowSpan={2}
        className="border-r-4 border-r-black relative"
        style={{ background: REST_DAY_STRIPES, backgroundColor: '#e5e7eb' }}
      >
        <div className="flex items-center justify-center h-full min-h-[64px]">
          <div className="flex items-center gap-1">
            <X className="w-4 h-4 text-red-500" strokeWidth={3} />
            <span className="text-xs font-bold text-gray-500 uppercase">Repos</span>
          </div>
          <button
            onClick={() => onToggleRestDay(employeeId, day, false)}
            className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Retirer le jour de repos"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </td>
    );
  };

  return (
    <div className="space-y-4">
      <div className="px-4 flex justify-between items-center">
        <ColorPicker
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          managedColors={managedColors}
          onManageClick={onManageColorsClick}
          showRestDayButton
        />

        <button
          onClick={() => setShowPDFModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Exporter PDF</span>
        </button>

        {showPDFModal && (
          <PDFExportModal
            onConfirm={handleExportPDF}
            onCancel={() => setShowPDFModal(false)}
          />
        )}
      </div>

      <ColorLegends managedColors={managedColors} />

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border-b-4 border-black p-2 w-[120px] font-bold border-r-4 border-r-black">EMPLOYE</th>
              <th className="border-b-4 border-black p-2 w-[60px] font-bold border-r-4 border-r-black">PER.</th>
              {days.map((day, index) => (
                <th key={day} className="border-b-4 border-black p-2 border-r-4 border-r-black">
                  <div className="text-center">
                    <div className="font-bold">{day}</div>
                    <div className="text-sm text-gray-500">{dates[index]}</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <button
                        onClick={() => onCopyDay(day)}
                        title={`Copier ${day}`}
                        className={`p-1 rounded transition-colors ${
                          copiedDay === day
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {copiedDay && copiedDay !== day && (
                        <button
                          onClick={() => onPasteDay(day)}
                          title={`Coller depuis ${copiedDay}`}
                          className="p-1 rounded text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
              <th className="border-b-4 border-black p-2 w-[80px] font-bold">TOTAL SEM.</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => {
              const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
              const restDays = days.map(day => {
                const schedule = schedules[`${employee.id}-${day}`] || {};
                return schedule.isRestDay === true;
              });

              return (
                <React.Fragment key={employee.id}>
                  {/* Morning row */}
                  <tr
                    className={`${
                      dragOverEmployeeIndex === index ? 'border-t-4 border-[#063971]' : ''
                    }`}
                    draggable
                    onDragStart={() => handleEmployeeDragStart(index)}
                    onDragOver={(e) => handleEmployeeDragOver(e, index)}
                    onDrop={handleEmployeeDrop}
                  >
                    <td rowSpan={2} className="border-r-4 border-r-black align-middle bg-white">
                      <DraggableEmployeeList
                        employee={employee}
                        index={index}
                        onEmployeeNameChange={onEmployeeNameChange}
                        onDragStart={() => {}}
                        onDragOver={() => {}}
                        onDragEnd={() => {}}
                        columnWidth={120}
                        onDelete={onEmployeeDelete}
                      />
                    </td>
                    <td className="border-r-4 border-r-black text-center h-8 bg-white px-1">
                      <span className="text-[0.75em] font-medium text-gray-500">MAT</span>
                    </td>
                    {days.map((day, dayIdx) => {
                      const isRestDay = restDays[dayIdx];
                      const cellKey = `${employee.id}-${day}`;
                      const isDragOver = restDayDragOverCell === cellKey;

                      if (isRestDay) {
                        return renderRestDayCell(employee.id, day);
                      }

                      return (
                        <td
                          key={`${employee.id}-${day}-morning`}
                          className={`border-r-4 border-r-black h-8 p-0 transition-colors ${
                            isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
                          }`}
                          onDragOver={(e) => handleRestDayDragOver(e, cellKey)}
                          onDragLeave={handleRestDayDragLeave}
                          onDrop={(e) => handleRestDayDrop(e, employee.id, day)}
                        >
                          {renderScheduleCell(employee, day, 'morning')}
                        </td>
                      );
                    })}
                    <td rowSpan={2} className="border-l-4 border-l-black text-center align-middle font-medium text-blue-600 bg-white">
                      {weeklyTotal.toFixed(2)}h
                    </td>
                  </tr>
                  {/* Afternoon row */}
                  <tr
                    className={`border-b-4 border-b-black ${
                      dragOverEmployeeIndex === index ? 'border-b-4 border-b-[#063971]' : ''
                    } border-t border-t-gray-300`}
                  >
                    <td className="border-r-4 border-r-black text-center h-8 bg-white px-1">
                      <span className="text-[0.75em] font-medium text-gray-500">APM</span>
                    </td>
                    {days.map((day, dayIdx) => {
                      const isRestDay = restDays[dayIdx];
                      if (isRestDay) return null; // already rendered as rowSpan=2
                      const cellKey = `${employee.id}-${day}`;
                      const isDragOver = restDayDragOverCell === cellKey;

                      return (
                        <td
                          key={`${employee.id}-${day}-afternoon`}
                          className={`border-r-4 border-r-black h-8 p-0 transition-colors ${
                            isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
                          }`}
                          onDragOver={(e) => handleRestDayDragOver(e, cellKey)}
                          onDragLeave={handleRestDayDragLeave}
                          onDrop={(e) => handleRestDayDrop(e, employee.id, day)}
                        >
                          {renderScheduleCell(employee, day, 'afternoon')}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="border-t-4 border-t-black bg-gray-50">
              <td className="border-r-4 border-r-black p-2 font-bold">TOTAUX</td>
              <td className="border-r-4 border-r-black"></td>
              {days.map((day) => (
                <td key={day} className="border-r-4 border-r-black text-center font-bold text-blue-600">
                  {calculateDayTotal(schedules, day).toFixed(2)}h
                </td>
              ))}
              <td className="border-l-4 border-l-black text-center font-bold text-blue-600">
                {calculateGrandTotal(schedules).toFixed(2)}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklySchedule;

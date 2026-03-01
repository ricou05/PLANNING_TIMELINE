import React, { useState } from 'react';
import { Download, Copy, ClipboardPaste, X } from 'lucide-react';
import TimeInput from './TimeInput';
import { Employee, Schedule, ManagedColor } from '../types';
import ColorPicker from './ColorPicker';
import ColorLegends from './ColorLegends';
import DraggableEmployeeList from './DraggableEmployeeList';
import { findManagedColor } from '../utils/colorUtils';
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

  const getCellStyle = (schedule: Schedule | undefined, period: 'morning' | 'afternoon'): React.CSSProperties => {
    if (!schedule) return {};
    const start = schedule[`${period}Start`];
    const end = schedule[`${period}End`];
    const color = schedule[`${period}Color`];
    if (!start || !end || !color) return {};
    const mc = findManagedColor(managedColors, color);
    if (!mc) return {};
    return { backgroundColor: mc.hex };
  };

  const renderRestDayCell = (employeeId: number, day: string, isMorning: boolean) => {
    return (
      <div
        className="flex items-center justify-center h-full min-h-[32px] relative"
        style={{ background: REST_DAY_STRIPES, backgroundColor: '#e5e7eb' }}
      >
        {isMorning ? (
          <div className="flex items-center gap-1">
            <X className="w-4 h-4 text-red-500" strokeWidth={3} />
            <span className="text-xs font-bold text-gray-500 uppercase">Repos</span>
            <button
              onClick={() => onToggleRestDay(employeeId, day, false)}
              className="absolute top-0 right-0 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Retirer le jour de repos"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <X className="w-4 h-4 text-red-400" strokeWidth={2.5} />
        )}
      </div>
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

      <ColorLegends managedColors={managedColors} showRestDayButton={true} />

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border-b-4 border-black p-2 w-[120px] font-bold border-r-4 border-r-black">EMPLOYE</th>
              <th className="border-b-4 border-black p-2 w-[80px] font-bold border-r-4 border-r-black">PERIODE</th>
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
              <th className="border-b-4 border-black p-2 w-[100px] font-bold">TOTAL SEMAINE</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => {
              const weeklyTotal = calculateWeeklyHours(schedules, employee.id);

              return (
                <React.Fragment key={employee.id}>
                  <tr className={`group hover:bg-gray-50 ${
                    dragOverEmployeeIndex === index ? 'border-t-4 border-[#063971]' : ''
                  }`}
                  draggable
                  onDragStart={() => handleEmployeeDragStart(index)}
                  onDragOver={(e) => handleEmployeeDragOver(e, index)}
                  onDrop={handleEmployeeDrop}>
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
                    <td className="border-r-4 border-r-black text-center h-8 bg-white">
                      <span className="text-[0.85em] font-medium">Matin</span>
                    </td>
                    {days.map((day) => {
                      const schedule = schedules[`${employee.id}-${day}`] || {};
                      const isRestDay = schedule.isRestDay === true;
                      const cellKey = `${employee.id}-${day}`;
                      const isDragOver = restDayDragOverCell === cellKey;
                      const cellStyle = isRestDay ? {} : getCellStyle(schedule, 'morning');

                      return (
                        <td
                          key={`${employee.id}-${day}-morning`}
                          className={`border-r-4 border-r-black h-8 transition-colors ${
                            isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
                          }`}
                          style={isRestDay ? {} : cellStyle}
                          onDragOver={(e) => handleRestDayDragOver(e, cellKey)}
                          onDragLeave={handleRestDayDragLeave}
                          onDrop={(e) => handleRestDayDrop(e, employee.id, day)}
                        >
                          {isRestDay ? (
                            renderRestDayCell(employee.id, day, true)
                          ) : (
                            <div className="flex gap-1 items-center justify-center">
                              <TimeInput
                                value={schedule.morningStart || ''}
                                onChange={(value) => {
                                  onScheduleChange(employee.id, day, 'morningStart', value);
                                  if (value && !schedule.morningColor) {
                                    onScheduleChange(employee.id, day, 'morningColor', selectedColor);
                                  }
                                }}
                                placeholder=":"
                                minTime="06:30"
                                maxTime="20:00"
                              />
                              <span className="text-black font-medium">-</span>
                              <TimeInput
                                value={schedule.morningEnd || ''}
                                onChange={(value) => {
                                  onScheduleChange(employee.id, day, 'morningEnd', value);
                                  if (value && !schedule.morningColor) {
                                    onScheduleChange(employee.id, day, 'morningColor', selectedColor);
                                  }
                                }}
                                placeholder=":"
                                minTime="06:30"
                                maxTime="20:00"
                              />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td rowSpan={2} className="border-l-4 border-l-black text-center align-middle font-medium text-blue-600 bg-white">
                      {weeklyTotal.toFixed(2)}h
                    </td>
                  </tr>
                  <tr className={`group border-b-4 border-b-black hover:bg-gray-50 ${
                    dragOverEmployeeIndex === index ? 'border-b-4 border-b-[#063971]' : ''
                  } border-t border-t-gray-300`}>
                    <td className="border-r-4 border-r-black text-center h-8 bg-white">
                      <span className="text-[0.85em] font-medium">Apres-midi</span>
                    </td>
                    {days.map((day) => {
                      const schedule = schedules[`${employee.id}-${day}`] || {};
                      const isRestDay = schedule.isRestDay === true;
                      const cellKey = `${employee.id}-${day}`;
                      const isDragOver = restDayDragOverCell === cellKey;
                      const cellStyle = isRestDay ? {} : getCellStyle(schedule, 'afternoon');

                      return (
                        <td
                          key={`${employee.id}-${day}-afternoon`}
                          className={`border-r-4 border-r-black h-8 transition-colors ${
                            isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
                          }`}
                          style={isRestDay ? {} : cellStyle}
                          onDragOver={(e) => handleRestDayDragOver(e, cellKey)}
                          onDragLeave={handleRestDayDragLeave}
                          onDrop={(e) => handleRestDayDrop(e, employee.id, day)}
                        >
                          {isRestDay ? (
                            renderRestDayCell(employee.id, day, false)
                          ) : (
                            <div className="flex gap-1 items-center justify-center">
                              <TimeInput
                                value={schedule.afternoonStart || ''}
                                onChange={(value) => {
                                  onScheduleChange(employee.id, day, 'afternoonStart', value);
                                  if (value && !schedule.afternoonColor) {
                                    onScheduleChange(employee.id, day, 'afternoonColor', selectedColor);
                                  }
                                }}
                                placeholder=":"
                                minTime="06:30"
                                maxTime="20:00"
                              />
                              <span className="text-black font-medium">-</span>
                              <TimeInput
                                value={schedule.afternoonEnd || ''}
                                onChange={(value) => {
                                  onScheduleChange(employee.id, day, 'afternoonEnd', value);
                                  if (value && !schedule.afternoonColor) {
                                    onScheduleChange(employee.id, day, 'afternoonColor', selectedColor);
                                  }
                                }}
                                placeholder=":"
                                minTime="06:30"
                                maxTime="20:00"
                              />
                            </div>
                          )}
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

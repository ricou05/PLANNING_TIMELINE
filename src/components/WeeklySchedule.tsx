import React, { useState } from 'react';
import { Download } from 'lucide-react';
import TimeInput from './TimeInput';
import { Employee, Schedule, ColorLabel } from '../types';
import ColorPicker from './ColorPicker';
import ColorLegends from './ColorLegends';
import DraggableEmployeeList from './DraggableEmployeeList';
import { COLOR_OPTIONS } from '../utils/colorUtils';
import { calculateWeeklyHours } from '../utils/scheduleCalculations';
import { calculateDayTotal, calculateGrandTotal } from '../utils/totalsCalculations';
import { exportToPDF } from '../utils/pdfExport';

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
  colorLabels: ColorLabel[];
  onColorLabelChange: (colorLabel: ColorLabel) => void;
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
  colorLabels,
  onColorLabelChange
}) => {
  const [dragOverEmployeeIndex, setDragOverEmployeeIndex] = useState<number | null>(null);
  const [draggedEmployeeIndex, setDraggedEmployeeIndex] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState('bleu');

  const handleExportPDF = async () => {
    try {
      await exportToPDF({
        employees,
        days,
        dates,
        schedules,
        weekNumber,
        year,
        colorLabels
      });
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
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

  const getCellStyle = (schedule: Schedule | undefined, period: 'morning' | 'afternoon'): string => {
    if (!schedule) return '';
    
    const start = schedule[`${period}Start`];
    const end = schedule[`${period}End`];
    const color = schedule[`${period}Color`];
    
    if (!start || !end) return '';
    
    const colorOption = color ? COLOR_OPTIONS.find(c => c.name.toLowerCase() === color) : null;
    return colorOption?.bgClass || '';
  };

  return (
    <div className="space-y-4">
      <div className="px-4 flex justify-between items-center">
        <ColorPicker 
          selectedColor={selectedColor} 
          onColorChange={setSelectedColor}
          colorLabels={colorLabels}
          onColorLabelChange={onColorLabelChange}
        />
        
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Exporter PDF</span>
        </button>
      </div>
      
      <ColorLegends colorLabels={colorLabels} />

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border-b-4 border-black p-2 w-[120px] font-bold border-r-4 border-r-black">EMPLOYÉ</th>
              <th className="border-b-4 border-black p-2 w-[80px] font-bold border-r-4 border-r-black">PÉRIODE</th>
              {days.map((day, index) => (
                <th key={day} className="border-b-4 border-black p-2 border-r-4 border-r-black">
                  <div className="text-center">
                    <div className="font-bold">{day}</div>
                    <div className="text-sm text-gray-500">{dates[index]}</div>
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
                      const cellStyle = getCellStyle(schedule, 'morning');
                      
                      return (
                        <td 
                          key={`${employee.id}-${day}-morning`} 
                          className={`border-r-4 border-r-black h-8 ${cellStyle}`}
                        >
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
                        </td>
                      );
                    })}
                    <td rowSpan={2} className="border-l-4 border-l-black text-center align-middle font-medium text-indigo-600 bg-white">
                      {weeklyTotal.toFixed(2)}h
                    </td>
                  </tr>
                  <tr className={`group border-b-4 border-black hover:bg-gray-50 ${
                    dragOverEmployeeIndex === index ? 'border-b-4 border-[#063971]' : ''
                  } border-t border-gray-300`}>
                    <td className="border-r-4 border-r-black text-center h-8 bg-white">
                      <span className="text-[0.85em] font-medium">Après-midi</span>
                    </td>
                    {days.map((day) => {
                      const schedule = schedules[`${employee.id}-${day}`] || {};
                      const cellStyle = getCellStyle(schedule, 'afternoon');
                      
                      return (
                        <td 
                          key={`${employee.id}-${day}-afternoon`} 
                          className={`border-r-4 border-r-black h-8 ${cellStyle}`}
                        >
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
                <td key={day} className="border-r-4 border-r-black text-center font-bold text-indigo-600">
                  {calculateDayTotal(schedules, day).toFixed(2)}h
                </td>
              ))}
              <td className="border-l-4 border-l-black text-center font-bold text-indigo-600">
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

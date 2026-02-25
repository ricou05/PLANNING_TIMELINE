import React, { useState, useRef } from 'react';
import { Employee, Schedule, ManagedColor } from '../types';
import ColorPicker from './ColorPicker';
import { findManagedColor, getTextColorForHex } from '../utils/colorUtils';
import DraggableEmployeeList from './DraggableEmployeeList';
import { timeToMinutes, minutesToTime, clampTime, TIME_CONSTRAINTS } from '../utils/timeUtils';
import { checkPeriodOverlap, getPeriodType, getOtherPeriod } from '../utils/periodUtils';
import { calculateDailyHours, calculateWeeklyHours } from '../utils/scheduleCalculations';
import { exportTimelineToPDF } from '../utils/pdfTimelineExport';
import { X, FileDown } from 'lucide-react';

interface TimelineViewProps {
  employees: Employee[];
  day: string;
  schedules: Record<string, Schedule>;
  onScheduleChange: (employeeId: number, day: string, period: keyof Schedule, value: string) => void;
  onEmployeeNameChange: (id: number, newName: string) => void;
  onEmployeeReorder: (reorderedEmployees: Employee[]) => void;
  onEmployeeDelete: (id: number) => void;
  managedColors: ManagedColor[];
  onManageColorsClick: () => void;
  weekNumber: number;
  year: number;
  dates: string[];
}

const HOUR_WIDTH = 80;
const COLUMN_WIDTH = {
  employee: 120,
  dailyTotal: 80,
  weeklyTotal: 80,
};

const TimelineView: React.FC<TimelineViewProps> = ({
  employees,
  day,
  schedules,
  onScheduleChange,
  onEmployeeNameChange,
  onEmployeeReorder,
  onEmployeeDelete,
  managedColors,
  onManageColorsClick,
  weekNumber,
  year,
  dates
}) => {
  const DAYS_LIST = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const dayIndex = DAYS_LIST.indexOf(day);
  const currentDate = dayIndex >= 0 && dayIndex < dates.length ? dates[dayIndex] : '';

  const [selectedColor, setSelectedColor] = useState('bleu');
  const [draggedEmployeeIndex, setDraggedEmployeeIndex] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [activeEmployee, setActiveEmployee] = useState<number | null>(null);
  const [activePeriod, setActivePeriod] = useState<{
    start: keyof Schedule;
    end: keyof Schedule;
    color: keyof Schedule;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isCreating, setIsCreating] = useState(false);

  const timelineWidth = (timeToMinutes(TIME_CONSTRAINTS.MAX_TIME) - timeToMinutes(TIME_CONSTRAINTS.MIN_TIME)) / 15 * (HOUR_WIDTH / 4);
  const totalWidth = timelineWidth + COLUMN_WIDTH.employee + COLUMN_WIDTH.dailyTotal + COLUMN_WIDTH.weeklyTotal;

  const getColorStyle = (colorId?: string): { bg: string; border: string; text: string } => {
    const mc = findManagedColor(managedColors, colorId);
    if (!mc) return { bg: '', border: '', text: '' };
    return {
      bg: mc.hex,
      border: mc.hex,
      text: getTextColorForHex(mc.hex),
    };
  };

  const handleEmployeeDragStart = (index: number) => {
    setDraggedEmployeeIndex(index);
  };

  const handleEmployeeDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedEmployeeIndex === null || draggedEmployeeIndex === index) return;

    const newEmployees = [...employees];
    const [draggedEmployee] = newEmployees.splice(draggedEmployeeIndex, 1);
    newEmployees.splice(index, 0, draggedEmployee);

    onEmployeeReorder(newEmployees);
    setDraggedEmployeeIndex(index);
  };

  const handleEmployeeDragEnd = () => {
    setDraggedEmployeeIndex(null);
  };

  const calculatePosition = (time: string): number => {
    if (!time) return 0;
    const totalMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
    return ((totalMinutes - startMinutes) / 15) * (HOUR_WIDTH / 4);
  };

  const calculateWidth = (start: string, end: string): number => {
    return calculatePosition(end) - calculatePosition(start);
  };

  const snapToGrid = (position: number): number => {
    const gridSize = HOUR_WIDTH / 4;
    return Math.round(position / gridSize) * gridSize;
  };

  const getTimeFromPosition = (position: number): string => {
    const startMinutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
    const snappedPosition = snapToGrid(position);
    const minutes = startMinutes + (snappedPosition / (HOUR_WIDTH / 4)) * 15;
    return clampTime(minutesToTime(minutes));
  };

  const getPositionFromEvent = (e: React.MouseEvent): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    return Math.max(0, e.clientX - rect.left + scrollLeft - COLUMN_WIDTH.employee);
  };

  const handlePeriodClick = (e: React.MouseEvent, employeeId: number, period: 'morning' | 'afternoon') => {
    e.stopPropagation();
    if (!isResizing && !isDragging) {
      onScheduleChange(employeeId, day, `${period}Color`, selectedColor);
    }
  };

  const handlePeriodMouseDown = (e: React.MouseEvent, employeeId: number, period: 'morning' | 'afternoon') => {
    e.stopPropagation();
    const schedule = schedules[`${employeeId}-${day}`] || {};
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isStart = e.clientX - rect.left < 10;
    const isEnd = rect.right - e.clientX < 10;

    if (isStart || isEnd) {
      setIsResizing(isStart ? 'start' : 'end');
      setActivePeriod({
        start: `${period}Start` as keyof Schedule,
        end: `${period}End` as keyof Schedule,
        color: `${period}Color` as keyof Schedule
      });
      setDragStart(calculatePosition(schedule[`${period}Start`]));
      setDragEnd(calculatePosition(schedule[`${period}End`]));
    } else {
      setIsDragging(true);
      setDragOffset(e.clientX - rect.left);
      setActivePeriod({
        start: `${period}Start` as keyof Schedule,
        end: `${period}End` as keyof Schedule,
        color: `${period}Color` as keyof Schedule
      });
      const startPos = calculatePosition(schedule[`${period}Start`]);
      const endPos = calculatePosition(schedule[`${period}End`]);
      setDragStart(startPos);
      setDragEnd(endPos);
    }
    setActiveEmployee(employeeId);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent, employeeId: number) => {
    if (e.button !== 0) return;
    const position = snapToGrid(getPositionFromEvent(e));
    const time = getTimeFromPosition(position);
    const periodType = getPeriodType(time);

    const schedule = schedules[`${employeeId}-${day}`] || {};
    const hasMorning = schedule.morningStart && schedule.morningEnd;
    const hasAfternoon = schedule.afternoonStart && schedule.afternoonEnd;

    if ((periodType === 'morning' && !hasMorning) || (periodType === 'afternoon' && !hasAfternoon)) {
      setActivePeriod({
        start: `${periodType}Start` as keyof Schedule,
        end: `${periodType}End` as keyof Schedule,
        color: `${periodType}Color` as keyof Schedule
      });
      setIsCreating(true);
      setIsDragging(true);
      setDragStart(position);
      setDragEnd(position);
      setActiveEmployee(employeeId);
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const currentPosition = getPositionFromEvent(e);

    if (isCreating) {
      setDragEnd(snapToGrid(currentPosition));
    } else if (isDragging && !isResizing && dragStart !== null && dragEnd !== null) {
      const width = dragEnd - dragStart;
      const newStart = snapToGrid(currentPosition - dragOffset);
      setDragStart(newStart);
      setDragEnd(newStart + width);
    } else if (isResizing && dragStart !== null && dragEnd !== null) {
      if (isResizing === 'start') {
        const newStart = snapToGrid(currentPosition);
        if (newStart < dragEnd) {
          setDragStart(newStart);
        }
      } else {
        const newEnd = snapToGrid(currentPosition);
        if (newEnd > dragStart) {
          setDragEnd(newEnd);
        }
      }
    }
  };

  const handleTimelineMouseUp = () => {
    if ((!isDragging && !isResizing) || !activeEmployee || !activePeriod) return;

    if (dragStart !== null && dragEnd !== null) {
      const startTime = getTimeFromPosition(Math.min(dragStart, dragEnd));
      const endTime = getTimeFromPosition(Math.max(dragStart, dragEnd));

      if (startTime !== endTime) {
        const schedule = schedules[`${activeEmployee}-${day}`] || {};
        const otherPeriod = getOtherPeriod(schedule, activePeriod.start.includes('morning') ? 'morning' : 'afternoon');

        const hasOverlap = checkPeriodOverlap(startTime, endTime, otherPeriod.start, otherPeriod.end);

        if (!hasOverlap) {
          if (isCreating || isDragging) {
            onScheduleChange(activeEmployee, day, activePeriod.start, startTime);
            onScheduleChange(activeEmployee, day, activePeriod.end, endTime);
            if (isCreating) {
              onScheduleChange(activeEmployee, day, activePeriod.color, selectedColor);
            }
          } else if (isResizing) {
            if (isResizing === 'start') {
              onScheduleChange(activeEmployee, day, activePeriod.start, startTime);
            } else {
              onScheduleChange(activeEmployee, day, activePeriod.end, endTime);
            }
          }
        }
      }
    }

    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
    setDragEnd(null);
    setActiveEmployee(null);
    setActivePeriod(null);
    setDragOffset(0);
    setIsCreating(false);
  };

  const handleDelete = (employeeId: number, period: 'morning' | 'afternoon') => {
    onScheduleChange(employeeId, day, `${period}Start`, '');
    onScheduleChange(employeeId, day, `${period}End`, '');
    onScheduleChange(employeeId, day, `${period}Color`, '');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportTimelineToPDF({
        employees,
        day,
        date: currentDate,
        schedules,
        weekNumber,
        year,
        managedColors,
      });
    } catch {
      // silent
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 flex items-center justify-between">
        <ColorPicker
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          managedColors={managedColors}
          onManageClick={onManageColorsClick}
        />
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 border border-gray-300 shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-4 h-4" />
          {isExporting ? 'Export en cours...' : `Exporter ${day} en PDF`}
        </button>
      </div>

      <div
        className="overflow-x-auto"
        ref={timelineRef}
        onMouseMove={handleTimelineMouseMove}
        onMouseUp={handleTimelineMouseUp}
        onMouseLeave={handleTimelineMouseUp}
      >
        <div style={{ width: totalWidth }} className="relative">
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <div className="flex min-h-[60px]">
              <div style={{ width: COLUMN_WIDTH.employee }} className="flex-shrink-0 border-r border-gray-200 bg-gray-50" />
              <div className="flex" style={{ width: timelineWidth }}>
                {Array.from({ length: (timeToMinutes(TIME_CONSTRAINTS.MAX_TIME) - timeToMinutes(TIME_CONSTRAINTS.MIN_TIME)) / 15 + 1 }).map((_, index) => {
                  const minutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME) + index * 15;
                  const time = minutesToTime(minutes);
                  const isHourStart = time.endsWith('00') || time.endsWith('30');
                  return (
                    <div
                      key={time}
                      className="border-r border-gray-200 flex items-center justify-start pl-1"
                      style={{ width: HOUR_WIDTH / 4 }}
                    >
                      {isHourStart && (
                        <span className="text-xs font-medium text-gray-500">{time}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ width: COLUMN_WIDTH.dailyTotal }} className="flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-0.5">
                <span className="text-sm font-bold text-blue-600">
                  {employees.reduce((sum, emp) => sum + calculateDailyHours(schedules[`${emp.id}-${day}`] || {}), 0).toFixed(2)}h
                </span>
                <span className="text-xs font-medium text-gray-500">Total jour</span>
              </div>
              <div style={{ width: COLUMN_WIDTH.weeklyTotal }} className="flex-shrink-0 border-l border-gray-200 bg-gray-50 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-500">Total sem.</span>
              </div>
            </div>
          </div>

          <div>
            {employees.map((employee, index) => {
              const schedule = schedules[`${employee.id}-${day}`] || {};
              const dailyHours = calculateDailyHours(schedule);
              const weeklyHours = calculateWeeklyHours(schedules, employee.id);
              const morningStyle = getColorStyle(schedule.morningColor);
              const afternoonStyle = getColorStyle(schedule.afternoonColor);

              return (
                <div key={employee.id} className="flex border-b border-gray-200">
                  <DraggableEmployeeList
                    employee={employee}
                    index={index}
                    onEmployeeNameChange={onEmployeeNameChange}
                    onDragStart={handleEmployeeDragStart}
                    onDragOver={handleEmployeeDragOver}
                    onDragEnd={handleEmployeeDragEnd}
                    columnWidth={COLUMN_WIDTH.employee}
                    onDelete={onEmployeeDelete}
                  />
                  <div
                    className="relative flex-grow h-9"
                    style={{ width: timelineWidth }}
                    onMouseDown={(e) => handleTimelineMouseDown(e, employee.id)}
                  >
                    {Array.from({ length: (timeToMinutes(TIME_CONSTRAINTS.MAX_TIME) - timeToMinutes(TIME_CONSTRAINTS.MIN_TIME)) / 15 + 1 }).map((_, index) => {
                      const minutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME) + index * 15;
                      const time = minutesToTime(minutes);
                      return (
                        <div
                          key={time}
                          className="absolute h-full border-l border-gray-100"
                          style={{ left: calculatePosition(time), zIndex: 0 }}
                        />
                      );
                    })}

                    {schedule.morningStart && schedule.morningEnd && (
                      <div
                        className="absolute h-7 top-1 border rounded cursor-move group"
                        style={{
                          left: calculatePosition(schedule.morningStart),
                          width: calculateWidth(schedule.morningStart, schedule.morningEnd),
                          backgroundColor: morningStyle.bg || '#DBEAFE',
                          borderColor: morningStyle.border || '#BFDBFE',
                          zIndex: 1,
                        }}
                        onMouseDown={(e) => handlePeriodMouseDown(e, employee.id, 'morning')}
                        onClick={(e) => handlePeriodClick(e, employee.id, 'morning')}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize" />
                        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize" />
                        <span
                          className="text-xs px-2 leading-[28px] whitespace-nowrap"
                          style={{ color: morningStyle.text || '#1E3A8A' }}
                        >
                          {schedule.morningStart} - {schedule.morningEnd}
                        </span>
                        <button
                          onClick={() => handleDelete(employee.id, 'morning')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    )}

                    {schedule.afternoonStart && schedule.afternoonEnd && (
                      <div
                        className="absolute h-7 top-1 border rounded cursor-move group"
                        style={{
                          left: calculatePosition(schedule.afternoonStart),
                          width: calculateWidth(schedule.afternoonStart, schedule.afternoonEnd),
                          backgroundColor: afternoonStyle.bg || '#F3F4F6',
                          borderColor: afternoonStyle.border || '#D1D5DB',
                          zIndex: 1,
                        }}
                        onMouseDown={(e) => handlePeriodMouseDown(e, employee.id, 'afternoon')}
                        onClick={(e) => handlePeriodClick(e, employee.id, 'afternoon')}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize" />
                        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize" />
                        <span
                          className="text-xs px-2 leading-[28px] whitespace-nowrap"
                          style={{ color: afternoonStyle.text || '#374151' }}
                        >
                          {schedule.afternoonStart} - {schedule.afternoonEnd}
                        </span>
                        <button
                          onClick={() => handleDelete(employee.id, 'afternoon')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    )}

                    {(isCreating || isDragging || isResizing) && activeEmployee === employee.id && dragStart !== null && dragEnd !== null && (
                      <div
                        className="absolute h-7 top-1 bg-blue-100/70 border border-blue-200 border-dashed rounded pointer-events-none z-[2]"
                        style={{
                          left: Math.min(dragStart, dragEnd),
                          width: Math.abs(dragEnd - dragStart),
                        }}
                      >
                        <span className="text-xs px-2 leading-[28px] whitespace-nowrap text-blue-800">
                          {getTimeFromPosition(Math.min(dragStart, dragEnd))} - {getTimeFromPosition(Math.max(dragStart, dragEnd))}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ width: COLUMN_WIDTH.dailyTotal }} className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {dailyHours.toFixed(2)}h
                    </span>
                  </div>
                  <div style={{ width: COLUMN_WIDTH.weeklyTotal }} className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {weeklyHours.toFixed(2)}h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ligne de totaux */}
          <div className="flex border-t-2 border-gray-400 bg-blue-50">
            <div style={{ width: COLUMN_WIDTH.employee }} className="flex-shrink-0 border-r border-gray-200 flex items-center justify-center h-10">
              <span className="text-sm font-bold text-gray-700">TOTAL</span>
            </div>
            <div className="flex-shrink-0 h-10" style={{ width: timelineWidth }} />
            <div style={{ width: COLUMN_WIDTH.dailyTotal }} className="flex-shrink-0 border-l border-gray-400 flex items-center justify-center h-10">
              <span className="text-sm font-bold text-blue-700">
                {employees.reduce((sum, emp) => sum + calculateDailyHours(schedules[`${emp.id}-${day}`] || {}), 0).toFixed(2)}h
              </span>
            </div>
            <div style={{ width: COLUMN_WIDTH.weeklyTotal }} className="flex-shrink-0 border-l border-gray-400 flex items-center justify-center h-10">
              <span className="text-sm font-bold text-blue-700">
                {employees.reduce((sum, emp) => sum + calculateWeeklyHours(schedules, emp.id), 0).toFixed(2)}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

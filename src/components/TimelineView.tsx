import React, { useState, useRef, useEffect } from 'react';
import { Employee, Schedule, ManagedColor, ShiftTemplate } from '../types';
import ColorPicker from './ColorPicker';
import ShiftToolsBar from './ShiftToolsBar';
import { findManagedColor, getTextColorForHex } from '../utils/colorUtils';
import DraggableEmployeeList from './DraggableEmployeeList';
import { timeToMinutes, minutesToTime, clampTime, TIME_CONSTRAINTS, formatHours } from '../utils/timeUtils';
import { checkPeriodOverlap, getPeriodType, getOtherPeriod } from '../utils/periodUtils';
import { calculateDailyHours, calculateWeeklyHours } from '../utils/scheduleCalculations';
import { calculateDayTotal } from '../utils/totalsCalculations';
import { exportTimelineToPDF } from '../utils/pdfTimelineExport';
import { X, FileDown, CalendarOff, Users, MoveVertical, Info } from 'lucide-react';
import {
  isPlanningDrag,
  isDayDrag,
  setDayDragData,
  getDayDragSource,
  transferModeOf,
  hasDayContent,
  DayRef,
  TransferMode,
  DAY_DRAG_HINT,
} from '../utils/planningDrag';
import { RESIZE_START_CURSOR, RESIZE_END_CURSOR, EDGE_GRIP_WIDTH } from '../utils/resizeCursors';

const REST_DAY_STRIPES = `repeating-linear-gradient(
  -45deg,
  transparent,
  transparent 4px,
  rgba(0,0,0,0.06) 4px,
  rgba(0,0,0,0.06) 8px
)`;

const PERIOD_DRAG_HINT =
  "Glisser horizontalement pour décaler l'horaire, ou vers la ligne d'un autre salarié " +
  "pour lui transférer ce créneau (Maj = toute la journée, Ctrl = copier). " +
  "Les extrémités permettent d'allonger ou de raccourcir le créneau.";

// Poignée d'extrémité d'un créneau : au survol, le curseur devient une accolade
// (barre verticale + double flèche) pour signaler qu'on peut avancer ou reculer
// cet horaire ; un petit trait vertical matérialise la zone de préhension.
const EdgeGrip: React.FC<{ side: 'start' | 'end'; color: string }> = ({ side, color }) => (
  <div
    className={`absolute top-0 bottom-0 flex items-center group/grip ${
      side === 'start' ? 'left-0 justify-start pl-[2px]' : 'right-0 justify-end pr-[2px]'
    }`}
    style={{
      width: EDGE_GRIP_WIDTH,
      cursor: side === 'start' ? RESIZE_START_CURSOR : RESIZE_END_CURSOR,
      color,
      zIndex: 2,
    }}
    title={
      side === 'start'
        ? "Glisser pour avancer ou reculer l'heure de début"
        : "Glisser pour avancer ou reculer l'heure de fin"
    }
  >
    <span className="w-[3px] h-4 rounded-full bg-current opacity-30 group-hover:opacity-60 group-hover/grip:opacity-100 transition-opacity" />
  </div>
);

interface TimelineViewProps {
  employees: Employee[];
  day: string;
  schedules: Record<string, Schedule>;
  onSchedulePatch: (employeeId: number, day: string, patch: Partial<Schedule>) => void;
  onEmployeeNameChange: (id: number, newName: string) => void;
  onEmployeeReorder: (reorderedEmployees: Employee[]) => void;
  onEmployeeDelete: (id: number) => void;
  managedColors: ManagedColor[];
  onManageColorsClick: () => void;
  onToggleRestDay: (employeeId: number, day: string, isRest: boolean) => void;
  weekNumber: number;
  year: number;
  dates: string[];
  shiftTemplates: ShiftTemplate[];
  onManageTemplatesClick: () => void;
  onApplyTemplate: (employeeId: number, day: string, template: ShiftTemplate, fallbackColor: string) => void;
  onSetAbsence: (employeeId: number, day: string, label: string | null) => void;
  /** Déplace (ou copie) toute une journée d'un salarié vers un autre */
  onTransferDay: (source: DayRef, target: DayRef, mode: TransferMode) => void;
  /** Déplace (ou copie) une seule demi-journée vers un autre salarié */
  onTransferPeriod: (
    source: DayRef,
    target: DayRef,
    period: 'morning' | 'afternoon',
    values: { start: string; end: string; color?: string },
    mode: TransferMode
  ) => void;
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
  onSchedulePatch,
  onEmployeeNameChange,
  onEmployeeReorder,
  onEmployeeDelete,
  managedColors,
  onManageColorsClick,
  onToggleRestDay,
  weekNumber,
  year,
  dates,
  shiftTemplates,
  onManageTemplatesClick,
  onApplyTemplate,
  onSetAbsence,
  onTransferDay,
  onTransferPeriod
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
    start: 'morningStart' | 'afternoonStart';
    end: 'morningEnd' | 'afternoonEnd';
    color: 'morningColor' | 'afternoonColor';
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isCreating, setIsCreating] = useState(false);
  const [restDayDragOverEmployee, setRestDayDragOverEmployee] = useState<number | null>(null);
  // Ligne survolée pendant un glissement : permet de transférer un créneau
  // (ou toute la journée avec Maj) vers un autre salarié
  const [hoverEmployee, setHoverEmployee] = useState<number | null>(null);
  const [wholeDayTransfer, setWholeDayTransfer] = useState(false);
  const [draggedDayEmployee, setDraggedDayEmployee] = useState<number | null>(null);

  const isTransferring =
    isDragging && !isCreating && !isResizing &&
    activeEmployee !== null && hoverEmployee !== null && hoverEmployee !== activeEmployee;

  // Pendant un redimensionnement, le curseur « accolade » reste affiché même si
  // la souris sort du créneau
  useEffect(() => {
    if (!isResizing) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = isResizing === 'start' ? RESIZE_START_CURSOR : RESIZE_END_CURSOR;
    return () => { document.body.style.cursor = previous; };
  }, [isResizing]);

  // Accepte les glisser-déposer de repos, de modèles de créneaux et d'absences
  const handleRestDayDragOver = (e: React.DragEvent, employeeId: number) => {
    if (isPlanningDrag(e)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = isDayDrag(e) ? transferModeOf(e) : 'copy';
      setRestDayDragOverEmployee(employeeId);
    }
  };

  // Poignée « journée » : glisser-déposer HTML5 de toute la journée d'un salarié
  const handleDayDragStart = (e: React.DragEvent, employeeId: number) => {
    e.stopPropagation();
    setDayDragData(e, { employeeId, day });
    setDraggedDayEmployee(employeeId);
  };

  const handleRestDayDragLeave = (e: React.DragEvent) => {
    if (isPlanningDrag(e)) {
      setRestDayDragOverEmployee(null);
    }
  };

  const handleRestDayDrop = (e: React.DragEvent, employeeId: number) => {
    if (!isPlanningDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setRestDayDragOverEmployee(null);

    const daySource = getDayDragSource(e);
    if (daySource) {
      setDraggedDayEmployee(null);
      onTransferDay(daySource, { employeeId, day }, transferModeOf(e));
      return;
    }

    const templateData = e.dataTransfer.getData('application/shift-template');
    const absenceLabel = e.dataTransfer.getData('application/absence');
    if (templateData) {
      onApplyTemplate(employeeId, day, JSON.parse(templateData) as ShiftTemplate, selectedColor);
    } else if (absenceLabel) {
      onSetAbsence(employeeId, day, absenceLabel);
    } else {
      onToggleRestDay(employeeId, day, true);
    }
  };

  const timelineWidth = (timeToMinutes(TIME_CONSTRAINTS.MAX_TIME) - timeToMinutes(TIME_CONSTRAINTS.MIN_TIME)) / 15 * (HOUR_WIDTH / 4);
  const totalWidth = timelineWidth + COLUMN_WIDTH.employee + COLUMN_WIDTH.dailyTotal + COLUMN_WIDTH.weeklyTotal;

  const totalDailyHours = calculateDayTotal(schedules, day, employees);

  // Couverture : nombre de présents par créneau de 15 min, avec détail par rayon (couleur)
  const dayStartMin = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
  const dayEndMin = timeToMinutes(TIME_CONSTRAINTS.MAX_TIME);
  const slotCount = (dayEndMin - dayStartMin) / 15;
  const coverage = Array.from({ length: slotCount }, (_, i) => {
    const slotStart = dayStartMin + i * 15;
    let count = 0;
    const byLabel: Record<string, number> = {};
    employees.forEach(emp => {
      const s = schedules[`${emp.id}-${day}`];
      if (!s || s.isRestDay || s.absence) return;
      const periods: Array<[string, string, string | undefined]> = [
        [s.morningStart, s.morningEnd, s.morningColor],
        [s.afternoonStart, s.afternoonEnd, s.afternoonColor],
      ];
      for (const [pStart, pEnd, pColor] of periods) {
        if (pStart && pEnd && timeToMinutes(pStart) <= slotStart && slotStart < timeToMinutes(pEnd)) {
          count++;
          const mc = findManagedColor(managedColors, pColor);
          const label = mc ? mc.label : 'Sans rayon';
          byLabel[label] = (byLabel[label] || 0) + 1;
          break;
        }
      }
    });
    return { slotStart, count, byLabel };
  });
  const maxCoverage = Math.max(1, ...coverage.map(c => c.count));

  const coverageTooltip = (slot: { slotStart: number; count: number; byLabel: Record<string, number> }): string => {
    const header = `${minutesToTime(slot.slotStart)} — ${slot.count} présent${slot.count > 1 ? 's' : ''}`;
    const details = Object.entries(slot.byLabel).map(([label, n]) => `${label} : ${n}`);
    return [header, ...details].join('\n');
  };

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
      onSchedulePatch(employeeId, day, { [`${period}Color`]: selectedColor });
    }
  };

  const handlePeriodMouseDown = (e: React.MouseEvent, employeeId: number, period: 'morning' | 'afternoon') => {
    e.stopPropagation();
    const schedule = schedules[`${employeeId}-${day}`] || {};
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isStart = e.clientX - rect.left < EDGE_GRIP_WIDTH;
    const isEnd = rect.right - e.clientX < EDGE_GRIP_WIDTH;

    if (isStart || isEnd) {
      setIsResizing(isStart ? 'start' : 'end');
      setActivePeriod({
        start: `${period}Start`,
        end: `${period}End`,
        color: `${period}Color`
      });
      setDragStart(calculatePosition(schedule[`${period}Start`]));
      setDragEnd(calculatePosition(schedule[`${period}End`]));
    } else {
      setIsDragging(true);
      setDragOffset(e.clientX - rect.left);
      setActivePeriod({
        start: `${period}Start`,
        end: `${period}End`,
        color: `${period}Color`
      });
      const startPos = calculatePosition(schedule[`${period}Start`]);
      const endPos = calculatePosition(schedule[`${period}End`]);
      setDragStart(startPos);
      setDragEnd(endPos);
    }
    setActiveEmployee(employeeId);
    setHoverEmployee(employeeId);
    setWholeDayTransfer(e.shiftKey);
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
        start: `${periodType}Start`,
        end: `${periodType}End`,
        color: `${periodType}Color`
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

    setWholeDayTransfer(e.shiftKey);
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

  const resetDragState = () => {
    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
    setDragEnd(null);
    setActiveEmployee(null);
    setActivePeriod(null);
    setDragOffset(0);
    setIsCreating(false);
    setWholeDayTransfer(false);
  };

  // Glisser un créneau vers la ligne d'un autre salarié : le créneau (ou toute
  // la journée si Maj est enfoncée) change de salarié. Ctrl/Cmd = copier.
  const transferToEmployee = (e: React.MouseEvent, targetEmployeeId: number) => {
    if (!activeEmployee || !activePeriod) return;
    const mode = transferModeOf(e);
    const source = { employeeId: activeEmployee, day };
    const target = { employeeId: targetEmployeeId, day };

    if (e.shiftKey) {
      onTransferDay(source, target, mode);
      return;
    }

    const period = activePeriod.start.includes('morning') ? 'morning' : 'afternoon';
    const schedule = schedules[`${activeEmployee}-${day}`] || {};
    const startTime = dragStart !== null && dragEnd !== null
      ? getTimeFromPosition(Math.min(dragStart, dragEnd))
      : schedule[activePeriod.start];
    const endTime = dragStart !== null && dragEnd !== null
      ? getTimeFromPosition(Math.max(dragStart, dragEnd))
      : schedule[activePeriod.end];
    if (!startTime || !endTime || startTime === endTime) return;

    // Refus si le créneau déposé chevauche l'autre demi-journée du salarié cible
    const targetSchedule = schedules[`${targetEmployeeId}-${day}`] || {};
    const otherPeriod = getOtherPeriod(targetSchedule, period);
    if (checkPeriodOverlap(startTime, endTime, otherPeriod.start, otherPeriod.end)) return;

    onTransferPeriod(source, target, period, {
      start: startTime,
      end: endTime,
      color: schedule[activePeriod.color],
    }, mode);
  };

  const handleTimelineMouseUp = (e: React.MouseEvent, allowTransfer = true) => {
    if ((!isDragging && !isResizing) || !activeEmployee || !activePeriod) return;

    // Transfert vers un autre salarié : prioritaire sur le déplacement horaire
    if (allowTransfer && isTransferring && hoverEmployee !== null) {
      transferToEmployee(e, hoverEmployee);
      resetDragState();
      return;
    }

    if (dragStart !== null && dragEnd !== null) {
      const startTime = getTimeFromPosition(Math.min(dragStart, dragEnd));
      const endTime = getTimeFromPosition(Math.max(dragStart, dragEnd));

      if (startTime !== endTime) {
        const schedule = schedules[`${activeEmployee}-${day}`] || {};
        const otherPeriod = getOtherPeriod(schedule, activePeriod.start.includes('morning') ? 'morning' : 'afternoon');

        const hasOverlap = checkPeriodOverlap(startTime, endTime, otherPeriod.start, otherPeriod.end);

        if (!hasOverlap) {
          if (isCreating || isDragging) {
            onSchedulePatch(activeEmployee, day, {
              [activePeriod.start]: startTime,
              [activePeriod.end]: endTime,
              ...(isCreating ? { [activePeriod.color]: selectedColor } : {}),
            });
          } else if (isResizing) {
            if (isResizing === 'start') {
              onSchedulePatch(activeEmployee, day, { [activePeriod.start]: startTime });
            } else {
              onSchedulePatch(activeEmployee, day, { [activePeriod.end]: endTime });
            }
          }
        }
      }
    }

    resetDragState();
  };

  // Sortie de la zone : on termine le geste comme un simple déplacement horaire
  // (pas de transfert involontaire vers la dernière ligne survolée)
  const handleTimelineMouseLeave = (e: React.MouseEvent) => {
    setHoverEmployee(null);
    handleTimelineMouseUp(e, false);
  };

  // Pendant un transfert, l'aperçu du créneau suit la ligne du salarié survolé
  const ghostRowEmployee = isTransferring ? hoverEmployee : activeEmployee;

  const handleDelete = (employeeId: number, period: 'morning' | 'afternoon') => {
    onSchedulePatch(employeeId, day, {
      [`${period}Start`]: '',
      [`${period}End`]: '',
      [`${period}Color`]: '',
    });
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
    <div className="flex flex-col gap-3">
      <div className="px-4 flex items-center justify-between gap-x-5 gap-y-2 flex-wrap">
        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap flex-1 min-w-0">
          <ColorPicker
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            managedColors={managedColors}
            onManageClick={onManageColorsClick}
            showRestDayButton
          />
          <ShiftToolsBar
            templates={shiftTemplates}
            managedColors={managedColors}
            onManageTemplatesClick={onManageTemplatesClick}
          />
          <div className="flex items-start gap-1.5 text-xs text-gray-500 max-w-2xl">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>
              Glissez un créneau vers la ligne d'un autre salarié pour le lui transférer
              (<strong>Maj</strong> = toute la journée, <strong>Ctrl</strong> = copier), ou saisissez
              ses extrémités pour avancer / reculer l'horaire. La colonne « Total jour » sert de
              poignée pour déplacer la journée entière.
            </span>
          </div>
        </div>
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
        className={`overflow-x-auto ${isDragging || isResizing ? 'select-none' : ''}`}
        ref={timelineRef}
        onMouseMove={handleTimelineMouseMove}
        onMouseUp={handleTimelineMouseUp}
        onMouseLeave={handleTimelineMouseLeave}
      >
        <div style={{ width: totalWidth }} className="relative">
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <div className="flex min-h-[36px]">
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
              <div style={{ width: COLUMN_WIDTH.dailyTotal }} className="flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-blue-700">{formatHours(totalDailyHours)}</span>
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
              const isRestDay = schedule.isRestDay === true;
              const absence = schedule.absence;
              const dailyHours = calculateDailyHours(schedule);
              const weeklyHours = calculateWeeklyHours(schedules, employee.id);
              const morningStyle = getColorStyle(schedule.morningColor);
              const afternoonStyle = getColorStyle(schedule.afternoonColor);
              const isRestDragOver = restDayDragOverEmployee === employee.id;

              const isTransferTarget = isTransferring && hoverEmployee === employee.id;
              const canDragDay = hasDayContent(schedule);
              const targetClass = isTransferTarget ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50' : '';

              return (
                <div
                  key={employee.id}
                  className="flex border-b border-gray-200"
                  onMouseEnter={() => setHoverEmployee(employee.id)}
                >
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

                  {isRestDay ? (
                    <div
                      className={`relative flex-grow h-9 flex items-center ${targetClass} ${
                        isRestDragOver ? 'ring-2 ring-inset ring-blue-400' : ''
                      }`}
                      style={{ width: timelineWidth, background: REST_DAY_STRIPES, backgroundColor: '#e5e7eb' }}
                      onDragOver={(e) => handleRestDayDragOver(e, employee.id)}
                      onDragLeave={handleRestDayDragLeave}
                      onDrop={(e) => handleRestDayDrop(e, employee.id)}
                    >
                      <div className="flex items-center gap-2 px-4">
                        <X className="w-4 h-4 text-red-500" strokeWidth={3} />
                        <span className="text-xs font-bold text-gray-500 uppercase">Repos</span>
                      </div>
                      <button
                        onClick={() => onToggleRestDay(employee.id, day, false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Retirer le jour de repos"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : absence ? (
                    <div
                      className={`relative flex-grow h-9 flex items-center ${targetClass} ${
                        isRestDragOver ? 'ring-2 ring-inset ring-blue-400' : ''
                      }`}
                      style={{ width: timelineWidth, background: REST_DAY_STRIPES, backgroundColor: '#fef3c7' }}
                      onDragOver={(e) => handleRestDayDragOver(e, employee.id)}
                      onDragLeave={handleRestDayDragLeave}
                      onDrop={(e) => handleRestDayDrop(e, employee.id)}
                    >
                      <div className="flex items-center gap-2 px-4">
                        <CalendarOff className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700 uppercase">{absence}</span>
                      </div>
                      <button
                        onClick={() => onSetAbsence(employee.id, day, null)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Retirer l'absence"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`relative flex-grow h-9 ${targetClass} ${
                        isRestDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
                      }`}
                      style={{ width: timelineWidth }}
                      onMouseDown={(e) => handleTimelineMouseDown(e, employee.id)}
                      onDragOver={(e) => handleRestDayDragOver(e, employee.id)}
                      onDragLeave={handleRestDayDragLeave}
                      onDrop={(e) => handleRestDayDrop(e, employee.id)}
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
                          title={PERIOD_DRAG_HINT}
                          onMouseDown={(e) => handlePeriodMouseDown(e, employee.id, 'morning')}
                          onClick={(e) => handlePeriodClick(e, employee.id, 'morning')}
                        >
                          <EdgeGrip side="start" color={morningStyle.text || '#1E3A8A'} />
                          <EdgeGrip side="end" color={morningStyle.text || '#1E3A8A'} />
                          <span
                            className="text-xs px-2 leading-[28px] whitespace-nowrap pointer-events-none"
                            style={{ color: morningStyle.text || '#1E3A8A' }}
                          >
                            {schedule.morningStart} - {schedule.morningEnd}
                          </span>
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); handleDelete(employee.id, 'morning'); }}
                            className="absolute top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 z-[3]"
                            style={{ right: EDGE_GRIP_WIDTH }}
                            title="Supprimer ce créneau"
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
                          title={PERIOD_DRAG_HINT}
                          onMouseDown={(e) => handlePeriodMouseDown(e, employee.id, 'afternoon')}
                          onClick={(e) => handlePeriodClick(e, employee.id, 'afternoon')}
                        >
                          <EdgeGrip side="start" color={afternoonStyle.text || '#374151'} />
                          <EdgeGrip side="end" color={afternoonStyle.text || '#374151'} />
                          <span
                            className="text-xs px-2 leading-[28px] whitespace-nowrap pointer-events-none"
                            style={{ color: afternoonStyle.text || '#374151' }}
                          >
                            {schedule.afternoonStart} - {schedule.afternoonEnd}
                          </span>
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); handleDelete(employee.id, 'afternoon'); }}
                            className="absolute top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 z-[3]"
                            style={{ right: EDGE_GRIP_WIDTH }}
                            title="Supprimer ce créneau"
                          >
                            <X className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      )}

                      {(isCreating || isDragging || isResizing) && ghostRowEmployee === employee.id && dragStart !== null && dragEnd !== null && (
                        <div
                          className={`absolute h-7 top-1 border border-dashed rounded pointer-events-none z-[4] ${
                            isTransferring
                              ? 'bg-emerald-100/80 border-emerald-400'
                              : 'bg-blue-100/70 border-blue-200'
                          }`}
                          style={{
                            left: Math.min(dragStart, dragEnd),
                            width: Math.abs(dragEnd - dragStart),
                          }}
                        >
                          <span
                            className={`text-xs px-2 leading-[28px] whitespace-nowrap ${
                              isTransferring ? 'text-emerald-800 font-semibold' : 'text-blue-800'
                            }`}
                          >
                            {isTransferring && '→ '}
                            {wholeDayTransfer && isTransferring
                              ? 'Journée entière'
                              : `${getTimeFromPosition(Math.min(dragStart, dragEnd))} - ${getTimeFromPosition(Math.max(dragStart, dragEnd))}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{ width: COLUMN_WIDTH.dailyTotal }}
                    className={`flex-shrink-0 border-l border-gray-200 flex items-center justify-center gap-1 ${
                      canDragDay ? 'cursor-grab active:cursor-grabbing hover:bg-blue-50' : ''
                    } ${draggedDayEmployee === employee.id ? 'opacity-40' : ''}`}
                    {...(canDragDay
                      ? {
                          draggable: true,
                          title: DAY_DRAG_HINT,
                          onDragStart: (e: React.DragEvent) => handleDayDragStart(e, employee.id),
                          onDragEnd: () => setDraggedDayEmployee(null),
                        }
                      : {})}
                  >
                    <span className="text-sm font-medium text-blue-600">
                      {formatHours(dailyHours)}
                    </span>
                    {canDragDay && <MoveVertical className="w-3 h-3 text-gray-400" />}
                  </div>
                  <div style={{ width: COLUMN_WIDTH.weeklyTotal }} className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {formatHours(weeklyHours)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ligne de couverture : nombre de présents par créneau de 15 min */}
          <div className="flex border-t-2 border-gray-400 bg-gray-50" style={{ height: 30 }}>
            <div
              style={{ width: COLUMN_WIDTH.employee }}
              className="flex-shrink-0 border-r border-gray-200 flex items-center gap-1.5 px-2"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-600">Présents</span>
            </div>
            <div className="flex" style={{ width: timelineWidth }}>
              {coverage.map((slot) => {
                const intensity = slot.count === 0 ? 0 : 0.15 + 0.55 * (slot.count / maxCoverage);
                return (
                  <div
                    key={slot.slotStart}
                    className="flex items-center justify-center border-r border-gray-100 cursor-help"
                    style={{
                      width: HOUR_WIDTH / 4,
                      backgroundColor: slot.count > 0 ? `rgba(37, 99, 235, ${intensity})` : undefined,
                    }}
                    title={coverageTooltip(slot)}
                  >
                    {slot.count > 0 && (
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: slot.count / maxCoverage > 0.6 ? '#ffffff' : '#1e3a8a' }}
                      >
                        {slot.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              style={{ width: COLUMN_WIDTH.dailyTotal + COLUMN_WIDTH.weeklyTotal }}
              className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center"
            >
              <span className="text-[10px] text-gray-400">max {maxCoverage}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

import React, { useState, useRef, useEffect } from 'react';
import { Download, X, Copy, ClipboardPaste, AlertTriangle, CalendarOff } from 'lucide-react';
import { Employee, Schedule, ManagedColor, ShiftTemplate, AbsencePeriod } from '../types';
import AbsencePeriodChooser from './AbsencePeriodChooser';
import { findManagedColor, getTextColorForHex } from '../utils/colorUtils';
import { calculateWeeklyHours } from '../utils/scheduleCalculations';
import { calculateDayTotal, calculateGrandTotal } from '../utils/totalsCalculations';
import { getEmployeeComplianceIssues } from '../utils/compliance';
import ColorPicker from './ColorPicker';
import ShiftToolsBar from './ShiftToolsBar';
import TimeInput from './TimeInput';
import { exportVisualToPDF } from '../utils/pdfExport';
import PDFExportModal, { PDFExportOptions } from './PDFExportModal';

import { isPlanningDrag } from '../utils/planningDrag';

const REST_DAY_STRIPES = `repeating-linear-gradient(
  -45deg,
  transparent,
  transparent 4px,
  rgba(0,0,0,0.06) 4px,
  rgba(0,0,0,0.06) 8px
)`;

interface WeeklyVisualViewProps {
  employees: Employee[];
  days: string[];
  dates: string[];
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  managedColors: ManagedColor[];
  onSchedulePatch: (employeeId: number, day: string, patch: Partial<Schedule>) => void;
  onManageColorsClick: () => void;
  onToggleRestDay: (employeeId: number, day: string, isRest: boolean) => void;
  copiedDay: string | null;
  onCopyDay: (day: string) => void;
  onPasteDay: (day: string) => void;
  shiftTemplates: ShiftTemplate[];
  onManageTemplatesClick: () => void;
  onApplyTemplate: (employeeId: number, day: string, template: ShiftTemplate, fallbackColor: string) => void;
  onSetAbsence: (employeeId: number, day: string, label: string | null, period?: AbsencePeriod) => void;
}

// Bloc d'absence sur une demi-journée (fond ambre hachuré, libellé + retrait)
const HalfAbsenceBlock: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <div
    className="flex items-center justify-center gap-1 rounded px-2 py-1 w-full relative group/half"
    style={{ background: REST_DAY_STRIPES, backgroundColor: '#fef3c7' }}
  >
    <CalendarOff className="w-3 h-3 text-amber-600" />
    <span className="text-[11px] font-bold text-amber-700 uppercase">{label}</span>
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      className="absolute top-0 right-0 p-0.5 text-gray-400 opacity-0 group-hover/half:opacity-100 hover:text-red-500 transition-all"
      title="Retirer l'absence"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

interface ShiftBlockProps {
  start: string;
  end: string;
  colorId: string | undefined;
  managedColors: ManagedColor[];
}

const ShiftBlock: React.FC<ShiftBlockProps> = ({ start, end, colorId, managedColors }) => {
  if (!start || !end) return null;

  const mc = colorId ? findManagedColor(managedColors, colorId) : null;
  const bgColor = mc?.hex || '#d1d5db';
  const textColor = getTextColorForHex(bgColor);

  return (
    <div
      className="rounded px-2 py-1 text-center leading-tight w-full"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span className="text-sm font-semibold whitespace-nowrap">
        {start}–{end}
      </span>
    </div>
  );
};

interface EditableShiftProps {
  label: string;
  start: string;
  end: string;
  colorId: string | undefined;
  managedColors: ManagedColor[];
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export const EditableShift: React.FC<EditableShiftProps> = ({
  label,
  start,
  end,
  colorId,
  managedColors,
  onStartChange,
  onEndChange,
}) => {
  const mc = colorId ? findManagedColor(managedColors, colorId) : null;
  const bgColor = mc?.hex || undefined;
  const textColor = bgColor ? getTextColorForHex(bgColor) : undefined;

  return (
    <div
      className="rounded px-1.5 py-0.5 w-full"
      style={bgColor ? { backgroundColor: bgColor, color: textColor } : { backgroundColor: '#f3f4f6' }}
    >
      <div className="text-[10px] font-medium opacity-70 mb-0.5">{label}</div>
      <div className="flex gap-0.5 items-center justify-center">
        <TimeInput
          value={start}
          onChange={onStartChange}
          placeholder=":"
          minTime="06:30"
          maxTime="20:00"
        />
        <span className="text-xs font-bold" style={textColor ? { color: textColor } : {}}>-</span>
        <TimeInput
          value={end}
          onChange={onEndChange}
          placeholder=":"
          minTime="06:30"
          maxTime="20:00"
        />
      </div>
    </div>
  );
};

interface EditableDayCellProps {
  schedule: Schedule | undefined;
  managedColors: ManagedColor[];
  selectedColor: string;
  employeeId: number;
  day: string;
  onSchedulePatch: (employeeId: number, day: string, patch: Partial<Schedule>) => void;
  onToggleRestDay: (employeeId: number, day: string, isRest: boolean) => void;
  onSetAbsence: (employeeId: number, day: string, label: string | null, period?: AbsencePeriod) => void;
  isRestDayDragOver: boolean;
  onRestDayDragOver: (e: React.DragEvent) => void;
  onRestDayDragLeave: (e: React.DragEvent) => void;
  onRestDayDrop: (e: React.DragEvent) => void;
  pendingAbsenceLabel: string | null;
  onResolvePendingAbsence: (period: AbsencePeriod | null) => void;
}

const EditableDayCell: React.FC<EditableDayCellProps> = ({
  schedule,
  managedColors,
  selectedColor,
  employeeId,
  day,
  onSchedulePatch,
  onToggleRestDay,
  onSetAbsence,
  isRestDayDragOver,
  onRestDayDragOver,
  onRestDayDragLeave,
  onRestDayDrop,
  pendingAbsenceLabel,
  onResolvePendingAbsence,
}) => {
  const [editing, setEditing] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing]);

  const absenceChooser = pendingAbsenceLabel && (
    <AbsencePeriodChooser
      label={pendingAbsenceLabel}
      onChoose={(period) => onResolvePendingAbsence(period)}
      onCancel={() => onResolvePendingAbsence(null)}
    />
  );

  if (schedule?.isRestDay) {
    return (
      <div
        className="flex items-center justify-center h-full min-h-[48px] relative"
        style={{ background: REST_DAY_STRIPES, backgroundColor: '#e5e7eb' }}
        onDragOver={onRestDayDragOver}
        onDragLeave={onRestDayDragLeave}
        onDrop={onRestDayDrop}
      >
        <div className="flex items-center gap-1">
          <X className="w-4 h-4 text-red-500" strokeWidth={3} />
          <span className="text-xs font-bold text-gray-500 uppercase">Repos</span>
        </div>
        <button
          onClick={() => onToggleRestDay(employeeId, day, false)}
          className="absolute top-0 right-0 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
          title="Retirer le jour de repos"
        >
          <X className="w-3 h-3" />
        </button>
        {absenceChooser}
      </div>
    );
  }

  if (schedule?.absence) {
    return (
      <div
        className="flex items-center justify-center h-full min-h-[48px] relative"
        style={{ background: REST_DAY_STRIPES, backgroundColor: '#fef3c7' }}
        onDragOver={onRestDayDragOver}
        onDragLeave={onRestDayDragLeave}
        onDrop={onRestDayDrop}
      >
        <div className="flex items-center gap-1">
          <CalendarOff className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase">{schedule.absence}</span>
        </div>
        <button
          onClick={() => onSetAbsence(employeeId, day, null)}
          className="absolute top-0 right-0 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
          title="Retirer l'absence"
        >
          <X className="w-3 h-3" />
        </button>
        {absenceChooser}
      </div>
    );
  }

  const hasMorning = schedule?.morningStart && schedule?.morningEnd;
  const hasAfternoon = schedule?.afternoonStart && schedule?.afternoonEnd;
  const morningAbsence = schedule?.morningAbsence;
  const afternoonAbsence = schedule?.afternoonAbsence;

  if (editing) {
    return (
      <div
        ref={cellRef}
        className={`relative flex flex-col gap-0.5 p-0.5 min-h-[48px] justify-center ${
          isRestDayDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
        }`}
        onDragOver={onRestDayDragOver}
        onDragLeave={onRestDayDragLeave}
        onDrop={onRestDayDrop}
      >
        {morningAbsence ? (
          <HalfAbsenceBlock
            label={morningAbsence}
            onRemove={() => onSetAbsence(employeeId, day, null, 'morning')}
          />
        ) : (
          <EditableShift
            label="Matin"
            start={schedule?.morningStart || ''}
            end={schedule?.morningEnd || ''}
            colorId={schedule?.morningColor}
            managedColors={managedColors}
            onStartChange={(v) => onSchedulePatch(employeeId, day, {
              morningStart: v,
              ...(v && !schedule?.morningColor ? { morningColor: selectedColor } : {}),
            })}
            onEndChange={(v) => onSchedulePatch(employeeId, day, {
              morningEnd: v,
              ...(v && !schedule?.morningColor ? { morningColor: selectedColor } : {}),
            })}
          />
        )}
        {afternoonAbsence ? (
          <HalfAbsenceBlock
            label={afternoonAbsence}
            onRemove={() => onSetAbsence(employeeId, day, null, 'afternoon')}
          />
        ) : (
          <EditableShift
            label="Apres-midi"
            start={schedule?.afternoonStart || ''}
            end={schedule?.afternoonEnd || ''}
            colorId={schedule?.afternoonColor}
            managedColors={managedColors}
            onStartChange={(v) => onSchedulePatch(employeeId, day, {
              afternoonStart: v,
              ...(v && !schedule?.afternoonColor ? { afternoonColor: selectedColor } : {}),
            })}
            onEndChange={(v) => onSchedulePatch(employeeId, day, {
              afternoonEnd: v,
              ...(v && !schedule?.afternoonColor ? { afternoonColor: selectedColor } : {}),
            })}
          />
        )}
        {absenceChooser}
      </div>
    );
  }

  // Display mode - click to edit
  return (
    <div
      className={`relative flex flex-col gap-0.5 p-1 min-h-[48px] justify-center cursor-pointer hover:bg-blue-50/50 transition-colors ${
        isRestDayDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
      }`}
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      onDragOver={onRestDayDragOver}
      onDragLeave={onRestDayDragLeave}
      onDrop={onRestDayDrop}
    >
      {!hasMorning && !hasAfternoon && !morningAbsence && !afternoonAbsence ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-300 text-sm">—</span>
        </div>
      ) : (
        <>
          {morningAbsence ? (
            <HalfAbsenceBlock
              label={morningAbsence}
              onRemove={() => onSetAbsence(employeeId, day, null, 'morning')}
            />
          ) : hasMorning && (
            <ShiftBlock
              start={schedule!.morningStart}
              end={schedule!.morningEnd}
              colorId={schedule!.morningColor}
              managedColors={managedColors}
            />
          )}
          {afternoonAbsence ? (
            <HalfAbsenceBlock
              label={afternoonAbsence}
              onRemove={() => onSetAbsence(employeeId, day, null, 'afternoon')}
            />
          ) : hasAfternoon && (
            <ShiftBlock
              start={schedule!.afternoonStart}
              end={schedule!.afternoonEnd}
              colorId={schedule!.afternoonColor}
              managedColors={managedColors}
            />
          )}
        </>
      )}
      {absenceChooser}
    </div>
  );
};

const WeeklyVisualView: React.FC<WeeklyVisualViewProps> = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year,
  managedColors,
  onSchedulePatch,
  onManageColorsClick,
  onToggleRestDay,
  copiedDay,
  onCopyDay,
  onPasteDay,
  shiftTemplates,
  onManageTemplatesClick,
  onApplyTemplate,
  onSetAbsence,
}) => {
  const [exporting, setExporting] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState('bleu');
  const [restDayDragOverCell, setRestDayDragOverCell] = useState<string | null>(null);
  const [pendingAbsence, setPendingAbsence] = useState<{ cellKey: string; employeeId: number; day: string; label: string } | null>(null);

  const handleExportPDF = async (options: PDFExportOptions) => {
    setShowPDFModal(false);
    setExporting(true);
    try {
      await exportVisualToPDF({ employees, days, dates, schedules, weekNumber, year, managedColors, options });
    } catch {
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  };

  // Accepte les glisser-déposer de repos, de modèles de créneaux et d'absences
  const handleRestDayDragOver = (e: React.DragEvent, cellKey: string) => {
    if (isPlanningDrag(e)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setRestDayDragOverCell(cellKey);
    }
  };

  const handleRestDayDragLeave = (e: React.DragEvent) => {
    if (isPlanningDrag(e)) {
      setRestDayDragOverCell(null);
    }
  };

  const handleRestDayDrop = (e: React.DragEvent, employeeId: number, day: string) => {
    if (!isPlanningDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setRestDayDragOverCell(null);

    const templateData = e.dataTransfer.getData('application/shift-template');
    const absenceLabel = e.dataTransfer.getData('application/absence');
    if (templateData) {
      onApplyTemplate(employeeId, day, JSON.parse(templateData) as ShiftTemplate, selectedColor);
    } else if (absenceLabel) {
      // La portée (journée / matin / après-midi) est choisie dans un petit panneau sur la cellule
      setPendingAbsence({ cellKey: `${employeeId}-${day}`, employeeId, day, label: absenceLabel });
    } else {
      onToggleRestDay(employeeId, day, true);
    }
  };

  const resolvePendingAbsence = (period: AbsencePeriod | null) => {
    if (pendingAbsence && period) {
      onSetAbsence(pendingAbsence.employeeId, pendingAbsence.day, pendingAbsence.label, period);
    }
    setPendingAbsence(null);
  };

  return (
    <div className="space-y-4">
      <div className="px-4 flex justify-between items-start gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <ColorPicker
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            managedColors={managedColors}
            onManageClick={onManageColorsClick}
            showRestDayButton={true}
          />
          <ShiftToolsBar
            templates={shiftTemplates}
            managedColors={managedColors}
            onManageTemplatesClick={onManageTemplatesClick}
          />
        </div>

        <button
          onClick={() => setShowPDFModal(true)}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <Download className="w-5 h-5" />
          <span>{exporting ? 'Export en cours…' : 'Exporter PDF / PNG'}</span>
        </button>

        {showPDFModal && (
          <PDFExportModal
            onConfirm={handleExportPDF}
            onCancel={() => setShowPDFModal(false)}
          />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th
                className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 bg-gray-200 sticky left-0 z-10"
                style={{ minWidth: 130 }}
              >
                EMPLOYE
              </th>
              {days.map((day, i) => (
                <th
                  key={day}
                  className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700"
                  style={{ minWidth: 119 }}
                >
                  <div className="text-sm">{day}</div>
                  <div className="text-xs font-normal text-gray-500">{dates[i]}</div>
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
                </th>
              ))}
              <th
                className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700 bg-gray-200"
                style={{ minWidth: 90 }}
              >
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, idx) => {
              const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
              const complianceIssues = getEmployeeComplianceIssues(schedules, employee.id);
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

              return (
                <tr key={employee.id} className={`${rowBg} hover:bg-blue-50/30 transition-colors`}>
                  <td
                    className={`border border-gray-300 px-3 py-1 font-medium text-gray-800 sticky left-0 z-10 ${rowBg}`}
                  >
                    {employee.name}
                  </td>
                  {days.map((day) => {
                    const schedule = schedules[`${employee.id}-${day}`];
                    const cellKey = `${employee.id}-${day}`;
                    return (
                      <td
                        key={cellKey}
                        className="border border-gray-300 align-middle p-0"
                      >
                        <EditableDayCell
                          schedule={schedule}
                          managedColors={managedColors}
                          selectedColor={selectedColor}
                          employeeId={employee.id}
                          day={day}
                          onSchedulePatch={onSchedulePatch}
                          onToggleRestDay={onToggleRestDay}
                          onSetAbsence={onSetAbsence}
                          isRestDayDragOver={restDayDragOverCell === cellKey}
                          onRestDayDragOver={(e) => handleRestDayDragOver(e, cellKey)}
                          onRestDayDragLeave={handleRestDayDragLeave}
                          onRestDayDrop={(e) => handleRestDayDrop(e, employee.id, day)}
                          pendingAbsenceLabel={pendingAbsence?.cellKey === cellKey ? pendingAbsence.label : null}
                          onResolvePendingAbsence={resolvePendingAbsence}
                        />
                      </td>
                    );
                  })}
                  <td className="border border-gray-300 text-center font-bold text-blue-700 align-middle">
                    <div className="flex items-center justify-center gap-1">
                      {weeklyTotal > 0 ? `${weeklyTotal.toFixed(1)}h` : '—'}
                      {complianceIssues.length > 0 && (
                        <span
                          title={complianceIssues.map(i => i.message).join('\n')}
                          className="cursor-help"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr className="bg-gray-200 font-bold border-t-2 border-gray-400">
              <td className="border border-gray-300 px-3 py-2 text-gray-800 sticky left-0 z-10 bg-gray-200">
                TOTAUX
              </td>
              {days.map((day) => (
                <td
                  key={day}
                  className="border border-gray-300 text-center py-2 text-blue-700"
                >
                  {(() => {
                    const t = calculateDayTotal(schedules, day);
                    return t > 0 ? `${t.toFixed(1)}h` : '—';
                  })()}
                </td>
              ))}
              <td className="border border-gray-300 text-center py-2 text-blue-700">
                {(() => {
                  const t = calculateGrandTotal(schedules);
                  return t > 0 ? `${t.toFixed(1)}h` : '—';
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyVisualView;

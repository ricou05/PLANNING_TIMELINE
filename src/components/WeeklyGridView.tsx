import React, { useState, useRef, useEffect } from 'react';
import { Download, X, Copy, ClipboardPaste, AlertTriangle, CalendarOff } from 'lucide-react';
import { Employee, Schedule, ManagedColor, ShiftTemplate, AbsencePeriod } from '../types';
import { findManagedColor, getTextColorForHex } from '../utils/colorUtils';
import { calculateWeeklyHours } from '../utils/scheduleCalculations';
import { calculateDayTotal, calculateGrandTotal } from '../utils/totalsCalculations';
import { getEmployeeComplianceIssues } from '../utils/compliance';
import ColorPicker from './ColorPicker';
import ShiftToolsBar from './ShiftToolsBar';
import AbsencePeriodChooser from './AbsencePeriodChooser';
import { EditableShift } from './WeeklyVisualView';
import { isPlanningDrag } from '../utils/planningDrag';
import { REST_DAY_STRIPES } from '../utils/cellStyles';
import { exportGridToPDF } from '../utils/pdfExport';
import PDFExportModal, { PDFExportOptions } from './PDFExportModal';

// Teinte rosée des en-têtes de jours alternés, comme sur le planning Excel d'origine
const HEADER_PINK = '#f4cccc';

interface WeeklyGridViewProps {
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

// Absence en attente de choix de portée (journée / matin / après-midi)
interface PendingAbsence {
  cellKey: string;
  employeeId: number;
  day: string;
  label: string;
}

// Croix diagonale (style bordures Excel) recouvrant toute la cellule
const DiagonalCross: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    preserveAspectRatio="none"
    viewBox="0 0 100 100"
  >
    <line x1="0" y1="0" x2="100" y2="100" stroke="#374151" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="100" x2="100" y2="0" stroke="#374151" strokeWidth="1" vectorEffect="non-scaling-stroke" />
  </svg>
);

// Demi-journée : plage horaire sur fond entièrement coloré, absence sur fond
// ambre hachuré, ou tiret si vide
const HalfDayBlock: React.FC<{
  start: string;
  end: string;
  colorId: string | undefined;
  managedColors: ManagedColor[];
  absence?: string;
  onRemoveAbsence?: () => void;
}> = ({ start, end, colorId, managedColors, absence, onRemoveAbsence }) => {
  if (absence) {
    return (
      <div
        className="flex-1 flex items-center justify-center relative group/half"
        style={{ background: REST_DAY_STRIPES, backgroundColor: '#fef3c7' }}
      >
        <div className="flex items-center gap-1">
          <CalendarOff className="w-3 h-3 text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase">{absence}</span>
        </div>
        {onRemoveAbsence && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveAbsence(); }}
            className="absolute top-0 right-0 p-0.5 text-gray-400 opacity-0 group-hover/half:opacity-100 hover:text-red-500 transition-all"
            title="Retirer l'absence"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (!start || !end) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-gray-500 text-base">-</span>
      </div>
    );
  }

  const mc = findManagedColor(managedColors, colorId);
  const bgColor = mc?.hex || '#d1d5db';
  const textColor = getTextColorForHex(bgColor);

  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span className="text-sm font-semibold whitespace-nowrap">
        {start} - {end}
      </span>
    </div>
  );
};

interface GridDayCellProps {
  schedule: Schedule | undefined;
  managedColors: ManagedColor[];
  selectedColor: string;
  employeeId: number;
  day: string;
  onSchedulePatch: (employeeId: number, day: string, patch: Partial<Schedule>) => void;
  onToggleRestDay: (employeeId: number, day: string, isRest: boolean) => void;
  onSetAbsence: (employeeId: number, day: string, label: string | null, period?: AbsencePeriod) => void;
  isDragOver: boolean;
  onCellDragOver: (e: React.DragEvent) => void;
  onCellDragLeave: (e: React.DragEvent) => void;
  onCellDrop: (e: React.DragEvent) => void;
  pendingAbsenceLabel: string | null;
  onResolvePendingAbsence: (period: AbsencePeriod | null) => void;
}

const GridDayCell: React.FC<GridDayCellProps> = ({
  schedule,
  managedColors,
  selectedColor,
  employeeId,
  day,
  onSchedulePatch,
  onToggleRestDay,
  onSetAbsence,
  isDragOver,
  onCellDragOver,
  onCellDragLeave,
  onCellDrop,
  pendingAbsenceLabel,
  onResolvePendingAbsence,
}) => {
  const [editing, setEditing] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  const absenceChooser = pendingAbsenceLabel && (
    <AbsencePeriodChooser
      label={pendingAbsenceLabel}
      onChoose={(period) => onResolvePendingAbsence(period)}
      onCancel={() => onResolvePendingAbsence(null)}
    />
  );

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

  // Jour de repos : croix diagonale sur toute la cellule, comme sur le planning Excel
  if (schedule?.isRestDay) {
    return (
      <div
        className={`relative flex flex-col h-full min-h-[52px] group ${
          isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
        }`}
        onDragOver={onCellDragOver}
        onDragLeave={onCellDragLeave}
        onDrop={onCellDrop}
      >
        <DiagonalCross />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500 text-sm">-</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500 text-sm">-</span>
        </div>
        <button
          onClick={() => onToggleRestDay(employeeId, day, false)}
          className="absolute top-0 right-0 p-0.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
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
        className={`relative flex items-center justify-center h-full min-h-[52px] group bg-amber-50 ${
          isDragOver ? 'ring-2 ring-inset ring-blue-400' : ''
        }`}
        onDragOver={onCellDragOver}
        onDragLeave={onCellDragLeave}
        onDrop={onCellDrop}
      >
        <DiagonalCross />
        <div className="flex items-center gap-1">
          <CalendarOff className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase">{schedule.absence}</span>
        </div>
        <button
          onClick={() => onSetAbsence(employeeId, day, null)}
          className="absolute top-0 right-0 p-0.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
          title="Retirer l'absence"
        >
          <X className="w-3 h-3" />
        </button>
        {absenceChooser}
      </div>
    );
  }

  if (editing) {
    return (
      <div
        ref={cellRef}
        className={`relative flex flex-col gap-0.5 p-0.5 min-h-[52px] justify-center ${
          isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
        }`}
        onDragOver={onCellDragOver}
        onDragLeave={onCellDragLeave}
        onDrop={onCellDrop}
      >
        {schedule?.morningAbsence ? (
          <div
            className="flex items-center justify-center gap-1 rounded px-1.5 py-1.5"
            style={{ background: REST_DAY_STRIPES, backgroundColor: '#fef3c7' }}
          >
            <CalendarOff className="w-3 h-3 text-amber-600" />
            <span className="text-[11px] font-bold text-amber-700 uppercase">{schedule.morningAbsence}</span>
            <button
              onClick={() => onSetAbsence(employeeId, day, null, 'morning')}
              className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Retirer l'absence du matin"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
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
        {schedule?.afternoonAbsence ? (
          <div
            className="flex items-center justify-center gap-1 rounded px-1.5 py-1.5"
            style={{ background: REST_DAY_STRIPES, backgroundColor: '#fef3c7' }}
          >
            <CalendarOff className="w-3 h-3 text-amber-600" />
            <span className="text-[11px] font-bold text-amber-700 uppercase">{schedule.afternoonAbsence}</span>
            <button
              onClick={() => onSetAbsence(employeeId, day, null, 'afternoon')}
              className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Retirer l'absence de l'après-midi"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
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

  // Affichage : deux demi-journées empilées, remplissant toute la cellule (clic pour éditer)
  return (
    <div
      className={`relative flex flex-col h-full min-h-[52px] cursor-pointer hover:brightness-95 transition-all ${
        isDragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''
      }`}
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      onDragOver={onCellDragOver}
      onDragLeave={onCellDragLeave}
      onDrop={onCellDrop}
    >
      <HalfDayBlock
        start={schedule?.morningStart || ''}
        end={schedule?.morningEnd || ''}
        colorId={schedule?.morningColor}
        managedColors={managedColors}
        absence={schedule?.morningAbsence}
        onRemoveAbsence={() => onSetAbsence(employeeId, day, null, 'morning')}
      />
      <HalfDayBlock
        start={schedule?.afternoonStart || ''}
        end={schedule?.afternoonEnd || ''}
        colorId={schedule?.afternoonColor}
        managedColors={managedColors}
        absence={schedule?.afternoonAbsence}
        onRemoveAbsence={() => onSetAbsence(employeeId, day, null, 'afternoon')}
      />
      {absenceChooser}
    </div>
  );
};

const WeeklyGridView: React.FC<WeeklyGridViewProps> = ({
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
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [pendingAbsence, setPendingAbsence] = useState<PendingAbsence | null>(null);

  const handleExportPDF = async (options: PDFExportOptions) => {
    setShowPDFModal(false);
    setExporting(true);
    try {
      await exportGridToPDF({ employees, days, dates, schedules, weekNumber, year, managedColors, options });
    } catch {
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  };

  // Accepte les glisser-déposer de repos, de modèles de créneaux et d'absences
  const handleCellDragOver = (e: React.DragEvent, cellKey: string) => {
    if (isPlanningDrag(e)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setDragOverCell(cellKey);
    }
  };

  const handleCellDragLeave = (e: React.DragEvent) => {
    if (isPlanningDrag(e)) {
      setDragOverCell(null);
    }
  };

  const handleCellDrop = (e: React.DragEvent, employeeId: number, day: string) => {
    if (!isPlanningDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);

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

  // Numéro du jour (le format d'entrée est "jj/mm")
  const dayNumberOf = (date: string): string => {
    const dayPart = date.split('/')[0];
    const n = parseInt(dayPart, 10);
    return Number.isNaN(n) ? date : String(n);
  };

  return (
    <div className="space-y-4">
      <div className="px-4 pt-4 flex justify-between items-start gap-4 flex-wrap">
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
          <span>{exporting ? 'Export en cours…' : 'Exporter PDF'}</span>
        </button>

        {showPDFModal && (
          <PDFExportModal
            onConfirm={handleExportPDF}
            onCancel={() => setShowPDFModal(false)}
          />
        )}
      </div>

      <div className="overflow-x-auto pb-4 px-4">
        {/* Largeur bornée et colonnes en pourcentage (table-fixed) : les proportions
            du modèle sont conservées quelle que soit la taille de la fenêtre */}
        <table className="border-collapse text-sm w-full min-w-[960px] max-w-[1280px] mx-auto table-fixed">
          <colgroup>
            <col style={{ width: '12%' }} />
            {days.map((day) => (
              <col key={day} />
            ))}
            <col style={{ width: '7.5%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="border border-gray-700 px-3 py-1 bg-white sticky left-0 z-10" />
              {days.map((day, i) => (
                <th
                  key={day}
                  className="border border-gray-700 px-2 py-1 text-center text-gray-900"
                  style={{ backgroundColor: i % 2 === 1 ? HEADER_PINK : '#ffffff' }}
                >
                  <div className="text-base font-bold leading-tight">{day}</div>
                  <div className="text-[15px] font-normal leading-tight">{dayNumberOf(dates[i])}</div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onCopyDay(day)}
                      title={`Copier ${day}`}
                      className={`p-0.5 rounded transition-colors ${
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
                        className="p-0.5 rounded text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th
                className="border border-gray-700 px-2 py-1 text-center font-bold text-gray-900 bg-white"
                style={{ minWidth: 80 }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
              const complianceIssues = getEmployeeComplianceIssues(schedules, employee.id);

              return (
                <tr key={employee.id} className="bg-white">
                  <td className="border border-gray-700 px-3 py-1 font-bold text-gray-900 text-[15px] sticky left-0 z-10 bg-white">
                    {employee.name}
                  </td>
                  {days.map((day) => {
                    const cellKey = `${employee.id}-${day}`;
                    return (
                      <td key={cellKey} className="border border-gray-700 align-middle p-0">
                        <GridDayCell
                          schedule={schedules[cellKey]}
                          managedColors={managedColors}
                          selectedColor={selectedColor}
                          employeeId={employee.id}
                          day={day}
                          onSchedulePatch={onSchedulePatch}
                          onToggleRestDay={onToggleRestDay}
                          onSetAbsence={onSetAbsence}
                          isDragOver={dragOverCell === cellKey}
                          onCellDragOver={(e) => handleCellDragOver(e, cellKey)}
                          onCellDragLeave={handleCellDragLeave}
                          onCellDrop={(e) => handleCellDrop(e, employee.id, day)}
                          pendingAbsenceLabel={pendingAbsence?.cellKey === cellKey ? pendingAbsence.label : null}
                          onResolvePendingAbsence={resolvePendingAbsence}
                        />
                      </td>
                    );
                  })}
                  <td className="border border-gray-700 text-center font-bold text-gray-900 text-[15px] align-middle">
                    <div className="flex items-center justify-center gap-1">
                      {weeklyTotal > 0 ? `${weeklyTotal.toFixed(1)}h` : '-'}
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

            {/* Ligne des totaux par jour */}
            <tr className="bg-gray-100 font-bold text-[15px]">
              <td className="border border-gray-700 px-3 py-1.5 text-gray-900 sticky left-0 z-10 bg-gray-100">
                Totaux
              </td>
              {days.map((day) => (
                <td key={day} className="border border-gray-700 text-center py-1.5 text-gray-900">
                  {(() => {
                    const t = calculateDayTotal(schedules, day);
                    return t > 0 ? `${t.toFixed(1)}h` : '-';
                  })()}
                </td>
              ))}
              <td className="border border-gray-700 text-center py-1.5 text-gray-900">
                {(() => {
                  const t = calculateGrandTotal(schedules);
                  return t > 0 ? `${t.toFixed(1)}h` : '-';
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyGridView;

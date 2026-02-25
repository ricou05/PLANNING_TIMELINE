import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Employee, Schedule, ManagedColor } from '../types';
import { findManagedColor, getTextColorForHex } from '../utils/colorUtils';
import { calculateWeeklyHours } from '../utils/scheduleCalculations';
import { calculateDayTotal, calculateGrandTotal } from '../utils/totalsCalculations';
import ColorLegends from './ColorLegends';
import { exportVisualToPDF } from '../utils/pdfExport';
import PDFExportModal, { PDFExportOptions } from './PDFExportModal';

interface WeeklyVisualViewProps {
  employees: Employee[];
  days: string[];
  dates: string[];
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  managedColors: ManagedColor[];
}

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

const DayCell: React.FC<{
  schedule: Schedule | undefined;
  managedColors: ManagedColor[];
}> = ({ schedule, managedColors }) => {
  const hasMorning = schedule?.morningStart && schedule?.morningEnd;
  const hasAfternoon = schedule?.afternoonStart && schedule?.afternoonEnd;

  if (!hasMorning && !hasAfternoon) {
    return (
      <div className="flex items-center justify-center h-full min-h-[48px]">
        <span className="text-gray-300 text-sm">—</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 p-1 min-h-[48px] justify-center">
      {hasMorning && (
        <ShiftBlock
          start={schedule!.morningStart}
          end={schedule!.morningEnd}
          colorId={schedule!.morningColor}
          managedColors={managedColors}
        />
      )}
      {hasAfternoon && (
        <ShiftBlock
          start={schedule!.afternoonStart}
          end={schedule!.afternoonEnd}
          colorId={schedule!.afternoonColor}
          managedColors={managedColors}
        />
      )}
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
}) => {
  const [exporting, setExporting] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="px-4 flex justify-end">
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

      <ColorLegends managedColors={managedColors} />

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
                  style={{ minWidth: 125 }}
                >
                  <div className="text-sm">{day}</div>
                  <div className="text-xs font-normal text-gray-500">{dates[i]}</div>
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
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

              return (
                <tr key={employee.id} className={`${rowBg} hover:bg-blue-50 transition-colors`}>
                  <td
                    className={`border border-gray-300 px-3 py-1 font-medium text-gray-800 sticky left-0 z-10 ${rowBg}`}
                  >
                    {employee.name}
                  </td>
                  {days.map((day) => {
                    const schedule = schedules[`${employee.id}-${day}`];
                    return (
                      <td
                        key={`${employee.id}-${day}`}
                        className="border border-gray-300 align-middle"
                      >
                        <DayCell schedule={schedule} managedColors={managedColors} />
                      </td>
                    );
                  })}
                  <td className="border border-gray-300 text-center font-bold text-blue-700 align-middle">
                    {weeklyTotal > 0 ? `${weeklyTotal.toFixed(1)}h` : '—'}
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

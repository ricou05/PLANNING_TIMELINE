import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Employee, Schedule, ManagedColor } from '../types';
import { calculateWeeklyHours, calculateDailyHours } from './scheduleCalculations';
import { findManagedColor, getTextColorForHex } from './colorUtils';

export interface PDFExportOptions {
  showTotalColumn: boolean;
}

interface ExportToPDFParams {
  employees: Employee[];
  days: string[];
  dates: string[];
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  managedColors: ManagedColor[];
  options?: PDFExportOptions;
}

// A4 landscape dimensions at 96dpi
const A4_W = 1122;
const A4_H = 793;
const PAD_H = 20;
const PAD_V = 16;
const TITLE_H = 35;
const LEGEND_H = 32;

const getColorHex = (managedColors: ManagedColor[], colorName?: string): string | null => {
  const mc = findManagedColor(managedColors, colorName);
  return mc ? mc.hex : null;
};

const getTextColor = (managedColors: ManagedColor[], colorName?: string): string => {
  const mc = findManagedColor(managedColors, colorName);
  return mc ? getTextColorForHex(mc.hex) : '#000000';
};

const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

const buildLegend = (managedColors: ManagedColor[]): HTMLElement => {
  const legend = document.createElement('div');
  legend.style.cssText = 'margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;font-size:9px;';
  managedColors.forEach(mc => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:4px;';
    const swatch = document.createElement('span');
    swatch.style.cssText = `width:10px;height:10px;border-radius:50%;border:1px solid #d1d5db;display:inline-block;background:${mc.hex};`;
    item.appendChild(swatch);
    const label = document.createElement('span');
    label.style.color = '#374151';
    label.textContent = mc.label;
    item.appendChild(label);
    legend.appendChild(item);
  });
  return legend;
};

// ─── VUE 1 : tableau avec 2 lignes par employé ────────────────────────────────

const createPDFTable = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year,
  managedColors,
  options,
}: ExportToPDFParams): HTMLElement => {
  const showTotal = options?.showTotalColumn !== false;
  const hasLegend = managedColors.length > 0;
  const tableAvailH =
    A4_H - 2 * PAD_V - TITLE_H - 10 - (hasLegend ? LEGEND_H : 0);
  const numRows = employees.length * 2 + 2; // header + footer
  const rowH = Math.floor(tableAvailH / numRows);
  const fontSize = Math.min(12, Math.max(8, Math.floor(rowH * 0.38)));
  const cellPadV = Math.max(2, Math.floor((rowH - fontSize * 1.5) / 2));

  const container = document.createElement('div');
  container.style.cssText = `padding:${PAD_V}px ${PAD_H}px;background:#fff;width:${A4_W}px;min-height:${A4_H}px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;`;

  const title = document.createElement('div');
  title.style.cssText = 'margin-bottom:10px;font-size:16px;font-weight:700;text-align:center;color:#111827;';
  title.textContent = `Planning Semaine ${weekNumber} - ${year}`;
  container.appendChild(title);

  const table = document.createElement('table');
  table.style.cssText = `width:100%;border-collapse:collapse;font-size:${fontSize}px;border:2px solid #1f2937;`;

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.height = `${rowH}px`;

  const thStyle = `padding:${cellPadV}px 4px;border:1px solid #374151;font-weight:700;text-align:center;background:#f3f4f6;color:#111827;`;

  const thEmployee = document.createElement('th');
  thEmployee.style.cssText = thStyle + 'width:100px;text-align:left;padding-left:8px;';
  thEmployee.textContent = 'Employe';
  headerRow.appendChild(thEmployee);

  const thPeriod = document.createElement('th');
  thPeriod.style.cssText = thStyle + 'width:60px;';
  thPeriod.textContent = 'Periode';
  headerRow.appendChild(thPeriod);

  days.forEach((day, i) => {
    const th = document.createElement('th');
    th.style.cssText = thStyle;
    th.innerHTML = `${day}<br><span style="font-size:${Math.max(7, fontSize - 2)}px;font-weight:400;color:#6b7280;">${dates[i]}</span>`;
    headerRow.appendChild(th);
  });

  if (showTotal) {
    const thTotal = document.createElement('th');
    thTotal.style.cssText = thStyle + 'width:52px;';
    thTotal.textContent = 'Total';
    headerRow.appendChild(thTotal);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const cellStyle = `padding:${cellPadV}px 4px;border:1px solid #d1d5db;text-align:center;`;

  employees.forEach((employee, empIndex) => {
    const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
    const bgColor = empIndex % 2 === 0 ? '' : 'background:#f9fafb;';

    const morningRow = document.createElement('tr');
    morningRow.style.height = `${rowH}px`;

    const nameCell = document.createElement('td');
    nameCell.style.cssText = cellStyle + 'text-align:left;font-weight:600;padding-left:8px;border-bottom:none;' + bgColor;
    nameCell.textContent = employee.name;
    nameCell.rowSpan = 2;
    morningRow.appendChild(nameCell);

    const mLabel = document.createElement('td');
    mLabel.style.cssText = cellStyle + `font-size:${Math.max(7, fontSize - 2)}px;color:#6b7280;border-bottom:none;` + bgColor;
    mLabel.textContent = 'Matin';
    morningRow.appendChild(mLabel);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      const td = document.createElement('td');
      td.style.cssText = cellStyle + 'border-bottom:none;' + bgColor;
      if (schedule.morningStart && schedule.morningEnd) {
        td.textContent = `${schedule.morningStart} - ${schedule.morningEnd}`;
        const hex = getColorHex(managedColors, schedule.morningColor);
        if (hex) {
          td.style.backgroundColor = hex;
          td.style.color = getTextColor(managedColors, schedule.morningColor);
          td.style.fontWeight = '500';
        }
      }
      morningRow.appendChild(td);
    });

    if (showTotal) {
      const totalCell = document.createElement('td');
      totalCell.style.cssText = cellStyle + 'font-weight:700;color:#1d4ed8;border-bottom:none;' + bgColor;
      totalCell.textContent = formatHours(weeklyTotal);
      totalCell.rowSpan = 2;
      morningRow.appendChild(totalCell);
    }

    const afternoonRow = document.createElement('tr');
    afternoonRow.style.height = `${rowH}px`;

    const aLabel = document.createElement('td');
    aLabel.style.cssText = cellStyle + `font-size:${Math.max(7, fontSize - 2)}px;color:#6b7280;` + bgColor;
    aLabel.textContent = 'Apres-midi';
    afternoonRow.appendChild(aLabel);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      const td = document.createElement('td');
      td.style.cssText = cellStyle + bgColor;
      if (schedule.afternoonStart && schedule.afternoonEnd) {
        td.textContent = `${schedule.afternoonStart} - ${schedule.afternoonEnd}`;
        const hex = getColorHex(managedColors, schedule.afternoonColor);
        if (hex) {
          td.style.backgroundColor = hex;
          td.style.color = getTextColor(managedColors, schedule.afternoonColor);
          td.style.fontWeight = '500';
        }
      }
      afternoonRow.appendChild(td);
    });

    tbody.appendChild(morningRow);
    tbody.appendChild(afternoonRow);
  });

  const footerRow = document.createElement('tr');
  footerRow.style.cssText = `background:#f3f4f6;height:${rowH}px;`;

  const totalLabel = document.createElement('td');
  totalLabel.style.cssText = cellStyle + 'font-weight:700;text-align:left;padding-left:8px;background:#f3f4f6;';
  totalLabel.colSpan = 2;
  totalLabel.textContent = 'Total / jour';
  footerRow.appendChild(totalLabel);

  let grandTotal = 0;
  days.forEach(day => {
    const td = document.createElement('td');
    td.style.cssText = cellStyle + 'font-weight:700;color:#1d4ed8;background:#f3f4f6;';
    let dayTotal = 0;
    employees.forEach(emp => {
      const schedule = schedules[`${emp.id}-${day}`];
      if (schedule) dayTotal += calculateDailyHours(schedule);
    });
    grandTotal += dayTotal;
    td.textContent = formatHours(dayTotal);
    footerRow.appendChild(td);
  });

  if (showTotal) {
    const grandTotalCell = document.createElement('td');
    grandTotalCell.style.cssText = cellStyle + 'font-weight:700;color:#1d4ed8;background:#f3f4f6;';
    grandTotalCell.textContent = formatHours(grandTotal);
    footerRow.appendChild(grandTotalCell);
  }

  tbody.appendChild(footerRow);
  table.appendChild(tbody);
  container.appendChild(table);

  if (hasLegend) {
    container.appendChild(buildLegend(managedColors));
  }

  return container;
};

// ─── VUE 2 : tableau visuel, 1 ligne par employé ──────────────────────────────

const buildShiftBlock = (
  start: string,
  end: string,
  colorId: string | undefined,
  managedColors: ManagedColor[],
  fontSize: number,
): HTMLElement => {
  const mc = colorId ? findManagedColor(managedColors, colorId) : null;
  const bgColor = mc?.hex || '#d1d5db';
  const textColor = getTextColorForHex(bgColor);
  const block = document.createElement('div');
  block.style.cssText = `border-radius:3px;padding:2px 5px;text-align:center;background:${bgColor};color:${textColor};font-size:${fontSize}px;font-weight:600;white-space:nowrap;`;
  block.textContent = `${start}–${end}`;
  return block;
};

const createVisualPDFTable = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year,
  managedColors,
  options,
}: ExportToPDFParams): HTMLElement => {
  const showTotal = options?.showTotalColumn !== false;
  const hasLegend = managedColors.length > 0;
  const tableAvailH =
    A4_H - 2 * PAD_V - TITLE_H - 10 - (hasLegend ? LEGEND_H : 0);
  const numRows = employees.length + 2; // header + footer
  const rowH = Math.floor(tableAvailH / numRows);
  const fontSize = Math.min(13, Math.max(9, Math.floor(rowH * 0.22)));
  const blockFontSize = Math.min(12, Math.max(9, Math.floor(rowH * 0.20)));
  const cellPadV = Math.max(3, Math.floor((rowH - fontSize * 1.5) / 2));

  const container = document.createElement('div');
  container.style.cssText = `padding:${PAD_V}px ${PAD_H}px;background:#fff;width:${A4_W}px;min-height:${A4_H}px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;`;

  const title = document.createElement('div');
  title.style.cssText = 'margin-bottom:10px;font-size:16px;font-weight:700;text-align:center;color:#111827;';
  title.textContent = `Planning Semaine ${weekNumber} - ${year}`;
  container.appendChild(title);

  const table = document.createElement('table');
  table.style.cssText = `width:100%;border-collapse:collapse;font-size:${fontSize}px;border:2px solid #1f2937;`;

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.height = `${rowH}px`;

  const thStyle = `padding:${cellPadV}px 4px;border:1px solid #374151;font-weight:700;text-align:center;background:#f3f4f6;color:#111827;`;

  const thEmployee = document.createElement('th');
  thEmployee.style.cssText = thStyle + 'width:110px;text-align:left;padding-left:8px;';
  thEmployee.textContent = 'Employe';
  headerRow.appendChild(thEmployee);

  days.forEach((day, i) => {
    const th = document.createElement('th');
    th.style.cssText = thStyle;
    th.innerHTML = `${day}<br><span style="font-size:${Math.max(7, fontSize - 2)}px;font-weight:400;color:#6b7280;">${dates[i]}</span>`;
    headerRow.appendChild(th);
  });

  if (showTotal) {
    const thTotal = document.createElement('th');
    thTotal.style.cssText = thStyle + 'width:60px;';
    thTotal.textContent = 'Total';
    headerRow.appendChild(thTotal);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  const cellStyle = `padding:3px 4px;border:1px solid #d1d5db;vertical-align:middle;height:${rowH}px;`;

  employees.forEach((employee, empIndex) => {
    const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
    const rowBg = empIndex % 2 === 0 ? '#ffffff' : '#f9fafb';

    const tr = document.createElement('tr');
    tr.style.cssText = `height:${rowH}px;background:${rowBg};`;

    const nameCell = document.createElement('td');
    nameCell.style.cssText = `${cellStyle}font-weight:600;color:#1f2937;padding-left:8px;background:${rowBg};`;
    nameCell.textContent = employee.name;
    tr.appendChild(nameCell);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`];
      const td = document.createElement('td');
      td.style.cssText = `${cellStyle}background:${rowBg};`;

      const hasMorning = schedule?.morningStart && schedule?.morningEnd;
      const hasAfternoon = schedule?.afternoonStart && schedule?.afternoonEnd;

      if (!hasMorning && !hasAfternoon) {
        td.style.textAlign = 'center';
        td.style.color = '#d1d5db';
        td.textContent = '—';
      } else {
        const inner = document.createElement('div');
        inner.style.cssText = 'display:flex;flex-direction:column;gap:2px;justify-content:center;height:100%;';
        if (hasMorning) {
          inner.appendChild(buildShiftBlock(schedule!.morningStart, schedule!.morningEnd, schedule!.morningColor, managedColors, blockFontSize));
        }
        if (hasAfternoon) {
          inner.appendChild(buildShiftBlock(schedule!.afternoonStart, schedule!.afternoonEnd, schedule!.afternoonColor, managedColors, blockFontSize));
        }
        td.appendChild(inner);
      }

      tr.appendChild(td);
    });

    if (showTotal) {
      const totalCell = document.createElement('td');
      totalCell.style.cssText = `${cellStyle}text-align:center;font-weight:700;color:#1d4ed8;background:${rowBg};`;
      totalCell.textContent = weeklyTotal > 0 ? `${weeklyTotal.toFixed(1)}h` : '—';
      tr.appendChild(totalCell);
    }

    tbody.appendChild(tr);
  });

  // Footer totals
  const footerRow = document.createElement('tr');
  footerRow.style.cssText = `background:#e5e7eb;height:${rowH}px;`;

  const totalLabel = document.createElement('td');
  totalLabel.style.cssText = `${cellStyle}font-weight:700;text-align:left;padding-left:8px;background:#e5e7eb;`;
  totalLabel.textContent = 'TOTAUX';
  footerRow.appendChild(totalLabel);

  let grandTotal = 0;
  days.forEach(day => {
    const td = document.createElement('td');
    td.style.cssText = `${cellStyle}text-align:center;font-weight:700;color:#1d4ed8;background:#e5e7eb;`;
    let dayTotal = 0;
    employees.forEach(emp => {
      const schedule = schedules[`${emp.id}-${day}`];
      if (schedule) dayTotal += calculateDailyHours(schedule);
    });
    grandTotal += dayTotal;
    td.textContent = dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : '—';
    footerRow.appendChild(td);
  });

  if (showTotal) {
    const grandTotalCell = document.createElement('td');
    grandTotalCell.style.cssText = `${cellStyle}text-align:center;font-weight:700;color:#1d4ed8;background:#e5e7eb;`;
    grandTotalCell.textContent = grandTotal > 0 ? `${grandTotal.toFixed(1)}h` : '—';
    footerRow.appendChild(grandTotalCell);
  }

  tbody.appendChild(footerRow);
  table.appendChild(tbody);
  container.appendChild(table);

  if (hasLegend) {
    container.appendChild(buildLegend(managedColors));
  }

  return container;
};

// ─── Fonction générique d'export ──────────────────────────────────────────────

const renderToPDF = async (
  container: HTMLElement,
  filename: string,
): Promise<void> => {
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  const canvas = await html2canvas(container, {
    scale: 2,
    logging: false,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(container);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();   // 297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
  const marginX = 10;
  const marginY = 6;
  const usableWidth = pageWidth - marginX * 2;
  const usableHeight = pageHeight - marginY * 2;
  const ratio = canvas.width / canvas.height;

  let imgWidth = usableWidth;
  let imgHeight = imgWidth / ratio;

  if (imgHeight > usableHeight) {
    imgHeight = usableHeight;
    imgWidth = imgHeight * ratio;
  }

  const x = (pageWidth - imgWidth) / 2;
  const y = (pageHeight - imgHeight) / 2;

  pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', x, y, imgWidth, imgHeight);
  pdf.save(filename);
};

export const exportToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderToPDF(
      createPDFTable(params),
      `planning-semaine-${params.weekNumber}-${params.year}.pdf`,
    );
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    throw error;
  }
};

export const exportVisualToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderToPDF(
      createVisualPDFTable(params),
      `planning-vue2-semaine-${params.weekNumber}-${params.year}.pdf`,
    );
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    throw error;
  }
};

import { ManagedColor } from '../../types';
import { calculateWeeklyHours, calculateDailyHours } from '../scheduleCalculations';
import { findManagedColor, getTextColorForHex } from '../colorUtils';
import { formatHoursHM as formatHours } from '../timeUtils';
import {
  ExportToPDFParams, A4_W, A4_H, PAD_H, PAD_V, TITLE_H, LEGEND_H, MAX_ROW_H_VISUAL,
  computeRowH, createContainer, buildLegend, REST_DAY_BG,
} from './shared';

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

export const createVisualPDFTable = ({
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
  const fillPage = options?.fillPage === true;
  const rowH = computeRowH(tableAvailH, numRows, MAX_ROW_H_VISUAL, fillPage);
  const fontSize = Math.min(13, Math.max(9, Math.floor(rowH * 0.24)));
  const blockFontSize = Math.min(12, Math.max(9, Math.floor(rowH * 0.22)));

  const container = createContainer(fillPage);

  const title = document.createElement('div');
  title.style.cssText = 'margin-bottom:10px;font-size:16px;font-weight:700;text-align:center;color:#111827;';
  title.textContent = `Planning Semaine ${weekNumber} - ${year}`;
  container.appendChild(title);

  // Calculate day column width: remaining space divided equally among 7 days
  const v2EmpW = 110;
  const v2TotalW = 60;
  const fixedW2 = v2EmpW + (showTotal ? v2TotalW : 0);
  const tableInnerW = A4_W - 2 * PAD_H;
  const dayColW = Math.floor((tableInnerW - fixedW2) / days.length);

  const table = document.createElement('table');
  table.style.cssText = `width:100%;border-collapse:collapse;font-size:${fontSize}px;border:2px solid #1f2937;table-layout:fixed;`;

  // Colgroup for fixed proportions
  const colgroup = document.createElement('colgroup');
  const colEmp = document.createElement('col');
  colEmp.style.width = `${v2EmpW}px`;
  colgroup.appendChild(colEmp);
  days.forEach(() => {
    const col = document.createElement('col');
    col.style.width = `${dayColW}px`;
    colgroup.appendChild(col);
  });
  if (showTotal) {
    const colTot = document.createElement('col');
    colTot.style.width = `${v2TotalW}px`;
    colgroup.appendChild(colTot);
  }
  table.appendChild(colgroup);

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.height = `${rowH}px`;

  const thBase = `border:1px solid #374151;font-weight:700;text-align:center;vertical-align:middle;background:#f3f4f6;color:#111827;`;

  const thEmployee = document.createElement('th');
  thEmployee.style.cssText = thBase + 'text-align:left;padding-left:8px;';
  thEmployee.textContent = 'Employe';
  headerRow.appendChild(thEmployee);

  days.forEach((day, i) => {
    const th = document.createElement('th');
    th.style.cssText = thBase;
    th.innerHTML = `${day}<br><span style="font-size:${Math.max(7, fontSize - 2)}px;font-weight:400;color:#6b7280;">${dates[i]}</span>`;
    headerRow.appendChild(th);
  });

  if (showTotal) {
    const thTotal = document.createElement('th');
    thTotal.style.cssText = thBase;
    thTotal.textContent = 'Total';
    headerRow.appendChild(thTotal);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  const cellBase = `border:1px solid #d1d5db;vertical-align:middle;text-align:center;height:${rowH}px;`;

  employees.forEach((employee, empIndex) => {
    const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
    const rowBg = empIndex % 2 === 0 ? '#ffffff' : '#f9fafb';

    const tr = document.createElement('tr');
    tr.style.cssText = `height:${rowH}px;background:${rowBg};`;

    const nameCell = document.createElement('td');
    nameCell.style.cssText = `${cellBase}font-weight:600;color:#1f2937;padding-left:8px;text-align:left;background:${rowBg};`;
    nameCell.textContent = employee.name;
    tr.appendChild(nameCell);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`];
      const td = document.createElement('td');
      td.style.cssText = `${cellBase}background:${rowBg};padding:3px 4px;`;

      const isRestDay = schedule?.isRestDay === true;
      const absence = schedule?.absence;
      const hasMorning = schedule?.morningStart && schedule?.morningEnd;
      const hasAfternoon = schedule?.afternoonStart && schedule?.afternoonEnd;
      const morningAbsence = schedule?.morningAbsence;
      const afternoonAbsence = schedule?.afternoonAbsence;

      // Bloc d'absence demi-journée : fond ambre hachuré, libellé en majuscules
      const buildHalfAbsenceBlock = (label: string): HTMLElement => {
        const block = document.createElement('div');
        block.style.cssText = `border-radius:3px;padding:2px 5px;text-align:center;background:${REST_DAY_BG}, #fef3c7;color:#b45309;font-size:${Math.max(7, blockFontSize - 1)}px;font-weight:700;text-transform:uppercase;white-space:nowrap;`;
        block.textContent = label;
        return block;
      };

      if (isRestDay) {
        td.style.background = `${REST_DAY_BG}, #e5e7eb`;
        td.style.fontWeight = '700';
        td.style.color = '#6b7280';
        td.style.fontSize = `${Math.max(7, fontSize - 1)}px`;
        td.innerHTML = `<span style="color:#ef4444;font-weight:900;">✕</span> REPOS`;
      } else if (absence) {
        td.style.background = `${REST_DAY_BG}, #fef3c7`;
        td.style.fontWeight = '700';
        td.style.color = '#b45309';
        td.style.fontSize = `${Math.max(7, fontSize - 1)}px`;
        td.style.textTransform = 'uppercase';
        td.textContent = absence;
      } else if (!hasMorning && !hasAfternoon && !morningAbsence && !afternoonAbsence) {
        td.style.color = '#d1d5db';
        td.textContent = '—';
      } else {
        const inner = document.createElement('div');
        inner.style.cssText = 'display:flex;flex-direction:column;gap:2px;justify-content:center;align-items:center;height:100%;';
        if (morningAbsence) {
          inner.appendChild(buildHalfAbsenceBlock(morningAbsence));
        } else if (hasMorning) {
          inner.appendChild(buildShiftBlock(schedule!.morningStart, schedule!.morningEnd, schedule!.morningColor, managedColors, blockFontSize));
        }
        if (afternoonAbsence) {
          inner.appendChild(buildHalfAbsenceBlock(afternoonAbsence));
        } else if (hasAfternoon) {
          inner.appendChild(buildShiftBlock(schedule!.afternoonStart, schedule!.afternoonEnd, schedule!.afternoonColor, managedColors, blockFontSize));
        }
        td.appendChild(inner);
      }

      tr.appendChild(td);
    });

    if (showTotal) {
      const totalCell = document.createElement('td');
      totalCell.style.cssText = `${cellBase}font-weight:700;color:#1d4ed8;background:${rowBg};`;
      totalCell.textContent = weeklyTotal > 0 ? formatHours(weeklyTotal) : '—';
      tr.appendChild(totalCell);
    }

    tbody.appendChild(tr);
  });

  // Footer totals
  const footerRow = document.createElement('tr');
  footerRow.style.cssText = `background:#e5e7eb;height:${rowH}px;`;

  const totalLabel = document.createElement('td');
  totalLabel.style.cssText = `${cellBase}font-weight:700;text-align:left;padding-left:8px;background:#e5e7eb;`;
  totalLabel.textContent = 'TOTAUX';
  footerRow.appendChild(totalLabel);

  let grandTotal = 0;
  days.forEach(day => {
    const td = document.createElement('td');
    td.style.cssText = `${cellBase}font-weight:700;color:#1d4ed8;background:#e5e7eb;`;
    let dayTotal = 0;
    employees.forEach(emp => {
      const schedule = schedules[`${emp.id}-${day}`];
      if (schedule) dayTotal += calculateDailyHours(schedule);
    });
    grandTotal += dayTotal;
    td.textContent = dayTotal > 0 ? formatHours(dayTotal) : '—';
    footerRow.appendChild(td);
  });

  if (showTotal) {
    const grandTotalCell = document.createElement('td');
    grandTotalCell.style.cssText = `${cellBase}font-weight:700;color:#1d4ed8;background:#e5e7eb;`;
    grandTotalCell.textContent = grandTotal > 0 ? formatHours(grandTotal) : '—';
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

import { calculateWeeklyHours, calculateDailyHours } from '../scheduleCalculations';
import { formatHoursHM as formatHours } from '../timeUtils';
import {
  ExportToPDFParams, A4_W, A4_H, PAD_H, PAD_V, TITLE_H, LEGEND_H,
  COL_EMPLOYEE, COL_PERIOD, COL_TOTAL, MAX_ROW_H_CLASSIC,
  computeRowH, createContainer, getColorHex, getTextColor, buildLegend, REST_DAY_BG,
} from './shared';

// ─── VUE 1 : tableau avec 2 lignes par employé ────────────────────────────────

export const createPDFTable = ({
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
  const fillPage = options?.fillPage === true;
  const rowH = computeRowH(tableAvailH, numRows, MAX_ROW_H_CLASSIC, fillPage);
  const fontSize = Math.min(12, Math.max(8, Math.floor(rowH * 0.38)));

  const container = createContainer(fillPage);

  const title = document.createElement('div');
  title.style.cssText = 'margin-bottom:10px;font-size:16px;font-weight:700;text-align:center;color:#111827;';
  title.textContent = `Planning Semaine ${weekNumber} - ${year}`;
  container.appendChild(title);

  // Calculate day column width: remaining space divided equally among 7 days
  const fixedW = COL_EMPLOYEE + COL_PERIOD + (showTotal ? COL_TOTAL : 0);
  const tableInnerW = A4_W - 2 * PAD_H;
  const dayColW = Math.floor((tableInnerW - fixedW) / days.length);

  const table = document.createElement('table');
  table.style.cssText = `width:100%;border-collapse:collapse;font-size:${fontSize}px;border:2px solid #1f2937;table-layout:fixed;`;

  // Colgroup for fixed proportions
  const colgroup = document.createElement('colgroup');
  const colEmp = document.createElement('col');
  colEmp.style.width = `${COL_EMPLOYEE}px`;
  colgroup.appendChild(colEmp);
  const colPer = document.createElement('col');
  colPer.style.width = `${COL_PERIOD}px`;
  colgroup.appendChild(colPer);
  days.forEach(() => {
    const col = document.createElement('col');
    col.style.width = `${dayColW}px`;
    colgroup.appendChild(col);
  });
  if (showTotal) {
    const colTot = document.createElement('col');
    colTot.style.width = `${COL_TOTAL}px`;
    colgroup.appendChild(colTot);
  }
  table.appendChild(colgroup);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.height = `${rowH}px`;

  const thBase = `border:1px solid #374151;font-weight:700;text-align:center;vertical-align:middle;background:#f3f4f6;color:#111827;`;

  const thEmployee = document.createElement('th');
  thEmployee.style.cssText = thBase + 'text-align:left;padding-left:6px;';
  thEmployee.textContent = 'Employe';
  headerRow.appendChild(thEmployee);

  const thPeriod = document.createElement('th');
  thPeriod.style.cssText = thBase + `font-size:${Math.max(7, fontSize - 2)}px;`;
  thPeriod.textContent = 'Per.';
  headerRow.appendChild(thPeriod);

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

  const tbody = document.createElement('tbody');
  const cellBase = `border:1px solid #d1d5db;text-align:center;vertical-align:middle;height:${rowH}px;`;

  employees.forEach((employee, empIndex) => {
    const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
    const bgColor = empIndex % 2 === 0 ? '' : 'background:#f9fafb;';

    // Repos et absences pleine journée pour cet employé
    const restDayFlags = days.map(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      return schedule.isRestDay === true;
    });
    const absenceLabels = days.map(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      return schedule.absence;
    });

    const morningRow = document.createElement('tr');
    morningRow.style.height = `${rowH}px`;

    const nameCell = document.createElement('td');
    nameCell.style.cssText = cellBase + 'text-align:left;font-weight:600;padding-left:6px;border-bottom:none;' + bgColor;
    nameCell.textContent = employee.name;
    nameCell.rowSpan = 2;
    morningRow.appendChild(nameCell);

    const mLabel = document.createElement('td');
    mLabel.style.cssText = cellBase + `font-size:${Math.max(7, fontSize - 2)}px;color:#6b7280;border-bottom:none;` + bgColor;
    mLabel.textContent = 'MAT';
    morningRow.appendChild(mLabel);

    days.forEach((day, dayIdx) => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      if (restDayFlags[dayIdx]) {
        // Rest day: rowSpan=2, hatched background
        const td = document.createElement('td');
        td.rowSpan = 2;
        td.style.cssText = cellBase + `background:#e5e7eb;background-image:${REST_DAY_BG};font-weight:700;color:#6b7280;font-size:${Math.max(7, fontSize - 1)}px;`;
        td.innerHTML = `<span style="color:#ef4444;font-weight:900;">✕</span> REPOS`;
        morningRow.appendChild(td);
      } else if (absenceLabels[dayIdx]) {
        // Absence pleine journée : rowSpan=2, fond ambre hachuré
        const td = document.createElement('td');
        td.rowSpan = 2;
        td.style.cssText = cellBase + `background:#fef3c7;background-image:${REST_DAY_BG};font-weight:700;color:#b45309;font-size:${Math.max(7, fontSize - 1)}px;text-transform:uppercase;`;
        td.textContent = absenceLabels[dayIdx] as string;
        morningRow.appendChild(td);
      } else {
        const td = document.createElement('td');
        td.style.cssText = cellBase + 'border-bottom:none;' + bgColor;
        if (schedule.morningAbsence) {
          // Absence demi-journée (matin) : fond ambre hachuré
          td.style.background = `${REST_DAY_BG}, #fef3c7`;
          td.style.fontWeight = '700';
          td.style.color = '#b45309';
          td.style.fontSize = `${Math.max(7, fontSize - 1)}px`;
          td.style.textTransform = 'uppercase';
          td.textContent = schedule.morningAbsence;
        } else if (schedule.morningStart && schedule.morningEnd) {
          td.textContent = `${schedule.morningStart} - ${schedule.morningEnd}`;
          td.style.fontWeight = '600';
          const hex = getColorHex(managedColors, schedule.morningColor);
          if (hex) {
            td.style.backgroundColor = hex;
            td.style.color = getTextColor(managedColors, schedule.morningColor);
          }
        }
        morningRow.appendChild(td);
      }
    });

    if (showTotal) {
      const totalCell = document.createElement('td');
      totalCell.style.cssText = cellBase + 'font-weight:700;color:#1d4ed8;border-bottom:none;' + bgColor;
      totalCell.textContent = formatHours(weeklyTotal);
      totalCell.rowSpan = 2;
      morningRow.appendChild(totalCell);
    }

    const afternoonRow = document.createElement('tr');
    afternoonRow.style.height = `${rowH}px`;

    const aLabel = document.createElement('td');
    aLabel.style.cssText = cellBase + `font-size:${Math.max(7, fontSize - 2)}px;color:#6b7280;` + bgColor;
    aLabel.textContent = 'APM';
    afternoonRow.appendChild(aLabel);

    days.forEach((day, dayIdx) => {
      if (restDayFlags[dayIdx] || absenceLabels[dayIdx]) return; // already rendered as rowSpan=2
      const schedule = schedules[`${employee.id}-${day}`] || {};
      const td = document.createElement('td');
      td.style.cssText = cellBase + bgColor;
      if (schedule.afternoonAbsence) {
        // Absence demi-journée (après-midi) : fond ambre hachuré
        td.style.background = `${REST_DAY_BG}, #fef3c7`;
        td.style.fontWeight = '700';
        td.style.color = '#b45309';
        td.style.fontSize = `${Math.max(7, fontSize - 1)}px`;
        td.style.textTransform = 'uppercase';
        td.textContent = schedule.afternoonAbsence;
      } else if (schedule.afternoonStart && schedule.afternoonEnd) {
        td.textContent = `${schedule.afternoonStart} - ${schedule.afternoonEnd}`;
        td.style.fontWeight = '600';
        const hex = getColorHex(managedColors, schedule.afternoonColor);
        if (hex) {
          td.style.backgroundColor = hex;
          td.style.color = getTextColor(managedColors, schedule.afternoonColor);
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
  totalLabel.style.cssText = cellBase + 'font-weight:700;text-align:left;padding-left:6px;background:#f3f4f6;';
  totalLabel.colSpan = 2;
  totalLabel.textContent = 'Total / jour';
  footerRow.appendChild(totalLabel);

  let grandTotal = 0;
  days.forEach(day => {
    const td = document.createElement('td');
    td.style.cssText = cellBase + 'font-weight:700;color:#1d4ed8;background:#f3f4f6;';
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
    grandTotalCell.style.cssText = cellBase + 'font-weight:700;color:#1d4ed8;background:#f3f4f6;';
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

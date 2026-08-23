import { Employee, Schedule, ManagedColor } from '../types';
import { calculateWeeklyHours, calculateDailyHours } from './scheduleCalculations';
import { findManagedColor, getTextColorForHex } from './colorUtils';
import { formatHoursHM as formatHours } from './timeUtils';

export interface PDFExportOptions {
  showTotalColumn: boolean;
  /** 'pdf' (défaut) pour impression, 'png' pour partage (WhatsApp, e-mail…) */
  format?: 'pdf' | 'png';
}

// Réglages d'affichage en cours (menu Paramètres) à reporter sur l'export
export interface ExportDisplaySettings {
  /** Taille de la police du tableau, en % (100 = normal) */
  fontScale?: number;
  /** Épaisseur des traits du tableau, en px */
  borderWidth?: number;
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
  display?: ExportDisplaySettings;
}

// A4 landscape dimensions at 96dpi
const A4_W = 1122;
const A4_H = 793;
const PAD_H = 20;
const PAD_V = 16;
const TITLE_H = 35;
const LEGEND_H = 32;

// Fixed column widths matching web proportions
const COL_EMPLOYEE = 100;
const COL_PERIOD = 42;
const COL_TOTAL = 56;

const getColorHex = (managedColors: ManagedColor[], colorName?: string): string | null => {
  const mc = findManagedColor(managedColors, colorName);
  return mc ? mc.hex : null;
};

const getTextColor = (managedColors: ManagedColor[], colorName?: string): string => {
  const mc = findManagedColor(managedColors, colorName);
  return mc ? getTextColorForHex(mc.hex) : '#000000';
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

const REST_DAY_BG = `repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 6px)`;

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

  const container = document.createElement('div');
  container.style.cssText = `padding:${PAD_V}px ${PAD_H}px;background:#fff;width:${A4_W}px;min-height:${A4_H}px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;`;

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

// ─── VUE 1 (grille type Excel) : cellules pleines, croix diagonales ───────────

// Teinte rosée des en-têtes de jours alternés (identique à la vue web)
const GRID_HEADER_PINK = '#f4cccc';

// Croix diagonale recouvrant la cellule : deux traits fins pivotés, calculés
// d'après les dimensions réelles de la cellule (rendu fiable avec html2canvas)
const buildDiagonalCross = (cellW: number, cellH: number): HTMLElement[] => {
  const length = Math.sqrt(cellW * cellW + cellH * cellH);
  const angle = (Math.atan2(cellH, cellW) * 180) / Math.PI;
  return [angle, -angle].map(a => {
    const line = document.createElement('div');
    line.style.cssText = `position:absolute;top:50%;left:50%;width:${length}px;height:1px;background:#374151;transform:translate(-50%,-50%) rotate(${a}deg);`;
    return line;
  });
};

const createGridPDFTable = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year,
  managedColors,
  options,
  display,
}: ExportToPDFParams): HTMLElement => {
  const showTotal = options?.showTotalColumn !== false;
  const hasLegend = managedColors.length > 0;
  const tableAvailH =
    A4_H - 2 * PAD_V - TITLE_H - 10 - (hasLegend ? LEGEND_H : 0);
  const numRows = employees.length + 2; // header + footer
  const rowH = Math.floor(tableAvailH / numRows);
  // Réglages d'affichage en cours reportés sur l'export ; la police est
  // bornée à la hauteur d'une demi-ligne (le format A4 étant fixe) pour
  // que le texte ne soit jamais tronqué.
  const fontScale = (display?.fontScale ?? 100) / 100;
  const borderW = display?.borderWidth ?? 1;
  const halfRowH = Math.floor(rowH / 2);
  const fontSize = Math.min(halfRowH - 4, Math.round(Math.min(14, Math.max(9, Math.floor(rowH * 0.22))) * fontScale));
  const timeFontSize = Math.min(halfRowH - 4, Math.round(Math.min(13, Math.max(8, Math.floor(rowH * 0.21))) * fontScale));

  const container = document.createElement('div');
  container.style.cssText = `padding:${PAD_V}px ${PAD_H}px;background:#fff;width:${A4_W}px;min-height:${A4_H}px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;`;

  const title = document.createElement('div');
  title.style.cssText = 'margin-bottom:10px;font-size:16px;font-weight:700;text-align:center;color:#111827;';
  title.textContent = `Planning Semaine ${weekNumber} - ${year}`;
  container.appendChild(title);

  // Mêmes proportions que la vue web : employé 12 %, total 7,5 %, jours à parts égales
  const tableInnerW = A4_W - 2 * PAD_H;
  const empW = Math.floor(tableInnerW * 0.12);
  const totalW = showTotal ? Math.floor(tableInnerW * 0.075) : 0;
  const dayColW = Math.floor((tableInnerW - empW - totalW) / days.length);

  const table = document.createElement('table');
  table.style.cssText = `width:100%;border-collapse:collapse;font-size:${fontSize}px;table-layout:fixed;`;

  const colgroup = document.createElement('colgroup');
  const colEmp = document.createElement('col');
  colEmp.style.width = `${empW}px`;
  colgroup.appendChild(colEmp);
  days.forEach(() => {
    const col = document.createElement('col');
    col.style.width = `${dayColW}px`;
    colgroup.appendChild(col);
  });
  if (showTotal) {
    const colTot = document.createElement('col');
    colTot.style.width = `${totalW}px`;
    colgroup.appendChild(colTot);
  }
  table.appendChild(colgroup);

  // En-tête : nom du jour en gras + numéro du jour, fond alterné blanc / rosé
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.height = `${rowH}px`;
  const thBase = `border:${borderW}px solid #374151;text-align:center;vertical-align:middle;color:#111827;`;

  const thEmpty = document.createElement('th');
  thEmpty.style.cssText = thBase + 'background:#ffffff;';
  headerRow.appendChild(thEmpty);

  days.forEach((day, i) => {
    const th = document.createElement('th');
    th.style.cssText = thBase + `background:${i % 2 === 1 ? GRID_HEADER_PINK : '#ffffff'};font-weight:700;`;
    th.innerHTML = `${day}<br><span style="font-weight:400;font-size:${Math.max(8, fontSize - 1)}px;">${parseInt(dates[i].split('/')[0], 10) || dates[i]}</span>`;
    headerRow.appendChild(th);
  });

  if (showTotal) {
    const thTotal = document.createElement('th');
    thTotal.style.cssText = thBase + 'background:#ffffff;font-weight:700;';
    thTotal.textContent = 'Total';
    headerRow.appendChild(thTotal);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const cellBase = `border:${borderW}px solid #374151;vertical-align:middle;text-align:center;height:${rowH}px;`;

  // Hauteurs entières des demi-journées : évite un liseré blanc au rendu html2canvas
  const topHalfH = Math.ceil(rowH / 2);
  const bottomHalfH = rowH - topHalfH;

  // Demi-journée : plage horaire sur fond entièrement coloré, absence ambre, ou tiret.
  // Centrage vertical par line-height (égale à la hauteur du bloc) : le centrage
  // flex est décalé vers le haut au rendu html2canvas, pas celui par line-height.
  const buildHalf = (
    start: string,
    end: string,
    colorId: string | undefined,
    absence: string | undefined,
    height: number,
  ): HTMLElement => {
    const half = document.createElement('div');
    half.style.cssText = `height:${height}px;line-height:${height}px;text-align:center;overflow:hidden;`;
    if (absence) {
      half.style.background = `${REST_DAY_BG}, #fef3c7`;
      half.innerHTML = `<span style="font-size:${Math.max(7, timeFontSize - 2)}px;font-weight:700;color:#b45309;text-transform:uppercase;white-space:nowrap;">${absence}</span>`;
    } else if (start && end) {
      const mc = findManagedColor(managedColors, colorId);
      const bg = mc?.hex || '#d1d5db';
      half.style.background = bg;
      half.innerHTML = `<span style="font-size:${timeFontSize}px;font-weight:600;color:${getTextColorForHex(bg)};white-space:nowrap;">${start} - ${end}</span>`;
    } else {
      half.innerHTML = `<span style="color:#6b7280;font-size:${timeFontSize}px;">-</span>`;
    }
    return half;
  };

  employees.forEach(employee => {
    const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
    const tr = document.createElement('tr');
    tr.style.cssText = `height:${rowH}px;background:#ffffff;`;

    const nameCell = document.createElement('td');
    nameCell.style.cssText = `${cellBase}font-weight:700;color:#111827;padding-left:8px;text-align:left;background:#ffffff;`;
    nameCell.textContent = employee.name;
    tr.appendChild(nameCell);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`];
      const td = document.createElement('td');
      td.style.cssText = `${cellBase}padding:0;background:#ffffff;`;

      const inner = document.createElement('div');
      inner.style.cssText = `position:relative;display:flex;flex-direction:column;height:${rowH}px;`;

      if (schedule?.isRestDay) {
        // Jour de repos : deux tirets + croix diagonale sur toute la cellule
        inner.appendChild(buildHalf('', '', undefined, undefined, topHalfH));
        inner.appendChild(buildHalf('', '', undefined, undefined, bottomHalfH));
        buildDiagonalCross(dayColW, rowH).forEach(line => inner.appendChild(line));
      } else if (schedule?.absence) {
        // Absence journée entière : fond ambre hachuré, libellé centré + croix
        // (centrage par line-height, fiable avec html2canvas)
        inner.style.background = `${REST_DAY_BG}, #fef3c7`;
        inner.style.display = 'block';
        inner.style.lineHeight = `${rowH}px`;
        inner.style.textAlign = 'center';
        inner.innerHTML = `<span style="font-size:${Math.max(7, timeFontSize - 1)}px;font-weight:700;color:#b45309;text-transform:uppercase;">${schedule.absence}</span>`;
        buildDiagonalCross(dayColW, rowH).forEach(line => inner.appendChild(line));
      } else {
        inner.appendChild(buildHalf(
          schedule?.morningStart || '',
          schedule?.morningEnd || '',
          schedule?.morningColor,
          schedule?.morningAbsence,
          topHalfH,
        ));
        inner.appendChild(buildHalf(
          schedule?.afternoonStart || '',
          schedule?.afternoonEnd || '',
          schedule?.afternoonColor,
          schedule?.afternoonAbsence,
          bottomHalfH,
        ));
      }

      td.appendChild(inner);
      tr.appendChild(td);
    });

    if (showTotal) {
      const totalCell = document.createElement('td');
      totalCell.style.cssText = `${cellBase}font-weight:700;color:#111827;background:#ffffff;`;
      totalCell.textContent = weeklyTotal > 0 ? formatHours(weeklyTotal) : '-';
      tr.appendChild(totalCell);
    }

    tbody.appendChild(tr);
  });

  // Ligne des totaux par jour
  const footerRow = document.createElement('tr');
  footerRow.style.cssText = `background:#f3f4f6;height:${rowH}px;`;

  const totalLabel = document.createElement('td');
  totalLabel.style.cssText = `${cellBase}font-weight:700;text-align:left;padding-left:8px;background:#f3f4f6;`;
  totalLabel.textContent = 'Totaux';
  footerRow.appendChild(totalLabel);

  let grandTotal = 0;
  days.forEach(day => {
    const td = document.createElement('td');
    td.style.cssText = `${cellBase}font-weight:700;color:#111827;background:#f3f4f6;`;
    let dayTotal = 0;
    employees.forEach(emp => {
      const schedule = schedules[`${emp.id}-${day}`];
      if (schedule) dayTotal += calculateDailyHours(schedule);
    });
    grandTotal += dayTotal;
    td.textContent = dayTotal > 0 ? formatHours(dayTotal) : '-';
    footerRow.appendChild(td);
  });

  if (showTotal) {
    const grandTotalCell = document.createElement('td');
    grandTotalCell.style.cssText = `${cellBase}font-weight:700;color:#111827;background:#f3f4f6;`;
    grandTotalCell.textContent = grandTotal > 0 ? formatHours(grandTotal) : '-';
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

  const container = document.createElement('div');
  container.style.cssText = `padding:${PAD_V}px ${PAD_H}px;background:#fff;width:${A4_W}px;min-height:${A4_H}px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;`;

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

// ─── Fonction générique d'export ──────────────────────────────────────────────

// Rendu du tableau HTML en canvas haute résolution (scale 3 ≈ 300 dpi sur A4)
const renderToCanvas = async (container: HTMLElement): Promise<HTMLCanvasElement> => {
  // Chargée à la demande : html2canvas ne pèse pas sur le chargement initial
  const { default: html2canvas } = await import('html2canvas');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    return await html2canvas(container, {
      scale: 3,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
  } finally {
    document.body.removeChild(container);
  }
};

const saveCanvasAsPDF = async (canvas: HTMLCanvasElement, filename: string): Promise<void> => {
  const { jsPDF } = await import('jspdf');
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

  // PNG sans perte : texte net sur les aplats de couleur. La compression 'SLOW'
  // (flate) est indispensable : sans elle jsPDF intègre l'image non compressée
  // et le fichier dépasse 30 Mo.
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight, undefined, 'SLOW');
  pdf.save(filename);
};

const saveCanvasAsPNG = (canvas: HTMLCanvasElement, filename: string): Promise<void> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Génération PNG impossible'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });

// Exporte le tableau en PDF ou en image PNG selon options.format
const renderAndSave = async (
  container: HTMLElement,
  baseFilename: string,
  format: 'pdf' | 'png',
): Promise<void> => {
  const canvas = await renderToCanvas(container);
  if (format === 'png') {
    await saveCanvasAsPNG(canvas, `${baseFilename}.png`);
  } else {
    await saveCanvasAsPDF(canvas, `${baseFilename}.pdf`);
  }
};

export const exportToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderAndSave(
      createPDFTable(params),
      `planning-semaine-${params.weekNumber}-${params.year}`,
      params.options?.format || 'pdf',
    );
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    throw error;
  }
};

export const exportGridToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderAndSave(
      createGridPDFTable(params),
      `planning-vue1-semaine-${params.weekNumber}-${params.year}`,
      params.options?.format || 'pdf',
    );
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    throw error;
  }
};

export const exportVisualToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderAndSave(
      createVisualPDFTable(params),
      `planning-vue2-semaine-${params.weekNumber}-${params.year}`,
      params.options?.format || 'pdf',
    );
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    throw error;
  }
};

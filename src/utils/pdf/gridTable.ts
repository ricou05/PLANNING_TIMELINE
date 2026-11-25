import { calculateWeeklyHours, calculateDailyHours } from '../scheduleCalculations';
import { findManagedColor, getTextColorForHex } from '../colorUtils';
import { formatHoursHM as formatHours } from '../timeUtils';
import {
  ExportToPDFParams, A4_W, A4_H, PAD_H, PAD_V, TITLE_H, LEGEND_H, MAX_ROW_H_GRID,
  computeRowH, createContainer, buildLegend, REST_DAY_BG,
} from './shared';

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

export const createGridPDFTable = ({
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
  const fillPage = options?.fillPage === true;
  const rowH = computeRowH(tableAvailH, numRows, MAX_ROW_H_GRID, fillPage);
  // Réglages d'affichage en cours reportés sur l'export ; la police est
  // bornée à la hauteur d'une demi-ligne (le format A4 étant fixe) pour
  // que le texte ne soit jamais tronqué.
  const fontScale = (display?.fontScale ?? 100) / 100;
  const borderW = display?.borderWidth ?? 1;
  const halfRowH = Math.floor(rowH / 2);
  const fontSize = Math.min(halfRowH - 4, Math.round(Math.min(14, Math.max(9, Math.floor(rowH * 0.26))) * fontScale));
  const timeFontSize = Math.min(halfRowH - 4, Math.round(Math.min(13, Math.max(8, Math.floor(rowH * 0.24))) * fontScale));

  const container = createContainer(fillPage);

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

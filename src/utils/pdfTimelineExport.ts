import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Employee, Schedule, ManagedColor } from '../types';
import { calculateDailyHours, calculateWeeklyHours } from './scheduleCalculations';
import { findManagedColor, getTextColorForHex } from './colorUtils';
import { timeToMinutes, minutesToTime, TIME_CONSTRAINTS } from './timeUtils';

interface ExportTimelinePDFParams {
  employees: Employee[];
  day: string;
  date: string;
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  managedColors: ManagedColor[];
}

const TIMELINE_PX_PER_HOUR = 70;
const EMPLOYEE_COL_W = 120;
const TOTAL_COL_W = 60;
const ROW_H = 32;

const formatHours = (h: number): string => {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h${mins.toString().padStart(2, '0')}` : `${hrs}h`;
};

const buildTimelineHTML = (params: ExportTimelinePDFParams): HTMLElement => {
  const { employees, day, date, schedules, weekNumber, year, managedColors } = params;
  const startMin = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
  const endMin = timeToMinutes(TIME_CONSTRAINTS.MAX_TIME);
  const totalMinutes = endMin - startMin;
  const timelineW = (totalMinutes / 60) * TIMELINE_PX_PER_HOUR;
  const fullW = EMPLOYEE_COL_W + timelineW + TOTAL_COL_W;

  const root = document.createElement('div');
  root.style.cssText = `padding:24px 28px;background:#fff;width:${fullW + 56}px;font-family:Arial,Helvetica,sans-serif;`;

  const title = document.createElement('div');
  title.style.cssText = 'margin-bottom:16px;font-size:15px;font-weight:700;text-align:center;color:#111827;';
  title.textContent = `Planning ${day} ${date} — Semaine ${weekNumber}, ${year}`;
  root.appendChild(title);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `width:${fullW}px;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;`;

  const headerRow = document.createElement('div');
  headerRow.style.cssText = `display:flex;background:#f3f4f6;border-bottom:2px solid #9ca3af;height:28px;`;

  const headerName = document.createElement('div');
  headerName.style.cssText = `width:${EMPLOYEE_COL_W}px;flex-shrink:0;display:flex;align-items:center;padding-left:8px;font-size:10px;font-weight:700;color:#374151;border-right:1px solid #d1d5db;`;
  headerName.textContent = 'Employe';
  headerRow.appendChild(headerName);

  const headerTimeline = document.createElement('div');
  headerTimeline.style.cssText = `width:${timelineW}px;flex-shrink:0;display:flex;position:relative;`;

  for (let m = startMin; m <= endMin; m += 60) {
    const offset = ((m - startMin) / totalMinutes) * timelineW;
    const tick = document.createElement('div');
    tick.style.cssText = `position:absolute;left:${offset}px;top:0;bottom:0;display:flex;align-items:center;border-left:1px solid #d1d5db;padding-left:3px;`;
    const label = document.createElement('span');
    label.style.cssText = 'font-size:9px;font-weight:600;color:#6b7280;';
    label.textContent = minutesToTime(m);
    tick.appendChild(label);
    headerTimeline.appendChild(tick);
  }
  headerRow.appendChild(headerTimeline);

  const headerTotal = document.createElement('div');
  headerTotal.style.cssText = `width:${TOTAL_COL_W}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#374151;border-left:1px solid #d1d5db;`;
  headerTotal.textContent = 'Total';
  headerRow.appendChild(headerTotal);

  wrapper.appendChild(headerRow);

  employees.forEach((employee, idx) => {
    const schedule = schedules[`${employee.id}-${day}`] || {};
    const dailyH = calculateDailyHours(schedule);
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? '#ffffff' : '#f9fafb';

    const row = document.createElement('div');
    row.style.cssText = `display:flex;height:${ROW_H}px;border-bottom:1px solid #e5e7eb;background:${bgColor};`;

    const nameCell = document.createElement('div');
    nameCell.style.cssText = `width:${EMPLOYEE_COL_W}px;flex-shrink:0;display:flex;align-items:center;padding-left:8px;font-size:10px;font-weight:600;color:#111827;border-right:1px solid #e5e7eb;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;`;
    nameCell.textContent = employee.name;
    row.appendChild(nameCell);

    const timelineCell = document.createElement('div');
    timelineCell.style.cssText = `width:${timelineW}px;flex-shrink:0;position:relative;`;

    for (let m = startMin; m <= endMin; m += 60) {
      const offset = ((m - startMin) / totalMinutes) * timelineW;
      const gridLine = document.createElement('div');
      gridLine.style.cssText = `position:absolute;left:${offset}px;top:0;bottom:0;border-left:1px solid ${m === timeToMinutes('12:00') ? '#d1d5db' : '#f3f4f6'};`;
      timelineCell.appendChild(gridLine);
    }

    const renderBar = (startKey: string, endKey: string, colorKey: string) => {
      const s = schedule[startKey as keyof Schedule];
      const e = schedule[endKey as keyof Schedule];
      if (!s || !e) return;

      const sMin = timeToMinutes(s);
      const eMin = timeToMinutes(e);
      const left = ((sMin - startMin) / totalMinutes) * timelineW;
      const width = ((eMin - sMin) / totalMinutes) * timelineW;

      const mc = findManagedColor(managedColors, schedule[colorKey as keyof Schedule]);
      const hex = mc ? mc.hex : '#DBEAFE';
      const textColor = mc ? getTextColorForHex(mc.hex) : '#1E3A8A';

      const bar = document.createElement('div');
      bar.style.cssText = `position:absolute;left:${left}px;width:${width}px;top:4px;height:${ROW_H - 8}px;background:${hex};border:1px solid ${hex};border-radius:4px;display:flex;align-items:center;padding:0 4px;overflow:hidden;`;

      const text = document.createElement('span');
      text.style.cssText = `font-size:8px;font-weight:600;color:${textColor};white-space:nowrap;`;
      text.textContent = `${s} - ${e}`;
      bar.appendChild(text);

      timelineCell.appendChild(bar);
    };

    renderBar('morningStart', 'morningEnd', 'morningColor');
    renderBar('afternoonStart', 'afternoonEnd', 'afternoonColor');

    row.appendChild(timelineCell);

    const totalCell = document.createElement('div');
    totalCell.style.cssText = `width:${TOTAL_COL_W}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#1d4ed8;border-left:1px solid #e5e7eb;`;
    totalCell.textContent = formatHours(dailyH);
    row.appendChild(totalCell);

    wrapper.appendChild(row);
  });

  const footerRow = document.createElement('div');
  footerRow.style.cssText = `display:flex;height:28px;background:#f3f4f6;border-top:2px solid #9ca3af;`;

  const footerLabel = document.createElement('div');
  footerLabel.style.cssText = `width:${EMPLOYEE_COL_W}px;flex-shrink:0;display:flex;align-items:center;padding-left:8px;font-size:10px;font-weight:700;color:#374151;border-right:1px solid #d1d5db;`;
  footerLabel.textContent = 'Total';
  footerRow.appendChild(footerLabel);

  const footerTimeline = document.createElement('div');
  footerTimeline.style.cssText = `width:${timelineW}px;flex-shrink:0;`;
  footerRow.appendChild(footerTimeline);

  let dayTotal = 0;
  employees.forEach(emp => {
    const sch = schedules[`${emp.id}-${day}`];
    if (sch) dayTotal += calculateDailyHours(sch);
  });

  const footerTotal = document.createElement('div');
  footerTotal.style.cssText = `width:${TOTAL_COL_W}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#1d4ed8;border-left:1px solid #d1d5db;`;
  footerTotal.textContent = formatHours(dayTotal);
  footerRow.appendChild(footerTotal);

  wrapper.appendChild(footerRow);
  root.appendChild(wrapper);

  if (managedColors.length > 0) {
    const legend = document.createElement('div');
    legend.style.cssText = 'margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;font-size:9px;';

    managedColors.forEach(mc => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:4px;';

      const swatch = document.createElement('span');
      swatch.style.cssText = `width:12px;height:12px;border-radius:50%;border:1px solid #d1d5db;display:inline-block;background:${mc.hex};`;
      item.appendChild(swatch);

      const label = document.createElement('span');
      label.style.cssText = 'color:#374151;';
      label.textContent = mc.label;
      item.appendChild(label);

      legend.appendChild(item);
    });

    root.appendChild(legend);
  }

  return root;
};

export const exportTimelineToPDF = async (params: ExportTimelinePDFParams): Promise<void> => {
  const container = buildTimelineHTML(params);
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    document.body.removeChild(container);

    const isPortrait = params.employees.length > 12;
    const pdf = new jsPDF({
      orientation: isPortrait ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;
    const ratio = canvas.width / canvas.height;

    let imgW = usableW;
    let imgH = imgW / ratio;

    if (imgH > usableH) {
      imgH = usableH;
      imgW = imgH * ratio;
    }

    const x = (pageW - imgW) / 2;
    const y = (pageH - imgH) / 2;

    pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', x, y, imgW, imgH);
    pdf.save(`planning-${params.day.toLowerCase()}-S${params.weekNumber}-${params.year}.pdf`);
  } catch (error) {
    document.body.removeChild(container);
    console.error('Erreur export PDF timeline:', error);
    throw error;
  }
};

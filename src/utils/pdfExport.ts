import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Employee, Schedule, ColorLabel } from '../types';
import { calculateWeeklyHours, calculateDailyHours } from './scheduleCalculations';
import { COLOR_OPTIONS } from './colorUtils';

interface ExportToPDFParams {
  employees: Employee[];
  days: string[];
  dates: string[];
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  colorLabels: ColorLabel[];
}

const getColorHex = (colorName?: string): string | null => {
  if (!colorName) return null;
  const option = COLOR_OPTIONS.find(c => c.name.toLowerCase() === colorName);
  if (!option) return null;
  const match = option.bgClass.match(/#[0-9A-Fa-f]{6}/);
  return match ? match[0] : null;
};

const getTextColorForBg = (colorName?: string): string => {
  if (!colorName) return '#000000';
  const option = COLOR_OPTIONS.find(c => c.name.toLowerCase() === colorName);
  return option?.textClass.includes('white') ? '#FFFFFF' : '#000000';
};

const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

const createPDFTable = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year,
  colorLabels
}: ExportToPDFParams): HTMLElement => {
  const container = document.createElement('div');
  container.style.cssText = 'padding:24px 32px;background:#fff;width:1120px;font-family:Arial,Helvetica,sans-serif;';

  const title = document.createElement('div');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;font-weight:700;text-align:center;color:#111827;';
  title.textContent = `Planning Semaine ${weekNumber} - ${year}`;
  container.appendChild(title);

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:9px;border:2px solid #1f2937;';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const thStyle = 'padding:6px 4px;border:1px solid #374151;font-weight:700;text-align:center;background:#f3f4f6;color:#111827;';

  const thEmployee = document.createElement('th');
  thEmployee.style.cssText = thStyle + 'width:100px;text-align:left;';
  thEmployee.textContent = 'Employé';
  headerRow.appendChild(thEmployee);

  const thPeriod = document.createElement('th');
  thPeriod.style.cssText = thStyle + 'width:60px;';
  thPeriod.textContent = 'Période';
  headerRow.appendChild(thPeriod);

  days.forEach((day, i) => {
    const th = document.createElement('th');
    th.style.cssText = thStyle;
    th.innerHTML = `${day}<br><span style="font-size:8px;font-weight:400;color:#6b7280;">${dates[i]}</span>`;
    headerRow.appendChild(th);
  });

  const thTotal = document.createElement('th');
  thTotal.style.cssText = thStyle + 'width:50px;';
  thTotal.textContent = 'Total';
  headerRow.appendChild(thTotal);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const cellStyle = 'padding:4px;border:1px solid #d1d5db;text-align:center;';

  employees.forEach((employee, empIndex) => {
    const weeklyTotal = calculateWeeklyHours(schedules, employee.id);
    const bgColor = empIndex % 2 === 0 ? '' : 'background:#f9fafb;';

    const morningRow = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.style.cssText = cellStyle + 'text-align:left;font-weight:600;border-bottom:none;' + bgColor;
    nameCell.textContent = employee.name;
    nameCell.rowSpan = 2;
    morningRow.appendChild(nameCell);

    const mLabel = document.createElement('td');
    mLabel.style.cssText = cellStyle + 'font-size:8px;color:#6b7280;border-bottom:none;' + bgColor;
    mLabel.textContent = 'Matin';
    morningRow.appendChild(mLabel);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      const td = document.createElement('td');
      td.style.cssText = cellStyle + 'border-bottom:none;' + bgColor;

      if (schedule.morningStart && schedule.morningEnd) {
        td.textContent = `${schedule.morningStart} - ${schedule.morningEnd}`;
        const hex = getColorHex(schedule.morningColor);
        if (hex) {
          td.style.backgroundColor = hex;
          td.style.color = getTextColorForBg(schedule.morningColor);
          td.style.fontWeight = '500';
        }
      }
      morningRow.appendChild(td);
    });

    const totalCell = document.createElement('td');
    totalCell.style.cssText = cellStyle + 'font-weight:700;color:#1d4ed8;border-bottom:none;' + bgColor;
    totalCell.textContent = formatHours(weeklyTotal);
    totalCell.rowSpan = 2;
    morningRow.appendChild(totalCell);

    const afternoonRow = document.createElement('tr');

    const aLabel = document.createElement('td');
    aLabel.style.cssText = cellStyle + 'font-size:8px;color:#6b7280;' + bgColor;
    aLabel.textContent = 'Après-midi';
    afternoonRow.appendChild(aLabel);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      const td = document.createElement('td');
      td.style.cssText = cellStyle + bgColor;

      if (schedule.afternoonStart && schedule.afternoonEnd) {
        td.textContent = `${schedule.afternoonStart} - ${schedule.afternoonEnd}`;
        const hex = getColorHex(schedule.afternoonColor);
        if (hex) {
          td.style.backgroundColor = hex;
          td.style.color = getTextColorForBg(schedule.afternoonColor);
          td.style.fontWeight = '500';
        }
      }
      afternoonRow.appendChild(td);
    });

    tbody.appendChild(morningRow);
    tbody.appendChild(afternoonRow);
  });

  const footerRow = document.createElement('tr');
  footerRow.style.cssText = 'background:#f3f4f6;';

  const totalLabel = document.createElement('td');
  totalLabel.style.cssText = cellStyle + 'font-weight:700;text-align:left;background:#f3f4f6;';
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

  const grandTotalCell = document.createElement('td');
  grandTotalCell.style.cssText = cellStyle + 'font-weight:700;color:#1d4ed8;background:#f3f4f6;';
  grandTotalCell.textContent = formatHours(grandTotal);
  footerRow.appendChild(grandTotalCell);

  tbody.appendChild(footerRow);
  table.appendChild(tbody);
  container.appendChild(table);

  if (colorLabels.length > 0) {
    const legend = document.createElement('div');
    legend.style.cssText = 'margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;font-size:9px;';

    colorLabels.forEach(cl => {
      if (!cl.label) return;
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:4px;';

      const swatch = document.createElement('span');
      const hex = getColorHex(cl.color);
      swatch.style.cssText = `width:12px;height:12px;border-radius:50%;border:1px solid #d1d5db;display:inline-block;${hex ? 'background:' + hex + ';' : ''}`;
      item.appendChild(swatch);

      const label = document.createElement('span');
      label.style.cssText = 'color:#374151;';
      label.textContent = cl.label;
      item.appendChild(label);

      legend.appendChild(item);
    });

    container.appendChild(legend);
  }

  return container;
};

export const exportToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    const container = createPDFTable(params);
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    document.body.removeChild(container);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
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
    pdf.save(`planning-semaine-${params.weekNumber}-${params.year}.pdf`);
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    throw error;
  }
};

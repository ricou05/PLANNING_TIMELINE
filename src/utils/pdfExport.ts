import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Employee, Schedule, ColorLabel } from '../types';
import { calculateWeeklyHours } from './scheduleCalculations';
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

const createPDFTable = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year
}: ExportToPDFParams): HTMLElement => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.backgroundColor = '#ffffff';
  container.style.width = '800px';

  // Title
  const title = document.createElement('h1');
  title.textContent = `Planning Semaine ${weekNumber} - ${year}`;
  title.style.marginBottom = '20px';
  title.style.fontSize = '18px';
  title.style.textAlign = 'center';
  title.style.fontWeight = 'bold';
  container.appendChild(title);

  // Table
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '11px';
  table.style.border = '1px solid #000';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.backgroundColor = '#f8f9fa';
  
  ['Employé', 'Période', ...days].forEach((text, index) => {
    const th = document.createElement('th');
    th.style.padding = '8px';
    th.style.border = '1px solid #000';
    th.style.fontWeight = 'bold';
    
    if (index > 1) {
      const headerContent = document.createElement('div');
      headerContent.innerHTML = `${text}<br><span style="font-size: 10px">${dates[index-2]}</span>`;
      th.appendChild(headerContent);
    } else {
      th.textContent = text;
    }
    
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  employees.forEach(employee => {
    const weeklyTotal = calculateWeeklyHours(schedules, employee.id);

    // Morning row
    const morningRow = document.createElement('tr');
    
    const employeeCell = document.createElement('td');
    employeeCell.style.padding = '8px';
    employeeCell.style.border = '1px solid #000';
    employeeCell.style.fontWeight = '500';
    employeeCell.textContent = employee.name;
    employeeCell.rowSpan = 2;
    morningRow.appendChild(employeeCell);

    const morningLabel = document.createElement('td');
    morningLabel.style.padding = '8px';
    morningLabel.style.border = '1px solid #000';
    morningLabel.textContent = 'Matin';
    morningRow.appendChild(morningLabel);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      const td = document.createElement('td');
      td.style.padding = '8px';
      td.style.border = '1px solid #000';
      td.style.textAlign = 'center';
      
      if (schedule.morningStart && schedule.morningEnd) {
        td.textContent = `${schedule.morningStart} - ${schedule.morningEnd}`;
        if (schedule.morningColor) {
          const colorOption = COLOR_OPTIONS.find(c => c.name.toLowerCase() === schedule.morningColor);
          if (colorOption) {
            td.style.backgroundColor = colorOption.bgClass.replace('bg-[', '').replace(']', '');
          }
        }
      }
      
      morningRow.appendChild(td);
    });

    // Afternoon row
    const afternoonRow = document.createElement('tr');
    
    const afternoonLabel = document.createElement('td');
    afternoonLabel.style.padding = '8px';
    afternoonLabel.style.border = '1px solid #000';
    afternoonLabel.textContent = 'Après-midi';
    afternoonRow.appendChild(afternoonLabel);

    days.forEach(day => {
      const schedule = schedules[`${employee.id}-${day}`] || {};
      const td = document.createElement('td');
      td.style.padding = '8px';
      td.style.border = '1px solid #000';
      td.style.textAlign = 'center';
      
      if (schedule.afternoonStart && schedule.afternoonEnd) {
        td.textContent = `${schedule.afternoonStart} - ${schedule.afternoonEnd}`;
        if (schedule.afternoonColor) {
          const colorOption = COLOR_OPTIONS.find(c => c.name.toLowerCase() === schedule.afternoonColor);
          if (colorOption) {
            td.style.backgroundColor = colorOption.bgClass.replace('bg-[', '').replace(']', '');
          }
        }
      }
      
      afternoonRow.appendChild(td);
    });

    tbody.appendChild(morningRow);
    tbody.appendChild(afternoonRow);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  return container;
};

export const exportToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    const container = createPDFTable(params);
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
    const ratio = canvas.width / canvas.height;
    
    let imgWidth = pageWidth - 20;
    let imgHeight = imgWidth / ratio;

    if (imgHeight > pageHeight - 20) {
      imgHeight = pageHeight - 20;
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
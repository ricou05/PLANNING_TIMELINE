import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Employee, Schedule } from '../types';
import * as XLSX from 'xlsx';
import EmployeeNameEditor from './EmployeeNameEditor';

interface ExcelViewProps {
  employees: Employee[];
  days: string[];
  dates: string[];
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  onEmployeeNameChange: (id: number, newName: string) => void;
  onEmployeeDelete: (id: number) => void;
}

const ExcelView: React.FC<ExcelViewProps> = ({
  employees,
  days,
  dates,
  schedules,
  weekNumber,
  year,
  onEmployeeNameChange,
  onEmployeeDelete
}) => {
  const exportToExcel = () => {
    // Créer un nouveau workbook
    const wb = XLSX.utils.book_new();
    
    // Préparer les données
    const wsData: any[][] = [];
    
    // En-tête avec les dates
    const headerRow = ['Employé'];
    days.forEach((_, index) => {
      headerRow.push(dates[index], '-', '');
    });
    wsData.push(headerRow);
    
    // Ajouter les employés et leurs horaires
    employees.forEach((employee) => {
      const morningRow = [employee.name];
      const afternoonRow = [''];
      
      days.forEach((day) => {
        const schedule = schedules[`${employee.id}-${day}`] || {};
        
        morningRow.push(
          schedule.morningStart || '',
          '-',
          schedule.morningEnd || ''
        );
        
        afternoonRow.push(
          schedule.afternoonStart || '',
          '-',
          schedule.afternoonEnd || ''
        );
      });
      
      wsData.push(morningRow, afternoonRow);
    });

    // Créer la feuille
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajouter des styles aux cellules
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell_address = XLSX.utils.encode_cell({r: R, c: C});
        if (!ws[cell_address]) continue;

        const employee = employees[Math.floor((R - 1) / 2)];
        const dayIndex = Math.floor((C - 1) / 3);
        const day = days[dayIndex];

        if (employee && day) {
          const schedule = schedules[`${employee.id}-${day}`] || {};
          const isMorning = (R - 1) % 2 === 0;
          const color = isMorning ? schedule.morningColor : schedule.afternoonColor;

          if (color) {
            if (!ws[cell_address].s) ws[cell_address].s = {};
            ws[cell_address].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: getColorRGB(color) }
            };
          }
        }
      }
    }

    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Planning');

    // Sauvegarder le fichier
    XLSX.writeFile(wb, `planning-semaine-${weekNumber}-${year}.xlsx`);
  };

  const getColorRGB = (colorName: string): string => {
    switch (colorName?.toLowerCase()) {
      case 'bleu': return '99CCFF';
      case 'rouge': return 'FF9999';
      case 'vert': return '99FF99';
      case 'violet': return 'CC99FF';
      case 'orange': return 'FFCC99';
      case 'cyan': return '99FFFF';
      case 'rose': return 'FF99CC';
      case 'ambre': return 'FFD699';
      default: return 'FFFFFF';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Liste des employés</h2>
        <div className="space-y-2">
          {employees.map((employee) => (
            <div key={employee.id} className="flex items-center gap-4">
              <span className="w-8 text-gray-500">#{employee.id}</span>
              <EmployeeNameEditor
                employee={employee}
                onNameChange={onEmployeeNameChange}
                className="text-base"
              />
              <button 
                onClick={() => onEmployeeDelete(employee.id)}
                className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                title="Supprimer cet employé"
              >
                <span className="text-sm">Supprimer</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={exportToExcel}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-all duration-150"
      >
        <FileSpreadsheet className="w-5 h-5" />
        Télécharger le fichier Excel
      </button>
    </div>
  );
};

export default ExcelView;
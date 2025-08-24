import { Employee, Schedule } from '../types';

interface CSVParseResult {
  employees: Employee[];
  schedules: Record<string, Schedule>;
  errors: string[];
  importedCount: number;
  employeeCount: number;
}

export const parseCSV = (
  csvContent: string,
  existingEmployees: Employee[] = [],
  replaceAll: boolean = false
): CSVParseResult => {
  const result: CSVParseResult = {
    employees: replaceAll ? [] : [...existingEmployees],
    schedules: {},
    errors: [],
    importedCount: 0,
    employeeCount: 0
  };

  // Séparation des lignes
  const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 3) {
    result.errors.push('Le fichier CSV ne contient pas assez de lignes');
    return result;
  }

  // Vérification des en-têtes
  const headerLine = lines[0];
  const daysLine = lines[1];
  
  // Extraction des jours de la semaine
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  
  // Traitement des données des employés
  let currentEmployeeId: number | null = null;
  let currentEmployeeName: string = '';
  let employeeCounter = 0;
  
  // Déterminer le prochain ID disponible
  let nextEmployeeId = 1;
  if (result.employees.length > 0) {
    nextEmployeeId = Math.max(...result.employees.map(e => e.id)) + 1;
  }

  // Parcourir les lignes de données (à partir de la ligne 2)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = line.split(';');
    
    // Vérifier si c'est une nouvelle ligne d'employé ou une ligne de période
    const employeeName = cells[0].trim();
    const periodType = cells[1].trim().toLowerCase();
    
    if (employeeName) {
      // Nouvelle ligne d'employé
      currentEmployeeName = employeeName;
      
      // Vérifier si l'employé existe déjà
      const existingEmployee = result.employees.find(e => e.name === currentEmployeeName);
      if (existingEmployee) {
        currentEmployeeId = existingEmployee.id;
      } else {
        // Créer un nouvel employé
        currentEmployeeId = nextEmployeeId++;
        result.employees.push({
          id: currentEmployeeId,
          name: currentEmployeeName
        });
        employeeCounter++;
      }
    }
    
    if (!currentEmployeeId) {
      result.errors.push(`Impossible de déterminer l'employé pour la ligne ${i + 1}`);
      continue;
    }
    
    // Traiter les horaires pour chaque jour
    if (periodType === 'matin' || periodType === 'apres-midi') {
      const period = periodType === 'matin' ? 'morning' : 'afternoon';
      
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];
        const startIndex = 2 + (dayIndex * 2); // Position de l'heure de début
        const endIndex = 3 + (dayIndex * 2);   // Position de l'heure de fin
        
        if (startIndex < cells.length && endIndex < cells.length) {
          const startTime = cells[startIndex].trim();
          const endTime = cells[endIndex].trim();
          
          // Ignorer les horaires vides ou 00:00
          if (startTime && endTime && 
              (startTime !== '00:00' || endTime !== '00:00') &&
              startTime !== endTime) {
            
            const scheduleKey = `${currentEmployeeId}-${day}`;
            
            if (!result.schedules[scheduleKey]) {
              result.schedules[scheduleKey] = {
                morningStart: '',
                morningEnd: '',
                afternoonStart: '',
                afternoonEnd: '',
                morningColor: 'bleu',
                afternoonColor: 'vert'
              };
            }
            
            result.schedules[scheduleKey][`${period}Start`] = startTime;
            result.schedules[scheduleKey][`${period}End`] = endTime;
            result.importedCount++;
          }
        }
      }
    }
  }
  
  result.employeeCount = employeeCounter;
  return result;
};
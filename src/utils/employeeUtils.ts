import Cookies from 'js-cookie';
import { Employee } from '../types';

const EMPLOYEE_ORDER_COOKIE = 'employeeOrder';

export const saveEmployeeOrder = (employees: Employee[]): void => {
  const orderIds = employees.map(emp => emp.id);
  Cookies.set(EMPLOYEE_ORDER_COOKIE, JSON.stringify(orderIds), { expires: 365 });
};

export const loadEmployeeOrder = (employees: Employee[]): Employee[] => {
  const savedOrder = Cookies.get(EMPLOYEE_ORDER_COOKIE);
  if (!savedOrder) return employees;

  try {
    const orderIds = JSON.parse(savedOrder) as number[];
    const orderedEmployees = [...employees];
    
    // Créer un map pour un accès rapide aux indices
    const currentOrder = new Map(employees.map((emp, index) => [emp.id, index]));
    
    // Réorganiser les employés selon l'ordre sauvegardé
    orderIds.forEach((id, newIndex) => {
      const currentIndex = currentOrder.get(id);
      if (currentIndex !== undefined && currentIndex !== newIndex) {
        const [employee] = orderedEmployees.splice(currentIndex, 1);
        orderedEmployees.splice(newIndex, 0, employee);
        // Mettre à jour les indices dans le map
        orderedEmployees.forEach((emp, i) => currentOrder.set(emp.id, i));
      }
    });

    return orderedEmployees;
  } catch (error) {
    console.error('Error loading employee order:', error);
    return employees;
  }
};
import { Timestamp } from 'firebase/firestore';

export interface Employee {
  id: number;
  name: string;
}

export interface Schedule {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  morningColor?: string;
  afternoonColor?: string;
  isRestDay?: boolean;
  /** Libellé d'absence (Congés, Maladie, École...) — journée non travaillée */
  absence?: string;
}

export interface ShiftTemplate {
  id: string;
  label: string;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  /** Couleur (id de couleur gérée) appliquée aux créneaux ; sinon la couleur sélectionnée */
  color?: string;
}

export interface ColorLabel {
  color: string;
  label: string;
}

export interface ManagedColor {
  id: string;
  hex: string;
  label: string;
}

export interface SavedSchedule {
  id: string;
  name: string;
  schedules: Record<string, Schedule>;
  employees: Employee[];
  weekNumber: number;
  year: number;
  colorLabels: ColorLabel[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
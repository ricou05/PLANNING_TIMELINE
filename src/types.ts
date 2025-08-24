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
}

export interface ColorLabel {
  color: string;
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
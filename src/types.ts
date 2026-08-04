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
  /** Libellé d'absence (Congés, Maladie, École...) — journée entière non travaillée */
  absence?: string;
  /** Libellé d'absence sur le matin uniquement (demi-journée) */
  morningAbsence?: string;
  /** Libellé d'absence sur l'après-midi uniquement (demi-journée) */
  afternoonAbsence?: string;
}

/** Portée d'une absence : journée entière ou demi-journée */
export type AbsencePeriod = 'full' | 'morning' | 'afternoon';

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
  /** Sauvegarde encore stockée sur ce seul PC (non envoyée en ligne) */
  isLocal?: boolean;
  /** Identifiant Firestore réservé pour cette sauvegarde locale (évite les doublons à la synchro) */
  remoteId?: string;
}
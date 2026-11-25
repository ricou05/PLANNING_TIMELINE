import { Timestamp } from 'firebase/firestore';

// Dates affichées dans le menu Fichier et ses boîtes de dialogue (JJ/MM/AAAA a HHhMM)
export const formatAutoSaveTime = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} a ${pad(d.getHours())}h${pad(d.getMinutes())}`;
};

export const formatTimestamp = (timestamp?: Timestamp | null): string => {
  if (!timestamp?.toDate) return 'date inconnue';
  return formatAutoSaveTime(timestamp.toDate().toISOString());
};

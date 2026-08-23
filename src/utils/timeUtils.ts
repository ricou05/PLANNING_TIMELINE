// Time constants
export const TIME_CONSTRAINTS = {
  MIN_TIME: '06:30',
  MAX_TIME: '20:00',
  NOON_TIME: '12:00'
};

// Basic time conversion utilities
export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Time slots generation (after basic utilities are defined)
export const generateTimeSlots = () => {
  const slots = [];
  const startMinutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
  const endMinutes = timeToMinutes(TIME_CONSTRAINTS.MAX_TIME);
  
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
};

// Export time slots
export const TIME_SLOTS = generateTimeSlots();

// Additional time utilities
export const clampTime = (time: string): string => {
  const timeInMinutes = timeToMinutes(time);
  const minMinutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
  const maxMinutes = timeToMinutes(TIME_CONSTRAINTS.MAX_TIME);
  
  const clampedMinutes = Math.min(Math.max(timeInMinutes, minMinutes), maxMinutes);
  return minutesToTime(clampedMinutes);
};

export const roundToNearestSlot = (time: string): string => {
  const minutes = timeToMinutes(time);
  const roundedMinutes = Math.round(minutes / 15) * 15;
  return minutesToTime(roundedMinutes);
};

// --- Affichage des cumuls d'heures -------------------------------------
// Un créneau est saisi au quart d'heure : 7h45 vaut 7,75 h. Arrondir à une
// seule décimale (7,8 h) fausse la lecture et fait diverger deux vues qui
// pourtant calculent la même chose. On garde donc la valeur exacte, sans
// zéro inutile : 7.75 → « 7.75h », 7.5 → « 7.5h », 8 → « 8h ».
export const formatHours = (hours: number): string => {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded.toFixed(2).replace(/\.?0+$/, '')}h`;
};

/** Variante heures/minutes utilisée par les exports PDF : 7.75 → « 7h45 ». */
export const formatHoursHM = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

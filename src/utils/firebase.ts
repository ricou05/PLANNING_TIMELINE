// Ce fichier est maintenant vide car toute la logique Firebase est déplacée
// vers les fichiers dans le dossier utils/firebase/
export { db } from './firebase/config';
export { saveSchedule, updateSchedule, getSchedules } from './firebase/schedules';
export { handleFirebaseError } from './firebase/error-handling';
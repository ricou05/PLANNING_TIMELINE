export function getWeekDates(weekNumber: number, year: number = new Date().getFullYear()): Date[] {
  // Créer une date au 1er janvier de l'année
  const date = new Date(year, 0, 1);
  
  // Obtenir le jour de la semaine (0-6, 0 étant dimanche)
  let dayNum = date.getDay();
  
  // Reculer au lundi de la première semaine
  // Si c'est dimanche (0), reculer de 6 jours
  // Si c'est lundi (1), reculer de 0 jour
  // Si c'est mardi (2), reculer de 1 jour, etc.
  date.setDate(date.getDate() - (dayNum === 0 ? 6 : dayNum - 1));
  
  // Avancer jusqu'à la semaine demandée
  date.setDate(date.getDate() + (weekNumber - 1) * 7);
  
  // Créer un tableau avec les 7 jours de la semaine
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(date);
    day.setDate(date.getDate() + i);
    return day;
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.floor(diff / oneWeek);
  return week + 1;
}

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  
  // Si c'est déjà une Date
  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Si c'est un Timestamp Firestore
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Si c'est un objet avec seconds (pour la compatibilité avec le stockage local)
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return '';
}
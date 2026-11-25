// Correspondances entre les saisonniers de l'an passé (N-1, prénoms de
// l'historique Excel) et ceux de cette saison (N, salariés de l'application).
// On suit des POSTES : le salarié N reprend le poste d'un ou plusieurs
// salariés N-1 (ex. un responsable remplacé, deux personnes qui se sont
// succédé sur le même poste en cours de saison).
//
// Les noms ne sont jamais écrits dans le code : la table est saisie dans
// l'application et rangée dans Firestore (collection `correspondances`).
import { Employee } from '../../types';
import { HistoryWeek } from './types';

export interface Correspondences {
  /** Prénom N-1 → prénom N-1 de la même personne (faute de frappe, diminutif) */
  aliases: Record<string, string>;
  /**
   * Prénom N-1 (après correction) → nom du salarié N qui reprend son poste.
   * Chaîne vide = poste non repris. Absent = association automatique
   * (même prénom), si le salarié N n'a pas déjà un poste attribué.
   */
  successors: Record<string, string>;
}

export const EMPTY_CORRESPONDENCES: Correspondences = { aliases: {}, successors: {} };

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const nameKey = (s: string) => stripAccents(s).trim().toLowerCase().replace(/\s+/g, ' ');
const firstNameKey = (s: string) => nameKey(s).split(' ')[0] ?? '';

/** Prénom N-1 corrigé (« Isa » → « Isabelle » si la table le dit) */
export const canonicalName = (name: string, c: Correspondences): string => c.aliases[name] || name;

const findEmployee = (employees: Employee[], name: string): Employee | null =>
  employees.find((e) => nameKey(e.name) === nameKey(name)) ?? null;

export interface ResolvedSuccessor {
  employee: Employee | null;
  /** true = trouvé par le prénom, sans réglage dans la table */
  auto: boolean;
}

/**
 * Salarié N qui reprend le poste d'un prénom N-1 : réglage explicite de la
 * table, sinon même prénom — sauf si ce salarié a déjà un poste attribué à
 * la main (ex. un salarié revenu qui change de poste).
 */
export function resolveSuccessor(n1Name: string, c: Correspondences, employees: Employee[]): ResolvedSuccessor {
  const canon = canonicalName(n1Name, c);
  if (canon in c.successors) {
    const target = c.successors[canon];
    return { employee: target ? findEmployee(employees, target) : null, auto: false };
  }
  const explicitTargets = new Set(Object.values(c.successors).filter(Boolean).map(nameKey));
  const matches = employees.filter(
    (e) => firstNameKey(e.name) === firstNameKey(canon) && !explicitTargets.has(nameKey(e.name))
  );
  return { employee: matches.length === 1 ? matches[0] : null, auto: true };
}

/** Prénoms N-1 (corrigés) dont le salarié reprend le poste */
export function predecessorsOf(
  employee: Employee,
  n1Names: string[],
  c: Correspondences,
  employees: Employee[]
): string[] {
  const names = new Set<string>();
  n1Names.forEach((n) => {
    if (resolveSuccessor(n, c, employees).employee?.id === employee.id) names.add(canonicalName(n, c));
  });
  return [...names];
}

/** Prénoms présents dans une semaine d'historique */
export const namesOfWeek = (week: HistoryWeek): string[] => [
  ...new Set(week.days.flatMap((d) => d.entries.map((e) => e.name))),
];

/** Heures N-1 de la semaine de référence, par salarié N (selon son poste) */
export function referenceHoursByEmployee(
  week: HistoryWeek,
  c: Correspondences,
  employees: Employee[]
): Record<number, { hours: number; names: string[] }> {
  const result: Record<number, { hours: number; names: string[] }> = {};
  week.days.forEach((day) =>
    day.entries.forEach((entry) => {
      const successor = resolveSuccessor(entry.name, c, employees).employee;
      if (!successor) return;
      const slot = (result[successor.id] ??= { hours: 0, names: [] });
      slot.hours += entry.hours;
      const canon = canonicalName(entry.name, c);
      if (!slot.names.includes(canon)) slot.names.push(canon);
    })
  );
  return result;
}

/** Nom de salarié N déjà présent dans le planning (comparaison sans casse ni accents) */
export const isInPlanning = (name: string, employees: Employee[]): boolean => findEmployee(employees, name) !== null;

/** Même prénom (premier mot), sans casse ni accents */
export const sameFirstName = (a: string, b: string): boolean => firstNameKey(a) === firstNameKey(b);

/**
 * Salariés N choisis dans la table mais pas encore dans le planning, avec
 * les prénoms N-1 dont ils reprennent le poste (limité à `n1Names` si fourni).
 */
export function missingSuccessors(
  c: Correspondences,
  employees: Employee[],
  n1Names?: string[]
): { name: string; predecessors: string[] }[] {
  const allowed = n1Names ? new Set(n1Names.map((n) => canonicalName(n, c))) : null;
  const byName = new Map<string, string[]>();
  Object.entries(c.successors).forEach(([n1, target]) => {
    if (!target || isInPlanning(target, employees)) return;
    if (allowed && !allowed.has(n1)) return;
    const list = byName.get(target) ?? [];
    list.push(n1);
    byName.set(target, list);
  });
  return [...byName.entries()].map(([name, predecessors]) => ({ name, predecessors }));
}

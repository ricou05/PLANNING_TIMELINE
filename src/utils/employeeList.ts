// « Coller une liste de salariés » : lecture d'une liste collée (copiée d'un
// tableur ou d'un message), une personne par ligne, éventuellement précédée
// d'un code de magasin (« UTILE 1 », « UTILE 2 ») ; et rapprochement avec les
// salariés déjà présents dans le planning.
import { Employee } from '../types';

export interface PastedEmployee {
  /** Nom retenu (code magasin retiré) */
  name: string;
  /** Ligne qui ressemble plutôt à une phrase (remarque) : décochée par défaut */
  looksLikeNote: boolean;
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const nameKey = (s: string) => stripAccents(s).trim().toLowerCase().replace(/\s+/g, ' ');
const firstNameKey = (s: string) => nameKey(s).split(' ')[0] ?? '';

/** Nom provisoire donné par l'application à un nouveau salarié (« Employe 7 ») */
export const isPlaceholderName = (name: string): boolean => /^employ[eé]\s*\d+$/i.test(name.trim());

export function parseEmployeeList(text: string): PastedEmployee[] {
  const seen = new Set<string>();
  const result: PastedEmployee[] = [];
  text.split(/\r?\n/).forEach((line) => {
    const name = line
      .replace(/\t/g, ' ')
      .replace(/^\s*utile\s*\d*\s*[:-]?\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name || seen.has(nameKey(name))) return;
    seen.add(nameKey(name));
    const looksLikeNote = /[().:!?]/.test(name) || /\s(est|sont|le|la|les)\s/i.test(` ${name} `) || name.split(' ').length > 4;
    result.push({ name, looksLikeNote });
  });
  return result;
}

/**
 * Salarié du planning qui correspond à un nom collé : même nom, même prénom,
 * ou prénom abrégé (« Isa » pour « Isabelle »). `taken` = salariés déjà
 * associés à une autre ligne.
 */
export function matchEmployee(name: string, employees: Employee[], taken: Set<number>): Employee | null {
  const free = employees.filter((e) => !taken.has(e.id) && !isPlaceholderName(e.name));
  const key = nameKey(name);
  const first = firstNameKey(name);
  return (
    free.find((e) => nameKey(e.name) === key) ??
    free.find((e) => firstNameKey(e.name) === first) ??
    free.find((e) => {
      const f = firstNameKey(e.name);
      return f.length >= 3 && first.startsWith(f);
    }) ??
    null
  );
}

export interface EmployeeListPlanItem {
  name: string;
  /** Salarié existant à renommer, ou null pour un nouveau salarié */
  targetId: number | null;
}

/**
 * Applique la liste : renomme les salariés associés, crée les autres (en
 * réutilisant d'abord les « Employe N » encore vides de nom), et peut remettre
 * les salariés dans l'ordre de la liste (les autres suivent, inchangés).
 */
export function applyEmployeeList(
  employees: Employee[],
  plan: EmployeeListPlanItem[],
  reorder: boolean
): Employee[] {
  const byId = new Map(employees.map((e) => [e.id, { ...e }]));
  const used = new Set(plan.map((p) => p.targetId).filter((id): id is number => id !== null));
  const placeholders = employees.filter((e) => isPlaceholderName(e.name) && !used.has(e.id));
  let maxId = employees.reduce((max, e) => Math.max(max, e.id), 0);
  const added: Employee[] = [];
  const orderedIds: number[] = [];

  plan.forEach((item) => {
    let id = item.targetId;
    if (id === null) {
      const placeholder = placeholders.shift();
      if (placeholder) id = placeholder.id;
    }
    if (id !== null && byId.has(id)) {
      byId.get(id)!.name = item.name;
    } else {
      id = ++maxId;
      added.push({ id, name: item.name });
    }
    orderedIds.push(id);
  });

  const updated = [...employees.map((e) => byId.get(e.id)!), ...added];
  if (!reorder) return updated;
  const listed = orderedIds.map((id) => updated.find((e) => e.id === id)!).filter(Boolean);
  return [...listed, ...updated.filter((e) => !orderedIds.includes(e.id))];
}

// S39-2 — configuration du module de prise de rendez-vous (CR du 09/10/2026).
// Les colonnes JSON de `meeting_types` (plages hebdomadaires, questions de
// préqualification) sont validées ici, côté application : une entrée
// invalide est écartée, jamais une erreur d'affichage.
//
// Module autonome (aucun import de valeur depuis un fichier voisin) : il est
// importé tel quel par les Edge Functions Deno, qui ne résolvent pas les
// imports `./x.js` du mode « bundler ».

/** Plage de disponibilité récurrente, en heure locale du type de RDV. 0 = dimanche … 6 = samedi. */
export interface WeeklyRange {
  day: number;
  /** "HH:MM" */
  start: string;
  /** "HH:MM", strictement après `start` */
  end: string;
}

export type BookingQuestionType = "text" | "textarea" | "select" | "checkbox";

export interface BookingQuestion {
  id: string;
  label: string;
  type: BookingQuestionType;
  required: boolean;
  /** Choix proposés (type `select` uniquement). */
  options?: string[];
}

export type VideoProvider = "teams" | "none";

export type MeetingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  pending: "À valider",
  confirmed: "Confirmé",
  declined: "Refusé",
  cancelled: "Annulé",
};

export const WEEKDAY_LABEL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes depuis minuit pour "HH:MM", ou null si le format est invalide. */
export function parseTimeOfDay(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = TIME_RE.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Pure : plages valides uniquement, triées par jour puis heure de début. */
export function normalizeWeeklyAvailability(raw: unknown): WeeklyRange[] {
  if (!Array.isArray(raw)) return [];
  const ranges: WeeklyRange[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { day, start, end } = item as Record<string, unknown>;
    if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) continue;
    const s = parseTimeOfDay(start);
    const e = parseTimeOfDay(end);
    if (s === null || e === null || e <= s) continue;
    ranges.push({ day, start: start as string, end: end as string });
  }
  return ranges.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

const QUESTION_TYPES: BookingQuestionType[] = ["text", "textarea", "select", "checkbox"];

/** Pure : questions valides uniquement (libellé non vide, type connu, au moins un choix pour `select`, ids uniques). */
export function normalizeQuestions(raw: unknown): BookingQuestion[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const questions: BookingQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const id = typeof q.id === "string" ? q.id.trim() : "";
    const label = typeof q.label === "string" ? q.label.trim() : "";
    const type = q.type as BookingQuestionType;
    if (!id || !label || seen.has(id) || !QUESTION_TYPES.includes(type)) continue;
    const question: BookingQuestion = { id, label, type, required: q.required === true };
    if (type === "select") {
      const options = Array.isArray(q.options)
        ? [...new Set(q.options.filter((o): o is string => typeof o === "string").map((o) => o.trim()).filter(Boolean))]
        : [];
      if (options.length === 0) continue;
      question.options = options;
    }
    seen.add(id);
    questions.push(question);
  }
  return questions;
}

/** Pure : identifiant d'URL (minuscules, sans accent, mots séparés par des tirets). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/** Slugs de page interdits : `/rdv/gerer/<jeton>` est la page « reprogrammer / annuler » du prospect (S39-8). */
export const RESERVED_PAGE_SLUGS = ["gerer"];

export function isValidPageSlug(value: string): boolean {
  return isValidSlug(value) && !RESERVED_PAGE_SLUGS.includes(value);
}

import { isValidSlug, normalizeQuestions, normalizeWeeklyAvailability, slugify } from "@dmh/booking";
import type { BookingQuestion, VideoProvider, WeeklyRange } from "@dmh/booking";
import type { MeetingType } from "@dmh/types";

/** S39-3 — état éditable d'un type de RDV dans le CRM. */
export interface MeetingTypeFormValues {
  name: string;
  slug: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  videoProvider: VideoProvider;
  location: string;
  weeklyAvailability: WeeklyRange[];
  questions: BookingQuestion[];
  reminderHours: number[];
  redirectUrl: string;
  active: boolean;
}

export const DEFAULT_WEEKLY_AVAILABILITY: WeeklyRange[] = [1, 2, 3, 4, 5].map((day) => ({ day, start: "09:00", end: "17:00" }));

export function emptyMeetingTypeForm(): MeetingTypeFormValues {
  return {
    name: "",
    slug: "",
    description: "",
    durationMinutes: 30,
    bufferMinutes: 15,
    minNoticeHours: 24,
    maxDaysAhead: 30,
    videoProvider: "teams",
    location: "",
    weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY.map((r) => ({ ...r })),
    questions: [],
    reminderHours: [24],
    redirectUrl: "",
    active: true,
  };
}

export function meetingTypeToForm(row: MeetingType): MeetingTypeFormValues {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    durationMinutes: row.duration_minutes,
    bufferMinutes: row.buffer_minutes,
    minNoticeHours: row.min_notice_hours,
    maxDaysAhead: row.max_days_ahead,
    videoProvider: row.video_provider,
    location: row.location ?? "",
    weeklyAvailability: normalizeWeeklyAvailability(row.weekly_availability),
    questions: normalizeQuestions(row.questions),
    reminderHours: row.reminder_hours ?? [],
    redirectUrl: row.redirect_url ?? "",
    active: row.active,
  };
}

export interface MeetingTypePayload {
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  max_days_ahead: number;
  video_provider: VideoProvider;
  location: string | null;
  weekly_availability: WeeklyRange[];
  questions: BookingQuestion[];
  reminder_hours: number[];
  redirect_url: string | null;
  active: boolean;
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Pure : valide le formulaire et produit la ligne à écrire (bornes alignées
 * sur les `check` de la migration 049). Le slug est déduit du nom s'il est
 * vide. Retourne la liste des erreurs à afficher, vide si tout est valide.
 */
export function buildMeetingTypePayload(values: MeetingTypeFormValues): { payload: MeetingTypePayload | null; errors: string[] } {
  const errors: string[] = [];
  const name = values.name.trim();
  const slug = values.slug.trim() || slugify(name);
  if (!name) errors.push("Le nom est obligatoire.");
  if (!isValidSlug(slug)) errors.push("Le lien personnalisé ne peut contenir que des minuscules, chiffres et tirets.");
  if (!inRange(values.durationMinutes, 5, 480)) errors.push("La durée doit être comprise entre 5 et 480 minutes.");
  if (!inRange(values.bufferMinutes, 0, 240)) errors.push("La pause entre deux RDV doit être comprise entre 0 et 240 minutes.");
  if (!inRange(values.minNoticeHours, 0, 720)) errors.push("Le délai minimum doit être compris entre 0 et 720 heures.");
  if (!inRange(values.maxDaysAhead, 1, 365)) errors.push("L'horizon de réservation doit être compris entre 1 et 365 jours.");

  const weeklyAvailability = normalizeWeeklyAvailability(values.weeklyAvailability);
  if (weeklyAvailability.length !== values.weeklyAvailability.length) errors.push("Une plage horaire est invalide (l'heure de fin doit suivre l'heure de début).");
  else if (weeklyAvailability.length === 0) errors.push("Ajoute au moins une plage de disponibilité.");

  const questions = normalizeQuestions(values.questions);
  if (questions.length !== values.questions.length) errors.push("Une question est incomplète (libellé manquant, ou liste de choix vide).");

  const reminderHours = [...new Set(values.reminderHours)].sort((a, b) => b - a);
  if (reminderHours.some((h) => !inRange(h, 1, 168))) errors.push("Un rappel doit être compris entre 1 et 168 heures avant le RDV.");

  const redirectUrl = values.redirectUrl.trim();
  if (redirectUrl && !/^https:\/\/\S+$/.test(redirectUrl)) errors.push("La page de remerciement doit être une adresse https://.");

  if (errors.length > 0) return { payload: null, errors };
  return {
    payload: {
      name,
      slug,
      description: values.description.trim() || null,
      duration_minutes: values.durationMinutes,
      buffer_minutes: values.bufferMinutes,
      min_notice_hours: values.minNoticeHours,
      max_days_ahead: values.maxDaysAhead,
      video_provider: values.videoProvider,
      location: values.videoProvider === "none" ? values.location.trim() || null : null,
      weekly_availability: weeklyAvailability,
      questions,
      reminder_hours: reminderHours,
      redirect_url: redirectUrl || null,
      active: values.active,
    },
    errors: [],
  };
}

/** Pure : URL publique d'une page (ou d'un type) de réservation. */
export function publicBookingUrl(origin: string, pageSlug: string, typeSlug?: string): string {
  return `${origin.replace(/\/+$/, "")}/rdv/${pageSlug}${typeSlug ? `/${typeSlug}` : ""}`;
}

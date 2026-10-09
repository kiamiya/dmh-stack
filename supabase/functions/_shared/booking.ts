// Code partagé du module de prise de rendez-vous (S39, CR du 09/10/2026) :
// chargement d'une page/type publics et calcul des intervalles occupés de
// l'hôte. Vit dans _shared/ (importé, jamais déployé seul).

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingPage, MeetingType } from "../../../packages/types/src/index.ts";
import type { CalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { fetchGoogleBusyEvents, mapGoogleEventsToBusyIntervals } from "../../../packages/calendar/src/googleCalendar.ts";
import { fetchMicrosoftBusyEvents, mapMicrosoftEventsToBusyIntervals } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { normalizeQuestions, normalizeWeeklyAvailability } from "../../../packages/booking/src/config.ts";
import { computeBookingSlots } from "../../../packages/booking/src/slots.ts";
import type { BookingSlot, BusyInterval } from "../../../packages/booking/src/slots.ts";
import { resolveConnectionsByStaffId } from "./calendarConnection.ts";
import type { ResolvedConnection } from "./calendarConnection.ts";

export const BOOKING_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function bookingJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...BOOKING_CORS_HEADERS } });
}

export async function loadPublicPage(supabase: SupabaseClient, pageSlug: string): Promise<BookingPage | null> {
  const { data, error } = await supabase.from("booking_pages").select("*").eq("slug", pageSlug).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BookingPage | null) ?? null;
}

export async function loadActiveTypes(supabase: SupabaseClient, pageId: string): Promise<MeetingType[]> {
  const { data, error } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("booking_page_id", pageId)
    .eq("active", true)
    .order("position")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as MeetingType[];
}

/** Vue publique d'un type de RDV : jamais l'hôte, les rappels ni la configuration interne. */
export function publicTypeView(t: MeetingType) {
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    durationMinutes: t.duration_minutes,
    videoProvider: t.video_provider,
    location: t.location,
    timezone: t.timezone,
    questions: normalizeQuestions(t.questions),
  };
}

/**
 * Intervalles occupés de l'hôte sur la fenêtre : événements de TOUS ses
 * agendas connectés + ses RDV en ligne en attente ou confirmés (au cas où
 * l'événement provisoire n'aurait pas pu être posé dans l'agenda).
 */
export async function hostBusy(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  hostStaffId: string,
  fromIso: string,
  toIso: string,
): Promise<{ busy: BusyInterval[]; connections: ResolvedConnection[] }> {
  const connections = await resolveConnectionsByStaffId(supabase, env, hostStaffId);
  const busy: BusyInterval[] = [];
  for (const c of connections) {
    if (c.provider === "google") {
      busy.push(...mapGoogleEventsToBusyIntervals(await fetchGoogleBusyEvents({ accessToken: c.accessToken, timeMin: fromIso, timeMax: toIso })));
    } else {
      busy.push(...mapMicrosoftEventsToBusyIntervals(await fetchMicrosoftBusyEvents({ accessToken: c.accessToken, startIso: fromIso, endIso: toIso })));
    }
  }
  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("starts_at, ends_at")
    .eq("staff_id", hostStaffId)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", toIso)
    .gt("ends_at", fromIso);
  if (error) throw new Error(error.message);
  busy.push(...(meetings ?? []).map((m) => ({ start: m.starts_at as string, end: m.ends_at as string })));
  return { busy, connections };
}

/** Créneaux libres d'un type de RDV, à l'instant `now`. */
export async function slotsForType(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  page: BookingPage,
  type: MeetingType,
  now: Date,
): Promise<{ slots: BookingSlot[]; connections: ResolvedConnection[] }> {
  const from = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const to = new Date(now.getTime() + (type.max_days_ahead + 1) * 24 * 3600_000).toISOString();
  const { busy, connections } = await hostBusy(supabase, env, page.host_staff_id, from, to);
  const slots = computeBookingSlots(
    {
      weeklyAvailability: normalizeWeeklyAvailability(type.weekly_availability),
      timezone: type.timezone,
      durationMinutes: type.duration_minutes,
      bufferMinutes: type.buffer_minutes,
      minNoticeHours: type.min_notice_hours,
      maxDaysAhead: type.max_days_ahead,
    },
    busy,
    now,
  );
  return { slots, connections };
}

/** RDV pris en ligne (colonnes utiles aux Edge Functions du module). */
export interface BookedMeeting {
  id: string;
  client_id: string;
  staff_id: string;
  meeting_type_id: string | null;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  title: string;
  starts_at: string;
  ends_at: string;
  external_calendar_provider: "google" | "microsoft" | null;
  external_event_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_company: string | null;
  guest_notes: string | null;
  answers: unknown;
  manage_token: string | null;
  public_base_url: string | null;
  online_meeting_url: string | null;
  contact_id: string | null;
  company_id: string | null;
  reminders_sent: number[];
}

/** Charge un RDV par id (CRM) ou par jeton de gestion (prospect), avec son type (null s'il a été supprimé). */
export async function loadBookedMeeting(
  supabase: SupabaseClient,
  filter: { id?: string; manageToken?: string },
): Promise<{ meeting: BookedMeeting; type: MeetingType | null } | null> {
  const base = supabase.from("meetings").select("*");
  const { data, error } = await (filter.id ? base.eq("id", filter.id) : base.eq("manage_token", filter.manageToken ?? "")).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const meeting = data as BookedMeeting;
  let type: MeetingType | null = null;
  if (meeting.meeting_type_id) {
    const { data: t, error: typeError } = await supabase.from("meeting_types").select("*").eq("id", meeting.meeting_type_id).maybeSingle();
    if (typeError) throw new Error(typeError.message);
    type = (t as MeetingType | null) ?? null;
  }
  return { meeting, type };
}

/** Membre du staff connecté, ou clé service_role (voir packages/config/src/edgeAuth.ts). */
export function staffOrServiceDeps(supabase: SupabaseClient, env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }) {
  return {
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    isServiceKey: async (token: string) => {
      const admin = createClient(env.SUPABASE_URL, token, { auth: { persistSession: false } });
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      return !error;
    },
    resolveUserId: async (jwt: string) => (await supabase.auth.getUser(jwt)).data.user?.id ?? null,
    isStaff: async (userId: string) => {
      const { data } = await supabase.from("staff_members").select("id").eq("id", userId).maybeSingle();
      return data !== null;
    },
  };
}

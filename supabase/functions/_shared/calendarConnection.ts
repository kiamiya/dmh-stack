// Code partagé entre calendar-freebusy, calendar-book-meeting et
// calendar-my-events (S16) : résout une connexion valide (rafraîchissant
// le token d'accès si besoin), par booking_token (accès public) ou par
// staff_id (accès authentifié, "mes événements"). Vit dans _shared/
// (convention Supabase pour du code non-déployé-en-tant-que-fonction,
// seulement importé).

import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshGoogleAccessToken } from "../../../packages/calendar/src/googleCalendar.ts";
import { refreshMicrosoftAccessToken } from "../../../packages/calendar/src/microsoftCalendar.ts";
import type { CalendarFunctionEnv } from "../../../packages/config/src/env.ts";

export interface ResolvedConnection {
  id: string;
  staffId: string;
  provider: "google" | "microsoft";
  accessToken: string;
  staffName: string;
}

interface ConnectionRow {
  id: string;
  staff_id: string;
  provider: "google" | "microsoft";
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  staff_members: { name: string } | null;
}

/** Rafraîchit le token d'accès s'il expire dans moins de 2 minutes, persiste le nouveau token. */
async function refreshIfNeeded(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  connection: ConnectionRow,
): Promise<ResolvedConnection> {
  const staffName = connection.staff_members?.name ?? "un membre de l'équipe";
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const needsRefresh = expiresAt < Date.now() + 2 * 60_000;

  if (!needsRefresh) {
    return { id: connection.id, staffId: connection.staff_id, provider: connection.provider, accessToken: connection.access_token, staffName };
  }

  if (connection.provider === "google") {
    const tokens = await refreshGoogleAccessToken({
      refreshToken: connection.refresh_token,
      clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    });
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    await supabase
      .from("staff_calendar_connections")
      .update({ access_token: tokens.access_token, token_expires_at: newExpiresAt, updated_at: new Date().toISOString() })
      .eq("id", connection.id);
    return { id: connection.id, staffId: connection.staff_id, provider: "google", accessToken: tokens.access_token, staffName };
  }

  const tokens = await refreshMicrosoftAccessToken({
    refreshToken: connection.refresh_token,
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
    tenantId: env.MICROSOFT_TENANT_ID,
  });
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase
    .from("staff_calendar_connections")
    .update({ access_token: tokens.access_token, token_expires_at: newExpiresAt, updated_at: new Date().toISOString() })
    .eq("id", connection.id);
  return { id: connection.id, staffId: connection.staff_id, provider: "microsoft", accessToken: tokens.access_token, staffName };
}

const CONNECTION_SELECT = "id, staff_id, provider, access_token, refresh_token, token_expires_at, staff_members(name)";

/**
 * Charge la connexion associée à un `booking_token` (accès public — page
 * de réservation). Retourne `null` si le token est inconnu.
 */
export async function resolveConnectionByBookingToken(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  bookingToken: string,
): Promise<ResolvedConnection | null> {
  const { data: connection, error } = await supabase
    .from("staff_calendar_connections")
    .select(CONNECTION_SELECT)
    .eq("booking_token", bookingToken)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!connection) return null;
  return refreshIfNeeded(supabase, env, connection as unknown as ConnectionRow);
}

/**
 * Charge toutes les connexions (Google/Microsoft) d'un membre staff —
 * accès authentifié ("mes événements"), jamais appelé pour un autre
 * staff_id que celui du token vérifié par l'appelant.
 */
export async function resolveConnectionsByStaffId(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  staffId: string,
): Promise<ResolvedConnection[]> {
  const { data: rows, error } = await supabase.from("staff_calendar_connections").select(CONNECTION_SELECT).eq("staff_id", staffId);
  if (error) throw new Error(error.message);
  return Promise.all((rows ?? []).map((row) => refreshIfNeeded(supabase, env, row as unknown as ConnectionRow)));
}

/**
 * Charge la connexion d'un membre staff pour UN fournisseur précis — pour
 * modifier un événement (l'appelant sait déjà de quel calendrier vient
 * l'événement puisqu'il l'a reçu via `calendar-my-events`). Retourne `null`
 * si ce staff n'a pas connecté ce fournisseur.
 */
export async function resolveConnectionByStaffIdAndProvider(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  staffId: string,
  provider: "google" | "microsoft",
): Promise<ResolvedConnection | null> {
  const { data: connection, error } = await supabase
    .from("staff_calendar_connections")
    .select(CONNECTION_SELECT)
    .eq("staff_id", staffId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!connection) return null;
  return refreshIfNeeded(supabase, env, connection as unknown as ConnectionRow);
}

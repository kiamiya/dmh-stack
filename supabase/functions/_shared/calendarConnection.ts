// Code partagé entre calendar-freebusy et calendar-book-meeting (S16) :
// résout un booking_token en connexion valide, rafraîchit le token
// d'accès s'il a expiré. Vit dans _shared/ (convention Supabase pour du
// code non-déployé-en-tant-que-fonction, seulement importé).

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

/**
 * Charge la connexion associée à un `booking_token`, rafraîchit le token
 * d'accès s'il a expiré (avec une marge de 2 minutes), persiste le
 * nouveau token si rafraîchi. Retourne `null` si le token est inconnu.
 */
export async function resolveConnectionByBookingToken(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  bookingToken: string,
): Promise<ResolvedConnection | null> {
  const { data: connection, error } = await supabase
    .from("staff_calendar_connections")
    .select("id, staff_id, provider, access_token, refresh_token, token_expires_at, staff_members(name)")
    .eq("booking_token", bookingToken)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!connection) return null;

  const staffName = (connection.staff_members as unknown as { name: string } | null)?.name ?? "un membre de l'équipe";
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

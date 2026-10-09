import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingPage, MeetingType } from "@dmh/types";
import type { MeetingTypePayload } from "../lib/meetingTypeForm";

/** Message lisible pour une violation d'unicité Postgres (slug déjà pris). */
function friendlyError(error: { code?: string; message: string }, what: string): Error {
  if (error.code === "23505") return new Error(`Ce lien personnalisé est déjà utilisé par ${what}.`);
  return new Error(error.message);
}

/** S39-3 — page de réservation du client (une au plus), null si elle n'existe pas encore. */
export async function getBookingPage(client: SupabaseClient, clientId: string): Promise<BookingPage | null> {
  const { data, error } = await client.from("booking_pages").select("*").eq("client_id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BookingPage | null) ?? null;
}

export interface BookingPageInput {
  clientId: string;
  slug: string;
  title: string;
  description: string | null;
  hostStaffId: string;
}

export async function saveBookingPage(client: SupabaseClient, input: BookingPageInput): Promise<BookingPage> {
  const { data, error } = await client
    .from("booking_pages")
    .upsert(
      {
        client_id: input.clientId,
        slug: input.slug,
        title: input.title,
        description: input.description,
        host_staff_id: input.hostStaffId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    )
    .select("*")
    .single();
  if (error) throw friendlyError(error, "un autre client");
  return data as BookingPage;
}

export async function listMeetingTypes(client: SupabaseClient, bookingPageId: string): Promise<MeetingType[]> {
  const { data, error } = await client
    .from("meeting_types")
    .select("*")
    .eq("booking_page_id", bookingPageId)
    .order("position")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as MeetingType[];
}

/** Crée (sans `id`) ou met à jour un type de RDV. */
export async function saveMeetingType(
  client: SupabaseClient,
  bookingPageId: string,
  payload: MeetingTypePayload,
  id?: string,
): Promise<void> {
  const row = { ...payload, booking_page_id: bookingPageId, updated_at: new Date().toISOString() };
  const { error } = id
    ? await client.from("meeting_types").update(row).eq("id", id)
    : await client.from("meeting_types").insert(row);
  if (error) throw friendlyError(error, "un autre type de RDV de cette page");
}

export async function deleteMeetingType(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("meeting_types").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

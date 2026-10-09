import type { SupabaseClient } from "@supabase/supabase-js";

/** S39-6 — demande de RDV prise en ligne, telle qu'affichée dans le CRM pour acceptation/refus. */
export interface BookingRequestRow {
  id: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  title: string;
  starts_at: string;
  ends_at: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_company: string | null;
  guest_notes: string | null;
  answers: unknown;
  created_at: string;
  meeting_types: { name: string; questions: unknown; timezone: string } | null;
}

const SELECT =
  "id, status, title, starts_at, ends_at, guest_name, guest_email, guest_phone, guest_company, guest_notes, answers, created_at, meeting_types(name, questions, timezone)";

/** Demandes en attente du client, la plus proche d'abord (les créneaux passés restent visibles pour être refusés). */
export async function listPendingBookingRequests(client: SupabaseClient, clientId: string): Promise<BookingRequestRow[]> {
  const { data, error } = await client
    .from("meetings")
    .select(SELECT)
    .eq("client_id", clientId)
    .eq("status", "pending")
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BookingRequestRow[];
}

/** Accepte ou refuse une demande via l'Edge Function `booking-decide` (JWT de l'utilisateur connecté). */
export async function decideBookingRequest(
  client: SupabaseClient,
  meetingId: string,
  decision: "accept" | "decline",
): Promise<{ status: string; onlineMeetingUrl?: string | null; emailWarning?: string | null }> {
  const { data, error } = await client.functions.invoke("booking-decide", { body: { meetingId, decision } });
  if (error) {
    // supabase-js range le corps de la réponse d'erreur dans `context` : on remonte le vrai message.
    const context = (error as { context?: Response }).context;
    const detail = context && typeof context.json === "function" ? await context.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as { status: string; onlineMeetingUrl?: string | null; emailWarning?: string | null };
}

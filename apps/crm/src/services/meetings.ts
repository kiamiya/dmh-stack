import type { SupabaseClient } from "@supabase/supabase-js";

export interface MeetingRow {
  id: string;
  client_id: string;
  staff_id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  external_calendar_provider: "google" | "microsoft" | null;
  external_event_id: string | null;
  contacts: { first_name: string; last_name: string } | null;
  companies: { name: string } | null;
  deals: { company_name: string } | null;
}

const MEETING_SELECT =
  "id, client_id, staff_id, contact_id, company_id, deal_id, title, starts_at, ends_at, external_calendar_provider, external_event_id, contacts(first_name, last_name), companies(name), deals(company_name)";

/** Toutes les réunions visibles par l'appelant (RLS staff_full_access/client_isolation/client_user_access) — filtrées côté client par contact/entreprise/opportunité, comme deals/tasks ailleurs dans l'app. */
export async function listMeetings(client: SupabaseClient): Promise<MeetingRow[]> {
  const { data, error } = await client.from("meetings").select(MEETING_SELECT).order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MeetingRow[];
}

export interface MeetingInsert {
  clientId: string;
  staffId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  externalCalendarProvider?: "google" | "microsoft" | null;
  externalEventId?: string | null;
}

/** Crée une réunion (nouvel événement créé depuis le CRM, déjà créé côté Google/Microsoft au moment de l'appel). */
export async function createMeeting(client: SupabaseClient, input: MeetingInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("meetings")
    .insert({
      client_id: input.clientId,
      staff_id: input.staffId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      contact_id: input.contactId ?? null,
      company_id: input.companyId ?? null,
      deal_id: input.dealId ?? null,
      external_calendar_provider: input.externalCalendarProvider ?? null,
      external_event_id: input.externalEventId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export interface MeetingLinkInput {
  clientId: string;
  staffId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  provider: "google" | "microsoft";
  externalEventId: string;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}

/** Lie un événement déjà existant sur le calendrier externe à un contact/entreprise/opportunité — upsert sur (provider, externalEventId) pour ne jamais dupliquer la ligne si on relie le même événement plusieurs fois. */
export async function upsertMeetingLink(client: SupabaseClient, input: MeetingLinkInput): Promise<void> {
  const { error } = await client
    .from("meetings")
    .upsert(
      {
        client_id: input.clientId,
        staff_id: input.staffId,
        title: input.title,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        external_calendar_provider: input.provider,
        external_event_id: input.externalEventId,
        contact_id: input.contactId ?? null,
        company_id: input.companyId ?? null,
        deal_id: input.dealId ?? null,
      },
      { onConflict: "external_calendar_provider,external_event_id" },
    );
  if (error) throw new Error(error.message);
}

/** Charge le lien existant (le cas échéant) pour un événement de calendrier externe donné — pour pré-remplir le formulaire de liaison. */
export async function getMeetingLink(
  client: SupabaseClient,
  provider: "google" | "microsoft",
  externalEventId: string,
): Promise<MeetingRow | null> {
  const { data, error } = await client
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("external_calendar_provider", provider)
    .eq("external_event_id", externalEventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as MeetingRow | null;
}

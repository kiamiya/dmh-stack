import type { SupabaseClient } from "@supabase/supabase-js";
import type { InteractionChannel, InteractionType } from "@dmh/types";

export interface InteractionRow {
  id: string;
  type: InteractionType;
  channel: InteractionChannel;
  subject: string | null;
  content: string | null;
  occurred_at: string;
  created_by: string | null;
}

const INTERACTION_SELECT = "id, type, channel, subject, content, occurred_at, created_by";

export async function listInteractions(client: SupabaseClient, prospectId: string): Promise<InteractionRow[]> {
  const { data, error } = await client
    .from("interactions")
    .select(INTERACTION_SELECT)
    .eq("prospect_id", prospectId)
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InteractionRow[];
}

export interface CreateNoteInput {
  prospectId: string;
  clientId: string;
  content: string;
  createdBy: string | null;
}

/**
 * Une note manuelle saisie depuis le CRM = une `interaction` type=`note`.
 * `channel` n'a pas de valeur dédiée pour les notes (contrainte existante :
 * 'email' | 'linkedin' | 'phone' | 'in_person') — `in_person` par défaut,
 * faute de mieux ; pas de sélecteur de canal dans cette V1 de l'UI de notes.
 */
export async function createNote(client: SupabaseClient, input: CreateNoteInput): Promise<InteractionRow> {
  const { data, error } = await client
    .from("interactions")
    .insert({
      prospect_id: input.prospectId,
      client_id: input.clientId,
      type: "note",
      channel: "in_person",
      content: input.content,
      created_by: input.createdBy,
      occurred_at: new Date().toISOString(),
    })
    .select(INTERACTION_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as InteractionRow;
}

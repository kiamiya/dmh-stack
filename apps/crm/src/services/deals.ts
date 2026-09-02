import type { SupabaseClient } from "@supabase/supabase-js";

export type DealStatus = "negotiation" | "won" | "lost";

export interface DealRow {
  id: string;
  client_id: string;
  company_name: string;
  deal_value: number;
  status: DealStatus;
  signed_at: string | null;
  attributed_to_dmh: boolean | null;
  commission_amount: number | null;
  contact_id: string | null;
  company_id: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  probability: number | null;
  expected_close_date: string | null;
  updated_at: string;
  contacts: { first_name: string; last_name: string } | null;
  companies: { name: string } | null;
}

const DEAL_SELECT =
  "id, client_id, company_name, deal_value, status, signed_at, attributed_to_dmh, commission_amount, contact_id, company_id, pipeline_id, stage_id, probability, expected_close_date, updated_at, contacts(first_name, last_name), companies(name)";

export async function listDeals(client: SupabaseClient): Promise<DealRow[]> {
  const { data, error } = await client.from("deals").select(DEAL_SELECT).order("signed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DealRow[];
}

export async function getDeal(client: SupabaseClient, id: string): Promise<DealRow> {
  const { data, error } = await client.from("deals").select(DEAL_SELECT).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as unknown as DealRow;
}

export interface DealInsert {
  clientId: string;
  companyName: string;
  dealValue: number;
  companyId?: string | null;
  contactId?: string | null;
  signedAt?: string | null;
  prospectId?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
}

/**
 * Crée une opportunité. Sans `stageId`, reste en statut `negotiation`
 * (colonne posée en dur, aucune étape ne pilote encore le statut) — le
 * passage à `won` déclenche déjà le trigger d'attribution existant, pas
 * dupliqué ici.
 */
export async function createDeal(client: SupabaseClient, input: DealInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("deals")
    .insert({
      client_id: input.clientId,
      company_name: input.companyName,
      deal_value: input.dealValue,
      company_id: input.companyId ?? null,
      contact_id: input.contactId ?? null,
      signed_at: input.signedAt ?? null,
      prospect_id: input.prospectId ?? null,
      pipeline_id: input.pipelineId ?? null,
      stage_id: input.stageId ?? null,
      status: "negotiation",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

/**
 * Change l'étape d'une opportunité — `calculate_attribution()` (migration
 * 015) dérive automatiquement `status` des drapeaux `is_won`/`is_lost` de
 * la nouvelle étape. Ne jamais poser `status` directement sur une
 * opportunité qui a déjà un `stage_id` : le trigger le réécrirait depuis
 * l'étape courante à la prochaine mise à jour.
 */
export async function updateDealStage(client: SupabaseClient, id: string, stageId: string): Promise<void> {
  const { error } = await client
    .from("deals")
    .update({ stage_id: stageId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface DealUpdate {
  dealValue?: number;
  probability?: number | null;
  expectedCloseDate?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}

export async function updateDeal(client: SupabaseClient, id: string, patch: DealUpdate): Promise<void> {
  const { error } = await client
    .from("deals")
    .update({
      ...(patch.dealValue !== undefined && { deal_value: patch.dealValue }),
      ...(patch.probability !== undefined && { probability: patch.probability }),
      ...(patch.expectedCloseDate !== undefined && { expected_close_date: patch.expectedCloseDate }),
      ...(patch.contactId !== undefined && { contact_id: patch.contactId }),
      ...(patch.companyId !== undefined && { company_id: patch.companyId }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

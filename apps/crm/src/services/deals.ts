import type { SupabaseClient } from "@supabase/supabase-js";

export type DealStatus = "negotiation" | "won" | "lost";

export interface DealRow {
  id: string;
  company_name: string;
  deal_value: number;
  status: DealStatus;
  signed_at: string | null;
  attributed_to_dmh: boolean | null;
  commission_amount: number | null;
  contact_id: string | null;
  company_id: string | null;
  contacts: { first_name: string; last_name: string } | null;
  companies: { name: string } | null;
}

const DEAL_SELECT =
  "id, company_name, deal_value, status, signed_at, attributed_to_dmh, commission_amount, contact_id, company_id, contacts(first_name, last_name), companies(name)";

export async function listDeals(client: SupabaseClient): Promise<DealRow[]> {
  const { data, error } = await client.from("deals").select(DEAL_SELECT).order("signed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DealRow[];
}

export interface DealInsert {
  clientId: string;
  companyName: string;
  dealValue: number;
  companyId?: string | null;
  contactId?: string | null;
  signedAt?: string | null;
  prospectId?: string | null;
}

/** Crée une opportunité en statut `negotiation` — le passage à `won` (ailleurs) déclenche déjà le trigger d'attribution existant, pas dupliqué ici. */
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
      status: "negotiation",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function updateDealStatus(client: SupabaseClient, id: string, status: DealStatus): Promise<void> {
  const { error } = await client.from("deals").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

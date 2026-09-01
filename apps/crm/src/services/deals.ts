import type { SupabaseClient } from "@supabase/supabase-js";

export interface DealRow {
  id: string;
  company_name: string;
  deal_value: number;
  status: "negotiation" | "won" | "lost";
  signed_at: string | null;
  attributed_to_dmh: boolean | null;
  commission_amount: number | null;
}

export async function listDeals(client: SupabaseClient): Promise<DealRow[]> {
  const { data, error } = await client
    .from("deals")
    .select("id, company_name, deal_value, status, signed_at, attributed_to_dmh, commission_amount")
    .order("signed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DealRow[];
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCompanyLayout } from "../lib/companyLayout";
import type { CompanyLayout } from "../lib/companyLayout";

/** Composition de la fiche entreprise d'un client (S38-9) — défaut si aucune n'a été enregistrée. */
export async function getCompanyLayout(client: SupabaseClient, clientId: string): Promise<{ layout: CompanyLayout; isCustom: boolean }> {
  const { data, error } = await client.from("company_layouts").select("layout").eq("client_id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  return { layout: normalizeCompanyLayout(data?.layout ?? null), isCustom: Boolean(data) };
}

export async function saveCompanyLayout(
  client: SupabaseClient,
  clientId: string,
  layout: CompanyLayout,
  updatedBy: string | null,
): Promise<void> {
  const { error } = await client
    .from("company_layouts")
    .upsert(
      { client_id: clientId, layout, updated_at: new Date().toISOString(), updated_by: updatedBy },
      { onConflict: "client_id" },
    );
  if (error) throw new Error(error.message);
}

/** Revient à l'affichage par défaut pour ce client. */
export async function resetCompanyLayout(client: SupabaseClient, clientId: string): Promise<void> {
  const { error } = await client.from("company_layouts").delete().eq("client_id", clientId);
  if (error) throw new Error(error.message);
}

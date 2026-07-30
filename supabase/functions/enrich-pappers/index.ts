// Edge Function Supabase (Deno) — S2 du brief : enrichissement Pappers.
//
// Déclenchement : appel HTTP POST { prospect_id } (webhook DB Supabase sur
// insertion en statut 'to_enrich', ou appel manuel/orchestré — le wiring du
// déclencheur automatique est une tâche séparée, cf. PROGRESS.md).
//
// Toute la logique métier testable (appel Pappers, mapping des champs) vit
// dans @dmh/pappers (packages/pappers/src), testée en vitest côté Node — ce
// fichier n'est que la glue Deno (lecture requête, accès DB via
// supabase-js), non testée unitairement mais couverte par un test
// fonctionnel, voir TESTING.md.
//
// Notes d'import : ce fichier importe les sources de @dmh/config et
// @dmh/pappers par chemin relatif direct vers les fichiers .ts concernés
// (pas via le barrel index.ts, qui ré-exporte avec des extensions .js —
// une convention pour le mode "bundler" côté Node/Vite, incompatible avec
// la résolution stricte de Deno). Les dépendances npm (`zod`,
// `@supabase/supabase-js`) sont mappées dans deno.json.

import { createClient } from "@supabase/supabase-js";
import { loadPappersFunctionEnv } from "../../../packages/config/src/env.ts";
import { fetchCompanyFromPappers } from "../../../packages/pappers/src/client.ts";
import { mapPappersCompany } from "../../../packages/pappers/src/mapper.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let prospectId: string | undefined;
  try {
    const body = await req.json();
    prospectId = body?.prospect_id;
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  if (!prospectId) {
    return jsonResponse({ error: "prospect_id requis" }, 400);
  }

  let env;
  try {
    env = loadPappersFunctionEnv(Deno.env.toObject());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, company_id, status")
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return jsonResponse(
      { error: `Prospect introuvable: ${prospectError?.message ?? prospectId}` },
      404,
    );
  }

  if (prospect.status !== "to_enrich") {
    return jsonResponse(
      { error: `Prospect ${prospectId} n'est pas en statut 'to_enrich' (actuel: ${prospect.status})` },
      409,
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, siren")
    .eq("id", prospect.company_id)
    .single();

  if (companyError || !company) {
    return jsonResponse(
      { error: `Entreprise introuvable: ${companyError?.message ?? prospect.company_id}` },
      404,
    );
  }

  try {
    const raw = await fetchCompanyFromPappers(
      {
        siren: company.siren ?? undefined,
        companyName: company.siren ? undefined : company.name,
      },
      { apiKey: env.PAPPERS_API_KEY },
    );

    const mapped = mapPappersCompany(raw);

    const { error: updateCompanyError } = await supabase
      .from("companies")
      .update({
        name: mapped.name ?? company.name,
        siren: mapped.siren ?? company.siren,
        naf_code: mapped.nafCode,
        naf_label: mapped.nafLabel,
        legal_form: mapped.legalForm,
        employee_range: mapped.employeeRange,
        revenue: mapped.revenue,
        revenue_year: mapped.revenueYear,
        city: mapped.city,
        address: mapped.address,
        website: mapped.website,
        creation_date: mapped.creationDate,
        pappers_data: raw,
      })
      .eq("id", company.id);

    if (updateCompanyError) {
      throw new Error(`Échec mise à jour companies: ${updateCompanyError.message}`);
    }

    const { error: updateProspectError } = await supabase
      .from("prospects")
      .update({ status: "enriched_pappers" })
      .eq("id", prospect.id);

    if (updateProspectError) {
      throw new Error(`Échec mise à jour prospects.status: ${updateProspectError.message}`);
    }

    return jsonResponse({ ok: true, prospect_id: prospect.id, company_id: company.id }, 200);
  } catch (error) {
    // Le statut du prospect reste 'to_enrich' en cas d'échec, pour permettre
    // un nouvel essai sans intervention manuelle.
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 502);
  }
});

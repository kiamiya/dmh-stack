// Edge Function Supabase (Deno) — S7 du brief : scoring IA des prospects
// (brief §1.3.5), déclenché après l'étape d'enrichissement Pappers.
//
// Déclenchement : appel HTTP POST { prospect_id } — automatiquement par la
// règle système d'enrichissement Dropcontact (action « Scorer », passage au
// statut 'enriched_pappers', migration 052, S40). Contrairement à enrich-dropcontact/generate-messages, ne
// dépend PAS du statut exact du prospect — seulement de la présence de
// `companies.pappers_data`, donc rejouable à tout moment une fois passé
// par Pappers (le scoring est un enrichissement parallèle, pas une étape
// bloquante du pipeline principal).
//
// Toute la logique métier testable (extraction des signaux, construction
// du prompt, appel Claude) vit dans @dmh/scoring (packages/scoring/src),
// testée en vitest côté Node — ce fichier n'est que la glue Deno, non
// testée unitairement mais couverte par un test fonctionnel, voir
// TESTING.md.

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { loadGenerateMessagesFunctionEnv } from "../../../packages/config/src/env.ts";
import { BROWSER_CORS_HEADERS, corsPreflightResponse } from "../../../packages/config/src/cors.ts";
import { authorizeEnrichmentCaller } from "../../../packages/config/src/edgeAuth.ts";
import { extractScoringSignals } from "../../../packages/scoring/src/signals.ts";
import { buildScoringPrompt } from "../../../packages/scoring/src/prompt.ts";
import { scoreCompany } from "../../../packages/scoring/src/client.ts";
import { DEFAULT_MODEL } from "../../../packages/claude-messages/src/client.ts";
import type { AnthropicMessagesClient, ClaudeUsage } from "../../../packages/claude-messages/src/client.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...BROWSER_CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflightResponse(req);
  if (preflight) return preflight;

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
    env = loadGenerateMessagesFunctionEnv(Deno.env.toObject());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Connexion obligatoire (S40, 2026-10-15) : clé service_role (pipeline
  // automatique, migration 052) ou membre du staff connecté — même contrôle
  // que enrich-pappers/enrich-dropcontact, voir packages/config/src/edgeAuth.ts.
  const auth = await authorizeEnrichmentCaller(req.headers.get("Authorization"), {
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    resolveUserId: async (jwt) => (await supabase.auth.getUser(jwt)).data.user?.id ?? null,
    isServiceKey: async (token) => {
      const admin = createClient(env.SUPABASE_URL, token, { auth: { persistSession: false } });
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      return !error;
    },
    isStaff: async (userId) => {
      const { data } = await supabase.from("staff_members").select("id").eq("id", userId).maybeSingle();
      return data !== null;
    },
  });
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, company_id")
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return jsonResponse(
      { error: `Prospect introuvable: ${prospectError?.message ?? prospectId}` },
      404,
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("name, naf_label, employee_range, website, pappers_data")
    .eq("id", prospect.company_id)
    .single();

  if (companyError || !company) {
    return jsonResponse(
      { error: `Entreprise introuvable: ${companyError?.message ?? prospect.company_id}` },
      404,
    );
  }

  if (!company.pappers_data) {
    return jsonResponse(
      {
        error:
          `Entreprise "${company.name}" n'a pas encore de données Pappers — le scoring nécessite d'être passé par enrich-pappers d'abord`,
      },
      409,
    );
  }

  // Tokens consommés, renvoyés dans la réponse (conservée par pg_net, 053) — aussi en cas d'échec.
  let usage: ClaudeUsage | null = null;
  try {
    const signals = extractScoringSignals(company.pappers_data, new Date());
    const prompt = buildScoringPrompt({
      companyName: company.name,
      nafLabel: company.naf_label,
      employeeRange: company.employee_range,
      website: company.website,
      signals,
    });

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const result = await scoreCompany(prompt, {
      client: anthropic as unknown as AnthropicMessagesClient,
      model: DEFAULT_MODEL,
      onUsage: (u) => {
        usage = u;
      },
    });

    const { error: updateError } = await supabase
      .from("companies")
      .update({ ai_score: result.score, ai_score_reason: result.justification })
      .eq("id", prospect.company_id);

    if (updateError) {
      throw new Error(`Échec mise à jour companies.ai_score: ${updateError.message}`);
    }

    return jsonResponse(
      { ok: true, company_id: prospect.company_id, score: result.score, usage },
      200,
    );
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error), usage }, 502);
  }
});

// Edge Function Supabase (Deno) — agent d'import intelligent (demande de
// Delphine relayée par Loïc, 2026-09-17) : analyse les colonnes d'un
// import CSV (Contacts/Entreprises) qui ne correspondent à aucun champ
// standard, pour guider l'utilisateur pas à pas sur quoi en faire
// (ignorer / rattacher à un champ personnalisé existant / en créer un).
//
// Contrairement à `score-prospect`/`generate-messages`, cette fonction
// n'accède PAS à la base : elle est appelée directement depuis le dialog
// React authentifié (`supabase.functions.invoke`, comme
// `enrich-pappers`/`enrich-dropcontact` en mode manuel), qui fournit déjà
// tout le contexte nécessaire dans le corps de la requête (colonnes,
// échantillons, champs déjà mappés, champs personnalisés existants). Pure
// glue Claude : parse le body, construit le prompt, appelle Claude, renvoie
// le JSON.
//
// Toute la logique métier testable (construction du prompt, appel Claude
// via sorties structurées) vit dans @dmh/import-agent (packages/import-agent/src),
// testée en vitest côté Node — ce fichier n'est que la glue Deno, non testé
// unitairement mais couvert par un test fonctionnel, voir TESTING.md.

import Anthropic from "@anthropic-ai/sdk";
import { loadAnalyzeImportColumnsFunctionEnv } from "../../../packages/config/src/env.ts";
import { buildImportColumnAnalysisPrompt } from "../../../packages/import-agent/src/prompt.ts";
import { analyzeImportColumns, DEFAULT_MODEL } from "../../../packages/import-agent/src/client.ts";
import type { AnthropicMessagesClient } from "../../../packages/import-agent/src/client.ts";
import type {
  ExistingCustomFieldSummary,
  ImportColumnSample,
  ImportEntityType,
} from "../../../packages/import-agent/src/prompt.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface RequestBody {
  entityType?: ImportEntityType;
  mappedStandardFields?: Array<{ key: string; label: string }>;
  existingCustomFields?: ExistingCustomFieldSummary[];
  columns?: ImportColumnSample[];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  if (body.entityType !== "contact" && body.entityType !== "company") {
    return jsonResponse({ error: 'entityType requis ("contact" ou "company")' }, 400);
  }
  if (!Array.isArray(body.columns) || body.columns.length === 0) {
    return jsonResponse({ error: "columns requis (au moins une colonne à analyser)" }, 400);
  }

  let env;
  try {
    env = loadAnalyzeImportColumnsFunctionEnv(Deno.env.toObject());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  try {
    const prompt = buildImportColumnAnalysisPrompt({
      entityType: body.entityType,
      mappedStandardFields: body.mappedStandardFields ?? [],
      existingCustomFields: body.existingCustomFields ?? [],
      columns: body.columns,
    });

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const suggestions = await analyzeImportColumns(prompt, {
      client: anthropic as unknown as AnthropicMessagesClient,
      model: DEFAULT_MODEL,
    });

    return jsonResponse({ suggestions }, 200);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 502);
  }
});

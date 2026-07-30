// Edge Function Supabase (Deno) — S3 du brief : enrichissement Dropcontact.
//
// Déclenchement : appel HTTP POST { prospect_id } (webhook DB sur passage
// au statut 'enriched_pappers', ou appel manuel/orchestré — comme pour
// enrich-pappers, le câblage du déclencheur automatique est une tâche
// séparée, cf. PROGRESS.md).
//
// Particularité par rapport à enrich-pappers : l'API Dropcontact est
// **asynchrone** (soumission -> request_id -> consultation différée). Cette
// fonction est donc appelée plusieurs fois pour un même prospect :
//   1er appel  : soumet le contact à Dropcontact, stocke le request_id sur
//                `contacts`, répond 202 (à réessayer plus tard).
//   appels suivants : consulte le request_id stocké ; si toujours en cours,
//                répond encore 202 ; une fois prêt, met à jour `contacts`
//                (email + confiance) et fait passer `prospects.status` à
//                'enriched_contact'.
//
// Toute la logique métier testable (appel Dropcontact, mapping de
// confiance) vit dans @dmh/dropcontact (packages/dropcontact/src), testée
// en vitest côté Node — ce fichier n'est que la glue Deno, non testée
// unitairement mais couverte par un test fonctionnel, voir TESTING.md.

import { createClient } from "@supabase/supabase-js";
import { loadDropcontactFunctionEnv } from "../../../packages/config/src/env.ts";
import {
  submitDropcontactBatch,
  pollDropcontactBatch,
} from "../../../packages/dropcontact/src/client.ts";
import { extractBestEmail } from "../../../packages/dropcontact/src/mapper.ts";
import type { DropcontactResultEntry } from "../../../packages/dropcontact/src/mapper.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Construit un domaine à partir d'une URL de site web (brief §1.3.1 étape 3). */
function domainFromWebsite(website: string | null): string | undefined {
  if (!website) return undefined;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
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
    env = loadDropcontactFunctionEnv(Deno.env.toObject());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, contact_id, company_id, status")
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return jsonResponse(
      { error: `Prospect introuvable: ${prospectError?.message ?? prospectId}` },
      404,
    );
  }

  if (prospect.status !== "enriched_pappers") {
    return jsonResponse(
      {
        error: `Prospect ${prospectId} n'est pas en statut 'enriched_pappers' (actuel: ${prospect.status})`,
      },
      409,
    );
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, dropcontact_request_id")
    .eq("id", prospect.contact_id)
    .single();

  if (contactError || !contact) {
    return jsonResponse(
      { error: `Contact introuvable: ${contactError?.message ?? prospect.contact_id}` },
      404,
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, website")
    .eq("id", prospect.company_id)
    .single();

  if (companyError || !company) {
    return jsonResponse(
      { error: `Entreprise introuvable: ${companyError?.message ?? prospect.company_id}` },
      404,
    );
  }

  try {
    // 1er appel pour ce contact : pas encore de request_id -> on soumet.
    if (!contact.dropcontact_request_id) {
      const requestId = await submitDropcontactBatch(
        [
          {
            first_name: contact.first_name,
            last_name: contact.last_name,
            company: company.name,
            website: domainFromWebsite(company.website),
          },
        ],
        { apiKey: env.DROPCONTACT_API_KEY },
      );

      const { error: updateError } = await supabase
        .from("contacts")
        .update({ dropcontact_request_id: requestId })
        .eq("id", contact.id);

      if (updateError) {
        throw new Error(`Échec enregistrement request_id: ${updateError.message}`);
      }

      return jsonResponse(
        { ok: true, status: "submitted", message: "Soumis à Dropcontact, réessayer plus tard" },
        202,
      );
    }

    // Requête déjà soumise : on consulte l'état.
    const poll = await pollDropcontactBatch(contact.dropcontact_request_id, {
      apiKey: env.DROPCONTACT_API_KEY,
    });

    if (poll.status === "pending") {
      return jsonResponse(
        { ok: true, status: "pending", reason: poll.reason },
        202,
      );
    }

    const result = (poll.results[0] ?? {}) as DropcontactResultEntry;
    const { email, confidence } = extractBestEmail(result);

    const { error: updateContactError } = await supabase
      .from("contacts")
      .update({
        email,
        email_confidence: confidence,
        dropcontact_request_id: null,
      })
      .eq("id", contact.id);

    if (updateContactError) {
      throw new Error(`Échec mise à jour contacts: ${updateContactError.message}`);
    }

    const { error: updateProspectError } = await supabase
      .from("prospects")
      .update({ status: "enriched_contact" })
      .eq("id", prospect.id);

    if (updateProspectError) {
      throw new Error(`Échec mise à jour prospects.status: ${updateProspectError.message}`);
    }

    return jsonResponse(
      { ok: true, status: "ready", prospect_id: prospect.id, email, confidence },
      200,
    );
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 502);
  }
});

// Edge Function Supabase (Deno) — S4 du brief, 2e item : réception des
// webhooks Smartlead (opens, clics, replies, bounces, désinscriptions,
// changement de catégorie de lead) et journalisation dans `interactions`.
//
// Déclenchement : appelé directement par Smartlead (webhook configuré côté
// Smartlead, cf. TESTING.md pour le format des payloads et l'état de la
// configuration réelle — pas encore de compte/campagne pilote à ce stade).
//
// Sécurité : chaque requête est vérifiée via le header
// `X-Smartlead-Signature` (HMAC SHA256 du corps brut, secret
// `SMARTLEAD_WEBHOOK_SECRET`) — voir @dmh/smartlead/signature. Le corps
// doit être lu en texte brut AVANT tout JSON.parse, sinon la signature ne
// correspond plus.
//
// Idempotence : Smartlead peut renvoyer le même événement (retry sur
// timeout). Le header `X-Request-Id` est stocké dans `interactions.metadata`
// et vérifié avant insertion pour ne jamais dupliquer une interaction.
//
// Rattachement événement -> prospect : les payloads Smartlead ne portent
// jamais l'identifiant qu'on espérerait retrouver dans
// `prospects.smartlead_contact_id` (jamais rempli aujourd'hui, faute
// d'injection réelle vers Smartlead) — le seul champ commun exploitable
// est l'email du lead, mis en correspondance avec `contacts.email`. Voir
// "Incertitudes techniques" dans PROGRESS.md.
//
// Toute la logique métier testable (vérification de signature, mapping
// événement -> interaction, mapping catégorie -> statut, garde-fou
// anti-retour-en-arrière) vit dans @dmh/smartlead (packages/smartlead/src),
// testée en vitest côté Node — ce fichier n'est que la glue Deno.

import { createClient } from "@supabase/supabase-js";
import { loadWebhookSmartleadFunctionEnv } from "../../../packages/config/src/env.ts";
import { verifySmartleadSignature } from "../../../packages/smartlead/src/signature.ts";
import {
  mapSmartleadEventToInteraction,
  mapLeadCategoryToProspectStatus,
  shouldAdvanceStatus,
} from "../../../packages/smartlead/src/mapper.ts";
import type { AnyProspectStatus, SmartleadWebhookPayload } from "../../../packages/smartlead/src/mapper.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Détermine, à partir de l'événement brut, quel statut viser (ou aucun). */
function candidateStatus(payload: SmartleadWebhookPayload): AnyProspectStatus | null {
  if (
    (payload.event_type === "EMAIL_SENT" || payload.event_type === "FIRST_EMAIL_SENT") &&
    payload.sequence_number === 1
  ) {
    return "in_sequence";
  }
  if (payload.event_type === "EMAIL_REPLY") {
    return "replied";
  }
  if (payload.event_type === "LEAD_CATEGORY_UPDATED") {
    return mapLeadCategoryToProspectStatus(payload.category ?? payload.to);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();

  let env;
  try {
    env = loadWebhookSmartleadFunctionEnv(Deno.env.toObject());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  const signatureValid = await verifySmartleadSignature(
    rawBody,
    req.headers.get("X-Smartlead-Signature"),
    env.SMARTLEAD_WEBHOOK_SECRET,
  );
  if (!signatureValid) {
    return jsonResponse({ error: "Signature invalide" }, 401);
  }

  let payload: SmartleadWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  const mapped = mapSmartleadEventToInteraction(payload);
  if (!mapped) {
    return jsonResponse(
      { ok: true, skipped: `event_type non géré: ${payload.event_type}` },
      200,
    );
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .ilike("email", mapped.leadEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contactError) {
    return jsonResponse({ error: `Erreur recherche contact: ${contactError.message}` }, 502);
  }
  if (!contact) {
    return jsonResponse({ ok: true, skipped: "contact introuvable pour cet email" }, 200);
  }

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, client_id, status")
    .eq("contact_id", contact.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prospectError) {
    return jsonResponse({ error: `Erreur recherche prospect: ${prospectError.message}` }, 502);
  }
  if (!prospect) {
    return jsonResponse({ ok: true, skipped: "prospect introuvable pour ce contact" }, 200);
  }

  const requestId = req.headers.get("X-Request-Id");

  if (requestId) {
    const { data: existing, error: existingError } = await supabase
      .from("interactions")
      .select("id")
      .eq("prospect_id", prospect.id)
      .contains("metadata", { x_request_id: requestId })
      .maybeSingle();

    if (existingError) {
      return jsonResponse({ error: `Erreur vérification idempotence: ${existingError.message}` }, 502);
    }
    if (existing) {
      return jsonResponse({ ok: true, deduplicated: true }, 200);
    }
  }

  const { error: insertError } = await supabase.from("interactions").insert({
    prospect_id: prospect.id,
    client_id: prospect.client_id,
    type: mapped.type,
    channel: mapped.channel,
    subject: mapped.subject,
    content: mapped.content,
    metadata: { ...payload, x_request_id: requestId },
    occurred_at: mapped.occurredAt,
  });

  if (insertError) {
    return jsonResponse({ error: `Échec insertion interaction: ${insertError.message}` }, 502);
  }

  const candidate = candidateStatus(payload);
  let statusUpdated: string | null = null;

  if (candidate && shouldAdvanceStatus(prospect.status as AnyProspectStatus, candidate)) {
    const { error: statusError } = await supabase
      .from("prospects")
      .update({ status: candidate })
      .eq("id", prospect.id);

    if (statusError) {
      return jsonResponse({ error: `Échec mise à jour statut: ${statusError.message}` }, 502);
    }
    statusUpdated = candidate;
  }

  return jsonResponse(
    { ok: true, prospect_id: prospect.id, interaction_type: mapped.type, status_updated: statusUpdated },
    200,
  );
});

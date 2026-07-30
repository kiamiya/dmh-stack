// Edge Function Supabase (Deno) — S3 du brief : génération de messages via
// Claude API (dernière étape du pipeline d'enrichissement, brief §1.3.1
// étape 4).
//
// Déclenchement : appel HTTP POST { prospect_id } (webhook DB sur passage
// au statut 'enriched_contact' — câblage du déclencheur automatique non
// fait, cf. PROGRESS.md, comme pour enrich-pappers/enrich-dropcontact).
//
// Toute la logique métier testable (construction du prompt, appel Claude
// via sorties structurées) vit dans @dmh/claude-messages
// (packages/claude-messages/src), testée en vitest côté Node — ce fichier
// n'est que la glue Deno, non testée unitairement mais couverte par un
// test fonctionnel, voir TESTING.md.

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { loadGenerateMessagesFunctionEnv } from "../../../packages/config/src/env.ts";
import { buildMessagePrompt } from "../../../packages/claude-messages/src/prompt.ts";
import { generateMessages, DEFAULT_MODEL } from "../../../packages/claude-messages/src/client.ts";
import type { AnthropicMessagesClient } from "../../../packages/claude-messages/src/client.ts";
import { calculateMonthsInRole } from "../../../packages/pappers/src/mapper.ts";

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
    env = loadGenerateMessagesFunctionEnv(Deno.env.toObject());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, client_id, contact_id, company_id, status")
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return jsonResponse(
      { error: `Prospect introuvable: ${prospectError?.message ?? prospectId}` },
      404,
    );
  }

  if (prospect.status !== "enriched_contact") {
    return jsonResponse(
      {
        error: `Prospect ${prospectId} n'est pas en statut 'enriched_contact' (actuel: ${prospect.status})`,
      },
      409,
    );
  }

  const [{ data: contact, error: contactError }, { data: company, error: companyError }, {
    data: dmhClient,
    error: dmhClientError,
  }] = await Promise.all([
    supabase
      .from("contacts")
      .select("first_name, last_name, job_title, appointment_date")
      .eq("id", prospect.contact_id)
      .single(),
    supabase
      .from("companies")
      .select("name, legal_form, naf_label, employee_range, city, revenue")
      .eq("id", prospect.company_id)
      .single(),
    supabase
      .from("dmh_clients")
      .select("name, offer_description")
      .eq("id", prospect.client_id)
      .single(),
  ]);

  if (contactError || !contact) {
    return jsonResponse(
      { error: `Contact introuvable: ${contactError?.message ?? prospect.contact_id}` },
      404,
    );
  }
  if (companyError || !company) {
    return jsonResponse(
      { error: `Entreprise introuvable: ${companyError?.message ?? prospect.company_id}` },
      404,
    );
  }
  if (dmhClientError || !dmhClient) {
    return jsonResponse(
      { error: `Client DMH introuvable: ${dmhClientError?.message ?? prospect.client_id}` },
      404,
    );
  }
  if (!dmhClient.offer_description) {
    return jsonResponse(
      {
        error:
          `Le client DMH "${dmhClient.name}" n'a pas de offer_description configurée — requis pour générer un message personnalisé`,
      },
      422,
    );
  }

  try {
    const prompt = buildMessagePrompt({
      companyName: company.name,
      legalForm: company.legal_form,
      nafLabel: company.naf_label,
      employeeRange: company.employee_range,
      city: company.city,
      revenue: company.revenue,
      contactFirstName: contact.first_name,
      contactLastName: contact.last_name,
      jobTitle: contact.job_title,
      monthsInRole: calculateMonthsInRole(contact.appointment_date, new Date()),
      dmhClientName: dmhClient.name,
      dmhClientOfferDescription: dmhClient.offer_description,
    });

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const messages = await generateMessages(prompt, {
      client: anthropic as unknown as AnthropicMessagesClient,
      model: DEFAULT_MODEL,
    });

    const { error: insertError } = await supabase.from("messages_generated").insert({
      prospect_id: prospect.id,
      client_id: prospect.client_id,
      email_subject: messages.email_subject,
      email_body: messages.email_body,
      linkedin_message: messages.linkedin_message,
      followup_email: messages.followup_email,
      model_used: DEFAULT_MODEL,
      prompt_version: "v1",
      approved: false,
    });

    if (insertError) {
      throw new Error(`Échec insertion messages_generated: ${insertError.message}`);
    }

    const { error: updateProspectError } = await supabase
      .from("prospects")
      .update({ status: "ready" })
      .eq("id", prospect.id);

    if (updateProspectError) {
      throw new Error(`Échec mise à jour prospects.status: ${updateProspectError.message}`);
    }

    return jsonResponse({ ok: true, prospect_id: prospect.id }, 200);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 502);
  }
});

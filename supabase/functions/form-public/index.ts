// Edge Function Supabase (Deno) — S39-11/12 (CR du 09/10/2026) : API publique
// des formulaires, appelée sans authentification depuis /f/<slug> (page ou
// iframe intégrée à un site). Déployée avec --no-verify-jwt.
//
//   get    { slug }                    → formulaire (champs, options du client)
//   submit { slug, values, website }   → réponse validée, enregistrée et
//                                        rattachée à la fiche contact (S39-12)
//
// Anti-spam (pas de captcha tiers, aucune clé à créer) : champ piège
// `website`, et 10 envois max par heure pour une même IP sur un formulaire
// (empreinte SHA-256 IP+jour, jamais l'IP en clair). Glue Deno, logique
// testable dans packages/forms.

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { validateSubmission } from "../../../packages/forms/src/submission.ts";
import type { RawValue } from "../../../packages/forms/src/submission.ts";
import { BOOKING_CORS_HEADERS, bookingJson } from "../_shared/booking.ts";
import { ipFingerprint, loadActiveForm, loadCustomSpecs, syncSubmissionToContact } from "../_shared/forms.ts";

const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: BOOKING_CORS_HEADERS });
  if (req.method !== "POST") return bookingJson({ error: "Method not allowed" }, 405);

  let body: { action?: string; slug?: string; values?: Record<string, RawValue>; website?: string };
  try {
    body = await req.json();
  } catch {
    return bookingJson({ error: "Corps JSON invalide" }, 400);
  }

  let env;
  try {
    env = loadCalendarFunctionEnv(Deno.env.toObject());
  } catch (err) {
    return bookingJson({ error: (err as Error).message }, 500);
  }
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!body.slug) return bookingJson({ error: "slug requis" }, 400);
    const loaded = await loadActiveForm(supabase, body.slug);
    if (!loaded) return bookingJson({ error: "Ce formulaire n'est pas disponible." }, 404);
    const { form, fields } = loaded;
    const specs = await loadCustomSpecs(supabase, form.client_id, fields);
    // Un champ personnalisé supprimé ou d'un autre client n'est pas proposé.
    const visibleFields = fields.filter((f) => f.kind === "standard" || specs.some((s) => s.id === f.fieldDefinitionId));

    if (body.action === "get") {
      return bookingJson({
        form: {
          title: form.title,
          description: form.description,
          submitLabel: form.submit_label,
          consentText: form.consent_text,
          fields: visibleFields.map((f) => {
            if (f.kind === "standard") return { id: f.id, kind: f.kind, key: f.key, label: f.label, required: f.required };
            const spec = specs.find((s) => s.id === f.fieldDefinitionId)!;
            return { id: f.id, kind: f.kind, label: f.label, required: f.required, fieldType: spec.field_type, options: spec.select_options ?? [] };
          }),
        },
      });
    }

    if (body.action === "submit") {
      const done = { ok: true, successMessage: form.success_message, redirectUrl: form.redirect_url };
      if (body.website) return bookingJson(done); // champ piège rempli : rien n'est enregistré

      const ipHash = await ipFingerprint(req, form.id);
      if (ipHash) {
        const { count, error } = await supabase
          .from("form_submissions")
          .select("id", { count: "exact", head: true })
          .eq("form_id", form.id)
          .eq("ip_hash", ipHash)
          .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
        if (error) throw new Error(error.message);
        if ((count ?? 0) >= MAX_SUBMISSIONS_PER_IP_PER_HOUR) {
          return bookingJson({ error: "Trop d'envois depuis cette connexion. Merci de réessayer plus tard." }, 429);
        }
      }

      const { value, errors } = validateSubmission(visibleFields, body.values ?? {}, specs);
      if (!value) return bookingJson({ error: "Formulaire incomplet", fields: errors }, 400);

      // Réponse telle qu'affichée dans le CRM : valeur validée par id de champ.
      const data: Record<string, unknown> = {};
      for (const f of visibleFields) {
        const v = f.kind === "standard" ? value.standard[f.key] : value.custom[f.fieldDefinitionId];
        if (v !== undefined) data[f.id] = v;
      }

      // S39-12 : fiche contact créée ou complétée. Un échec n'empêche pas de conserver la réponse.
      let contactId: string | null = null;
      try {
        contactId = await syncSubmissionToContact(supabase, form.client_id, value);
      } catch (err) {
        console.error("form-public: report sur la fiche contact impossible", (err as Error).message);
      }

      const { error: insertError } = await supabase
        .from("form_submissions")
        .insert({ form_id: form.id, client_id: form.client_id, data, ip_hash: ipHash, contact_id: contactId });
      if (insertError) throw new Error(insertError.message);
      return bookingJson(done);
    }

    return bookingJson({ error: "Action inconnue" }, 400);
  } catch (err) {
    return bookingJson({ error: (err as Error).message }, 500);
  }
});

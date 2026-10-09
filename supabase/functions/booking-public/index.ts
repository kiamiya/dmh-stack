// Edge Function Supabase (Deno) — S39 (CR du 09/10/2026) : API publique du
// module de prise de rendez-vous, appelée sans authentification depuis
// les pages /rdv/<page>[/<type>] du CRM (déployée avec --no-verify-jwt).
// Accès en base via service_role, réponses limitées à ce qu'un visiteur
// peut voir (jamais l'hôte, ses agendas ni la configuration interne).
//
// Actions (POST JSON { action, ... }) :
//   page  { page }                → page + types de RDV actifs
//   slots { page, type }          → créneaux libres du type
// La logique testable vit dans packages/booking (vitest) ; ce fichier n'est
// que la glue Deno, couverte par le test fonctionnel (TESTING.md).

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { BOOKING_CORS_HEADERS, bookingJson, loadActiveTypes, loadPublicPage, publicTypeView, slotsForType } from "../_shared/booking.ts";

interface RequestBody {
  action?: string;
  page?: string;
  type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: BOOKING_CORS_HEADERS });
  if (req.method !== "POST") return bookingJson({ error: "Method not allowed" }, 405);

  let body: RequestBody;
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
    if (!body.page) return bookingJson({ error: "page requis" }, 400);
    const page = await loadPublicPage(supabase, body.page);
    if (!page) return bookingJson({ error: "Page de réservation introuvable" }, 404);
    const types = await loadActiveTypes(supabase, page.id);

    if (body.action === "page") {
      return bookingJson({ page: { title: page.title, description: page.description }, types: types.map(publicTypeView) });
    }

    const type = types.find((t) => t.slug === body.type);
    if (!type) return bookingJson({ error: "Type de rendez-vous introuvable" }, 404);

    if (body.action === "slots") {
      const { slots } = await slotsForType(supabase, env, page, type, new Date());
      return bookingJson({ type: publicTypeView(type), slots });
    }

    return bookingJson({ error: "Action inconnue" }, 400);
  } catch (err) {
    return bookingJson({ error: (err as Error).message }, 500);
  }
});

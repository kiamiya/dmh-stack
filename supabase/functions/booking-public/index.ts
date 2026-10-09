// Edge Function Supabase (Deno) — S39 (CR du 09/10/2026) : API publique du
// module de prise de rendez-vous, appelée sans authentification depuis
// les pages /rdv/<page>[/<type>] du CRM (déployée avec --no-verify-jwt).
// Accès en base via service_role, réponses limitées à ce qu'un visiteur
// peut voir (jamais l'hôte, ses agendas ni la configuration interne).
//
// Actions (POST JSON { action, ... }) :
//   page  { page }                → page + types de RDV actifs
//   slots { page, type }          → créneaux libres du type
//   request { page, type, slotStart, firstName, lastName, email, phone,
//             company, notes, answers, website }
//                                  → demande « en attente » (S39-5/S39-6) :
//     créneau re-vérifié, événement PROVISOIRE posé dans l'agenda de l'hôte,
//     RDV `pending` en base ; l'hôte accepte ou refuse dans le CRM.
//     `website` est un champ piège invisible (anti-spam) : rempli = ignoré.
//   manage-get / manage-cancel / manage-reschedule { token[, slotStart] }
//                                  → lien « reprogrammer / annuler » du prospect (S39-8, manage.ts)
// La logique testable vit dans packages/booking (vitest) ; ce fichier n'est
// que la glue Deno, couverte par le test fonctionnel (TESTING.md).

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { BOOKING_CORS_HEADERS, bookingJson, loadActiveTypes, loadPublicPage, publicTypeView, slotsForType } from "../_shared/booking.ts";
import { normalizeQuestions } from "../../../packages/booking/src/config.ts";
import { isOfferedSlot } from "../../../packages/booking/src/slots.ts";
import { validateBookingRequest } from "../../../packages/booking/src/request.ts";
import { recapHtml, recapLines, recapText } from "../../../packages/booking/src/recap.ts";
import { createMicrosoftEvent } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { createGoogleEvent } from "../../../packages/calendar/src/googleCalendar.ts";
import { hostNewRequestEmail } from "../../../packages/booking/src/emails.ts";
import { emailContextFor, loadHost, sendFromHost } from "../_shared/bookingMail.ts";
import type { BookedMeeting } from "../_shared/booking.ts";
import { handleManage } from "./manage.ts";

/** Au-delà, une même adresse ne peut plus déposer de demande pour ce client sur 24 h (anti-abus). */
const MAX_PENDING_PER_EMAIL_PER_DAY = 3;

/** Origine de la page publique (liens des e-mails) : https, ou http://localhost en développement. */
function publicBaseUrl(req: Request): string | null {
  const origin = req.headers.get("Origin");
  if (!origin) return null;
  return /^https:\/\/[^/]+$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin) ? origin : null;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface RequestBody {
  action?: string;
  page?: string;
  type?: string;
  slotStart?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  answers?: Record<string, string | boolean>;
  website?: string;
  token?: string;
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
    if (body.action?.startsWith("manage-")) return await handleManage(supabase, env, body);

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

    if (body.action === "request") {
      // Champ piège rempli : on répond comme si tout allait bien, sans rien enregistrer.
      if (body.website) return bookingJson({ ok: true, redirectUrl: type.redirect_url });

      const questions = normalizeQuestions(type.questions);
      const { value: request, errors } = validateBookingRequest(
        {
          firstName: body.firstName ?? "",
          lastName: body.lastName ?? "",
          email: body.email ?? "",
          phone: body.phone ?? "",
          company: body.company ?? "",
          notes: body.notes ?? "",
          answers: body.answers ?? {},
        },
        questions,
      );
      if (!request) return bookingJson({ error: "Formulaire incomplet", fields: errors }, 400);

      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { count, error: countError } = await supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .eq("client_id", page.client_id)
        .eq("guest_email", request.email)
        .eq("status", "pending")
        .gte("created_at", since);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) >= MAX_PENDING_PER_EMAIL_PER_DAY) {
        return bookingJson({ error: "Vous avez déjà plusieurs demandes en attente. Merci de patienter avant d'en déposer une nouvelle." }, 429);
      }

      const { slots, connections } = await slotsForType(supabase, env, page, type, new Date());
      const slot = body.slotStart ? isOfferedSlot(slots, body.slotStart) : null;
      if (!slot) return bookingJson({ error: "Ce créneau n'est plus disponible, merci d'en choisir un autre." }, 409);

      const lines = recapLines(request, questions);
      const title = `${type.name} — ${request.firstName} ${request.lastName} (${request.company})`;
      // Événement PROVISOIRE dans l'agenda de l'hôte (Outlook de préférence : c'est là que partira l'invitation Teams).
      const host = connections.find((c) => c.provider === "microsoft") ?? connections[0] ?? null;
      let externalEventId: string | null = null;
      if (host?.provider === "microsoft") {
        const event = await createMicrosoftEvent({
          accessToken: host.accessToken,
          subject: `[À valider] ${title}`,
          startIso: slot.start,
          endIso: slot.end,
          showAs: "tentative",
          bodyHtml: `<p>Demande de rendez-vous à accepter ou refuser dans le CRM.</p>${recapHtml(lines)}`,
        });
        externalEventId = event.id;
      } else if (host?.provider === "google") {
        const event = await createGoogleEvent({
          accessToken: host.accessToken,
          summary: `[À valider] ${title}`,
          startIso: slot.start,
          endIso: slot.end,
          description: `Demande de rendez-vous à accepter ou refuser dans le CRM.\n\n${recapText(lines)}`,
        });
        externalEventId = event.id;
      }

      const { data: inserted, error: insertError } = await supabase.from("meetings").insert({
        client_id: page.client_id,
        staff_id: page.host_staff_id,
        meeting_type_id: type.id,
        status: "pending",
        title,
        starts_at: slot.start,
        ends_at: slot.end,
        external_calendar_provider: host?.provider ?? null,
        external_event_id: externalEventId,
        guest_name: `${request.firstName} ${request.lastName}`,
        guest_email: request.email,
        guest_phone: request.phone,
        guest_company: request.company,
        guest_notes: request.notes,
        answers: request.answers,
        manage_token: randomToken(),
        public_base_url: publicBaseUrl(req),
      }).select("*").single();
      if (insertError) throw new Error(insertError.message);

      // E-mail (S39-7) : alerte à l'hôte uniquement, jamais bloquant. Pas d'accusé de
      // réception au prospect : la page publique le confirme déjà, et un e-mail envoyé
      // depuis la boîte de l'hôte vers une adresse saisie par n'importe quel visiteur,
      // avec son message libre, servirait de relais à du contenu non sollicité. Le
      // prospect n'est écrit qu'après validation par l'hôte.
      const hostInfo = await loadHost(supabase, page.host_staff_id);
      if (hostInfo) {
        const ctx = await emailContextFor(supabase, inserted as BookedMeeting, type, hostInfo);
        await sendFromHost(supabase, env, page.host_staff_id, { email: hostInfo.email, name: hostInfo.name }, hostNewRequestEmail(ctx));
      }

      return bookingJson({ ok: true, redirectUrl: type.redirect_url });
    }

    return bookingJson({ error: "Action inconnue" }, 400);
  } catch (err) {
    return bookingJson({ error: (err as Error).message }, 500);
  }
});

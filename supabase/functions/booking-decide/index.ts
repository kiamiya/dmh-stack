// Edge Function Supabase (Deno) — S39-6 (CR du 09/10/2026) : l'hôte accepte
// ou refuse dans le CRM une demande de RDV prise en ligne (modèle
// « invitation acceptée manuellement », décision Loïc du 09/10).
//
//   POST { meetingId, decision: "accept" | "decline" }
//   accept  : l'événement provisoire devient définitif (Outlook : « occupé »
//             + réunion Teams si le type le prévoit), RDV `confirmed`.
//   decline : l'événement provisoire est supprimé, RDV `declined`.
// E-mails au prospect (S39-7) depuis la boîte Outlook de l'hôte : confirmation
// + .ics, ou refus avec lien pour choisir un autre créneau. Un e-mail non
// envoyé ne bloque pas la décision : `emailWarning` est renvoyé au CRM.
//
// Réservé au staff connecté (ou à la clé service_role), voir
// packages/config/src/edgeAuth.ts. Glue Deno, logique testable dans
// packages/booking et packages/calendar.

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { authorizeStaffOrService } from "../../../packages/config/src/edgeAuth.ts";
import { normalizeQuestions } from "../../../packages/booking/src/config.ts";
import { manageMeetingUrl, recapHtml, recapLines, recapText, requestFromMeeting } from "../../../packages/booking/src/recap.ts";
import { deleteMicrosoftEvent, updateMicrosoftEvent } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { deleteGoogleEvent, updateGoogleEvent } from "../../../packages/calendar/src/googleCalendar.ts";
import { resolveConnectionByStaffIdAndProvider } from "../_shared/calendarConnection.ts";
import { BOOKING_CORS_HEADERS, bookingJson, loadBookedMeeting, staffOrServiceDeps } from "../_shared/booking.ts";
import { emailContextFor, firstWarning, loadHost, meetingIcsAttachment, sendFromHost } from "../_shared/bookingMail.ts";
import { guestConfirmedEmail, guestDeclinedEmail } from "../../../packages/booking/src/emails.ts";
import { remindersCoveredAt } from "../../../packages/booking/src/reminders.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: BOOKING_CORS_HEADERS });
  if (req.method !== "POST") return bookingJson({ error: "Method not allowed" }, 405);

  let env;
  try {
    env = loadCalendarFunctionEnv(Deno.env.toObject());
  } catch (err) {
    return bookingJson({ error: (err as Error).message }, 500);
  }
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const auth = await authorizeStaffOrService(req.headers.get("Authorization"), staffOrServiceDeps(supabase, env));
  if (!auth.ok) return bookingJson({ error: auth.error }, auth.status);

  let body: { meetingId?: string; decision?: string };
  try {
    body = await req.json();
  } catch {
    return bookingJson({ error: "Corps JSON invalide" }, 400);
  }
  if (!body.meetingId || (body.decision !== "accept" && body.decision !== "decline")) {
    return bookingJson({ error: "meetingId et decision (accept|decline) requis" }, 400);
  }

  try {
    const loaded = await loadBookedMeeting(supabase, { id: body.meetingId });
    if (!loaded) return bookingJson({ error: "Rendez-vous introuvable" }, 404);
    const { meeting, type } = loaded;
    if (meeting.status !== "pending") return bookingJson({ error: "Cette demande a déjà été traitée." }, 409);

    const connection = meeting.external_calendar_provider
      ? await resolveConnectionByStaffIdAndProvider(supabase, env, meeting.staff_id, meeting.external_calendar_provider)
      : null;
    const decidedBy = auth.caller.kind === "staff" ? auth.caller.userId : null;

    if (body.decision === "decline") {
      if (connection && meeting.external_event_id) {
        if (connection.provider === "microsoft") await deleteMicrosoftEvent({ accessToken: connection.accessToken, eventId: meeting.external_event_id });
        else await deleteGoogleEvent({ accessToken: connection.accessToken, eventId: meeting.external_event_id });
      }
      const { error } = await supabase
        .from("meetings")
        .update({ status: "declined", decided_at: new Date().toISOString(), decided_by: decidedBy, external_event_id: null })
        .eq("id", meeting.id);
      if (error) throw new Error(error.message);
      const host = await loadHost(supabase, meeting.staff_id);
      let emailWarning: string | null = null;
      if (host && meeting.guest_email) {
        const ctx = await emailContextFor(supabase, meeting, type, host);
        emailWarning = firstWarning([
          await sendFromHost(supabase, env, meeting.staff_id, { email: meeting.guest_email, name: meeting.guest_name ?? undefined }, guestDeclinedEmail(ctx)),
        ]);
      }
      return bookingJson({ ok: true, status: "declined", emailWarning });
    }

    const lines = recapLines(requestFromMeeting(meeting), normalizeQuestions(type?.questions ?? []));
    const manageLink = meeting.public_base_url && meeting.manage_token ? manageMeetingUrl(meeting.public_base_url, meeting.manage_token) : null;
    let onlineMeetingUrl: string | null = null;
    if (connection && meeting.external_event_id) {
      if (connection.provider === "microsoft") {
        const event = await updateMicrosoftEvent({
          accessToken: connection.accessToken,
          eventId: meeting.external_event_id,
          subject: meeting.title,
          showAs: "busy",
          bodyHtml: recapHtml(lines),
          isOnlineMeeting: type?.video_provider === "teams" ? true : undefined,
        });
        onlineMeetingUrl = event.onlineMeeting?.joinUrl ?? null;
      } else {
        await updateGoogleEvent({
          accessToken: connection.accessToken,
          eventId: meeting.external_event_id,
          summary: meeting.title,
          description: recapText(lines) + (manageLink ? `\n\nLien de gestion du prospect : ${manageLink}` : ""),
        });
      }
    }

    const now = new Date();
    const covered = remindersCoveredAt(meeting.starts_at, type?.reminder_hours ?? [], now);
    const { error } = await supabase
      .from("meetings")
      .update({
        status: "confirmed",
        decided_at: now.toISOString(),
        decided_by: decidedBy,
        online_meeting_url: onlineMeetingUrl,
        reminders_sent: [...new Set([...(meeting.reminders_sent ?? []), ...covered])],
      })
      .eq("id", meeting.id);
    if (error) throw new Error(error.message);

    const host = await loadHost(supabase, meeting.staff_id);
    let emailWarning: string | null = null;
    if (host && meeting.guest_email) {
      const confirmed = { ...meeting, status: "confirmed" as const, online_meeting_url: onlineMeetingUrl };
      const ctx = await emailContextFor(supabase, confirmed, type, host);
      emailWarning = firstWarning([
        await sendFromHost(
          supabase,
          env,
          meeting.staff_id,
          { email: meeting.guest_email, name: meeting.guest_name ?? undefined },
          guestConfirmedEmail(ctx),
          [meetingIcsAttachment(confirmed, ctx, host, "REQUEST")],
        ),
      ]);
    }
    if (type?.video_provider === "teams" && connection?.provider === "microsoft" && !onlineMeetingUrl) {
      emailWarning = (emailWarning ? emailWarning + " " : "") + "Aucun lien Teams n'a pu être créé (compte Microsoft 365 professionnel requis).";
    }
    return bookingJson({ ok: true, status: "confirmed", onlineMeetingUrl, emailWarning });
  } catch (err) {
    return bookingJson({ error: (err as Error).message }, 500);
  }
});

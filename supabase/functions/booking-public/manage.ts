// S39-8 — actions du lien « reprogrammer / annuler » envoyé au prospect
// (CR du 09/10/2026). Le jeton (`meetings.manage_token`, 24 octets
// aléatoires) est la seule autorisation : il n'est connu que du prospect
// (e-mail de confirmation) — il n'est jamais renvoyé par le CRM.
//
//   manage-get        { token }             → RDV + droits + créneaux si reprogrammable
//   manage-cancel     { token }             → RDV annulé, créneau libéré, e-mails
//   manage-reschedule { token, slotStart }  → nouveau créneau, repasse « en attente »
//                                             (l'hôte valide à nouveau, modèle d'acceptation manuelle)

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import type { BookingPage } from "../../../packages/types/src/index.ts";
import { manageRights } from "../../../packages/booking/src/manage.ts";
import { isOfferedSlot } from "../../../packages/booking/src/slots.ts";
import { guestCancelledEmail, hostCancelledEmail, hostNewRequestEmail } from "../../../packages/booking/src/emails.ts";
import { deleteMicrosoftEvent, updateMicrosoftEvent } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { deleteGoogleEvent, updateGoogleEvent } from "../../../packages/calendar/src/googleCalendar.ts";
import { resolveConnectionByStaffIdAndProvider } from "../_shared/calendarConnection.ts";
import { bookingJson, loadBookedMeeting, publicTypeView, slotsForType } from "../_shared/booking.ts";
import type { BookedMeeting } from "../_shared/booking.ts";
import { emailContextFor, loadHost, meetingIcsAttachment, sendFromHost } from "../_shared/bookingMail.ts";

async function hostConnection(supabase: SupabaseClient, env: CalendarFunctionEnv, meeting: BookedMeeting) {
  if (!meeting.external_calendar_provider || !meeting.external_event_id) return null;
  return resolveConnectionByStaffIdAndProvider(supabase, env, meeting.staff_id, meeting.external_calendar_provider);
}

export async function handleManage(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  body: { action?: string; token?: string; slotStart?: string },
): Promise<Response> {
  if (!body.token) return bookingJson({ error: "Lien invalide" }, 400);
  const loaded = await loadBookedMeeting(supabase, { manageToken: body.token });
  if (!loaded) return bookingJson({ error: "Ce lien n'est plus valide." }, 404);
  const { meeting, type } = loaded;

  let page: BookingPage | null = null;
  if (type) {
    const { data } = await supabase.from("booking_pages").select("*").eq("id", type.booking_page_id).maybeSingle();
    page = (data as BookingPage | null) ?? null;
  }
  const typeAvailable = Boolean(type?.active && page);
  const now = new Date();
  const rights = manageRights(meeting.status, meeting.starts_at, typeAvailable, now);

  if (body.action === "manage-get") {
    const slots = rights.canReschedule && page && type ? (await slotsForType(supabase, env, page, type, now)).slots : [];
    return bookingJson({
      meeting: {
        status: meeting.status,
        startsAt: meeting.starts_at,
        endsAt: meeting.ends_at,
        guestName: meeting.guest_name,
        onlineMeetingUrl: meeting.status === "confirmed" ? meeting.online_meeting_url : null,
      },
      type: type ? publicTypeView(type) : null,
      rights,
      slots,
    });
  }

  const host = await loadHost(supabase, meeting.staff_id);

  if (body.action === "manage-cancel") {
    if (!rights.canCancel) return bookingJson({ error: rights.reason ?? "Annulation impossible." }, 409);
    const connection = await hostConnection(supabase, env, meeting);
    if (connection && meeting.external_event_id) {
      if (connection.provider === "microsoft") await deleteMicrosoftEvent({ accessToken: connection.accessToken, eventId: meeting.external_event_id });
      else await deleteGoogleEvent({ accessToken: connection.accessToken, eventId: meeting.external_event_id });
    }
    const cancelled: BookedMeeting = { ...meeting, status: "cancelled", ics_sequence: meeting.ics_sequence + 1, external_event_id: null };
    const { error } = await supabase
      .from("meetings")
      .update({ status: "cancelled", ics_sequence: cancelled.ics_sequence, external_event_id: null })
      .eq("id", meeting.id);
    if (error) throw new Error(error.message);

    if (host && meeting.guest_email) {
      const ctx = await emailContextFor(supabase, cancelled, type, host);
      // Un RDV confirmé a un .ics dans l'agenda du prospect : on lui envoie l'annulation correspondante.
      const attachments = meeting.status === "confirmed" ? [meetingIcsAttachment(cancelled, ctx, host, "CANCEL")] : [];
      await sendFromHost(supabase, env, meeting.staff_id, { email: meeting.guest_email, name: meeting.guest_name ?? undefined }, guestCancelledEmail(ctx), attachments);
      await sendFromHost(supabase, env, meeting.staff_id, { email: host.email, name: host.name }, hostCancelledEmail(ctx));
    }
    return bookingJson({ ok: true, status: "cancelled" });
  }

  if (body.action === "manage-reschedule") {
    if (!rights.canReschedule || !page || !type) return bookingJson({ error: rights.reason ?? "Reprogrammation impossible." }, 409);
    const { slots } = await slotsForType(supabase, env, page, type, now);
    const slot = body.slotStart ? isOfferedSlot(slots, body.slotStart) : null;
    if (!slot) return bookingJson({ error: "Ce créneau n'est plus disponible, merci d'en choisir un autre." }, 409);

    const connection = await hostConnection(supabase, env, meeting);
    if (connection && meeting.external_event_id) {
      if (connection.provider === "microsoft") {
        await updateMicrosoftEvent({
          accessToken: connection.accessToken,
          eventId: meeting.external_event_id,
          subject: `[À valider] ${meeting.title}`,
          startIso: slot.start,
          endIso: slot.end,
          showAs: "tentative",
        });
      } else {
        await updateGoogleEvent({
          accessToken: connection.accessToken,
          eventId: meeting.external_event_id,
          summary: `[À valider] ${meeting.title}`,
          startIso: slot.start,
          endIso: slot.end,
        });
      }
    }
    const moved: BookedMeeting = {
      ...meeting,
      status: "pending",
      starts_at: slot.start,
      ends_at: slot.end,
      ics_sequence: meeting.ics_sequence + 1,
      reminders_sent: [],
    };
    const { error } = await supabase
      .from("meetings")
      .update({
        status: "pending",
        starts_at: slot.start,
        ends_at: slot.end,
        ics_sequence: moved.ics_sequence,
        reminders_sent: [],
        decided_at: null,
        decided_by: null,
      })
      .eq("id", meeting.id);
    if (error) throw new Error(error.message);

    if (host) {
      const ctx = await emailContextFor(supabase, moved, type, host);
      await sendFromHost(supabase, env, meeting.staff_id, { email: host.email, name: host.name }, hostNewRequestEmail(ctx, true));
    }
    return bookingJson({ ok: true, status: "pending" });
  }

  return bookingJson({ error: "Action inconnue" }, 400);
}

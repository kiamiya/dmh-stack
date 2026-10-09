// S39-7 — envoi des e-mails du module de RDV depuis la boîte Outlook de
// l'hôte (décision Loïc du 09/10 : pas de nouveau fournisseur). Un e-mail
// qui ne part pas ne fait JAMAIS échouer la réservation ou la décision :
// l'appelant reçoit un avertissement à afficher dans le CRM.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeetingType } from "../../../packages/types/src/index.ts";
import type { CalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { MicrosoftMailError, sendMicrosoftMail } from "../../../packages/calendar/src/microsoftCalendar.ts";
import type { MailAttachment } from "../../../packages/calendar/src/microsoftCalendar.ts";
import { normalizeQuestions } from "../../../packages/booking/src/config.ts";
import { manageMeetingUrl, recapHtml, recapLines, requestFromMeeting } from "../../../packages/booking/src/recap.ts";
import { buildIcs, toBase64Utf8 } from "../../../packages/booking/src/ics.ts";
import type { EmailContent, MeetingEmailContext } from "../../../packages/booking/src/emails.ts";
import { resolveConnectionByStaffIdAndProvider } from "./calendarConnection.ts";
import type { BookedMeeting } from "./booking.ts";

export type MailOutcome = { sent: true } | { sent: false; warning: string };

export interface HostInfo {
  id: string;
  name: string;
  email: string;
}

export async function loadHost(supabase: SupabaseClient, staffId: string): Promise<HostInfo | null> {
  const { data, error } = await supabase.from("staff_members").select("id, name, email").eq("id", staffId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as HostInfo | null) ?? null;
}

/** Contexte commun des gabarits d'e-mail pour un RDV donné. */
export async function emailContextFor(
  supabase: SupabaseClient,
  meeting: BookedMeeting,
  type: MeetingType | null,
  host: HostInfo,
): Promise<MeetingEmailContext> {
  let rebookUrl: string | null = null;
  if (type && meeting.public_base_url) {
    const { data: page } = await supabase.from("booking_pages").select("slug").eq("id", type.booking_page_id).maybeSingle();
    if (page?.slug) rebookUrl = `${meeting.public_base_url}/rdv/${page.slug}/${type.slug}`;
  }
  const lines = recapLines(requestFromMeeting(meeting), normalizeQuestions(type?.questions ?? []));
  return {
    hostName: host.name,
    guestName: meeting.guest_name ?? "",
    typeName: type?.name ?? meeting.title,
    startIso: meeting.starts_at,
    durationMinutes: Math.round((new Date(meeting.ends_at).getTime() - new Date(meeting.starts_at).getTime()) / 60_000),
    timezone: type?.timezone ?? "Europe/Paris",
    videoUrl: meeting.online_meeting_url,
    location: type?.video_provider === "none" ? type.location : null,
    manageUrl: meeting.public_base_url && meeting.manage_token ? manageMeetingUrl(meeting.public_base_url, meeting.manage_token) : null,
    rebookUrl,
    crmUrl: meeting.public_base_url ? `${meeting.public_base_url}/forms-meetings` : null,
    recapHtml: recapHtml(lines),
  };
}

/** Pièce jointe .ics du RDV (même UID pour toute sa vie, SEQUENCE = meetings.ics_sequence). */
export function meetingIcsAttachment(
  meeting: BookedMeeting,
  ctx: MeetingEmailContext,
  host: HostInfo,
  method: "REQUEST" | "CANCEL",
): MailAttachment {
  const ics = buildIcs({
    uid: `${meeting.id}@dmh-crm`,
    sequence: meeting.ics_sequence,
    method,
    startIso: meeting.starts_at,
    endIso: meeting.ends_at,
    summary: `${ctx.typeName} — ${host.name}`,
    description: [ctx.videoUrl ? `Réunion Teams : ${ctx.videoUrl}` : null, ctx.manageUrl ? `Reprogrammer ou annuler : ${ctx.manageUrl}` : null]
      .filter(Boolean)
      .join("\n"),
    location: ctx.videoUrl ? "Microsoft Teams" : ctx.location ?? undefined,
    url: ctx.videoUrl ?? undefined,
    organizer: { name: host.name, email: host.email },
    attendee: { name: meeting.guest_name ?? meeting.guest_email ?? "", email: meeting.guest_email ?? "" },
  });
  return { name: method === "CANCEL" ? "annulation.ics" : "invitation.ics", contentType: "text/calendar; charset=utf-8; method=" + method, contentBase64: toBase64Utf8(ics) };
}

/** Envoie un e-mail depuis la boîte Outlook de l'hôte ; ne lève jamais. */
export async function sendFromHost(
  supabase: SupabaseClient,
  env: CalendarFunctionEnv,
  hostStaffId: string,
  to: { email: string; name?: string },
  content: EmailContent,
  attachments: MailAttachment[] = [],
): Promise<MailOutcome> {
  try {
    const connection = await resolveConnectionByStaffIdAndProvider(supabase, env, hostStaffId, "microsoft");
    if (!connection) return { sent: false, warning: "L'hôte n'a pas connecté de calendrier Microsoft : aucun e-mail n'a été envoyé." };
    await sendMicrosoftMail({ accessToken: connection.accessToken, to: [to], subject: content.subject, html: content.html, attachments });
    return { sent: true };
  } catch (err) {
    if (err instanceof MicrosoftMailError && err.missingPermission) {
      return {
        sent: false,
        warning: "E-mail non envoyé : reconnecte ton calendrier Microsoft (Paramètres › Mon calendrier) pour autoriser l'envoi d'e-mails.",
      };
    }
    return { sent: false, warning: `E-mail non envoyé : ${(err as Error).message}` };
  }
}

/** Premier avertissement d'une série d'envois, ou null si tout est parti. */
export function firstWarning(outcomes: MailOutcome[]): string | null {
  for (const o of outcomes) if (!o.sent) return o.warning;
  return null;
}

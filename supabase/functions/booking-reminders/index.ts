// Edge Function Supabase (Deno) — S39-7 (CR du 09/10/2026) : rappels avant
// les RDV confirmés, selon le réglage « rappels » de leur type. Appelée toutes
// les 15 minutes par pg_cron (migration 050) avec la clé service_role du
// Vault ; un membre du staff peut aussi la déclencher (test).
//
// Règle d'envoi testée dans packages/booking/src/reminders.ts : un seul
// e-mail même si plusieurs rappels sont dus, jamais après le début du RDV.

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { authorizeStaffOrService } from "../../../packages/config/src/edgeAuth.ts";
import { dueReminder } from "../../../packages/booking/src/reminders.ts";
import { guestReminderEmail } from "../../../packages/booking/src/emails.ts";
import type { MeetingType } from "../../../packages/types/src/index.ts";
import { BOOKING_CORS_HEADERS, bookingJson, staffOrServiceDeps } from "../_shared/booking.ts";
import type { BookedMeeting } from "../_shared/booking.ts";
import { emailContextFor, loadHost, sendFromHost } from "../_shared/bookingMail.ts";

/** Rappel le plus éloigné autorisé par la migration/le CRM : 168 h. */
const MAX_REMINDER_HOURS = 168;

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

  const now = new Date();
  try {
    const { data, error } = await supabase
      .from("meetings")
      .select("*, meeting_types(*)")
      .eq("status", "confirmed")
      .not("meeting_type_id", "is", null)
      .gt("starts_at", now.toISOString())
      .lt("starts_at", new Date(now.getTime() + MAX_REMINDER_HOURS * 3600_000).toISOString());
    if (error) throw new Error(error.message);

    let sent = 0;
    const warnings: string[] = [];
    for (const row of data ?? []) {
      const { meeting_types: type, ...meeting } = row as BookedMeeting & { meeting_types: MeetingType | null };
      if (!type || !meeting.guest_email) continue;
      const due = dueReminder(meeting.starts_at, type.reminder_hours ?? [], meeting.reminders_sent ?? [], now);
      if (!due.send) continue;

      const host = await loadHost(supabase, meeting.staff_id);
      if (!host) continue;
      const ctx = await emailContextFor(supabase, meeting, type, host);
      const outcome = await sendFromHost(supabase, env, meeting.staff_id, { email: meeting.guest_email, name: meeting.guest_name ?? undefined }, guestReminderEmail(ctx));
      // Marqué envoyé même en cas d'échec : un rappel raté n'est pas renvoyé en boucle toutes les 15 minutes.
      const { error: updateError } = await supabase
        .from("meetings")
        .update({ reminders_sent: [...new Set([...(meeting.reminders_sent ?? []), ...due.markSent])] })
        .eq("id", meeting.id);
      if (updateError) throw new Error(updateError.message);
      if (outcome.sent) sent++;
      else warnings.push(`${meeting.id} : ${outcome.warning}`);
    }
    return bookingJson({ ok: true, sent, warnings });
  } catch (err) {
    return bookingJson({ error: (err as Error).message }, 500);
  }
});

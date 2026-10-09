// S39-7 — e-mails transactionnels du module de RDV, en français (CR du
// 09/10/2026 : Brevo les envoie en deux langues, une version française est
// souhaitée). Contenu inspiré des e-mails Brevo (confirmation, lien de
// reprogrammation, récapitulatif) — à ajuster une fois le RDV de test Brevo
// réalisé (action Loïc). Envoyés depuis la boîte Outlook de l'hôte.
//
// Module autonome (aucun import entre fichiers voisins : Deno ne résout pas
// les imports `./x.js`) — le récapitulatif arrive déjà mis en HTML
// (`recapHtml` de recap.ts) et l'échappement est dupliqué ici.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface MeetingEmailContext {
  hostName: string;
  guestName: string;
  typeName: string;
  startIso: string;
  durationMinutes: number;
  timezone: string;
  /** Lien de la réunion Teams (null si pas de visio ou lien indisponible). */
  videoUrl: string | null;
  /** Lieu, pour un RDV sans visio. */
  location: string | null;
  /** Lien « reprogrammer / annuler » du prospect. */
  manageUrl: string | null;
  /** Page du type de RDV, pour choisir un autre créneau. */
  rebookUrl: string | null;
  /** Lien vers l'onglet Rendez-vous du CRM (e-mails à l'hôte). */
  crmUrl: string | null;
  /** Récapitulatif déjà mis en HTML (`recapHtml(recapLines(...))`, valeurs échappées). */
  recapHtml: string;
}

export interface EmailContent {
  subject: string;
  html: string;
}

export function formatMeetingDate(startIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(startIso));
}

function layout(title: string, paragraphs: string[]): string {
  return `<!doctype html><html lang="fr"><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.5">
<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>
${paragraphs.join("\n")}
</body></html>`;
}

function p(html: string): string {
  return `<p style="margin:0 0 12px">${html}</p>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 12px"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1f2937;color:#ffffff;padding:8px 14px;border-radius:4px;text-decoration:none">${escapeHtml(label)}</a></p>`;
}

function whenLine(ctx: MeetingEmailContext): string {
  return `<strong>${escapeHtml(formatMeetingDate(ctx.startIso, ctx.timezone))}</strong> (${ctx.durationMinutes} min, heure de Paris)`;
}

function whereLine(ctx: MeetingEmailContext): string {
  if (ctx.videoUrl) return `Visio Microsoft Teams : <a href="${escapeHtml(ctx.videoUrl)}">rejoindre la réunion</a>`;
  if (ctx.location) return `Lieu : ${escapeHtml(ctx.location)}`;
  return "";
}

/** À l'hôte : une demande (ou une reprogrammation) attend sa décision. */
export function hostNewRequestEmail(ctx: MeetingEmailContext, reschedule = false): EmailContent {
  return {
    subject: `${reschedule ? "Reprogrammation à valider" : "Nouvelle demande de RDV"} — ${ctx.guestName} (${ctx.typeName})`,
    html: layout(reschedule ? "Demande de reprogrammation" : "Nouvelle demande de rendez-vous", [
      p(
        `${escapeHtml(ctx.guestName)} ${reschedule ? "propose de déplacer son rendez-vous" : "demande un rendez-vous"} « ${escapeHtml(ctx.typeName)} » le ${whenLine(ctx)}.`,
      ),
      p("Le créneau est bloqué « provisoire » dans votre agenda. Acceptez ou refusez la demande dans le CRM."),
      ...(ctx.crmUrl ? [button(ctx.crmUrl, "Ouvrir les demandes à valider")] : []),
      ctx.recapHtml,
    ]),
  };
}

/** Au prospect, à l'acceptation (avec le .ics en pièce jointe). */
export function guestConfirmedEmail(ctx: MeetingEmailContext): EmailContent {
  const where = whereLine(ctx);
  return {
    subject: `Rendez-vous confirmé — ${ctx.typeName}, ${formatMeetingDate(ctx.startIso, ctx.timezone)}`,
    html: layout("Votre rendez-vous est confirmé", [
      p(`Bonjour ${escapeHtml(ctx.guestName)},`),
      p(`Votre rendez-vous « ${escapeHtml(ctx.typeName)} » avec ${escapeHtml(ctx.hostName)} est confirmé pour le ${whenLine(ctx)}.`),
      ...(where ? [p(where)] : []),
      p("L'invitation est jointe à cet e-mail (fichier .ics) : ouvrez-la pour l'ajouter à votre agenda."),
      ...(ctx.manageUrl ? [p("Un empêchement ? Vous pouvez reprogrammer ou annuler :"), button(ctx.manageUrl, "Reprogrammer ou annuler")] : []),
      p("<strong>Récapitulatif</strong>"),
      ctx.recapHtml,
    ]),
  };
}

/** Au prospect, si la demande est refusée. */
export function guestDeclinedEmail(ctx: MeetingEmailContext): EmailContent {
  return {
    subject: `Votre demande de rendez-vous — ${ctx.typeName}`,
    html: layout("Ce créneau n'est malheureusement pas disponible", [
      p(`Bonjour ${escapeHtml(ctx.guestName)},`),
      p(`Le créneau du ${whenLine(ctx)} n'a pas pu être retenu par ${escapeHtml(ctx.hostName)}.`),
      ...(ctx.rebookUrl ? [p("Nous vous invitons à choisir un autre créneau :"), button(ctx.rebookUrl, "Choisir un autre créneau")] : []),
    ]),
  };
}

/** Au prospect, avant le RDV. */
export function guestReminderEmail(ctx: MeetingEmailContext): EmailContent {
  const where = whereLine(ctx);
  return {
    subject: `Rappel : rendez-vous ${ctx.typeName}, ${formatMeetingDate(ctx.startIso, ctx.timezone)}`,
    html: layout("Rappel de votre rendez-vous", [
      p(`Bonjour ${escapeHtml(ctx.guestName)},`),
      p(`Pour rappel, votre rendez-vous « ${escapeHtml(ctx.typeName)} » avec ${escapeHtml(ctx.hostName)} a lieu le ${whenLine(ctx)}.`),
      ...(where ? [p(where)] : []),
      ...(ctx.manageUrl ? [button(ctx.manageUrl, "Reprogrammer ou annuler")] : []),
    ]),
  };
}

/** Au prospect, après une annulation de sa part (avec .ics d'annulation). */
export function guestCancelledEmail(ctx: MeetingEmailContext): EmailContent {
  return {
    subject: `Rendez-vous annulé — ${ctx.typeName}`,
    html: layout("Votre rendez-vous est annulé", [
      p(`Bonjour ${escapeHtml(ctx.guestName)},`),
      p(`Votre rendez-vous du ${whenLine(ctx)} avec ${escapeHtml(ctx.hostName)} est bien annulé.`),
      ...(ctx.rebookUrl ? [button(ctx.rebookUrl, "Prendre un nouveau rendez-vous")] : []),
    ]),
  };
}

/** À l'hôte, quand le prospect annule. */
export function hostCancelledEmail(ctx: MeetingEmailContext): EmailContent {
  return {
    subject: `RDV annulé par ${ctx.guestName} — ${ctx.typeName}`,
    html: layout("Rendez-vous annulé", [
      p(`${escapeHtml(ctx.guestName)} a annulé son rendez-vous « ${escapeHtml(ctx.typeName)} » du ${whenLine(ctx)}. Le créneau est libéré dans votre agenda.`),
      ctx.recapHtml,
    ]),
  };
}

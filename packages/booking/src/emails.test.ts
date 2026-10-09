import { describe, expect, it } from "vitest";
import {
  formatMeetingDate,
  guestCancelledEmail,
  guestConfirmedEmail,
  guestDeclinedEmail,
  guestReminderEmail,
  hostCancelledEmail,
  hostNewRequestEmail,
} from "./emails.js";
import type { MeetingEmailContext } from "./emails.js";
import { recapHtml } from "./recap.js";

const ctx: MeetingEmailContext = {
  hostName: "Delphine",
  guestName: "Alice <Martin>",
  typeName: "Découverte",
  startIso: "2026-10-12T07:00:00.000Z",
  durationMinutes: 30,
  timezone: "Europe/Paris",
  videoUrl: "https://teams.microsoft.com/l/x",
  location: null,
  manageUrl: "https://crm.dmh.fr/rdv/gerer/tok",
  rebookUrl: "https://crm.dmh.fr/rdv/acme/decouverte",
  crmUrl: "https://crm.dmh.fr/forms-meetings",
  recapHtml: recapHtml([["Société", "ACME"]]),
};

describe("emails de RDV", () => {
  it("date en français, heure de Paris", () => {
    expect(formatMeetingDate(ctx.startIso, ctx.timezone)).toBe("lundi 12 octobre 2026 à 09:00");
  });

  it("confirmation : date, lien Teams, lien de gestion, récapitulatif, nom échappé", () => {
    const { subject, html } = guestConfirmedEmail(ctx);
    expect(subject).toBe("Rendez-vous confirmé — Découverte, lundi 12 octobre 2026 à 09:00");
    expect(html).toContain("lundi 12 octobre 2026 à 09:00");
    expect(html).toContain('href="https://teams.microsoft.com/l/x"');
    expect(html).toContain('href="https://crm.dmh.fr/rdv/gerer/tok"');
    expect(html).toContain("ACME");
    expect(html).toContain("Alice &lt;Martin&gt;");
    expect(html).not.toContain("<Martin>");
  });

  it("sans visio : lieu affiché ; sans lien de gestion : pas de bouton", () => {
    const { html } = guestConfirmedEmail({ ...ctx, videoUrl: null, location: "Bureaux DMH", manageUrl: null });
    expect(html).toContain("Lieu : Bureaux DMH");
    expect(html).not.toContain("Reprogrammer ou annuler");
  });

  it("refus / rappel / annulations", () => {
    expect(guestDeclinedEmail(ctx).html).toContain('href="https://crm.dmh.fr/rdv/acme/decouverte"');
    expect(guestReminderEmail(ctx).subject).toBe("Rappel : rendez-vous Découverte, lundi 12 octobre 2026 à 09:00");
    expect(guestCancelledEmail(ctx).subject).toBe("Rendez-vous annulé — Découverte");
    expect(hostCancelledEmail(ctx).subject).toBe("RDV annulé par Alice <Martin> — Découverte");
  });

  it("à l'hôte : nouvelle demande ou reprogrammation, avec lien vers le CRM", () => {
    expect(hostNewRequestEmail(ctx).subject).toBe("Nouvelle demande de RDV — Alice <Martin> (Découverte)");
    const r = hostNewRequestEmail(ctx, true);
    expect(r.subject).toBe("Reprogrammation à valider — Alice <Martin> (Découverte)");
    expect(r.html).toContain('href="https://crm.dmh.fr/forms-meetings"');
  });
});

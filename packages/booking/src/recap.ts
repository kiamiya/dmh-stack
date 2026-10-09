// S39 — récapitulatif d'une demande de RDV (coordonnées + réponses aux
// questions de préqualification), réutilisé dans le corps de l'événement
// provisoire de l'agenda de l'hôte et dans les e-mails (S39-7).
//
// Module autonome (import de types uniquement), importable par Deno.

import type { BookingQuestion } from "./config.ts";
import type { ValidBookingRequest } from "./request.ts";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Pure : lignes « libellé : valeur » de la demande, dans l'ordre d'affichage. */
export function recapLines(request: ValidBookingRequest, questions: BookingQuestion[]): Array<[string, string]> {
  const lines: Array<[string, string]> = [
    ["Nom", `${request.firstName} ${request.lastName}`],
    ["Société", request.company],
    ["E-mail", request.email],
  ];
  if (request.phone) lines.push(["Téléphone", request.phone]);
  for (const q of questions) {
    const answer = request.answers[q.id];
    if (answer === undefined || answer === "") continue;
    lines.push([q.label, typeof answer === "boolean" ? (answer ? "Oui" : "Non") : answer]);
  }
  if (request.notes) lines.push(["Message", request.notes]);
  return lines;
}

/** Pure : récapitulatif en HTML (valeurs échappées). */
export function recapHtml(lines: Array<[string, string]>): string {
  return `<table cellpadding="4" style="border-collapse:collapse">${lines
    .map(
      ([label, value]) =>
        `<tr><td style="color:#555;vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("")}</table>`;
}

/** Pure : récapitulatif en texte brut (agenda Google). */
export function recapText(lines: Array<[string, string]>): string {
  return lines.map(([label, value]) => `${label} : ${value}`).join("\n");
}

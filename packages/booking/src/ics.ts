// S39-7 — fichier .ics joint aux e-mails de RDV (CR du 09/10/2026 : « le
// fichier .ics doit s'intégrer au calendrier du prospect »). RFC 5545 :
// fins de ligne CRLF, texte échappé, lignes repliées à 75 octets. Un même
// RDV garde le même UID ; SEQUENCE augmente à chaque reprogrammation pour
// que le calendrier du prospect remplace l'événement au lieu d'en ajouter un.
//
// Module autonome, importable par Deno.

export interface IcsEvent {
  uid: string;
  sequence: number;
  /** "REQUEST" = invitation/mise à jour, "CANCEL" = annulation. */
  method: "REQUEST" | "CANCEL";
  startIso: string;
  endIso: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
  /** Horodatage de génération (DTSTAMP), injectable pour les tests. */
  now?: Date;
}

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function escapeParam(value: string): string {
  return `"${value.replace(/"/g, "'")}"`;
}

/** Replie une ligne à 75 octets UTF-8 (les suites commencent par une espace), sans couper un caractère. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Pure : contenu complet du fichier .ics. */
export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DMH Associes//CRM//FR",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence}`,
    `DTSTAMP:${icsDate((event.now ?? new Date()).toISOString())}`,
    `DTSTART:${icsDate(event.startIso)}`,
    `DTEND:${icsDate(event.endIso)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    `ORGANIZER;CN=${escapeParam(event.organizer.name)}:mailto:${event.organizer.email}`,
    `ATTENDEE;CN=${escapeParam(event.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${event.attendee.email}`,
    `STATUS:${event.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

/** Pure : encodage base64 d'un texte UTF-8 (pièce jointe d'e-mail), sans dépendance Node. */
export function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

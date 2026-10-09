import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcsText, foldIcsLine, toBase64Utf8 } from "./ics.js";

const base = {
  uid: "m1@dmh-crm",
  sequence: 0,
  method: "REQUEST" as const,
  startIso: "2026-10-12T07:00:00.000Z",
  endIso: "2026-10-12T07:30:00.000Z",
  summary: "Découverte, avec DMH; 30 min",
  description: "Ligne 1\nLigne 2",
  url: "https://teams.microsoft.com/l/x",
  organizer: { name: "Delphine \"DMH\"", email: "delphine@dmh.fr" },
  attendee: { name: "Alice Martin", email: "alice@acme.fr" },
  now: new Date("2026-10-09T12:00:00Z"),
};

describe("buildIcs", () => {
  it("événement complet, CRLF, dates UTC, texte échappé", () => {
    const ics = buildIcs(base);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.split("\r\n")).toEqual(
      expect.arrayContaining([
        "METHOD:REQUEST",
        "UID:m1@dmh-crm",
        "SEQUENCE:0",
        "DTSTAMP:20261009T120000Z",
        "DTSTART:20261012T070000Z",
        "DTEND:20261012T073000Z",
        "SUMMARY:Découverte\\, avec DMH\\; 30 min",
        "DESCRIPTION:Ligne 1\\nLigne 2",
        "URL:https://teams.microsoft.com/l/x",
        "ORGANIZER;CN=\"Delphine 'DMH'\":mailto:delphine@dmh.fr",
        "STATUS:CONFIRMED",
      ]),
    );
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("annulation", () => {
    const ics = buildIcs({ ...base, method: "CANCEL", sequence: 2 });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:2");
  });
});

describe("foldIcsLine", () => {
  it("replie à 75 octets sans couper un caractère multi-octets", () => {
    const line = "DESCRIPTION:" + "é".repeat(80);
    const folded = foldIcsLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });

  it("ligne courte inchangée", () => {
    expect(foldIcsLine("UID:x")).toBe("UID:x");
  });
});

describe("helpers", () => {
  it("escapeIcsText", () => {
    expect(escapeIcsText("a\\b;c,d\r\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("toBase64Utf8", () => {
    expect(toBase64Utf8("é")).toBe("w6k=");
  });
});

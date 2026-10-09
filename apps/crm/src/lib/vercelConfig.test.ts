import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * S39-13 — garde-fous de la configuration Vercel du CRM : toutes les routes
 * servent l'application (pages publiques /rdv, /f comprises), le CRM ne peut
 * pas être affiché dans un cadre (anti-clickjacking), sauf les formulaires
 * /f/* qui doivent rester intégrables sur les sites des clients.
 */
interface VercelConfig {
  rewrites: Array<{ source: string; destination: string }>;
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}

const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")) as VercelConfig;

/** Équivalent suffisant de path-to-regexp pour ces motifs (groupes regex bruts). */
function matches(source: string, path: string): boolean {
  return new RegExp(`^${source}$`).test(path);
}

function headersFor(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of config.headers) if (matches(rule.source, path)) for (const h of rule.headers) out[h.key] = h.value;
  return out;
}

describe("vercel.json (CRM)", () => {
  it("routes de l'application réécrites vers index.html, pas les fichiers construits", () => {
    const rewrite = config.rewrites[0];
    expect(rewrite.destination).toBe("/index.html");
    for (const path of ["/", "/forms-meetings", "/rdv/acme/demo", "/rdv/gerer/tok", "/f/contact"]) expect(matches(rewrite.source, path), path).toBe(true);
    expect(matches(rewrite.source, "/assets/index-abc.js")).toBe(false);
  });

  it("le CRM refuse d'être affiché dans un cadre", () => {
    expect(headersFor("/forms-meetings")).toMatchObject({ "X-Frame-Options": "DENY", "Content-Security-Policy": "frame-ancestors 'none'" });
    expect(headersFor("/rdv/acme")["X-Frame-Options"]).toBe("DENY");
  });

  it("les formulaires /f/* restent intégrables", () => {
    const h = headersFor("/f/contact");
    expect(h["X-Frame-Options"]).toBeUndefined();
    expect(h["Content-Security-Policy"]).toBe("frame-ancestors *");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
  });
});

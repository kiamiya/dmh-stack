/**
 * Vérification de la signature webhook Smartlead : header `X-Smartlead-Signature`
 * au format `"sha256=" + HMAC-SHA256(secret, corps_brut).hex()` (doc
 * api.smartlead.ai/guides/webhook-integration, pas dans le brief). Le corps
 * doit être le texte brut reçu, avant tout `JSON.parse` — sinon la signature
 * ne correspond plus (reformattage JSON).
 *
 * Implémenté avec Web Crypto (`crypto.subtle`), disponible nativement en Deno
 * (Edge Function) et en Node 18+ (tests vitest), sans dépendance externe.
 */

const SIGNATURE_PREFIX = "sha256=";

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compare deux chaînes de même longueur sans court-circuiter à la première
 * différence (limite l'exposition à une attaque par mesure de temps). Pas
 * une garantie aussi forte que `crypto.timingSafeEqual` (Node), mais
 * suffisante pour un système interne Phase 1 et disponible dans les deux
 * runtimes (Deno n'a pas d'équivalent natif exposé de la même façon).
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Vérifie qu'un header `X-Smartlead-Signature` correspond bien au corps brut
 * reçu, avec le secret configuré (`SMARTLEAD_WEBHOOK_SECRET`). Retourne
 * `false` (jamais d'exception) sur tout header absent/malformé.
 */
export async function verifySmartleadSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expectedHex = await hmacSha256Hex(secret, rawBody);
  return constantTimeEqual(providedHex, expectedHex);
}

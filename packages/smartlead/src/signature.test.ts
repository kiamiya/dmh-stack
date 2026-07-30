import { describe, expect, it } from "vitest";
import { verifySmartleadSignature } from "./signature.js";

const SECRET = "test-secret-12345";

async function sign(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

describe("verifySmartleadSignature", () => {
  it("accepts a correctly signed body", async () => {
    const body = '{"event_type":"EMAIL_SENT","to_email":"a@b.com"}';
    const signature = await sign(SECRET, body);
    expect(await verifySmartleadSignature(body, signature, SECRET)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const body = '{"event_type":"EMAIL_SENT","to_email":"a@b.com"}';
    const signature = await sign(SECRET, body);
    const tampered = body.replace("a@b.com", "attacker@evil.com");
    expect(await verifySmartleadSignature(tampered, signature, SECRET)).toBe(false);
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const body = '{"event_type":"EMAIL_SENT"}';
    const signature = await sign("wrong-secret", body);
    expect(await verifySmartleadSignature(body, signature, SECRET)).toBe(false);
  });

  it("rejects a missing header", async () => {
    expect(await verifySmartleadSignature("{}", null, SECRET)).toBe(false);
    expect(await verifySmartleadSignature("{}", undefined, SECRET)).toBe(false);
  });

  it("rejects a header without the sha256= prefix", async () => {
    const body = "{}";
    expect(await verifySmartleadSignature(body, "not-a-real-signature", SECRET)).toBe(false);
  });

  it("rejects a header with the right prefix but wrong digest", async () => {
    expect(await verifySmartleadSignature("{}", "sha256=deadbeef", SECRET)).toBe(false);
  });
});

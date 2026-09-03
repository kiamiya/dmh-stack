import { describe, expect, it, vi } from "vitest";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  mapGoogleEventsToBusyIntervals,
} from "./googleCalendar.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
}

describe("buildGoogleAuthorizationUrl", () => {
  it("construit une URL avec les bons paramètres, sans jamais inclure de secret", () => {
    const url = buildGoogleAuthorizationUrl({
      clientId: "client-123",
      redirectUri: "https://example.supabase.co/functions/v1/google-calendar-oauth-callback",
      state: "staff-abc",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("state")).toBe("staff-abc");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(url).not.toContain("secret");
  });
});

describe("mapGoogleEventsToBusyIntervals", () => {
  it("ne garde que les événements avec un dateTime précis", () => {
    const events = [
      { start: { dateTime: "2026-09-07T10:00:00Z" }, end: { dateTime: "2026-09-07T11:00:00Z" } },
      { start: { date: "2026-09-08" }, end: { date: "2026-09-09" } }, // événement "journée entière", ignoré
    ];
    expect(mapGoogleEventsToBusyIntervals(events)).toEqual([
      { start: "2026-09-07T10:00:00Z", end: "2026-09-07T11:00:00Z" },
    ]);
  });

  it("retourne un tableau vide sans événement", () => {
    expect(mapGoogleEventsToBusyIntervals([])).toEqual([]);
  });
});

describe("exchangeGoogleCode", () => {
  it("envoie les bons paramètres au endpoint de token", async () => {
    const fetchImpl = mockFetch(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 });
    const result = await exchangeGoogleCode(
      { code: "auth-code", clientId: "client-1", clientSecret: "secret-1", redirectUri: "https://x/cb" },
      { fetchImpl },
    );
    expect(result.access_token).toBe("at");
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
  });

  it("lève une erreur explicite si Google renvoie un échec", async () => {
    const fetchImpl = mockFetch(400, { error: "invalid_grant" });
    await expect(
      exchangeGoogleCode(
        { code: "bad", clientId: "c", clientSecret: "s", redirectUri: "https://x/cb" },
        { fetchImpl },
      ),
    ).rejects.toThrow(/Google token exchange failed/);
  });
});

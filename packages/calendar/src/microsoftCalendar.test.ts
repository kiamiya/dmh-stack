import { describe, expect, it, vi } from "vitest";
import {
  buildMicrosoftAuthorizationUrl,
  exchangeMicrosoftCode,
  mapMicrosoftEventsToBusyIntervals,
  mapMicrosoftEventsToSummaries,
  updateMicrosoftEvent,
} from "./microsoftCalendar.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
}

describe("buildMicrosoftAuthorizationUrl", () => {
  it("construit une URL avec le bon tenant et les bons paramètres", () => {
    const url = buildMicrosoftAuthorizationUrl({
      clientId: "client-123",
      tenantId: "tenant-abc",
      redirectUri: "https://example.supabase.co/functions/v1/microsoft-calendar-oauth-callback",
      state: "staff-abc",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://login.microsoftonline.com/tenant-abc/oauth2/v2.0/authorize",
    );
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("scope")).toContain("Calendars.ReadWrite");
    expect(url).not.toContain("secret");
  });
});

describe("mapMicrosoftEventsToBusyIntervals", () => {
  it("ajoute le suffixe Z si absent (Graph renvoie des dateTime sans fuseau)", () => {
    const events = [{ start: { dateTime: "2026-09-07T10:00:00.0000000" }, end: { dateTime: "2026-09-07T11:00:00.0000000" } }];
    expect(mapMicrosoftEventsToBusyIntervals(events)).toEqual([
      { start: "2026-09-07T10:00:00.0000000Z", end: "2026-09-07T11:00:00.0000000Z" },
    ]);
  });

  it("ne double pas le suffixe Z s'il est déjà présent", () => {
    const events = [{ start: { dateTime: "2026-09-07T10:00:00Z" }, end: { dateTime: "2026-09-07T11:00:00Z" } }];
    expect(mapMicrosoftEventsToBusyIntervals(events)).toEqual([
      { start: "2026-09-07T10:00:00Z", end: "2026-09-07T11:00:00Z" },
    ]);
  });

  it("ignore les événements sans dateTime", () => {
    expect(mapMicrosoftEventsToBusyIntervals([{}])).toEqual([]);
  });
});

describe("mapMicrosoftEventsToSummaries", () => {
  it("garde l'id et le titre de l'événement (subject) et normalise le fuseau", () => {
    const events = [{ id: "evt-1", subject: "Point client", start: { dateTime: "2026-09-07T10:00:00.0000000" }, end: { dateTime: "2026-09-07T11:00:00.0000000" } }];
    expect(mapMicrosoftEventsToSummaries(events)).toEqual([
      { id: "evt-1", title: "Point client", start: "2026-09-07T10:00:00.0000000Z", end: "2026-09-07T11:00:00.0000000Z" },
    ]);
  });

  it("utilise 'Sans titre' si l'événement n'a pas de subject", () => {
    const events = [{ id: "evt-1", start: { dateTime: "2026-09-07T10:00:00Z" }, end: { dateTime: "2026-09-07T11:00:00Z" } }];
    expect(mapMicrosoftEventsToSummaries(events)[0].title).toBe("Sans titre");
  });

  it("ignore les événements sans id (non modifiables)", () => {
    const events = [{ subject: "x", start: { dateTime: "2026-09-07T10:00:00Z" }, end: { dateTime: "2026-09-07T11:00:00Z" } }];
    expect(mapMicrosoftEventsToSummaries(events)).toEqual([]);
  });
});

describe("updateMicrosoftEvent", () => {
  it("envoie une requête PATCH avec uniquement les champs fournis", async () => {
    const fetchImpl = mockFetch(200, { id: "evt-1" });
    await updateMicrosoftEvent({ accessToken: "at", eventId: "evt-1", subject: "Nouveau titre" }, { fetchImpl });
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://graph.microsoft.com/v1.0/me/events/evt-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ subject: "Nouveau titre" });
  });

  it("lève une erreur explicite si Microsoft renvoie un échec", async () => {
    const fetchImpl = mockFetch(404, { error: "not found" });
    await expect(
      updateMicrosoftEvent({ accessToken: "at", eventId: "evt-1", subject: "x" }, { fetchImpl }),
    ).rejects.toThrow(/Microsoft event update failed/);
  });
});

describe("exchangeMicrosoftCode", () => {
  it("envoie les bons paramètres au endpoint de token du bon tenant", async () => {
    const fetchImpl = mockFetch(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 });
    const result = await exchangeMicrosoftCode(
      { code: "auth-code", clientId: "c1", clientSecret: "s1", redirectUri: "https://x/cb", tenantId: "t1" },
      { fetchImpl },
    );
    expect(result.access_token).toBe("at");
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://login.microsoftonline.com/t1/oauth2/v2.0/token");
    const body = init.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
  });

  it("lève une erreur explicite si Microsoft renvoie un échec", async () => {
    const fetchImpl = mockFetch(400, { error: "invalid_grant" });
    await expect(
      exchangeMicrosoftCode(
        { code: "bad", clientId: "c", clientSecret: "s", redirectUri: "https://x/cb", tenantId: "t" },
        { fetchImpl },
      ),
    ).rejects.toThrow(/Microsoft token exchange failed/);
  });
});

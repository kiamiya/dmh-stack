import { describe, expect, it, vi } from "vitest";
import { fetchMyUpcomingEvents, updateCalendarEvent } from "./calendarEvents";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("fetchMyUpcomingEvents", () => {
  const baseUrl = "https://example.supabase.co/functions/v1";

  it("retourne les événements et passe le token en Authorization", async () => {
    const events = [{ id: "evt-1", title: "Point client", start: "2026-09-07T10:00:00Z", end: "2026-09-07T11:00:00Z", provider: "google" }];
    const fetchImpl = mockFetch(200, { events });
    const result = await fetchMyUpcomingEvents("access-token-123", baseUrl, fetchImpl);
    expect(result).toEqual(events);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${baseUrl}/calendar-my-events`);
    expect(init.headers.Authorization).toBe("Bearer access-token-123");
  });

  it("lève une erreur avec le message renvoyé par la fonction en cas d'échec", async () => {
    const fetchImpl = mockFetch(401, { error: "Session invalide" });
    await expect(fetchMyUpcomingEvents("bad-token", baseUrl, fetchImpl)).rejects.toThrow("Session invalide");
  });
});

describe("updateCalendarEvent", () => {
  const baseUrl = "https://example.supabase.co/functions/v1";

  it("envoie le provider/eventId/patch et passe le token en Authorization", async () => {
    const fetchImpl = mockFetch(200, { id: "evt-1" });
    await updateCalendarEvent("access-token-123", baseUrl, "google", "evt-1", { title: "Nouveau titre" }, fetchImpl);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${baseUrl}/calendar-update-event`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer access-token-123");
    expect(JSON.parse(init.body as string)).toEqual({
      provider: "google",
      eventId: "evt-1",
      title: "Nouveau titre",
      startIso: undefined,
      endIso: undefined,
    });
  });

  it("lève une erreur avec le message renvoyé par la fonction en cas d'échec", async () => {
    const fetchImpl = mockFetch(404, { error: "Calendrier non connecté" });
    await expect(
      updateCalendarEvent("token", baseUrl, "microsoft", "evt-1", { title: "x" }, fetchImpl),
    ).rejects.toThrow("Calendrier non connecté");
  });
});

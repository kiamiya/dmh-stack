import { describe, expect, it } from "vitest";
import { createMicrosoftEvent, deleteMicrosoftEvent, updateMicrosoftEvent } from "./microsoftCalendar.js";
import { deleteGoogleEvent } from "./googleCalendar.js";

describe("créneau provisoire / Teams / suppression (S39-6)", () => {
  it("createMicrosoftEvent transmet showAs, corps HTML et réunion Teams", async () => {
    let sent: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ id: "e1" }), { status: 201 });
    }) as unknown as typeof fetch;
    await createMicrosoftEvent(
      { accessToken: "t", subject: "S", startIso: "a", endIso: "b", showAs: "tentative", bodyHtml: "<p>x</p>", isOnlineMeeting: true },
      { fetchImpl },
    );
    expect(sent).toMatchObject({
      showAs: "tentative",
      body: { contentType: "HTML", content: "<p>x</p>" },
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      attendees: [],
    });
  });

  it("updateMicrosoftEvent sans options : corps inchangé par rapport à avant", async () => {
    let sent: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ id: "e1" }), { status: 200 });
    }) as unknown as typeof fetch;
    await updateMicrosoftEvent({ accessToken: "t", eventId: "e1", subject: "S" }, { fetchImpl });
    expect(sent).toEqual({ subject: "S" });
  });

  it("deleteMicrosoftEvent : 404 toléré", async () => {
    const fetchImpl = (async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    await expect(deleteMicrosoftEvent({ accessToken: "t", eventId: "e1" }, { fetchImpl })).resolves.toBeUndefined();
  });

  it("deleteGoogleEvent : 410 toléré, 500 = erreur", async () => {
    const gone = (async () => new Response(null, { status: 410 })) as unknown as typeof fetch;
    await expect(deleteGoogleEvent({ accessToken: "t", eventId: "e" }, { fetchImpl: gone })).resolves.toBeUndefined();
    const ko = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    await expect(deleteGoogleEvent({ accessToken: "t", eventId: "e" }, { fetchImpl: ko })).rejects.toThrow();
  });
});

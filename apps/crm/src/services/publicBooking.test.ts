import { describe, expect, it } from "vitest";
import { PublicBookingError, cancelManagedMeeting, fetchPublicSlots, rescheduleManagedMeeting, submitPublicBooking } from "./publicBooking";

function fakeFetch(status: number, body: unknown, sent: Array<{ url: string; body: unknown }>) {
  return (async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}

describe("services/publicBooking", () => {
  it("appelle booking-public avec l'action demandée", async () => {
    const sent: Array<{ url: string; body: unknown }> = [];
    await fetchPublicSlots("https://x.supabase.co/functions/v1", "acme", "demo", fakeFetch(200, { slots: [] }, sent));
    expect(sent[0]).toEqual({ url: "https://x.supabase.co/functions/v1/booking-public", body: { action: "slots", page: "acme", type: "demo" } });
  });

  it("erreur : message, statut et erreurs par champ remontés", async () => {
    const sent: Array<{ url: string; body: unknown }> = [];
    const err = await submitPublicBooking(
      "https://x",
      "acme",
      "demo",
      { slotStart: "s", firstName: "", lastName: "", email: "", phone: "", company: "", notes: "", answers: {}, website: "" },
      fakeFetch(400, { error: "Formulaire incomplet", fields: { email: "E-mail obligatoire." } }, sent),
    ).catch((e) => e);
    expect(err).toBeInstanceOf(PublicBookingError);
    expect(err).toMatchObject({ message: "Formulaire incomplet", status: 400, fields: { email: "E-mail obligatoire." } });
    expect(sent[0].body).toMatchObject({ action: "request", page: "acme", type: "demo", website: "" });
  });

  it("actions de gestion : jeton (et créneau) transmis", async () => {
    const sent: Array<{ url: string; body: unknown }> = [];
    await cancelManagedMeeting("https://x", "tok", fakeFetch(200, { ok: true }, sent));
    await rescheduleManagedMeeting("https://x", "tok", "2026-10-12T07:00:00.000Z", fakeFetch(200, { ok: true }, sent));
    expect(sent.map((c) => c.body)).toEqual([
      { action: "manage-cancel", token: "tok" },
      { action: "manage-reschedule", token: "tok", slotStart: "2026-10-12T07:00:00.000Z" },
    ]);
  });
});

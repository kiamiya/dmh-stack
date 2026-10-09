import { describe, expect, it } from "vitest";
import { PublicBookingError, fetchPublicSlots, submitPublicBooking } from "./publicBooking";

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
});

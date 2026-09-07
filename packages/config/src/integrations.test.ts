import { describe, expect, it } from "vitest";
import { computeIntegrationStatuses } from "./integrations.js";

describe("computeIntegrationStatuses", () => {
  it("marque configuré un fournisseur dont la clé est présente", () => {
    const statuses = computeIntegrationStatuses({ PAPPERS_API_KEY: "fake-key" });
    expect(statuses.find((s) => s.key === "pappers")).toMatchObject({ label: "Pappers", configured: true });
  });

  it("marque non configuré un fournisseur dont la clé est absente", () => {
    const statuses = computeIntegrationStatuses({});
    expect(statuses.every((s) => s.configured === false)).toBe(true);
  });

  it("ignore une clé vide ou uniquement des espaces", () => {
    const statuses = computeIntegrationStatuses({ LEMLIST_API_KEY: "   " });
    expect(statuses.find((s) => s.key === "lemlist")).toMatchObject({ configured: false });
  });

  it("retourne les 4 fournisseurs réels (pas Kaspr/Hunter/Brevo du mockup)", () => {
    const statuses = computeIntegrationStatuses({});
    expect(statuses.map((s) => s.key).sort()).toEqual(["dropcontact", "lemlist", "pappers", "smartlead"]);
  });
});

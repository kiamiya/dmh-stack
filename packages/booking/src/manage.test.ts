import { describe, expect, it } from "vitest";
import { manageRights } from "./manage.js";

const NOW = new Date("2026-10-10T10:00:00Z");
const FUTURE = "2026-10-12T07:00:00Z";

describe("manageRights", () => {
  it("en attente ou confirmé, à venir : annuler et reprogrammer", () => {
    expect(manageRights("pending", FUTURE, true, NOW)).toEqual({ canCancel: true, canReschedule: true, reason: null });
    expect(manageRights("confirmed", FUTURE, true, NOW)).toEqual({ canCancel: true, canReschedule: true, reason: null });
  });

  it("type supprimé ou masqué : annulation seulement", () => {
    expect(manageRights("confirmed", FUTURE, false, NOW)).toEqual({ canCancel: true, canReschedule: false, reason: null });
  });

  it("annulé, refusé, passé : plus rien", () => {
    expect(manageRights("cancelled", FUTURE, true, NOW).reason).toBe("Ce rendez-vous a été annulé.");
    expect(manageRights("declined", FUTURE, true, NOW).reason).toBe("Cette demande n'a pas pu être acceptée.");
    expect(manageRights("confirmed", "2026-10-10T09:00:00Z", true, NOW)).toEqual({
      canCancel: false,
      canReschedule: false,
      reason: "Ce rendez-vous est passé.",
    });
  });
});

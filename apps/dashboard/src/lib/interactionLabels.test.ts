import { describe, expect, it } from "vitest";
import { getInteractionTypeColor, getInteractionTypeLabel } from "./interactionLabels.js";
import type { InteractionType } from "@dmh/types";

const ALL_TYPES: InteractionType[] = [
  "email_sent",
  "email_opened",
  "email_clicked",
  "email_replied",
  "email_unsubscribed",
  "email_bounced",
  "linkedin_request_sent",
  "linkedin_connected",
  "linkedin_message_sent",
  "linkedin_replied",
  "call",
  "meeting",
  "note",
];

describe("getInteractionTypeLabel / getInteractionTypeColor", () => {
  it("couvre les 13 types d'interaction sans exception", () => {
    for (const type of ALL_TYPES) {
      expect(() => getInteractionTypeLabel(type)).not.toThrow();
      expect(() => getInteractionTypeColor(type)).not.toThrow();
      expect(getInteractionTypeLabel(type)).toBeTruthy();
      expect(getInteractionTypeColor(type)).toBeTruthy();
    }
  });

  it("retourne des libellés FR distincts pour chaque type", () => {
    const labels = new Set(ALL_TYPES.map((t) => getInteractionTypeLabel(t)));
    expect(labels.size).toBe(ALL_TYPES.length);
  });

  it("mappe les signaux négatifs (bounce/unsubscribe) sur rouge", () => {
    expect(getInteractionTypeColor("email_bounced")).toBe("red");
    expect(getInteractionTypeColor("email_unsubscribed")).toBe("red");
  });

  it("mappe les réponses reçues sur vert", () => {
    expect(getInteractionTypeColor("email_replied")).toBe("green");
    expect(getInteractionTypeColor("linkedin_replied")).toBe("green");
  });
});

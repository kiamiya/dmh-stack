import { describe, expect, it } from "vitest";
import {
  mapLeadCategoryToProspectStatus,
  mapSmartleadEventToInteraction,
  shouldAdvanceStatus,
  type SmartleadWebhookPayload,
} from "./mapper.js";

function payload(overrides: Partial<SmartleadWebhookPayload>): SmartleadWebhookPayload {
  return { event_type: "EMAIL_SENT", to_email: "prospect@example.com", ...overrides };
}

describe("mapSmartleadEventToInteraction", () => {
  it("maps EMAIL_SENT", () => {
    const result = mapSmartleadEventToInteraction(
      payload({
        event_type: "EMAIL_SENT",
        custom_subject: "Objet",
        custom_email_message: "Corps",
        time_sent: "2026-07-30T10:00:00Z",
      }),
    );
    expect(result).toEqual({
      type: "email_sent",
      channel: "email",
      subject: "Objet",
      content: "Corps",
      occurredAt: "2026-07-30T10:00:00.000Z",
      leadEmail: "prospect@example.com",
    });
  });

  it("maps FIRST_EMAIL_SENT the same way as EMAIL_SENT", () => {
    const result = mapSmartleadEventToInteraction(payload({ event_type: "FIRST_EMAIL_SENT" }));
    expect(result?.type).toBe("email_sent");
  });

  it("maps EMAIL_OPEN", () => {
    const result = mapSmartleadEventToInteraction(
      payload({ event_type: "EMAIL_OPEN", time_opened: "2026-07-30T11:00:00Z" }),
    );
    expect(result?.type).toBe("email_opened");
    expect(result?.occurredAt).toBe("2026-07-30T11:00:00.000Z");
  });

  it("maps EMAIL_LINK_CLICK with joined links", () => {
    const result = mapSmartleadEventToInteraction(
      payload({ event_type: "EMAIL_LINK_CLICK", link_clicked: ["https://a.com", "https://b.com"] }),
    );
    expect(result?.type).toBe("email_clicked");
    expect(result?.content).toBe("https://a.com, https://b.com");
  });

  it("maps EMAIL_REPLY with reply_body", () => {
    const result = mapSmartleadEventToInteraction(
      payload({ event_type: "EMAIL_REPLY", subject: "Re: Objet", reply_body: "Merci pour votre message" }),
    );
    expect(result?.type).toBe("email_replied");
    expect(result?.subject).toBe("Re: Objet");
    expect(result?.content).toBe("Merci pour votre message");
  });

  it("maps EMAIL_REPLY falling back to preview_text when reply_body is absent", () => {
    const result = mapSmartleadEventToInteraction(
      payload({ event_type: "EMAIL_REPLY", preview_text: "Aperçu" }),
    );
    expect(result?.content).toBe("Aperçu");
  });

  it("maps EMAIL_BOUNCE", () => {
    const result = mapSmartleadEventToInteraction(payload({ event_type: "EMAIL_BOUNCE" }));
    expect(result?.type).toBe("email_bounced");
  });

  it("maps LEAD_UNSUBSCRIBED using lead_email", () => {
    const result = mapSmartleadEventToInteraction({
      event_type: "LEAD_UNSUBSCRIBED",
      lead_email: "lead@example.com",
    });
    expect(result?.type).toBe("email_unsubscribed");
    expect(result?.leadEmail).toBe("lead@example.com");
  });

  it("maps LEAD_CATEGORY_UPDATED to a note interaction", () => {
    const result = mapSmartleadEventToInteraction(
      payload({ event_type: "LEAD_CATEGORY_UPDATED", from: "Uncategorized", to: "Interested" }),
    );
    expect(result?.type).toBe("note");
    expect(result?.content).toContain("Uncategorized");
    expect(result?.content).toContain("Interested");
  });

  it("returns null for an unrecognized event_type", () => {
    expect(mapSmartleadEventToInteraction(payload({ event_type: "SOMETHING_NEW" }))).toBeNull();
  });

  it("returns null when no lead email is present at all", () => {
    expect(
      mapSmartleadEventToInteraction({ event_type: "EMAIL_SENT" } as SmartleadWebhookPayload),
    ).toBeNull();
  });
});

describe("mapLeadCategoryToProspectStatus", () => {
  it.each([
    ["Interested", "qualified"],
    ["Meeting Booked", "meeting_booked"],
    ["Meeting Request", "meeting_booked"],
    ["Not Interested", "not_interested"],
    ["Wrong Person", "not_interested"],
    ["Do Not Contact", "not_interested"],
    ["Closed", "won"],
  ])("maps %s to %s", (category, expected) => {
    expect(mapLeadCategoryToProspectStatus(category)).toBe(expected);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(mapLeadCategoryToProspectStatus("  interested  ")).toBe("qualified");
  });

  it("returns null for an unrecognized category", () => {
    expect(mapLeadCategoryToProspectStatus("Out Of Office")).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(mapLeadCategoryToProspectStatus(null)).toBeNull();
    expect(mapLeadCategoryToProspectStatus(undefined)).toBeNull();
  });
});

describe("shouldAdvanceStatus", () => {
  it("allows a forward transition", () => {
    expect(shouldAdvanceStatus("ready", "in_sequence")).toBe(true);
    expect(shouldAdvanceStatus("ready", "replied")).toBe(true);
  });

  it("rejects a backward transition", () => {
    expect(shouldAdvanceStatus("qualified", "ready")).toBe(false);
    expect(shouldAdvanceStatus("proposal_sent", "in_sequence")).toBe(false);
  });

  it("rejects staying on the same status", () => {
    expect(shouldAdvanceStatus("replied", "replied")).toBe(false);
  });

  it("treats won/lost/not_interested as the same terminal rank (no cross-transition)", () => {
    expect(shouldAdvanceStatus("won", "not_interested")).toBe(false);
    expect(shouldAdvanceStatus("not_interested", "won")).toBe(false);
    expect(shouldAdvanceStatus("lost", "won")).toBe(false);
  });

  it("allows reaching a terminal status from earlier in the funnel", () => {
    expect(shouldAdvanceStatus("qualified", "won")).toBe(true);
    expect(shouldAdvanceStatus("in_sequence", "not_interested")).toBe(true);
  });
});

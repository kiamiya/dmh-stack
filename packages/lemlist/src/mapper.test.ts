import { describe, expect, it } from "vitest";
import { mapLemlistActivityToInteraction, mapLemlistActivityToProspectStatus } from "./mapper.js";
import type { LemlistActivity } from "./client.js";

function activity(overrides: Partial<LemlistActivity> = {}): LemlistActivity {
  return {
    _id: "act_1",
    type: "linkedinInviteDone",
    createdAt: "2026-07-31T10:00:00Z",
    leadEmail: "prospect@example.com",
    leadId: "lea_123",
    ...overrides,
  };
}

describe("mapLemlistActivityToInteraction", () => {
  it("maps linkedinInviteDone to linkedin_request_sent", () => {
    const result = mapLemlistActivityToInteraction(activity({ type: "linkedinInviteDone" }));
    expect(result).toEqual({
      type: "linkedin_request_sent",
      channel: "linkedin",
      occurredAt: "2026-07-31T10:00:00.000Z",
      leadEmail: "prospect@example.com",
      leadId: "lea_123",
    });
  });

  it("maps linkedinInviteAccepted to linkedin_connected", () => {
    const result = mapLemlistActivityToInteraction(activity({ type: "linkedinInviteAccepted" }));
    expect(result?.type).toBe("linkedin_connected");
  });

  it("maps linkedinSent to linkedin_message_sent", () => {
    const result = mapLemlistActivityToInteraction(activity({ type: "linkedinSent" }));
    expect(result?.type).toBe("linkedin_message_sent");
  });

  it("maps linkedinReplied to linkedin_replied", () => {
    const result = mapLemlistActivityToInteraction(activity({ type: "linkedinReplied" }));
    expect(result?.type).toBe("linkedin_replied");
  });

  it("returns null for an unmapped activity type (e.g. email, handled by Smartlead)", () => {
    expect(mapLemlistActivityToInteraction(activity({ type: "emailsSent" }))).toBeNull();
  });

  it("maps linkedinInterested to a note interaction (so the status check downstream still runs)", () => {
    const result = mapLemlistActivityToInteraction(activity({ type: "linkedinInterested" }));
    expect(result?.type).toBe("note");
    expect(result?.content).toMatch(/intéressé/);
  });

  it("maps linkedinNotInterested to a note interaction", () => {
    const result = mapLemlistActivityToInteraction(activity({ type: "linkedinNotInterested" }));
    expect(result?.type).toBe("note");
    expect(result?.content).toMatch(/non intéressé/);
  });

  it("returns null when leadEmail is absent", () => {
    expect(mapLemlistActivityToInteraction(activity({ leadEmail: undefined }))).toBeNull();
  });

  it("defaults leadId to null when absent", () => {
    const result = mapLemlistActivityToInteraction(activity({ leadId: undefined }));
    expect(result?.leadId).toBeNull();
  });

  it("falls back to now() for an invalid createdAt", () => {
    const result = mapLemlistActivityToInteraction(activity({ createdAt: "not-a-date" }));
    expect(result?.occurredAt).toBeTruthy();
    expect(Number.isNaN(new Date(result!.occurredAt).getTime())).toBe(false);
  });
});

describe("mapLemlistActivityToProspectStatus", () => {
  it("maps linkedinInterested to qualified", () => {
    expect(mapLemlistActivityToProspectStatus("linkedinInterested")).toBe("qualified");
  });

  it("maps linkedinNotInterested to not_interested", () => {
    expect(mapLemlistActivityToProspectStatus("linkedinNotInterested")).toBe("not_interested");
  });

  it("returns null for any other activity type", () => {
    expect(mapLemlistActivityToProspectStatus("linkedinInviteDone")).toBeNull();
    expect(mapLemlistActivityToProspectStatus("linkedinReplied")).toBeNull();
  });
});

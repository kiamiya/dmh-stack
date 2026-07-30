import { describe, expect, it } from "vitest";
import { computeOverviewStats, groupProspectsByColumn, PIPELINE_COLUMNS } from "./pipeline.js";
import type { ProspectStatus } from "@dmh/types";

function prospect(status: ProspectStatus) {
  return { status };
}

describe("groupProspectsByColumn", () => {
  it("merges the 3 enrichment statuses into 'preparing'", () => {
    const prospects = [prospect("to_enrich"), prospect("enriched_pappers"), prospect("enriched_contact")];
    const groups = groupProspectsByColumn(prospects);
    const preparing = groups.find((g) => g.column.key === "preparing");
    expect(preparing?.prospects).toHaveLength(3);
  });

  it("merges lost and not_interested into 'lost'", () => {
    const prospects = [prospect("lost"), prospect("not_interested")];
    const groups = groupProspectsByColumn(prospects);
    const lost = groups.find((g) => g.column.key === "lost");
    expect(lost?.prospects).toHaveLength(2);
  });

  it("puts each remaining status in its own column", () => {
    const prospects = [prospect("ready"), prospect("qualified"), prospect("won")];
    const groups = groupProspectsByColumn(prospects);
    expect(groups.find((g) => g.column.key === "ready")?.prospects).toHaveLength(1);
    expect(groups.find((g) => g.column.key === "qualified")?.prospects).toHaveLength(1);
    expect(groups.find((g) => g.column.key === "won")?.prospects).toHaveLength(1);
  });

  it("returns all 9 columns even when empty", () => {
    const groups = groupProspectsByColumn([]);
    expect(groups).toHaveLength(PIPELINE_COLUMNS.length);
    expect(groups.every((g) => g.prospects.length === 0)).toBe(true);
  });

  it("preserves extra fields on the prospect objects", () => {
    const prospects = [{ status: "ready" as ProspectStatus, id: "abc", companyName: "ACME" }];
    const groups = groupProspectsByColumn(prospects);
    const ready = groups.find((g) => g.column.key === "ready");
    expect(ready?.prospects[0]).toEqual({ status: "ready", id: "abc", companyName: "ACME" });
  });
});

describe("computeOverviewStats", () => {
  it("counts totals and statuses correctly", () => {
    const prospects = [
      prospect("in_sequence"),
      prospect("in_sequence"),
      prospect("meeting_booked"),
      prospect("won"),
      prospect("ready"),
    ];
    const stats = computeOverviewStats(prospects, []);
    expect(stats.totalProspects).toBe(5);
    expect(stats.inActiveSequence).toBe(2);
    expect(stats.meetingsBooked).toBe(1);
    expect(stats.won).toBe(1);
  });

  it("computes reply rate from email_sent / email_replied interactions", () => {
    const interactions = [
      { type: "email_sent" as const },
      { type: "email_sent" as const },
      { type: "email_sent" as const },
      { type: "email_sent" as const },
      { type: "email_replied" as const },
    ];
    const stats = computeOverviewStats([], interactions);
    expect(stats.replyRate).toBe(25);
  });

  it("returns null reply rate when no emails were sent (avoids division by zero)", () => {
    const stats = computeOverviewStats([], []);
    expect(stats.replyRate).toBeNull();
  });

  it("ignores interaction types other than email_sent/email_replied", () => {
    const interactions = [
      { type: "email_sent" as const },
      { type: "email_opened" as const },
      { type: "email_clicked" as const },
      { type: "email_replied" as const },
    ];
    const stats = computeOverviewStats([], interactions);
    expect(stats.replyRate).toBe(100);
  });

  it("returns zeroes for an empty prospect list", () => {
    const stats = computeOverviewStats([], []);
    expect(stats.totalProspects).toBe(0);
    expect(stats.inActiveSequence).toBe(0);
    expect(stats.meetingsBooked).toBe(0);
    expect(stats.won).toBe(0);
  });
});

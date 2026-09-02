import { describe, expect, it } from "vitest";
import { ALL_DEAL_STATUSES, getDealStatusColor, getDealStatusLabel } from "./dealStatus";

describe("getDealStatusLabel / getDealStatusColor", () => {
  it("couvre les 3 statuts sans exception", () => {
    for (const status of ALL_DEAL_STATUSES) {
      expect(getDealStatusLabel(status)).toBeTruthy();
      expect(getDealStatusColor(status)).toBeTruthy();
    }
  });

  it("mappe won/lost sur des couleurs cohérentes", () => {
    expect(getDealStatusColor("won")).toBe("green");
    expect(getDealStatusColor("lost")).toBe("red");
  });

  it("ALL_DEAL_STATUSES contient exactement les 3 statuts, sans doublon", () => {
    expect(new Set(ALL_DEAL_STATUSES).size).toBe(3);
  });
});

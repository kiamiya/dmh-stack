import { describe, expect, it } from "vitest";
import { ALL_TASK_STATUSES, getTaskStatusColor, getTaskStatusLabel } from "./taskStatus";

describe("getTaskStatusLabel / getTaskStatusColor", () => {
  it("couvre les 3 statuts sans exception", () => {
    for (const status of ALL_TASK_STATUSES) {
      expect(getTaskStatusLabel(status)).toBeTruthy();
      expect(getTaskStatusColor(status)).toBeTruthy();
    }
  });

  it("mappe done sur vert", () => {
    expect(getTaskStatusColor("done")).toBe("green");
  });

  it("ALL_TASK_STATUSES contient exactement les 3 statuts, sans doublon", () => {
    expect(new Set(ALL_TASK_STATUSES).size).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import { formatScore, getScoreColor } from "./score.js";

describe("getScoreColor", () => {
  it("returns red for scores below 4", () => {
    expect(getScoreColor(1)).toBe("red");
    expect(getScoreColor(3)).toBe("red");
  });

  it("returns yellow for scores between 4 and 6 inclusive", () => {
    expect(getScoreColor(4)).toBe("yellow");
    expect(getScoreColor(6)).toBe("yellow");
  });

  it("returns green for scores above 6", () => {
    expect(getScoreColor(7)).toBe("green");
    expect(getScoreColor(10)).toBe("green");
  });

  it("returns default for null (not yet scored)", () => {
    expect(getScoreColor(null)).toBe("default");
  });
});

describe("formatScore", () => {
  it("formats a score as x/10", () => {
    expect(formatScore(8)).toBe("8/10");
  });

  it("returns a placeholder for null", () => {
    expect(formatScore(null)).toBe("—");
  });
});

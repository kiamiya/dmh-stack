import { describe, expect, it } from "vitest";
import { parseFormsMeetingsTab } from "./formsMeetingsTab";

describe("parseFormsMeetingsTab", () => {
  it("Rendez-vous par défaut, Formulaires sur ?tab=forms", () => {
    expect(parseFormsMeetingsTab(null)).toBe("meetings");
    expect(parseFormsMeetingsTab("autre")).toBe("meetings");
    expect(parseFormsMeetingsTab("forms")).toBe("forms");
  });
});

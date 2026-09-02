import { describe, expect, it } from "vitest";
import { validateTaskForm } from "./taskForm";

describe("validateTaskForm", () => {
  it("accepte un titre non vide", () => {
    expect(validateTaskForm({ title: "Relancer le contact" })).toBeNull();
  });

  it("refuse un titre vide ou blanc", () => {
    expect(validateTaskForm({ title: "" })).toMatch(/titre/i);
    expect(validateTaskForm({ title: "   " })).toMatch(/titre/i);
  });
});

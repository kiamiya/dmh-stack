import { describe, expect, it } from "vitest";
import { validateAutomationRuleForm } from "./automationForm";

describe("validateAutomationRuleForm", () => {
  it("accepte une règle valide (stage_changed sur une opportunité)", () => {
    expect(
      validateAutomationRuleForm({ name: "Relance auto", entityType: "opportunity", triggerType: "stage_changed" }),
    ).toBeNull();
  });

  it("accepte record_created sur n'importe quel type d'objet", () => {
    expect(
      validateAutomationRuleForm({ name: "Bienvenue", entityType: "contact", triggerType: "record_created" }),
    ).toBeNull();
  });

  it("refuse un nom vide", () => {
    expect(
      validateAutomationRuleForm({ name: "  ", entityType: "contact", triggerType: "record_created" }),
    ).toMatch(/nom/i);
  });

  it("refuse stage_changed sur un objet autre qu'opportunité", () => {
    expect(
      validateAutomationRuleForm({ name: "Test", entityType: "contact", triggerType: "stage_changed" }),
    ).toMatch(/opportunités/);
  });
});

import { describe, expect, it } from "vitest";
import { validateStageForm } from "./pipelineForm";

describe("validateStageForm", () => {
  it("accepte un nom valide et unique", () => {
    expect(validateStageForm({ name: "Qualification", existingNames: ["Négociation"] })).toBeNull();
  });

  it("refuse un nom vide", () => {
    expect(validateStageForm({ name: "  ", existingNames: [] })).toMatch(/nom/i);
  });

  it("refuse un nom déjà utilisé (insensible à la casse)", () => {
    expect(validateStageForm({ name: "négociation", existingNames: ["Négociation"] })).toMatch(/existe déjà/);
  });
});

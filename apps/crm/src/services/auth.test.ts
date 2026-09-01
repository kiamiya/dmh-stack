import { describe, expect, it } from "vitest";
import { validateNewPassword } from "./auth";

describe("validateNewPassword", () => {
  it("refuse un mot de passe trop court", () => {
    expect(validateNewPassword("abc", "abc")).toMatch(/au moins/);
  });

  it("refuse si les deux mots de passe ne correspondent pas", () => {
    expect(validateNewPassword("abcdef", "abcdefg")).toMatch(/correspondent/);
  });

  it("accepte un mot de passe valide et confirmé", () => {
    expect(validateNewPassword("abcdef", "abcdef")).toBeNull();
  });
});

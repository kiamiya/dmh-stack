import { describe, expect, it } from "vitest";
import { getAvatarColor, getInitials } from "./avatar";

describe("getInitials", () => {
  it("prend la première et la dernière lettre pour un nom composé", () => {
    expect(getInitials("Frédéric Vaysse")).toBe("FV");
  });

  it("prend les 2 premières lettres pour un mot unique", () => {
    expect(getInitials("Acme")).toBe("AC");
  });

  it("gère les espaces multiples/en bordure", () => {
    expect(getInitials("  Marie   Dubois  ")).toBe("MD");
  });

  it("retourne ? pour une chaîne vide", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
  });
});

describe("getAvatarColor", () => {
  it("est déterministe : le même nom retourne toujours la même couleur", () => {
    const color1 = getAvatarColor("PM Mécanique Industrie");
    const color2 = getAvatarColor("PM Mécanique Industrie");
    expect(color1).toBe(color2);
  });

  it("retourne une classe Tailwind non vide pour différents noms", () => {
    expect(getAvatarColor("Entreprise A")).toMatch(/^bg-\w+-100 text-\w+-800$/);
    expect(getAvatarColor("Entreprise B")).toMatch(/^bg-\w+-100 text-\w+-800$/);
  });
});

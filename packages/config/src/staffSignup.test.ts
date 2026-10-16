import { describe, expect, it } from "vitest";
import { isDmhStaffEmail, normalizeEmail, validateStaffName, validateStaffSignup } from "./staffSignup";

describe("isDmhStaffEmail", () => {
  it("accepte une adresse du domaine DMH, casse et espaces ignorés", () => {
    expect(isDmhStaffEmail("lrd@dmhassocies.com")).toBe(true);
    expect(isDmhStaffEmail("  Delphine.Martin@DMHAssocies.COM ")).toBe(true);
  });

  it("refuse les autres domaines, y compris ceux qui y ressemblent", () => {
    expect(isDmhStaffEmail("x@gmail.com")).toBe(false);
    expect(isDmhStaffEmail("x@dmhassocies.com.exemple.fr")).toBe(false);
    expect(isDmhStaffEmail("x@mail.dmhassocies.com")).toBe(false);
    expect(isDmhStaffEmail("x@dmhassocies.co")).toBe(false);
    expect(isDmhStaffEmail("x@evil-dmhassocies.com")).toBe(false);
  });

  it("refuse les adresses mal formées", () => {
    expect(isDmhStaffEmail("@dmhassocies.com")).toBe(false);
    expect(isDmhStaffEmail("x@y@dmhassocies.com")).toBe(false);
    expect(isDmhStaffEmail("pré nom@dmhassocies.com")).toBe(false);
    expect(isDmhStaffEmail("dmhassocies.com")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("retire les espaces et met en minuscules", () => {
    expect(normalizeEmail("  LRD@DMHassocies.com ")).toBe("lrd@dmhassocies.com");
  });
});

describe("validateStaffName", () => {
  it("exige un nom d'au moins 2 caractères et au plus 80", () => {
    expect(validateStaffName(" ")).toMatch(/prénom et ton nom/);
    expect(validateStaffName("x".repeat(81))).toMatch(/trop long/);
    expect(validateStaffName("Loïc R.")).toBeNull();
  });
});

describe("validateStaffSignup", () => {
  it("vérifie le nom puis le domaine", () => {
    expect(validateStaffSignup({ name: "", email: "lrd@dmhassocies.com" })).toMatch(/prénom/);
    expect(validateStaffSignup({ name: "Loïc", email: "loic@gmail.com" })).toMatch(/@dmhassocies\.com/);
    expect(validateStaffSignup({ name: "Loïc", email: "lrd@dmhassocies.com" })).toBeNull();
  });
});

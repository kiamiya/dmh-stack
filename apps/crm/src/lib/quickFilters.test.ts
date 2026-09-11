import { describe, expect, it } from "vitest";
import { hasPhone, hasSiren, isCompleteAbove, isEmailVerified, isFreshUnderDays, isStaleOverDays } from "./quickFilters";

describe("isEmailVerified", () => {
  it("vrai seulement si email_confidence === valid", () => {
    expect(isEmailVerified({ email_confidence: "valid" })).toBe(true);
    expect(isEmailVerified({ email_confidence: "risky" })).toBe(false);
    expect(isEmailVerified({ email_confidence: null })).toBe(false);
  });
});

describe("hasPhone", () => {
  it("vrai si un téléphone non vide est renseigné", () => {
    expect(hasPhone({ phone: "0102030405" })).toBe(true);
    expect(hasPhone({ phone: "  " })).toBe(false);
    expect(hasPhone({ phone: null })).toBe(false);
  });
});

describe("hasSiren", () => {
  it("vrai si un SIREN est renseigné", () => {
    expect(hasSiren({ siren: "123456789" })).toBe(true);
    expect(hasSiren({ siren: null })).toBe(false);
  });
});

describe("isCompleteAbove", () => {
  it("compare le pourcentage réel au seuil", () => {
    expect(isCompleteAbove(80, 80)).toBe(true);
    expect(isCompleteAbove(80, 79)).toBe(false);
  });
});

describe("isFreshUnderDays", () => {
  const now = new Date("2026-09-11T12:00:00Z");

  it("vrai si moins de N jours se sont écoulés", () => {
    expect(isFreshUnderDays(7, "2026-09-08T12:00:00Z", now)).toBe(true);
    expect(isFreshUnderDays(7, "2026-08-01T12:00:00Z", now)).toBe(false);
  });

  it("faux si aucune date", () => {
    expect(isFreshUnderDays(7, null, now)).toBe(false);
  });
});

describe("isStaleOverDays", () => {
  const now = new Date("2026-09-11T12:00:00Z");

  it("vrai si au moins N jours se sont écoulés", () => {
    expect(isStaleOverDays(14, "2026-08-01T12:00:00Z", now)).toBe(true);
    expect(isStaleOverDays(14, "2026-09-08T12:00:00Z", now)).toBe(false);
  });

  it("vrai si aucune date (jamais travaillée)", () => {
    expect(isStaleOverDays(14, null, now)).toBe(true);
  });
});

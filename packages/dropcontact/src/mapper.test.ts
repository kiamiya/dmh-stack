import { describe, expect, it } from "vitest";
import { extractBestEmail, mapQualificationToConfidence } from "./mapper.js";

describe("mapQualificationToConfidence", () => {
  it("nominative@pro -> valid", () => {
    expect(mapQualificationToConfidence("nominative@pro")).toBe("valid");
  });

  it("catch_all@pro et generic@pro -> accept", () => {
    expect(mapQualificationToConfidence("catch_all@pro")).toBe("accept");
    expect(mapQualificationToConfidence("generic@pro")).toBe("accept");
  });

  it("nominative@perso, random@pro, invalid@invalid -> risky", () => {
    expect(mapQualificationToConfidence("nominative@perso")).toBe("risky");
    expect(mapQualificationToConfidence("random@pro")).toBe("risky");
    expect(mapQualificationToConfidence("invalid@invalid")).toBe("risky");
  });

  it("absent -> not_found", () => {
    expect(mapQualificationToConfidence(null)).toBe("not_found");
    expect(mapQualificationToConfidence(undefined)).toBe("not_found");
  });
});

describe("extractBestEmail", () => {
  it("retourne not_found si aucun email dans le résultat", () => {
    expect(extractBestEmail({})).toEqual({ email: null, confidence: "not_found" });
    expect(extractBestEmail({ email: [] })).toEqual({ email: null, confidence: "not_found" });
  });

  it("retourne l'unique email avec sa confiance mappée", () => {
    const result = extractBestEmail({
      email: [{ email: "jean@acme.fr", qualification: "nominative@pro" }],
    });
    expect(result).toEqual({ email: "jean@acme.fr", confidence: "valid" });
  });

  it("choisit le meilleur email quand plusieurs sont proposés", () => {
    const result = extractBestEmail({
      email: [
        { email: "risky@acme.fr", qualification: "random@pro" },
        { email: "best@acme.fr", qualification: "nominative@pro" },
        { email: "middle@acme.fr", qualification: "generic@pro" },
      ],
    });
    expect(result).toEqual({ email: "best@acme.fr", confidence: "valid" });
  });

  it("ignore les entrées sans email", () => {
    const result = extractBestEmail({
      email: [{ qualification: "nominative@pro" }, { email: "ok@acme.fr", qualification: "generic@pro" }],
    });
    expect(result).toEqual({ email: "ok@acme.fr", confidence: "accept" });
  });
});

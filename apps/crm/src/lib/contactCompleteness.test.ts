import { describe, expect, it } from "vitest";
import { computeContactCompleteness } from "./contactCompleteness";

describe("computeContactCompleteness", () => {
  it("retourne 100 si poste/email/LinkedIn sont renseignés", () => {
    expect(computeContactCompleteness({ job_title: "DAF", email: "a@b.fr", linkedin_url: "https://linkedin.com/in/x" })).toBe(100);
  });

  it("retourne 0 si aucun champ n'est renseigné", () => {
    expect(computeContactCompleteness({ job_title: null, email: null, linkedin_url: null })).toBe(0);
  });

  it("calcule un ratio partiel arrondi", () => {
    expect(computeContactCompleteness({ job_title: "DAF", email: null, linkedin_url: null })).toBe(33);
  });
});

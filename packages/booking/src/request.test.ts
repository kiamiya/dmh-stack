import { describe, expect, it } from "vitest";
import { isValidEmailAddress, normalizePhone, validateBookingRequest } from "./request.js";
import type { BookingRequestInput } from "./request.js";
import type { BookingQuestion } from "./config.js";

describe("isValidEmailAddress", () => {
  it("refuse espaces et formes incomplètes", () => {
    expect(isValidEmailAddress("alice@acme.fr")).toBe(true);
    expect(isValidEmailAddress("alice @acme.fr")).toBe(false);
    expect(isValidEmailAddress("alice@acme")).toBe(false);
    expect(isValidEmailAddress("alice@@acme.fr")).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("normalise en E.164", () => {
    expect(normalizePhone("06 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("01.23.45.67.89")).toBe("+33123456789");
    expect(normalizePhone("+44 20 7946 0000")).toBe("+442079460000");
    expect(normalizePhone("0044 20 7946 0000")).toBe("+442079460000");
    expect(normalizePhone("(+33) 6 12 34 56 78")).toBe("+33612345678");
  });

  it("refuse l'inexploitable", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("06 12 34")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
  });
});

const questions: BookingQuestion[] = [
  { id: "size", label: "Taille", type: "select", required: true, options: ["1-10", "11-50"] },
  { id: "ctx", label: "Contexte", type: "textarea", required: false },
  { id: "rgpd", label: "J'accepte", type: "checkbox", required: true },
];

const valid: BookingRequestInput = {
  firstName: " Alice ",
  lastName: "Martin",
  email: " Alice.Martin@ACME.fr ",
  phone: "06 12 34 56 78",
  company: "ACME",
  notes: "",
  answers: { size: "11-50", rgpd: true },
};

describe("validateBookingRequest", () => {
  it("demande valide : valeurs nettoyées", () => {
    expect(validateBookingRequest(valid, questions)).toEqual({
      value: {
        firstName: "Alice",
        lastName: "Martin",
        email: "alice.martin@acme.fr",
        phone: "+33612345678",
        company: "ACME",
        notes: null,
        answers: { size: "11-50", rgpd: true },
      },
      errors: {},
    });
  });

  it("erreurs par champ", () => {
    const { value, errors } = validateBookingRequest(
      { ...valid, firstName: "", email: "alice @acme.fr", phone: "123", company: " ", answers: { size: "999" } },
      questions,
    );
    expect(value).toBeNull();
    expect(errors).toEqual({
      firstName: "Prénom obligatoire.",
      email: "Adresse e-mail invalide (sans espace, ex. prenom.nom@societe.fr).",
      phone: "Numéro invalide (ex. 06 12 34 56 78 ou +44 20 7946 0000).",
      company: "Société obligatoire.",
      "answers.size": "Choix invalide.",
      "answers.rgpd": "Case à cocher obligatoire.",
    });
  });

  it("téléphone obligatoire, question facultative vide ignorée", () => {
    const r = validateBookingRequest({ ...valid, phone: "" }, questions);
    expect(r.errors).toEqual({ phone: "Téléphone obligatoire." });
  });
});

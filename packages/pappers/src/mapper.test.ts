import { describe, expect, it } from "vitest";
import { calculateMonthsInRole, mapPappersCompany } from "./mapper.js";

const NOW = new Date("2026-07-30T00:00:00Z");

describe("mapPappersCompany", () => {
  it("extrait les champs connus d'une réponse Pappers complète", () => {
    const raw = {
      nom_entreprise: "ACME Industries",
      siren: "123456789",
      forme_juridique: "SAS",
      code_naf: "25.62B",
      libelle_code_naf: "Mécanique industrielle",
      tranche_effectif: "20 à 49 salariés",
      chiffre_affaires: 4_500_000,
      site_web: "https://acme-industries.fr",
      date_creation: "2010-03-15",
      siege: {
        adresse_ligne_1: "12 rue de l'Industrie",
        ville: "Saint-Étienne",
        code_postal: "42000",
      },
    };

    const result = mapPappersCompany(raw, NOW);

    expect(result).toEqual({
      name: "ACME Industries",
      siren: "123456789",
      nafCode: "25.62B",
      nafLabel: "Mécanique industrielle",
      legalForm: "SAS",
      employeeRange: "20 à 49 salariés",
      revenue: 4_500_000,
      revenueYear: 2026,
      city: "Saint-Étienne",
      address: "12 rue de l'Industrie",
      website: "https://acme-industries.fr",
      creationDate: "2010-03-15",
    });
  });

  it("retourne des champs null sans planter sur une réponse vide ou partielle", () => {
    expect(mapPappersCompany({}, NOW)).toEqual({
      name: null,
      siren: null,
      nafCode: null,
      nafLabel: null,
      legalForm: null,
      employeeRange: null,
      revenue: null,
      revenueYear: null,
      city: null,
      address: null,
      website: null,
      creationDate: null,
    });

    expect(mapPappersCompany(null, NOW).name).toBeNull();
    expect(mapPappersCompany(undefined, NOW).name).toBeNull();
  });

  it("retombe sur ville/adresse top-level si `siege` est absent", () => {
    const result = mapPappersCompany(
      { nom_entreprise: "ACME", ville: "Lyon", adresse: "1 rue X" },
      NOW,
    );

    expect(result.city).toBe("Lyon");
    expect(result.address).toBe("1 rue X");
  });

  it("utilise `denomination` si `nom_entreprise` est absent", () => {
    const result = mapPappersCompany({ denomination: "ACME SARL" }, NOW);
    expect(result.name).toBe("ACME SARL");
  });
});

describe("calculateMonthsInRole", () => {
  it("calcule le nombre de mois entiers depuis la prise de poste", () => {
    expect(calculateMonthsInRole("2026-01-30", NOW)).toBe(6);
    expect(calculateMonthsInRole("2025-07-30", NOW)).toBe(12);
  });

  it("n'arrondit pas au mois supérieur avant la date anniversaire du mois", () => {
    // Le 30 juillet n'est pas encore atteint le 29 janvier -> 5 mois pleins, pas 6.
    expect(calculateMonthsInRole("2026-01-31", NOW)).toBe(5);
  });

  it("retourne null si la date est absente ou invalide", () => {
    expect(calculateMonthsInRole(null, NOW)).toBeNull();
    expect(calculateMonthsInRole(undefined, NOW)).toBeNull();
    expect(calculateMonthsInRole("pas-une-date", NOW)).toBeNull();
  });

  it("ne retourne jamais un nombre négatif", () => {
    expect(calculateMonthsInRole("2030-01-01", NOW)).toBe(0);
  });
});

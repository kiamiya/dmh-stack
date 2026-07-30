import { describe, expect, it } from "vitest";
import { PharowCsvError, parsePharowCsv } from "./csv.js";

describe("parsePharowCsv", () => {
  it("parse un export avec les en-têtes français attendus", () => {
    const csv =
      "prenom,nom,intitule_poste,nom_entreprise,email,url_linkedin,telephone,ville,secteur\n" +
      "Jean,Dupont,Directeur général,ACME Mécanique,jean.dupont@acme.fr,https://linkedin.com/in/jdupont,0601020304,Lyon,Mécanique industrielle\n";

    const rows = parsePharowCsv(csv);

    expect(rows).toEqual([
      {
        firstName: "Jean",
        lastName: "Dupont",
        jobTitle: "Directeur général",
        companyName: "ACME Mécanique",
        email: "jean.dupont@acme.fr",
        linkedinUrl: "https://linkedin.com/in/jdupont",
        phone: "0601020304",
        city: "Lyon",
        sector: "Mécanique industrielle",
      },
    ]);
  });

  it("accepte des variantes d'en-têtes (majuscules, accents, espaces)", () => {
    const csv = "Prénom,Nom,Nom Entreprise\nMarie,Martin,PME Test\n";
    const rows = parsePharowCsv(csv);

    expect(rows[0]).toMatchObject({
      firstName: "Marie",
      lastName: "Martin",
      companyName: "PME Test",
    });
  });

  it("traite email et téléphone absents comme null (brief : parfois non disponibles)", () => {
    const csv = "prenom,nom,nom_entreprise\nPaul,Durand,ACME\n";
    const rows = parsePharowCsv(csv);

    expect(rows[0].email).toBeNull();
    expect(rows[0].phone).toBeNull();
    expect(rows[0].jobTitle).toBeNull();
  });

  it("retourne un tableau vide pour un CSV sans lignes de données", () => {
    expect(parsePharowCsv("prenom,nom,nom_entreprise\n")).toEqual([]);
  });

  it("lève PharowCsvError si une colonne requise manque de l'en-tête", () => {
    const csv = "prenom,nom\nJean,Dupont\n"; // pas de colonne entreprise
    expect(() => parsePharowCsv(csv)).toThrow(PharowCsvError);
    expect(() => parsePharowCsv(csv)).toThrow(/companyName/);
  });

  it("lève PharowCsvError si une ligne a un champ requis vide", () => {
    const csv = "prenom,nom,nom_entreprise\n,Dupont,ACME\n";
    expect(() => parsePharowCsv(csv)).toThrow(PharowCsvError);
  });
});

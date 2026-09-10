import { describe, expect, it } from "vitest";
import { autoDetectColumn } from "./importColumnMapping";

describe("autoDetectColumn", () => {
  it("détecte prénom/nom/entreprise même avec des colonnes ambiguës qui se chevauchent", () => {
    const columns = ["Prénom", "Nom", "Nom de l'entreprise", "Email"];
    expect(autoDetectColumn(columns, "firstName")).toBe("Prénom");
    expect(autoDetectColumn(columns, "lastName")).toBe("Nom");
    expect(autoDetectColumn(columns, "companyName")).toBe("Nom de l'entreprise");
    expect(autoDetectColumn(columns, "email")).toBe("Email");
  });

  it("ignore la casse et les accents", () => {
    expect(autoDetectColumn(["PRENOM", "email"], "firstName")).toBe("PRENOM");
    expect(autoDetectColumn(["prénom"], "firstName")).toBe("prénom");
  });

  it("retourne une correspondance partielle si aucune correspondance exacte n'existe", () => {
    expect(autoDetectColumn(["Site web société"], "website")).toBe("Site web société");
  });

  it("retourne une chaîne vide si aucune colonne ne correspond", () => {
    expect(autoDetectColumn(["Colonne inconnue"], "firstName")).toBe("");
  });
});

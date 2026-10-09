import { describe, expect, it } from "vitest";
import { escapeHtml, recapHtml, recapLines, recapText } from "./recap.js";
import type { BookingQuestion } from "./config.js";

const questions: BookingQuestion[] = [
  { id: "size", label: "Taille", type: "select", required: true, options: ["1-10"] },
  { id: "opt", label: "Facultatif", type: "text", required: false },
  { id: "rgpd", label: "Newsletter", type: "checkbox", required: false },
];

const request = {
  firstName: "Alice",
  lastName: "Martin",
  email: "alice@acme.fr",
  phone: "+33612345678",
  company: "ACME <SAS>",
  notes: "Ligne 1\nLigne 2",
  answers: { size: "1-10", rgpd: false },
};

describe("recap", () => {
  it("lignes dans l'ordre, réponses vides omises, booléens en Oui/Non", () => {
    expect(recapLines(request, questions)).toEqual([
      ["Nom", "Alice Martin"],
      ["Société", "ACME <SAS>"],
      ["E-mail", "alice@acme.fr"],
      ["Téléphone", "+33612345678"],
      ["Taille", "1-10"],
      ["Newsletter", "Non"],
      ["Message", "Ligne 1\nLigne 2"],
    ]);
  });

  it("HTML échappé, retours à la ligne conservés", () => {
    const html = recapHtml(recapLines(request, questions));
    expect(html).toContain("ACME &lt;SAS&gt;");
    expect(html).toContain("Ligne 1<br>Ligne 2");
    expect(html).not.toContain("<SAS>");
  });

  it("texte brut", () => {
    expect(recapText([["Nom", "Alice"], ["Société", "ACME"]])).toBe("Nom : Alice\nSociété : ACME");
  });

  it("escapeHtml", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

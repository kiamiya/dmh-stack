import { describe, expect, it } from "vitest";
import { mapPharowRow } from "./mapper.js";
import type { PharowRow } from "./csv.js";

const fullRow: PharowRow = {
  firstName: "Jean",
  lastName: "Dupont",
  jobTitle: "Directeur général",
  companyName: "ACME Mécanique",
  email: "jean.dupont@acme.fr",
  linkedinUrl: "https://linkedin.com/in/jdupont",
  phone: "0601020304",
  city: "Lyon",
  sector: "Mécanique industrielle",
};

describe("mapPharowRow", () => {
  it("mappe une ligne complète vers company/contact", () => {
    const result = mapPharowRow(fullRow);

    expect(result.company).toEqual({
      name: "ACME Mécanique",
      city: "Lyon",
      naf_label: "Mécanique industrielle",
    });

    expect(result.contact).toEqual({
      first_name: "Jean",
      last_name: "Dupont",
      job_title: "Directeur général",
      email: "jean.dupont@acme.fr",
      linkedin_url: "https://linkedin.com/in/jdupont",
      phone: "0601020304",
      data_source: "pharow",
    });
  });

  it("propage les null pour les champs optionnels absents", () => {
    const row: PharowRow = { ...fullRow, email: null, phone: null, jobTitle: null, sector: null };
    const result = mapPharowRow(row);

    expect(result.contact.email).toBeNull();
    expect(result.contact.phone).toBeNull();
    expect(result.contact.job_title).toBeNull();
    expect(result.company.naf_label).toBeNull();
  });
});

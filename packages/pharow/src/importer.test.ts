import { describe, expect, it } from "vitest";
import { runImport } from "./importer.js";
import type { ImportDeps } from "./importer.js";
import type { PharowRow } from "./csv.js";

function makeRow(overrides: Partial<PharowRow> = {}): PharowRow {
  return {
    firstName: "Jean",
    lastName: "Dupont",
    jobTitle: null,
    companyName: "ACME",
    email: null,
    linkedinUrl: null,
    phone: null,
    city: null,
    sector: null,
    ...overrides,
  };
}

/** Fake en mémoire : simule une base vide (aucune entreprise pré-existante). */
function createFakeDeps(preExistingCompanies: Record<string, string> = {}) {
  let nextId = 1;
  const genId = () => `id-${nextId++}`;

  const companiesByName = new Map(Object.entries(preExistingCompanies));
  const calls = { insertCompany: 0, insertContact: 0, insertProspect: 0, findCompanyByName: 0 };

  const deps: ImportDeps = {
    async findCompanyByName(_clientId, name) {
      calls.findCompanyByName++;
      const id = companiesByName.get(name);
      return id ? { id } : null;
    },
    async insertCompany(_clientId, company) {
      calls.insertCompany++;
      const id = genId();
      companiesByName.set(company.name, id);
      return { id };
    },
    async insertContact() {
      calls.insertContact++;
      return { id: genId() };
    },
    async insertProspect() {
      calls.insertProspect++;
      return { id: genId() };
    },
  };

  return { deps, calls };
}

describe("runImport", () => {
  it("crée une entreprise, un contact et un prospect pour une ligne unique", async () => {
    const { deps, calls } = createFakeDeps();
    const summary = await runImport([makeRow()], "client-1", deps);

    expect(summary).toEqual({
      totalRows: 1,
      prospectsCreated: 1,
      companiesCreated: 1,
      companiesReused: 0,
      errors: [],
    });
    expect(calls).toMatchObject({ insertCompany: 1, insertContact: 1, insertProspect: 1 });
  });

  it("ne crée l'entreprise qu'une fois quand deux lignes la partagent (même import)", async () => {
    const { deps, calls } = createFakeDeps();
    const rows = [
      makeRow({ firstName: "Jean" }),
      makeRow({ firstName: "Marie", lastName: "Martin" }),
    ];

    const summary = await runImport(rows, "client-1", deps);

    expect(summary.prospectsCreated).toBe(2);
    expect(summary.companiesCreated).toBe(1);
    expect(summary.companiesReused).toBe(1);
    expect(calls.insertCompany).toBe(1);
    expect(calls.insertContact).toBe(2);
  });

  it("réutilise une entreprise déjà en base sans la recréer", async () => {
    const { deps, calls } = createFakeDeps({ ACME: "existing-company-id" });
    const summary = await runImport([makeRow()], "client-1", deps);

    expect(summary.companiesCreated).toBe(0);
    expect(summary.companiesReused).toBe(1);
    expect(calls.insertCompany).toBe(0);
  });

  it("collecte l'erreur d'une ligne sans interrompre les suivantes", async () => {
    const { deps } = createFakeDeps();
    const failingDeps: ImportDeps = {
      ...deps,
      insertContact: async (clientId, companyId, contact) => {
        if (contact.first_name === "Casse-tout") {
          throw new Error("boom");
        }
        return deps.insertContact(clientId, companyId, contact);
      },
    };

    const rows = [
      makeRow({ firstName: "Casse-tout", companyName: "ACME A" }),
      makeRow({ firstName: "OK", companyName: "ACME B" }),
    ];

    const summary = await runImport(rows, "client-1", failingDeps);

    expect(summary.prospectsCreated).toBe(1);
    expect(summary.errors).toEqual([{ row: 2, error: "boom" }]);
  });

  it("numérote les erreurs selon la ligne du CSV (en-tête = ligne 1)", async () => {
    const { deps } = createFakeDeps();
    const failingDeps: ImportDeps = {
      ...deps,
      insertProspect: async () => {
        throw new Error("échec prospect");
      },
    };

    const summary = await runImport([makeRow(), makeRow()], "client-1", failingDeps);

    expect(summary.errors.map((e) => e.row)).toEqual([2, 3]);
  });
});

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadPharowImportEnv } from "@dmh/config";
import { parsePharowCsv, runImport } from "@dmh/pharow";
import type { ImportDeps } from "@dmh/pharow";

function printUsageAndExit(): never {
  console.error("Usage: pnpm run import-pharow -- --client-id <uuid> <fichier.csv>");
  process.exit(1);
}

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const clientIdIndex = args.indexOf("--client-id");

if (clientIdIndex === -1 || !args[clientIdIndex + 1]) {
  printUsageAndExit();
}

const clientId = args[clientIdIndex + 1];
const csvPath = args.find((_arg, i) => i !== clientIdIndex && i !== clientIdIndex + 1);

if (!csvPath) {
  printUsageAndExit();
}

const env = loadPharowImportEnv(process.env);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const deps: ImportDeps = {
  async findCompanyByName(clientId, name) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("client_id", clientId)
      .eq("name", name)
      .maybeSingle();
    if (error) throw new Error(`findCompanyByName: ${error.message}`);
    return data;
  },
  async insertCompany(clientId, company) {
    const { data, error } = await supabase
      .from("companies")
      .insert({ client_id: clientId, ...company })
      .select("id")
      .single();
    if (error) throw new Error(`insertCompany: ${error.message}`);
    return data;
  },
  async insertContact(clientId, companyId, contact) {
    const { data, error } = await supabase
      .from("contacts")
      .insert({ client_id: clientId, company_id: companyId, ...contact })
      .select("id")
      .single();
    if (error) throw new Error(`insertContact: ${error.message}`);
    return data;
  },
  async insertProspect(clientId, contactId, companyId) {
    const { data, error } = await supabase
      .from("prospects")
      .insert({ client_id: clientId, contact_id: contactId, company_id: companyId })
      .select("id")
      .single();
    if (error) throw new Error(`insertProspect: ${error.message}`);
    return data;
  },
};

async function main() {
  const content = readFileSync(csvPath as string, "utf-8");
  const rows = parsePharowCsv(content);
  console.log(`${rows.length} ligne(s) à importer pour le client ${clientId}...`);

  const summary = await runImport(rows, clientId as string, deps);

  console.log("\n=== Résumé de l'import ===");
  console.log(`Prospects créés        : ${summary.prospectsCreated}/${summary.totalRows}`);
  console.log(`Entreprises créées      : ${summary.companiesCreated}`);
  console.log(`Entreprises réutilisées : ${summary.companiesReused}`);

  if (summary.errors.length > 0) {
    console.log(`\n${summary.errors.length} ligne(s) en erreur :`);
    for (const err of summary.errors) {
      console.log(`  - ligne ${err.row} : ${err.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

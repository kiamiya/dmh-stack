import { fetchCompanyFromPappers } from "../packages/pappers/src/client.js";
import { mapPappersCompany } from "../packages/pappers/src/mapper.js";

// `pnpm run check-pappers -- <siren>` transmet littéralement "--" comme
// argument avant le siren : on le filtre pour ne garder que le vrai argument.
const siren = process.argv.slice(2).filter((arg) => arg !== "--")[0];

if (!siren) {
  console.error("Usage: pnpm run check-pappers -- <siren>");
  process.exit(1);
}

const apiKey = process.env.PAPPERS_API_KEY;
if (!apiKey) {
  console.error("PAPPERS_API_KEY manquant dans .env.local");
  process.exit(1);
}

async function main(siren: string, apiKey: string) {
  const raw = await fetchCompanyFromPappers({ siren }, { apiKey });

  console.log("=== Réponse brute Pappers ===");
  console.log(JSON.stringify(raw, null, 2));

  console.log("\n=== Résultat du mapping (packages/pappers/src/mapper.ts) ===");
  console.log(JSON.stringify(mapPappersCompany(raw), null, 2));
}

main(siren, apiKey);

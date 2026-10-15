import { describe, expect, it } from "vitest";

/**
 * Garde-fou S38-1 / S38-10 : `run_automation_rules()` est partagée par les
 * triggers de contacts/companies/prospects/tasks/deals. Une colonne propre à
 * une seule table (stage_id des deals, status/contact_id/company_id des
 * prospects) référencée hors d'une branche réservée à cette entité casse
 * toute insertion sur les autres tables (`record "new" has no field ...`) —
 * bug corrigé en 018, réintroduit en 030/035/040, recorrigé en 044. Ce test
 * vérifie la DERNIÈRE définition de la fonction dans les migrations.
 */
const migrations = import.meta.glob("../../../../supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const TABLE_SPECIFIC_COLUMNS = /\b(new|old)\.(stage_id|status|contact_id|company_id)\b/gi;

function latestRunAutomationRulesBody(): { file: string; body: string } {
  const files = Object.keys(migrations).sort();
  let latest: { file: string; body: string } | null = null;
  for (const file of files) {
    const sql = migrations[file].replace(/\r\n/g, "\n");
    const start = sql.search(/create or replace function run_automation_rules\(\)/i);
    if (start === -1) continue;
    const bodyStart = sql.indexOf("$$", start);
    const bodyEnd = sql.indexOf("$$", bodyStart + 2);
    latest = { file, body: sql.slice(bodyStart + 2, bodyEnd) };
  }
  if (!latest) throw new Error("run_automation_rules() introuvable dans les migrations");
  return latest;
}

describe("run_automation_rules() — dernière migration", () => {
  it("trouve bien les migrations", () => {
    expect(Object.keys(migrations).length).toBeGreaterThan(40);
  });

  it("ne référence aucune colonne propre à une table dans la requête de sélection des règles", () => {
    const { file, body } = latestRunAutomationRulesBody();
    const loopStart = body.indexOf("for rule in");
    const query = body.slice(loopStart, body.indexOf("\n  loop", loopStart));
    expect(query, file).not.toMatch(TABLE_SPECIFIC_COLUMNS);
  });

  it("ne lit ces colonnes que dans les branches par entité, avant la boucle des règles", () => {
    const { file, body } = latestRunAutomationRulesBody();
    const loopStart = body.indexOf("for rule in");
    const firstEntityBranch = body.search(/\bif v_entity_type = '/);
    expect(firstEntityBranch, file).toBeGreaterThan(-1);
    for (const match of body.matchAll(TABLE_SPECIFIC_COLUMNS)) {
      const at = match.index ?? 0;
      expect(at > firstEntityBranch && at < loopStart, `${file} : ${match[0]} hors de la section par entité`).toBe(true);
    }
  });
});

/**
 * S40 : pipeline d'enrichissement automatique par défaut (migration 052) —
 * le moteur doit atteindre les 4 Edge Functions du pipeline, et chaque client
 * (existant ou nouveau) doit recevoir ses 3 règles système.
 */
describe("pipeline d'enrichissement par défaut (052)", () => {
  const file = Object.keys(migrations).find((f) => f.endsWith("052_default_enrichment_pipeline.sql"));
  const sql = file ? migrations[file].replace(/\r\n/g, "\n") : "";

  it("existe", () => {
    expect(file).toBeDefined();
  });

  it("la dernière définition du moteur associe chaque fournisseur à son Edge Function", () => {
    const { file: latest, body } = latestRunAutomationRulesBody();
    for (const [provider, fn] of [
      ["pappers", "enrich-pappers"],
      ["dropcontact", "enrich-dropcontact"],
      ["score", "score-prospect"],
      ["messages", "generate-messages"],
    ]) {
      expect(body, latest).toContain(`when '${provider}' then '${fn}'`);
    }
    expect(body, latest).not.toContain("/functions/v1/enrich-' ||");
  });

  it("crée les 3 règles système de la chaîne Pappers -> Dropcontact + score -> messages", () => {
    for (const key of ["enrich_pappers", "enrich_dropcontact", "generate_messages"]) {
      expect(sql).toContain(`'${key}')`);
    }
    expect(sql).toContain(`'{"to_status": "enriched_pappers"}'`);
    expect(sql).toContain(`'{"to_status": "enriched_contact"}'`);
    for (const provider of ["pappers", "dropcontact", "score", "messages"]) {
      expect(sql).toContain(`'{"provider": "${provider}"}'`);
    }
    expect(sql).toMatch(/on conflict \(client_id, system_key\) where system_key is not null do nothing/);
  });

  it("équipe tout nouveau client et rattrape les clients existants", () => {
    expect(sql).toMatch(/create trigger dmh_clients_default_enrichment_rules after insert on dmh_clients/);
    expect(sql).toContain("select public.seed_default_enrichment_rules(id) from dmh_clients;");
  });

  it("relance Dropcontact (API asynchrone) par pg_cron, seulement si la règle système est active", () => {
    expect(sql).toContain("select cron.schedule('poll-dropcontact', '*/5 * * * *'");
    expect(sql).toMatch(/r\.system_key = 'enrich_dropcontact'\s+and r\.enabled = true/);
  });

  it("n'expose aucune fonction security definer aux rôles publics", () => {
    for (const fn of ["seed_default_enrichment_rules(uuid)", "seed_default_enrichment_rules_on_client()", "poll_dropcontact_enrichments()"]) {
      expect(sql).toContain(`revoke execute on function public.${fn} from public, anon, authenticated;`);
    }
  });
});

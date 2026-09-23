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

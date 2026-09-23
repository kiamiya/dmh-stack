import { describe, expect, it } from "vitest";

/**
 * Garde-fou S38-1 : `run_automation_rules()` est partagée par les triggers
 * de contacts/companies/prospects/tasks/deals, mais seule `deals` a une
 * colonne `stage_id`. La référencer dans la requête de sélection des règles
 * casse toute insertion sur les autres tables (`record "new" has no field
 * "stage_id"`) — bug corrigé en 018, réintroduit en 030/035/040, recorrigé
 * en 044. Ce test vérifie la DERNIÈRE définition de la fonction.
 */
const migrations = import.meta.glob("../../../../supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function latestRunAutomationRulesBody(): { file: string; body: string } {
  const files = Object.keys(migrations).sort();
  let latest: { file: string; body: string } | null = null;
  for (const file of files) {
    const sql = migrations[file];
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

  it("ne référence jamais new/old.stage_id dans la requête de sélection des règles", () => {
    const { file, body } = latestRunAutomationRulesBody();
    const query = body.slice(body.indexOf("for rule in"), body.indexOf("loop", body.indexOf("for rule in")));
    expect(query, file).not.toMatch(/\b(new|old)\.stage_id\b/i);
  });

  it("ne lit stage_id que dans une branche réservée aux opportunités", () => {
    const { file, body } = latestRunAutomationRulesBody();
    const guard = body.search(/if v_entity_type = 'opportunity' and TG_OP = 'UPDATE' then/i);
    expect(guard, file).toBeGreaterThan(-1);
    const guardEnd = guard + body.slice(guard).search(/end if;\s*end if;/);
    const outside = body.slice(0, guard) + body.slice(guardEnd);
    expect(outside, file).not.toMatch(/\b(new|old)\.stage_id\b/i);
  });
});

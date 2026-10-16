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

/** S40 (suite, migration 053) : pg_net coupe l'attente à 5 s par défaut — trop court pour les appels Claude du pipeline. */
describe("délai d'attente des appels du pipeline (053)", () => {
  function latestFunctionBody(signature: string): { file: string; body: string } {
    let latest: { file: string; body: string } | null = null;
    for (const file of Object.keys(migrations).sort()) {
      const sql = migrations[file].replace(/\r\n/g, "\n");
      const start = sql.indexOf(`create or replace function ${signature}`);
      if (start === -1) continue;
      const bodyStart = sql.indexOf("$$", start);
      latest = { file, body: sql.slice(bodyStart + 2, sql.indexOf("$$", bodyStart + 2)) };
    }
    if (!latest) throw new Error(`${signature} introuvable dans les migrations`);
    return latest;
  }

  it("le moteur attend jusqu'à 60 s la réponse des Edge Functions du pipeline", () => {
    const { file, body } = latestRunAutomationRulesBody();
    expect(body, file).toContain("timeout_milliseconds => 60000");
  });

  it("la relève Dropcontact aussi", () => {
    const { file, body } = latestFunctionBody("public.poll_dropcontact_enrichments()");
    expect(body, file).toContain("timeout_milliseconds => 60000");
  });
});

/** S40 (suite, migration 054) : nouvelle tentative automatique d'une étape du pipeline en échec. */
describe("relance des étapes en échec (054)", () => {
  const file = Object.keys(migrations).find((f) => f.endsWith("054_enrichment_retries.sql"));
  const sql = file ? migrations[file].replace(/\r\n/g, "\n") : "";
  const fnStart = sql.indexOf("create or replace function public.retry_failed_enrichments()");
  const body = sql.slice(sql.indexOf("$$", fnStart) + 2, sql.indexOf("$$;", fnStart));

  it("existe", () => {
    expect(file).toBeDefined();
    expect(fnStart).toBeGreaterThan(-1);
  });

  it("couvre les 4 étapes, chacune vers son Edge Function et sa règle système", () => {
    for (const [step, fn, rule] of [
      ["pappers", "enrich-pappers", "enrich_pappers"],
      ["dropcontact", "enrich-dropcontact", "enrich_dropcontact"],
      ["score", "score-prospect", "enrich_dropcontact"],
      ["messages", "generate-messages", "generate_messages"],
    ]) {
      expect(body).toMatch(new RegExp(`'${step}'(::text as step)?, '${fn}'(::text as fn)?,\\s+'${rule}'`));
    }
  });

  it("ne relance une demande Dropcontact que si elle n'a jamais été soumise (le suivi reste à poll-dropcontact)", () => {
    expect(body).toContain("and c.dropcontact_request_id is null");
  });

  it("borne les relances : 3 essais, espacés, 10 min après le changement de statut, fenêtre de 48 h, règle active", () => {
    expect(body).toContain("coalesce(r.attempts, 0) < 3");
    expect(body).toContain("r.last_attempt_at < now() - r.attempts * interval '15 minutes'");
    expect(body).toContain("p.status_changed_at < now() - interval '10 minutes'");
    expect(body).toContain("p.status_changed_at > now() - interval '48 hours'");
    expect(body).toMatch(/ar\.system_key = c\.rule_key\s+and ar\.enabled = true/);
    expect(body).toContain("limit 50");
  });

  it("ne génère pas de messages pour un client sans description de l'offre (422 certain)", () => {
    expect(body).toContain("coalesce(d.offer_description, '') <> ''");
  });

  it("compte chaque essai, attend 60 s la réponse, et reste inaccessible aux rôles publics", () => {
    expect(body).toContain("set attempts = pipeline_retries.attempts + 1");
    expect(body).toContain("timeout_milliseconds => 60000");
    expect(sql).toContain("revoke execute on function public.retry_failed_enrichments() from public, anon, authenticated;");
    expect(sql).toContain("select cron.schedule('retry-failed-enrichments', '*/10 * * * *'");
  });

  it("date chaque changement de statut (base de la fenêtre de relance)", () => {
    expect(sql).toMatch(/create trigger prospects_status_changed_at before update of status on prospects/);
    expect(sql).toContain("new.status_changed_at := now();");
  });
});

/** S40 (suite, migration 055) : tâche « Enrichissement en échec » + plafond du suivi Dropcontact. */
describe("échecs définitifs et plafond Dropcontact (055)", () => {
  function latestBody(signature: string): string {
    let latest = "";
    for (const f of Object.keys(migrations).sort()) {
      const sql = migrations[f].replace(/\r\n/g, "\n");
      const start = sql.indexOf(`create or replace function ${signature}`);
      if (start === -1) continue;
      const bodyStart = sql.indexOf("$$", start);
      latest = sql.slice(bodyStart + 2, sql.indexOf("$$", bodyStart + 2));
    }
    return latest;
  }
  const retry = latestBody("public.retry_failed_enrichments()");
  const poll = latestBody("public.poll_dropcontact_enrichments()");
  const file = Object.keys(migrations).find((f) => f.endsWith("055_enrichment_failure_tasks.sql"));
  const sql = file ? migrations[file].replace(/\r\n/g, "\n") : "";

  it("existe", () => {
    expect(file).toBeDefined();
  });

  it("crée une seule tâche par étape, 30 min après le 3e essai, rattachée au contact et à l'entreprise", () => {
    expect(retry).toContain("r.attempts >= 3 and r.failed_at is null and r.last_attempt_at < now() - interval '30 minutes'");
    expect(retry).toContain("'Enrichissement en échec : ' || v_step_label");
    expect(retry).toMatch(/v_candidate\.contact_id,\s+v_candidate\.company_id,\s+'automation',\s+'data',\s+'high'/);
    expect(retry).toContain("set failed_at = now(), failure_task_id = v_task_id");
  });

  it("garde les règles de relance de la 054 (3 essais, espacés, fenêtre de 48 h, règle active)", () => {
    expect(retry).toContain("(coalesce(r.attempts, 0) < 3");
    expect(retry).toContain("r.last_attempt_at < now() - r.attempts * interval '15 minutes'");
    expect(retry).toContain("p.status_changed_at > now() - interval '48 hours'");
    expect(retry).toMatch(/ar\.system_key = c\.rule_key\s+and ar\.enabled = true/);
    expect(retry).toContain("timeout_milliseconds => 60000");
  });

  it("ne consulte plus une demande Dropcontact au-delà de 6 h, puis l'abandonne pour resoumission", () => {
    expect(poll).toContain("and c.dropcontact_submitted_at > now() - interval '6 hours'");
    expect(poll).toMatch(/set dropcontact_request_id = null\s+where c\.dropcontact_request_id is not null\s+and c\.dropcontact_submitted_at < now\(\) - interval '6 hours'/);
    expect(poll).toContain("order by c.dropcontact_submitted_at");
    expect(poll).toContain("limit 100");
    expect(poll).toContain("timeout_milliseconds => 60000");
  });

  it("date chaque soumission Dropcontact par trigger (aucune modification de l'Edge Function)", () => {
    expect(sql).toMatch(/create trigger contacts_dropcontact_submitted_at before update of dropcontact_request_id on contacts/);
    expect(sql).toContain("new.dropcontact_submitted_at := now();");
    expect(sql).toContain("revoke execute on function public.retry_failed_enrichments() from public, anon, authenticated;");
    expect(sql).toContain("revoke execute on function public.poll_dropcontact_enrichments() from public, anon, authenticated;");
  });
});

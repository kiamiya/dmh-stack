// Scénarios de test du trigger `calculate_attribution` (S6) contre le
// vrai Supabase. La logique testée ici est en SQL (le trigger lui-même,
// supabase/migrations/001_initial_schema.sql + 008_fix_deal_attribution_trigger.sql),
// pas en TS — pas de logique pure à extraire/tester en vitest, même
// principe que la validation des Edge Functions (test fonctionnel documenté
// dans TESTING.md plutôt qu'un test unitaire).
//
// Réutilise `loadPharowImportEnv` (Supabase uniquement) : la forme est
// identique à ce dont ce script a besoin, pas la peine de dupliquer un
// schéma zod identique pour un nom différent.
import { createClient } from "@supabase/supabase-js";
import { loadPharowImportEnv } from "@dmh/config";

const env = loadPharowImportEnv(process.env);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_CLIENT_ID = "bd2335d1-ded7-4bb7-be31-d16dd3ef8055"; // [TEST Claude] Client de test

interface ScenarioResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: ScenarioResult[] = [];

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

async function createProspect(label: string, { isExisting = false } = {}) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ client_id: TEST_CLIENT_ID, name: `[TEST attribution] ${label}` })
    .select("id")
    .single();
  if (companyError) throw new Error(`createProspect/company: ${companyError.message}`);

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      client_id: TEST_CLIENT_ID,
      company_id: company.id,
      first_name: "Test",
      last_name: label,
      data_source: "manual",
    })
    .select("id")
    .single();
  if (contactError) throw new Error(`createProspect/contact: ${contactError.message}`);

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .insert({
      client_id: TEST_CLIENT_ID,
      company_id: company.id,
      contact_id: contact.id,
      is_existing_contact: isExisting,
      status: "won",
    })
    .select("id")
    .single();
  if (prospectError) throw new Error(`createProspect/prospect: ${prospectError.message}`);

  return prospect.id as string;
}

async function addInteraction(prospectId: string, occurredAt: Date) {
  const { error } = await supabase.from("interactions").insert({
    prospect_id: prospectId,
    client_id: TEST_CLIENT_ID,
    type: "email_sent",
    channel: "email",
    occurred_at: occurredAt.toISOString(),
  });
  if (error) throw new Error(`addInteraction: ${error.message}`);
}

async function insertDeal(overrides: {
  company_name: string;
  deal_value: number;
  signed_at: string;
  prospect_id: string | null;
  status?: string;
}) {
  const { data, error } = await supabase
    .from("deals")
    .insert({ client_id: TEST_CLIENT_ID, status: "won", ...overrides })
    .select("*")
    .single();
  if (error) throw new Error(`insertDeal: ${error.message}`);
  return data;
}

async function main() {
  const { data: client, error: clientError } = await supabase
    .from("dmh_clients")
    .select("commission_rate")
    .eq("id", TEST_CLIENT_ID)
    .single();
  if (clientError) throw new Error(`fetch client: ${clientError.message}`);
  const commissionRate = Number(client.commission_rate);

  const today = new Date().toISOString().slice(0, 10);

  // 1. INSERT direct en 'won' déclenche bien l'attribution (fix #1).
  {
    const prospectId = await createProspect("Insert direct won");
    await addInteraction(prospectId, new Date());
    const deal = await insertDeal({
      company_name: "[TEST attribution] Insert direct won",
      deal_value: 10000,
      signed_at: today,
      prospect_id: prospectId,
    });
    const expectedCommission = Math.round(10000 * commissionRate * 100) / 100;
    record(
      "INSERT direct en 'won' déclenche l'attribution",
      deal.attributed_to_dmh === true && Number(deal.commission_amount) === expectedCommission,
      `attributed_to_dmh=${deal.attributed_to_dmh}, commission=${deal.commission_amount} (attendu ${expectedCommission})`,
    );
    record(
      "months_between correct pour un écart <1 mois",
      deal.attribution_report?.months_between === 0,
      `months_between=${deal.attribution_report?.months_between}`,
    );
  }

  // 2. Contact préexistant -> jamais attribué.
  {
    const prospectId = await createProspect("Contact existant", { isExisting: true });
    await addInteraction(prospectId, new Date());
    const deal = await insertDeal({
      company_name: "[TEST attribution] Contact existant",
      deal_value: 5000,
      signed_at: today,
      prospect_id: prospectId,
    });
    record(
      "Contact préexistant -> non attribué",
      deal.attributed_to_dmh === false && Number(deal.commission_amount) === 0,
      `attributed_to_dmh=${deal.attributed_to_dmh}, commission=${deal.commission_amount}`,
    );
  }

  // 3. Aucune interaction -> jamais attribué.
  {
    const prospectId = await createProspect("Sans interaction");
    const deal = await insertDeal({
      company_name: "[TEST attribution] Sans interaction",
      deal_value: 5000,
      signed_at: today,
      prospect_id: prospectId,
    });
    record(
      "Aucune interaction -> non attribué",
      deal.attributed_to_dmh === false,
      `attributed_to_dmh=${deal.attributed_to_dmh}`,
    );
  }

  // 4. Premier contact il y a >18 mois -> non attribué, mais months_between
  //    correctement calculé (fix #2 : bug sur les écarts >12 mois).
  {
    const prospectId = await createProspect("Contact ancien");
    const oldContact = monthsAgo(20);
    await addInteraction(prospectId, oldContact);
    const deal = await insertDeal({
      company_name: "[TEST attribution] Contact ancien",
      deal_value: 5000,
      signed_at: today,
      prospect_id: prospectId,
    });
    record(
      "Premier contact >18 mois -> non attribué",
      deal.attributed_to_dmh === false,
      `attributed_to_dmh=${deal.attributed_to_dmh}`,
    );
    const monthsBetween = deal.attribution_report?.months_between;
    record(
      "months_between correct pour un écart >12 mois (fix #2)",
      monthsBetween === 19 || monthsBetween === 20,
      `months_between=${monthsBetween} (attendu ~20, aurait été 0-11 avant le fix, bug extract(month from age(...)))`,
    );
  }

  // 5. Deal sans prospect_id -> non attribué (pas de premier contact trouvable).
  {
    const deal = await insertDeal({
      company_name: "[TEST attribution] Sans prospect",
      deal_value: 5000,
      signed_at: today,
      prospect_id: null,
    });
    record(
      "Deal sans prospect_id -> non attribué",
      deal.attributed_to_dmh === false,
      `attributed_to_dmh=${deal.attributed_to_dmh}`,
    );
  }

  // 6. Un deal déjà 'won' qui est remis à jour ne recalcule pas le rapport.
  {
    const prospectId = await createProspect("Deja gagne");
    await addInteraction(prospectId, new Date());
    const deal = await insertDeal({
      company_name: "[TEST attribution] Deja gagne",
      deal_value: 8000,
      signed_at: today,
      prospect_id: prospectId,
    });

    const { data: updated, error: updateError } = await supabase
      .from("deals")
      .update({ commission_paid: true })
      .eq("id", deal.id)
      .select("*")
      .single();
    if (updateError) throw new Error(`update commission_paid: ${updateError.message}`);

    record(
      "Une mise à jour sur un deal déjà 'won' ne recalcule pas l'attribution",
      JSON.stringify(updated.attribution_report) === JSON.stringify(deal.attribution_report) &&
        updated.commission_amount === deal.commission_amount,
      `commission_paid=${updated.commission_paid}, attribution_report inchangé=${JSON.stringify(updated.attribution_report) === JSON.stringify(deal.attribution_report)}`,
    );
  }

  console.log("\n=== Résultats des scénarios d'attribution ===\n");
  let allPass = true;
  for (const r of results) {
    console.log(`${r.pass ? "✅" : "❌"} ${r.name}\n   ${r.detail}`);
    if (!r.pass) allPass = false;
  }
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} scénarios réussis.`);

  if (!allPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

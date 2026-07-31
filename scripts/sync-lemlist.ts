// Synchronisation manuelle Lemlist -> Supabase (S7, item 3, brief §1.2.4).
// Contrairement au webhook Smartlead (S4, temps réel), le brief décrit une
// "synchro manuelle dans un premier temps" pour Waalaxy/Lemlist : ce script
// est déclenché à la main (par Loïc ou le SDR), pas un endpoint HTTP.
//
// Usage : pnpm run sync-lemlist -- [--campaign-id <id>] [--since <date-ISO>]
//
// Toute la logique métier testable (appel API, mapping événement ->
// interaction, mapping catégorie -> statut) vit dans @dmh/lemlist,
// testée en vitest. Ce fichier n'est que l'orchestration, non testée
// unitairement (comme import-pharow.ts), couverte par un test fonctionnel,
// voir TESTING.md. Réutilise `shouldAdvanceStatus` de @dmh/smartlead
// (garde-fou anti-retour-en-arrière générique, pas de duplication).

import { createClient } from "@supabase/supabase-js";
import { loadLemlistSyncEnv } from "@dmh/config";
import {
  fetchAllLemlistActivities,
  mapLemlistActivityToInteraction,
  mapLemlistActivityToProspectStatus,
} from "@dmh/lemlist";
import { shouldAdvanceStatus } from "@dmh/smartlead";
import type { AnyProspectStatus } from "@dmh/smartlead";

const args = process.argv.slice(2).filter((arg) => arg !== "--");

function getArg(name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : undefined;
}

const campaignId = getArg("--campaign-id");
const since = getArg("--since");

const env = loadLemlistSyncEnv(process.env);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log(
    `Récupération des activités Lemlist` +
      `${campaignId ? ` (campagne ${campaignId})` : " (toutes campagnes)"}` +
      `${since ? ` depuis ${since}` : ""}...`,
  );

  const activities = await fetchAllLemlistActivities(
    { campaignId, minDate: since },
    { apiKey: env.LEMLIST_API_KEY },
  );

  console.log(`${activities.length} activité(s) récupérée(s).`);

  let synced = 0;
  let deduplicated = 0;
  let skipped = 0;
  const errors: Array<{ activityId: string; error: string }> = [];

  for (const activity of activities) {
    try {
      const mapped = mapLemlistActivityToInteraction(activity);
      if (!mapped) {
        skipped += 1;
        continue;
      }

      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("id")
        .ilike("email", mapped.leadEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (contactError) throw new Error(`recherche contact: ${contactError.message}`);
      if (!contact) {
        skipped += 1;
        continue;
      }

      const { data: prospect, error: prospectError } = await supabase
        .from("prospects")
        .select("id, client_id, status, lemlist_contact_id")
        .eq("contact_id", contact.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prospectError) throw new Error(`recherche prospect: ${prospectError.message}`);
      if (!prospect) {
        skipped += 1;
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from("interactions")
        .select("id")
        .eq("prospect_id", prospect.id)
        .contains("metadata", { lemlist_activity_id: activity._id })
        .maybeSingle();
      if (existingError) throw new Error(`vérification idempotence: ${existingError.message}`);
      if (existing) {
        deduplicated += 1;
        continue;
      }

      const { error: insertError } = await supabase.from("interactions").insert({
        prospect_id: prospect.id,
        client_id: prospect.client_id,
        type: mapped.type,
        channel: mapped.channel,
        content: mapped.content ?? null,
        occurred_at: mapped.occurredAt,
        metadata: { ...activity, lemlist_activity_id: activity._id },
      });
      if (insertError) throw new Error(`insertion interaction: ${insertError.message}`);

      const candidate = mapLemlistActivityToProspectStatus(activity.type);
      if (candidate && shouldAdvanceStatus(prospect.status as AnyProspectStatus, candidate)) {
        const { error: statusError } = await supabase
          .from("prospects")
          .update({ status: candidate })
          .eq("id", prospect.id);
        if (statusError) throw new Error(`mise à jour statut: ${statusError.message}`);
      }

      if (mapped.leadId && !prospect.lemlist_contact_id) {
        const { error: leadIdError } = await supabase
          .from("prospects")
          .update({ lemlist_contact_id: mapped.leadId })
          .eq("id", prospect.id);
        if (leadIdError) throw new Error(`mise à jour lemlist_contact_id: ${leadIdError.message}`);
      }

      synced += 1;
    } catch (error) {
      errors.push({
        activityId: activity._id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`\n=== Résumé de la synchro ===`);
  console.log(`Synchronisées : ${synced}`);
  console.log(`Dédupliquées  : ${deduplicated}`);
  console.log(`Ignorées      : ${skipped} (type non-LinkedIn, ou contact/prospect introuvable)`);

  if (errors.length > 0) {
    console.log(`\n${errors.length} erreur(s) :`);
    for (const e of errors) {
      console.log(`  - ${e.activityId} : ${e.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

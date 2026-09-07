import type { CompanyList, ContactList, OpportunityList, RuleGroup } from "@dmh/types";
import { matchesRuleGroups } from "./segmentEvaluator";
import { computeCompanyCompleteness } from "./companyCompleteness";
import type { CompanyCompletenessFields } from "./companyCompleteness";
import { computeContactCompleteness } from "./contactCompleteness";
import type { ContactCompletenessFields } from "./contactCompleteness";

export type ListEntityType = "contact" | "company" | "opportunity";

export interface ListOverviewRow {
  id: string;
  name: string;
  entityType: ListEntityType;
  mode: "static" | "dynamic";
  clientId: string;
  clientName: string;
  memberCount: number;
  /** Nombre total de conditions (tous groupes confondus) — null pour une liste statique, pas de notion de "critères". */
  criteriaCount: number | null;
  /** % moyen de complétude des membres (Pappers pour les entreprises, cascade contact sinon) — null pour les listes d'opportunités, aucune notion d'enrichissement pertinente pour un deal. */
  enrichmentRate: number | null;
  /** Date de création réelle (`created_at`) — pas de vraie date de "dernière modification" en base (`*_lists` n'a pas d'`updated_at`), donc jamais présentée comme telle. */
  createdAt: string;
}

interface ListLike {
  id: string;
  client_id: string;
  name: string;
  rules: RuleGroup[] | null;
  created_at: string;
}

interface EntityLike {
  id: string;
  client_id: string;
}

function countCriteria(rules: RuleGroup[] | null): number | null {
  if (rules === null) return null;
  return rules.reduce((sum, group) => sum + group.conditions.length, 0);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function buildRows<E extends EntityLike>(
  lists: ListLike[],
  entityType: ListEntityType,
  entities: E[],
  clients: Array<{ id: string; name: string }>,
  staticMemberIds: Map<string, string[]>,
  completeness: ((entity: E) => number) | null,
): ListOverviewRow[] {
  return lists.map((list) => {
    const isDynamic = list.rules !== null;
    let memberCount: number;
    let matched: E[];

    if (isDynamic) {
      matched = entities.filter(
        (e) => e.client_id === list.client_id && matchesRuleGroups(e as unknown as Record<string, unknown>, list.rules!),
      );
      memberCount = matched.length;
    } else {
      const ids = staticMemberIds.get(list.id) ?? [];
      memberCount = ids.length;
      const idSet = new Set(ids);
      matched = entities.filter((e) => idSet.has(e.id));
    }

    return {
      id: list.id,
      name: list.name,
      entityType,
      mode: isDynamic ? "dynamic" : "static",
      clientId: list.client_id,
      clientName: clients.find((c) => c.id === list.client_id)?.name ?? "—",
      memberCount,
      criteriaCount: countCriteria(list.rules),
      enrichmentRate: completeness ? average(matched.map(completeness)) : null,
      createdAt: list.created_at,
    };
  });
}

/**
 * Pure : vue d'ensemble de toutes les listes (Contacts/Entreprises/
 * Opportunités, S23/S26) réunies — pour /lists. Effectif réel dans
 * tous les cas : les listes dynamiques sont évaluées contre le jeu
 * d'entités déjà chargé (`matchesRuleGroups`, même logique que
 * Contacts.tsx/Opportunities.tsx) ; les statiques utilisent les vrais
 * ids de membres (jointure `*_list_members`). % d'enrichissement et
 * nombre de critères également réels (S32-segments) — jamais un nombre
 * approximatif ou une colonne sans donnée réelle derrière (toujours pas
 * de "Propriétaire"/"Origine" ici, cf. migration 031 pour Propriétaire).
 */
export function computeListOverviewRows(
  contactLists: ContactList[],
  companyLists: CompanyList[],
  opportunityLists: OpportunityList[],
  clients: Array<{ id: string; name: string }>,
  contacts: Array<EntityLike & ContactCompletenessFields>,
  companies: Array<EntityLike & CompanyCompletenessFields>,
  opportunities: EntityLike[],
  staticMemberIds: Map<string, string[]>,
): ListOverviewRow[] {
  return [
    ...buildRows(contactLists, "contact", contacts, clients, staticMemberIds, computeContactCompleteness),
    ...buildRows(companyLists, "company", companies, clients, staticMemberIds, computeCompanyCompleteness),
    ...buildRows(opportunityLists, "opportunity", opportunities, clients, staticMemberIds, null),
  ];
}

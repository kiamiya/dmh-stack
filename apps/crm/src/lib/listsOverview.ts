import type { CompanyList, ContactList, OpportunityList, RuleGroup } from "@dmh/types";
import { matchesRuleGroups } from "./segmentEvaluator";

export type ListEntityType = "contact" | "company" | "opportunity";

export interface ListOverviewRow {
  id: string;
  name: string;
  entityType: ListEntityType;
  mode: "static" | "dynamic";
  clientId: string;
  clientName: string;
  memberCount: number;
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
  client_id: string;
}

function buildRows(
  lists: ListLike[],
  entityType: ListEntityType,
  entities: EntityLike[],
  clients: Array<{ id: string; name: string }>,
  staticMemberCounts: Map<string, number>,
): ListOverviewRow[] {
  return lists.map((list) => {
    const isDynamic = list.rules !== null;
    const memberCount = isDynamic
      ? entities.filter(
          (e) => e.client_id === list.client_id && matchesRuleGroups(e as unknown as Record<string, unknown>, list.rules!),
        ).length
      : (staticMemberCounts.get(list.id) ?? 0);
    return {
      id: list.id,
      name: list.name,
      entityType,
      mode: isDynamic ? "dynamic" : "static",
      clientId: list.client_id,
      clientName: clients.find((c) => c.id === list.client_id)?.name ?? "—",
      memberCount,
      createdAt: list.created_at,
    };
  });
}

/**
 * Pure : vue d'ensemble de toutes les listes (Contacts/Entreprises/
 * Opportunités, S23/S26) réunies — pour /lists. Effectif réel dans
 * tous les cas : les listes dynamiques sont évaluées contre le jeu
 * d'entités déjà chargé (`matchesRuleGroups`, même logique que
 * Contacts.tsx/Opportunities.tsx) ; les statiques utilisent un
 * comptage précalculé (jointure `*_list_members`, coûteux à refaire
 * ici). Jamais un nombre approximatif ou une colonne sans donnée
 * réelle derrière (pas de "Propriétaire"/"Origine" — inexistants en
 * base, cf. plan S29+).
 */
export function computeListOverviewRows(
  contactLists: ContactList[],
  companyLists: CompanyList[],
  opportunityLists: OpportunityList[],
  clients: Array<{ id: string; name: string }>,
  contacts: EntityLike[],
  companies: EntityLike[],
  opportunities: EntityLike[],
  staticMemberCounts: Map<string, number>,
): ListOverviewRow[] {
  return [
    ...buildRows(contactLists, "contact", contacts, clients, staticMemberCounts),
    ...buildRows(companyLists, "company", companies, clients, staticMemberCounts),
    ...buildRows(opportunityLists, "opportunity", opportunities, clients, staticMemberCounts),
  ];
}

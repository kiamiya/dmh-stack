import { matchesSearch } from "./prospectFilters";
import type { ProspectListRow } from "../services/prospects";
import type { ContactListRow } from "../services/contacts";
import type { CompanyListRow } from "../services/companies";

/** Pure : les N premiers prospects correspondant à la requête (même logique de correspondance que le filtre de recherche du tableau) — alimente la palette de commandes (cmd+K). */
export function filterPaletteProspects(prospects: ProspectListRow[], query: string, limit = 8): ProspectListRow[] {
  if (!query.trim()) return prospects.slice(0, limit);
  return prospects.filter((p) => matchesSearch(p, query)).slice(0, limit);
}

/** Pure : contacts correspondant à la requête (nom, prénom, email) — alimente la barre de recherche du Header. */
export function filterPaletteContacts(contacts: ContactListRow[], query: string, limit = 5): ContactListRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return contacts
    .filter((c) => [c.first_name, c.last_name, c.email].filter(Boolean).join(" ").toLowerCase().includes(q))
    .slice(0, limit);
}

/** Pure : entreprises correspondant à la requête (nom, SIREN) — alimente la barre de recherche du Header. */
export function filterPaletteCompanies(companies: CompanyListRow[], query: string, limit = 5): CompanyListRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return companies.filter((c) => [c.name, c.siren].filter(Boolean).join(" ").toLowerCase().includes(q)).slice(0, limit);
}

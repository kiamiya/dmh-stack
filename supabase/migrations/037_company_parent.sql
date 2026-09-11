-- ============================================================
-- DMH & Associés — S34 (revue dev CRM 11/09/2026) : relations
-- hiérarchiques entre entreprises (maison mère / filiale), demandées
-- pour la prospection de grands comptes (contacts répartis sur
-- plusieurs filiales d'un même groupe). Auto-référence nullable —
-- aucune entreprise existante n'a de maison mère par défaut.
-- ============================================================

alter table companies add column parent_company_id uuid references companies(id) on delete set null;

create index if not exists idx_companies_parent_company_id on companies(parent_company_id);

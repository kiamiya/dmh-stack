-- ============================================================
-- DMH & Associés — S34 (revue dev CRM 11/09/2026) : champ nom libre
-- pour une opportunité. Jusqu'ici, `deals.company_name` servait à la
-- fois de nom d'entreprise ET de "nom" affiché de l'opportunité — deux
-- opportunités liées à la même entreprise (renouvellement, upsell...)
-- étaient donc indiscernables dans les listes. Colonne nullable :
-- aucune rupture pour les deals existants (retombent sur
-- `company_name` à l'affichage, géré côté application).
-- ============================================================

alter table deals add column name text;

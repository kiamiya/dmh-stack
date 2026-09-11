-- ============================================================
-- DMH & Associés — correction Claude Design (audit des 12 écrans) :
-- l'écran Pipeline du mockup montre une colonne "Commercial" et des
-- vues "Mes affaires"/"Mon portefeuille" — aucune notion de
-- propriétaire n'existe sur `deals` aujourd'hui. Nullable, pas de
-- rétro-affectation inventée pour les deals déjà créés.
-- ============================================================

alter table deals add column assigned_to uuid references staff_members(id);
create index if not exists idx_deals_assigned_to on deals(assigned_to);

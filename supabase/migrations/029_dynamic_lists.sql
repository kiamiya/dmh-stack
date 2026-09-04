-- ============================================================
-- DMH & Associés — S26 : listes dynamiques (critères de filtrage,
-- ET/OU) + fusion des segments dans les listes.
--
-- `rules` nullable : null = liste statique (comportement actuel,
-- adhésion stockée dans *_list_members) ; tableau de groupes = liste
-- dynamique, évaluée côté client comme les segments l'étaient déjà.
-- Forme : [{ conditions: [{field, operator, value}, ...] }, ...] — ET
-- entre les conditions d'un groupe, OU entre les groupes (même modèle
-- que HubSpot).
--
-- Les segments existants sont migrés en DONNÉES vers contact_lists (une
-- liste dynamique à un seul groupe par segment — équivalent exact du
-- comportement ET-uniquement précédent, aucune perte). `contact_segments`
-- reste en base (pas de suppression) mais n'est plus utilisée par le
-- code après cette étape.
-- ============================================================

alter table contact_lists add column rules jsonb;
alter table company_lists add column rules jsonb;
alter table opportunity_lists add column rules jsonb;

insert into contact_lists (client_id, name, rules, created_at)
select client_id, name, jsonb_build_array(jsonb_build_object('conditions', rules)), created_at
from contact_segments;

-- ============================================================
-- DMH & Associés — S33 (revue dev CRM 08/09/2026) : aligner le
-- pipeline Opportunités par défaut sur les 5 étapes décidées en
-- réunion (nouveau, qualifié, proposition envoyée, négociation,
-- gagné/perdu — le CR compte "gagné/perdu" comme une seule étape
-- conceptuelle, gardée comme 2 colonnes distinctes ici pour rester
-- cohérent avec le modèle existant, un stage = une colonne Kanban).
-- Le seed de la migration 015 n'avait posé que Négociation/Gagné/Perdu.
--
-- Insère 3 nouvelles étapes AVANT "Négociation" sur le pipeline par
-- défaut de chaque client existant, décale les positions des étapes
-- existantes en conséquence. N'affecte aucun deal déjà classé
-- (`deals.stage_id` inchangé pour les stages existants) : les affaires
-- en cours restent où elles sont, seules de nouvelles colonnes
-- apparaissent avant elles dans le Kanban. Idempotent : rejouable sans
-- effet si les étapes existent déjà (vérifié par nom).
-- ============================================================

update pipeline_stages ps
set position = position + 3
from pipelines p
where p.id = ps.pipeline_id
  and p.is_default
  and ps.name in ('Négociation', 'Gagné', 'Perdu')
  and not exists (
    select 1 from pipeline_stages ps2 where ps2.pipeline_id = p.id and ps2.name = 'Nouveau'
  );

insert into pipeline_stages (client_id, pipeline_id, name, position, is_won, is_lost)
select p.client_id, p.id, s.name, s.position, false, false
from pipelines p
cross join (
  values
    ('Nouveau', 1),
    ('Qualifié', 2),
    ('Proposition envoyée', 3)
) as s(name, position)
where p.is_default
  and not exists (
    select 1 from pipeline_stages ps where ps.pipeline_id = p.id and ps.name = s.name
  );

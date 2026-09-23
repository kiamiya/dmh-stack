-- ============================================================
-- DMH & Associés — S38-6 (CR réunion Delphine/Loïc du 17/09) : les champs
-- de la fiche de prospection (gabarit Delphine, S37) deviennent des
-- CHAMPS SYSTÈME, communs à tous les clients — au lieu de champs
-- personnalisés recréés client par client via le bouton S37.
--
-- Choix d'implémentation : on étend `custom_field_definitions` (S9) plutôt
-- que d'ajouter 8 colonnes en dur à contacts/companies — les fiches, l'import
-- (S36), les filtres de listes et les segments savent déjà afficher/filtrer
-- ces champs, sans rien réécrire.
--   - Définition système = `client_id is null` + `is_system = true`, visible
--     par tous les clients, non supprimable (trigger ci-dessous).
--   - Les VALEURS restent cloisonnées par client (`custom_field_values.client_id`).
--   - Options propres à un client ("Offres concernées", "Grille de
--     qualification" : libellés génériques à renommer par client, cf. gabarit)
--     : table de surcharge `custom_field_client_options`.
--
-- Reprise de l'existant : les définitions par client créées via S37 (mêmes
-- `entity_type` + `field_key`) sont fusionnées dans la définition système —
-- leurs valeurs sont repointées, leurs options conservées en surcharge si
-- elles différaient du défaut, puis la définition par client est supprimée.
-- ============================================================

-- 1. Définitions système
alter table custom_field_definitions alter column client_id drop not null;
alter table custom_field_definitions add column is_system boolean not null default false;
alter table custom_field_definitions add constraint custom_field_definitions_system_scope
  check ((is_system and client_id is null) or (not is_system and client_id is not null));
create unique index custom_field_definitions_system_key
  on custom_field_definitions (entity_type, field_key) where client_id is null;

-- Lecture des définitions système pour tout utilisateur authentifié (les
-- policies existantes filtrent sur client_id, donc excluaient client_id null
-- pour les comptes clients ; le staff y a déjà accès via staff_full_access).
create policy "system_definitions_read" on custom_field_definitions
  for select using (client_id is null and (select auth.role()) = 'authenticated');

create or replace function prevent_system_field_definition_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and old.is_system then
    raise exception 'Un champ système ne peut pas être supprimé (%).', old.field_key;
  end if;
  if tg_op = 'UPDATE' and old.is_system and (
    new.is_system is distinct from old.is_system
    or new.client_id is distinct from old.client_id
    or new.field_key is distinct from old.field_key
    or new.field_type is distinct from old.field_type
    or new.entity_type is distinct from old.entity_type
  ) then
    raise exception 'La structure d''un champ système ne peut pas être modifiée (%).', old.field_key;
  end if;
  return coalesce(new, old);
end $$;

create trigger custom_field_definitions_protect_system
  before update or delete on custom_field_definitions
  for each row execute function prevent_system_field_definition_change();

-- 2. Options par client (surcharge des select_options d'une définition)
create table custom_field_client_options (
  field_definition_id uuid references custom_field_definitions(id) on delete cascade not null,
  client_id uuid references dmh_clients(id) on delete cascade not null,
  select_options text[] not null,
  updated_at timestamptz default now(),
  primary key (field_definition_id, client_id)
);

alter table custom_field_client_options enable row level security;

create policy "client_isolation" on custom_field_client_options
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on custom_field_client_options
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on custom_field_client_options
  using (exists (
    select 1 from client_users
    where id = (select auth.uid()) and client_id = custom_field_client_options.client_id
  ));

create index if not exists idx_custom_field_client_options_client_id on custom_field_client_options(client_id);

-- 3. Les 8 champs système du gabarit (mêmes clés que S37)
insert into custom_field_definitions (client_id, is_system, entity_type, field_key, label, field_type, select_options) values
  (null, true, 'contact', 'role_decisionnel', 'Rôle décisionnel', 'select', array['Décideur', 'Influenceur', 'Filtrant']),
  (null, true, 'company', 'niveau_de_chaleur', 'Niveau de chaleur', 'select', array['COLD', 'WARM', 'HOT']),
  (null, true, 'company', 'source_du_signal', 'Source du signal', 'select', array['Fichier prescripteur', 'Salon', 'Recommandation', 'Inbound', 'Autre']),
  (null, true, 'company', 'reference_tracable', 'Référence traçable', 'text', null),
  (null, true, 'company', 'date_du_signal', 'Date du signal', 'date', null),
  (null, true, 'company', 'offres_concernees', 'Offres concernées', 'multiselect', array['Offre 1', 'Offre 2', 'Offre 3', 'Offre 4', 'Autre']),
  (null, true, 'company', 'grille_de_qualification', 'Grille de qualification', 'multiselect',
    array['Critère 1 — à définir', 'Critère 2 — à définir', 'Critère 3 — à définir', 'Critère 4 — à définir']),
  (null, true, 'company', 'besoins_et_angle_accroche', 'Besoins probables et angle d''accroche', 'text', null);

-- 4. Fusion des définitions par client créées via S37
create temp table s38_6_merge as
select d.id as old_id, d.client_id, d.select_options as old_options, s.id as system_id, s.select_options as system_options
from custom_field_definitions d
join custom_field_definitions s
  on s.is_system and s.entity_type = d.entity_type and s.field_key = d.field_key
where not d.is_system;

insert into custom_field_client_options (field_definition_id, client_id, select_options)
select system_id, client_id, old_options
from s38_6_merge
where old_options is not null and old_options is distinct from system_options
on conflict do nothing;

update custom_field_values v
set field_definition_id = m.system_id
from s38_6_merge m
where v.field_definition_id = m.old_id;

delete from custom_field_definitions d
using s38_6_merge m
where d.id = m.old_id;

drop table s38_6_merge;

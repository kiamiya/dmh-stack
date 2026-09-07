-- ============================================================
-- DMH & Associés — S32-segments : métadonnées réelles pour les listes
-- (Propriétaire, Mise à jour, Corbeille) — comparaison avec le mockup
-- "Relais" demandée par Loïc, lot B validé en totalité.
--
-- Les 3 tables `contact_lists`/`company_lists`/`opportunity_lists` ont
-- aujourd'hui exactement : id, client_id, name, created_at, rules
-- (migrations 024/025/026 + 029). Cette migration ajoute :
--   - created_by  : même pattern que `tasks.created_by` (migration 013)
--                   — référence staff_members, jamais l'uid d'un compte
--                   client (posé côté frontend, jamais fabriqué ici).
--   - updated_at  : bumpé à la modification directe de la liste (nom/
--                   règles) ET quand sa composition change (ajout/retrait
--                   de membre) — sinon "Mise à jour" resterait figée sur
--                   la date de création pour une liste statique dont on
--                   ne fait qu'ajouter des membres.
--   - deleted_at  : soft-delete (Corbeille). `deleteList()` passe d'un
--                   hard delete à `update set deleted_at = now()` côté
--                   service (fait dans le même lot, pas ici). Purge
--                   automatique après 30 jours via pg_cron (pas encore
--                   activé sur ce projet, vérifié en lecture seule avant
--                   cette migration).
-- ============================================================

alter table contact_lists add column created_by uuid references staff_members(id);
alter table company_lists add column created_by uuid references staff_members(id);
alter table opportunity_lists add column created_by uuid references staff_members(id);

alter table contact_lists add column updated_at timestamptz not null default now();
alter table company_lists add column updated_at timestamptz not null default now();
alter table opportunity_lists add column updated_at timestamptz not null default now();

alter table contact_lists add column deleted_at timestamptz;
alter table company_lists add column deleted_at timestamptz;
alter table opportunity_lists add column deleted_at timestamptz;

-- Bump direct : modification du nom ou des règles de la liste elle-même.
create or replace function bump_list_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contact_lists_bump_updated_at before update on contact_lists
  for each row execute function bump_list_updated_at();
create trigger company_lists_bump_updated_at before update on company_lists
  for each row execute function bump_list_updated_at();
create trigger opportunity_lists_bump_updated_at before update on opportunity_lists
  for each row execute function bump_list_updated_at();

-- Bump indirect : la composition (membres) change. Une seule fonction
-- générique pour les 3 tables de membres — la colonne `list_id` est
-- identique partout, seule la table `*_lists` cible diffère (passée en
-- TG_ARGV[0]).
create or replace function bump_parent_list_updated_at()
returns trigger language plpgsql as $$
declare
  v_list_id uuid := coalesce(new.list_id, old.list_id);
  v_table text := TG_ARGV[0];
begin
  execute format('update %I set updated_at = now() where id = $1', v_table) using v_list_id;
  return coalesce(new, old);
end;
$$;

create trigger contact_list_members_bump_parent after insert or delete on contact_list_members
  for each row execute function bump_parent_list_updated_at('contact_lists');
create trigger company_list_members_bump_parent after insert or delete on company_list_members
  for each row execute function bump_parent_list_updated_at('company_lists');
create trigger opportunity_list_members_bump_parent after insert or delete on opportunity_list_members
  for each row execute function bump_parent_list_updated_at('opportunity_lists');

-- Corbeille : purge automatique 30 jours après suppression (soft-delete).
-- pg_cron vérifié absent de ce projet avant cette migration (lecture
-- seule, `default_version 1.6.4`, `installed_version null`).
create extension if not exists pg_cron;

create or replace function purge_old_deleted_lists()
returns void language plpgsql as $$
begin
  delete from contact_lists where deleted_at < now() - interval '30 days';
  delete from company_lists where deleted_at < now() - interval '30 days';
  delete from opportunity_lists where deleted_at < now() - interval '30 days';
end;
$$;

select cron.schedule('purge-old-deleted-lists', '0 3 * * *', 'select purge_old_deleted_lists();');

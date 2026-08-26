-- ============================================================
-- DMH & Associés — Traçabilité pour la refonte UX/UI du CRM interne
-- (feat/crm-redesign)
--
-- Comble 3 lacunes du schéma repérées en planifiant la refonte :
-- 1) Aucun auteur sur les notes/interactions ("qui a écrit quoi").
-- 2) Aucune assignation de prospect à un membre staff ("assigner").
-- 3) Aucun historique des changements de statut — seul `updated_at`
--    (dernier touch) existe, donc ni fil d'activité ni évolution du
--    pipeline dans le temps ne sont reconstructibles.
--
-- Non appliquée sans confirmation explicite séparée (voir CLAUDE.md §4/§5
-- — migrations sur le vrai projet Supabase toujours soumises à accord).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Auteur des interactions (notes, appels manuels...)
-- ------------------------------------------------------------
alter table interactions add column created_by uuid references staff_members(id);
-- Nullable : les interactions issues des webhooks/scripts (Smartlead,
-- Lemlist, sync automatique) n'ont pas d'auteur staff — seules les
-- interactions saisies manuellement depuis le CRM (ex. notes) le
-- renseignent, à l'insertion, avec l'utilisateur staff connecté.

-- ------------------------------------------------------------
-- 2) Assignation d'un prospect à un membre staff
-- ------------------------------------------------------------
alter table prospects add column assigned_to uuid references staff_members(id);

-- ------------------------------------------------------------
-- 3) Historique des changements de statut (fil d'activité + évolution
--    du pipeline dans le temps)
-- ------------------------------------------------------------
create table prospect_status_history (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade not null,
  client_id uuid references dmh_clients(id) on delete cascade not null,
  old_status prospect_status,                   -- null à la création du prospect
  new_status prospect_status not null,
  changed_by uuid references staff_members(id), -- null si changement automatique (Edge Function/webhook)
  changed_at timestamptz not null default now()
);

alter table prospect_status_history enable row level security;

create policy "client_isolation" on prospect_status_history
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on prospect_status_history
  using (exists (select 1 from staff_members where id = (select auth.uid())));

create policy "client_user_access" on prospect_status_history
  using (exists (select 1 from client_users
                 where id = (select auth.uid()) and client_id = prospect_status_history.client_id));

create index if not exists idx_prospect_status_history_prospect_id on prospect_status_history(prospect_id);
create index if not exists idx_prospect_status_history_client_id on prospect_status_history(client_id);

-- Log automatique : capture aussi bien les changements manuels (Kanban,
-- via la clé anonyme + RLS staff) que les avancées automatiques des Edge
-- Functions (service_role) — `changed_by` distingue les deux (null pour
-- les changements automatiques, l'UID staff sinon).
create or replace function log_prospect_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into prospect_status_history (prospect_id, client_id, old_status, new_status, changed_by)
    values (
      new.id,
      new.client_id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger prospect_status_change
  after insert or update of status on prospects
  for each row execute function log_prospect_status_change();

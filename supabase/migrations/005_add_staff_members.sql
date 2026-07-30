-- ============================================================
-- DMH & Associés — Accès CRM interne (S4)
-- Les policies RLS existantes (001_initial_schema.sql) ne couvrent que le
-- service_role (Edge Functions/scripts) et un client scopé à son propre
-- client_id (dashboard client, S5). Aucune ne permet à un membre de
-- l'équipe DMH (William, le SDR, Loïc) de voir tous les clients depuis le
-- CRM interne (navigateur, clé anonyme — jamais la clé service_role
-- côté client). Cette migration ajoute cet accès sans toucher aux
-- policies existantes.
-- ============================================================

create table staff_members (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

alter table staff_members enable row level security;

-- Un membre de l'équipe peut lire la liste du staff (pas la modifier
-- depuis le navigateur — gestion via service_role uniquement).
create policy "staff_can_read_staff" on staff_members
  for select
  using (auth.uid() = id or auth.role() = 'service_role');

-- Accès complet (lecture/écriture, tous clients confondus) pour tout
-- utilisateur authentifié présent dans staff_members, en plus des
-- policies "client_isolation" déjà en place sur chacune de ces tables.
create policy "staff_full_access" on dmh_clients
  using (exists (select 1 from staff_members where id = auth.uid()));

create policy "staff_full_access" on companies
  using (exists (select 1 from staff_members where id = auth.uid()));

create policy "staff_full_access" on contacts
  using (exists (select 1 from staff_members where id = auth.uid()));

create policy "staff_full_access" on prospects
  using (exists (select 1 from staff_members where id = auth.uid()));

create policy "staff_full_access" on interactions
  using (exists (select 1 from staff_members where id = auth.uid()));

create policy "staff_full_access" on messages_generated
  using (exists (select 1 from staff_members where id = auth.uid()));

create policy "staff_full_access" on deals
  using (exists (select 1 from staff_members where id = auth.uid()));

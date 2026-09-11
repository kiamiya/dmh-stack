-- ============================================================
-- DMH & Associés — S34-15 (Revue dev CRM du 11/09) : dashboards nommés
-- personnels. Décision de cadrage (question posée à Loïc) : un jeu de
-- blocs FIXE réutilisant les cartes/graphiques déjà codés dans
-- `Dashboard.tsx` (pas de nouveau catalogue générique) ; dashboards
-- PERSONNELS par membre du staff (pas partagés équipe), cohérent avec
-- l'absence de toute notion de "vue privée" ailleurs dans le CRM mais
-- demandé explicitement pour ce chantier précis.
--
-- Pas de `client_id` : ce n'est pas une donnée scopée à un client DMH,
-- c'est une préférence de pilotage interne pour le membre du staff qui
-- la crée — RLS "propriétaire uniquement", pas le triptyque habituel
-- client_isolation/staff_full_access/client_user_access.
-- ============================================================

create table dashboards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references staff_members(id) on delete cascade not null,
  name text not null,
  blocks text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table dashboards enable row level security;

create policy "owner_full_access" on dashboards
  using (owner_id = (select auth.uid()) or (select auth.role()) = 'service_role')
  with check (owner_id = (select auth.uid()) or (select auth.role()) = 'service_role');

create index if not exists idx_dashboards_owner_id on dashboards(owner_id);

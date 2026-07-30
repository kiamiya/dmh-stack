-- ============================================================
-- DMH & Associés — Accès dashboard client (S5)
-- La policy "client_isolation" existante (001_initial_schema.sql) suppose
-- que l'UID Supabase Auth d'un client est littéralement égal à
-- dmh_clients.id (auth.uid()::text = id::text) — aucun flux de création
-- de compte ne garantit ça en pratique. Même situation que l'accès staff
-- en S4 (005_add_staff_members.sql) : ajout d'une table de rattachement +
-- policy additive, sans toucher aux policies existantes.
-- ============================================================

create table client_users (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid references dmh_clients(id) on delete cascade not null,
  created_at timestamptz default now()
);

alter table client_users enable row level security;

create policy "client_user_can_read_self" on client_users
  for select
  using (auth.uid() = id or auth.role() = 'service_role');

create policy "client_user_access" on dmh_clients
  using (exists (
    select 1 from client_users where id = auth.uid() and client_id = dmh_clients.id
  ));

create policy "client_user_access" on companies
  using (exists (
    select 1 from client_users where id = auth.uid() and client_id = companies.client_id
  ));

create policy "client_user_access" on contacts
  using (exists (
    select 1 from client_users where id = auth.uid() and client_id = contacts.client_id
  ));

create policy "client_user_access" on prospects
  using (exists (
    select 1 from client_users where id = auth.uid() and client_id = prospects.client_id
  ));

create policy "client_user_access" on interactions
  using (exists (
    select 1 from client_users where id = auth.uid() and client_id = interactions.client_id
  ));

create policy "client_user_access" on messages_generated
  using (exists (
    select 1 from client_users where id = auth.uid() and client_id = messages_generated.client_id
  ));

create policy "client_user_access" on deals
  using (exists (
    select 1 from client_users where id = auth.uid() and client_id = deals.client_id
  ));

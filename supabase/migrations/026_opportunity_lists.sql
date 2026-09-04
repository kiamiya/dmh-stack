-- ============================================================
-- DMH & Associés — S23 : listes statiques d'opportunités.
-- Copie exacte du template contact_lists (migration 024). "Opportunité"
-- = table `deals` dans ce schéma (voir migration 013).
-- ============================================================

create table opportunity_lists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table opportunity_lists enable row level security;

create policy "client_isolation" on opportunity_lists
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on opportunity_lists
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on opportunity_lists
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = opportunity_lists.client_id
  ));

create table opportunity_list_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  list_id uuid references opportunity_lists(id) on delete cascade not null,
  deal_id uuid references deals(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique (list_id, deal_id)
);

alter table opportunity_list_members enable row level security;

create policy "client_isolation" on opportunity_list_members
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on opportunity_list_members
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on opportunity_list_members
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = opportunity_list_members.client_id
  ));

create index if not exists idx_opportunity_lists_client_id on opportunity_lists(client_id);
create index if not exists idx_opportunity_list_members_client_id on opportunity_list_members(client_id);
create index if not exists idx_opportunity_list_members_list_id on opportunity_list_members(list_id);
create index if not exists idx_opportunity_list_members_deal_id on opportunity_list_members(deal_id);

-- ============================================================
-- DMH & Associés — S23 : listes statiques d'entreprises.
-- Copie exacte du template contact_lists (migration 024).
-- ============================================================

create table company_lists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table company_lists enable row level security;

create policy "client_isolation" on company_lists
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on company_lists
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on company_lists
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = company_lists.client_id
  ));

create table company_list_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  list_id uuid references company_lists(id) on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique (list_id, company_id)
);

alter table company_list_members enable row level security;

create policy "client_isolation" on company_list_members
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on company_list_members
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on company_list_members
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = company_list_members.client_id
  ));

create index if not exists idx_company_lists_client_id on company_lists(client_id);
create index if not exists idx_company_list_members_client_id on company_list_members(client_id);
create index if not exists idx_company_list_members_list_id on company_list_members(list_id);
create index if not exists idx_company_list_members_company_id on company_list_members(company_id);

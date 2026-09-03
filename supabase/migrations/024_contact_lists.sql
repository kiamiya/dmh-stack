-- ============================================================
-- DMH & Associés — S20 : listes statiques de contacts.
--
-- Différent des "segments" (contact_segments, migration 019) : une liste
-- est un ensemble figé de contacts choisis à la main (adhésion stockée),
-- pas des règles évaluées à la volée. `client_id` dupliqué sur
-- `contact_list_members` (comme `contact_companies`, migration 013) pour
-- garder la même RLS à 3 politiques partout plutôt qu'une sous-requête
-- jointe sur `contact_lists`.
-- ============================================================

create table contact_lists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table contact_lists enable row level security;

create policy "client_isolation" on contact_lists
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on contact_lists
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on contact_lists
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = contact_lists.client_id
  ));

create table contact_list_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  list_id uuid references contact_lists(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique (list_id, contact_id)
);

alter table contact_list_members enable row level security;

create policy "client_isolation" on contact_list_members
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on contact_list_members
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on contact_list_members
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = contact_list_members.client_id
  ));

create index if not exists idx_contact_lists_client_id on contact_lists(client_id);
create index if not exists idx_contact_list_members_client_id on contact_list_members(client_id);
create index if not exists idx_contact_list_members_list_id on contact_list_members(list_id);
create index if not exists idx_contact_list_members_contact_id on contact_list_members(contact_id);

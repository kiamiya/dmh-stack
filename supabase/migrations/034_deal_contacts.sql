-- ============================================================
-- DMH & Associés — S33 (revue dev CRM 08/09/2026) : une opportunité
-- peut être liée à plusieurs contacts (ex. achat, juridique, comptable
-- — cf. CR "Structure des pipelines"). Même pattern que
-- `contact_companies` (migration 013) pour Contact<->Entreprise :
-- `deals.contact_id` reste le contact "principal", utilisé par tout le
-- code existant (aucune rupture) — cette table ajoute les contacts
-- additionnels liés à une même opportunité.
-- ============================================================

create table deal_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  deal_id uuid references deals(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  is_primary boolean not null default false,
  role text,
  created_at timestamptz default now(),
  unique (deal_id, contact_id)
);

alter table deal_contacts enable row level security;

create policy "client_isolation" on deal_contacts
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on deal_contacts
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on deal_contacts
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = deal_contacts.client_id
  ));

-- Backfill : chaque deal ayant déjà un contact principal (`deals.contact_id`) obtient sa relation correspondante.
insert into deal_contacts (client_id, deal_id, contact_id, is_primary)
select client_id, id, contact_id, true from deals where contact_id is not null;

create index if not exists idx_deal_contacts_client_id on deal_contacts(client_id);
create index if not exists idx_deal_contacts_deal_id on deal_contacts(deal_id);
create index if not exists idx_deal_contacts_contact_id on deal_contacts(contact_id);

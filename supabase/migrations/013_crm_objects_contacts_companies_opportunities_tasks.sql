-- ============================================================
-- DMH & Associés — Objets CRM génériques : relation Contact<->Entreprise
-- (N:N), Opportunités (extension de deals), Tâches
--
-- Demande de Delphine (collaboratrice DMH, utilisatrice du CRM) : se
-- rapprocher des CRM du marché (HubSpot, Brevo) avec des objets Contacts/
-- Entreprises/Opportunités/Tâches reliés entre eux. Le pipeline
-- d'automatisation existant (table prospects, S1-S8) n'est pas touché —
-- ces objets s'ajoutent par-dessus (décision de coexistence, voir
-- PROGRESS.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Contact <-> Entreprise (seule vraie relation N:N demandée).
-- contacts.company_id reste l'entreprise "principale", utilisée par tout
-- le pipeline existant — cette table ajoute des relations
-- additionnelles (ex. un contact impliqué dans plusieurs entreprises).
-- ------------------------------------------------------------
create table contact_companies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  is_primary boolean not null default false,
  role text,
  created_at timestamptz default now(),
  unique (contact_id, company_id)
);

alter table contact_companies enable row level security;

create policy "client_isolation" on contact_companies
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on contact_companies
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on contact_companies
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = contact_companies.client_id
  ));

-- Backfill : chaque contact existant a déjà une entreprise principale.
insert into contact_companies (client_id, contact_id, company_id, is_primary)
select client_id, id, company_id, true from contacts;

-- ------------------------------------------------------------
-- 2) Opportunités = extension de la table "deals" existante (même
-- concept que l'objet "Deals" chez HubSpot) — pas d'objet parallèle,
-- pour ne pas fragmenter la logique d'attribution/commission déjà
-- construite (trigger calculate_attribution). company_name/prospect_id
-- restent (compatibilité apps/dashboard + scripts/test-attribution.ts) ;
-- contact_id/company_id ajoutent des relations réelles en plus du texte
-- libre actuel.
-- ------------------------------------------------------------
alter table deals add column contact_id uuid references contacts(id);
alter table deals add column company_id uuid references companies(id);

-- ------------------------------------------------------------
-- 3) Tâches (nouvel objet). Trois liens optionnels plutôt qu'une
-- relation polymorphe générique — cohérent avec le reste du schéma
-- (pas d'EAV/JSONB flexible, voir dette technique actée dans
-- TESTING.md).
-- ------------------------------------------------------------
create type task_status as enum ('to_do', 'in_progress', 'done');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  status task_status not null default 'to_do',
  assigned_to uuid references staff_members(id),
  contact_id uuid references contacts(id),
  company_id uuid references companies(id),
  deal_id uuid references deals(id),
  created_by uuid references staff_members(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tasks enable row level security;

create policy "client_isolation" on tasks
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on tasks
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on tasks
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = tasks.client_id
  ));

-- ------------------------------------------------------------
-- 4) Index de couverture sur les nouvelles clés étrangères (même
-- discipline que la migration 009_performance_and_security_hardening).
-- ------------------------------------------------------------
create index if not exists idx_contact_companies_client_id on contact_companies(client_id);
create index if not exists idx_contact_companies_contact_id on contact_companies(contact_id);
create index if not exists idx_contact_companies_company_id on contact_companies(company_id);

create index if not exists idx_deals_contact_id on deals(contact_id);
create index if not exists idx_deals_company_id on deals(company_id);

create index if not exists idx_tasks_client_id on tasks(client_id);
create index if not exists idx_tasks_assigned_to on tasks(assigned_to);
create index if not exists idx_tasks_contact_id on tasks(contact_id);
create index if not exists idx_tasks_company_id on tasks(company_id);
create index if not exists idx_tasks_deal_id on tasks(deal_id);
create index if not exists idx_tasks_created_by on tasks(created_by);

-- ============================================================
-- DMH & Associés — Durcissement perf/sécurité (S8)
-- Trouvé via `supabase db advisors --linked` (linter officiel Supabase),
-- pas des suppositions :
--
-- 1) Les 23 policies RLS (auth_rls_initplan, WARN) appellent auth.uid()/
--    auth.role() directement, ré-évalués à CHAQUE ligne. Remplacer par
--    (select auth.uid())/(select auth.role()) permet à Postgres de les
--    traiter comme un InitPlan (évalué une seule fois par requête) —
--    gain de perf important à l'échelle (10+ clients, brief §2.6).
--    Sémantique strictement identique, uniquement une réécriture pour
--    la planification de requête.
-- 2) 13 clés étrangères sans index de couverture (unindexed_foreign_keys,
--    INFO) — exactement les colonnes client_id/prospect_id/company_id/
--    contact_id sur lesquelles portent la quasi-totalité des filtres RLS
--    et des requêtes applicatives (CRM, dashboard).
-- 3) 2 fonctions (update_prospect_activity, calculate_attribution) avec
--    un search_path mutable (function_search_path_mutable, WARN) —
--    bonne pratique de sécurité Postgres standard.
--
-- Non traité ici (action manuelle, pas une migration) :
-- auth_leaked_password_protection (WARN) — à activer dans Auth >
-- Providers du dashboard Supabase, pas modifiable par SQL.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Index de couverture sur les clés étrangères
-- ------------------------------------------------------------
create index if not exists idx_client_users_client_id on client_users(client_id);
create index if not exists idx_companies_client_id on companies(client_id);
create index if not exists idx_contacts_client_id on contacts(client_id);
create index if not exists idx_contacts_company_id on contacts(company_id);
create index if not exists idx_deals_client_id on deals(client_id);
create index if not exists idx_deals_prospect_id on deals(prospect_id);
create index if not exists idx_interactions_client_id on interactions(client_id);
create index if not exists idx_interactions_prospect_id on interactions(prospect_id);
create index if not exists idx_messages_generated_client_id on messages_generated(client_id);
create index if not exists idx_messages_generated_prospect_id on messages_generated(prospect_id);
create index if not exists idx_prospects_client_id on prospects(client_id);
create index if not exists idx_prospects_company_id on prospects(company_id);
create index if not exists idx_prospects_contact_id on prospects(contact_id);

-- ------------------------------------------------------------
-- 2) search_path fixe sur les fonctions trigger
-- ------------------------------------------------------------
alter function update_prospect_activity() set search_path = public;
alter function calculate_attribution() set search_path = public;

-- ------------------------------------------------------------
-- 3) Policies RLS réécrites avec (select auth.<fn>())
-- ------------------------------------------------------------

-- dmh_clients
drop policy if exists "client_isolation" on dmh_clients;
create policy "client_isolation" on dmh_clients
  using (((select auth.uid())::text = id::text) or (select auth.role()) = 'service_role');

drop policy if exists "staff_full_access" on dmh_clients;
create policy "staff_full_access" on dmh_clients
  using (exists (select 1 from staff_members where id = (select auth.uid())));

drop policy if exists "client_user_access" on dmh_clients;
create policy "client_user_access" on dmh_clients
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = dmh_clients.id
  ));

-- companies
drop policy if exists "client_isolation" on companies;
create policy "client_isolation" on companies
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

drop policy if exists "staff_full_access" on companies;
create policy "staff_full_access" on companies
  using (exists (select 1 from staff_members where id = (select auth.uid())));

drop policy if exists "client_user_access" on companies;
create policy "client_user_access" on companies
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = companies.client_id
  ));

-- contacts
drop policy if exists "client_isolation" on contacts;
create policy "client_isolation" on contacts
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

drop policy if exists "staff_full_access" on contacts;
create policy "staff_full_access" on contacts
  using (exists (select 1 from staff_members where id = (select auth.uid())));

drop policy if exists "client_user_access" on contacts;
create policy "client_user_access" on contacts
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = contacts.client_id
  ));

-- prospects
drop policy if exists "client_isolation" on prospects;
create policy "client_isolation" on prospects
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

drop policy if exists "staff_full_access" on prospects;
create policy "staff_full_access" on prospects
  using (exists (select 1 from staff_members where id = (select auth.uid())));

drop policy if exists "client_user_access" on prospects;
create policy "client_user_access" on prospects
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = prospects.client_id
  ));

-- interactions
drop policy if exists "client_isolation" on interactions;
create policy "client_isolation" on interactions
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

drop policy if exists "staff_full_access" on interactions;
create policy "staff_full_access" on interactions
  using (exists (select 1 from staff_members where id = (select auth.uid())));

drop policy if exists "client_user_access" on interactions;
create policy "client_user_access" on interactions
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = interactions.client_id
  ));

-- messages_generated
drop policy if exists "client_isolation" on messages_generated;
create policy "client_isolation" on messages_generated
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

drop policy if exists "staff_full_access" on messages_generated;
create policy "staff_full_access" on messages_generated
  using (exists (select 1 from staff_members where id = (select auth.uid())));

drop policy if exists "client_user_access" on messages_generated;
create policy "client_user_access" on messages_generated
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = messages_generated.client_id
  ));

-- deals
drop policy if exists "client_isolation" on deals;
create policy "client_isolation" on deals
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

drop policy if exists "staff_full_access" on deals;
create policy "staff_full_access" on deals
  using (exists (select 1 from staff_members where id = (select auth.uid())));

drop policy if exists "client_user_access" on deals;
create policy "client_user_access" on deals
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = deals.client_id
  ));

-- staff_members (self-read)
drop policy if exists "staff_can_read_staff" on staff_members;
create policy "staff_can_read_staff" on staff_members
  for select
  using ((select auth.uid()) = id or (select auth.role()) = 'service_role');

-- client_users (self-read)
drop policy if exists "client_user_can_read_self" on client_users;
create policy "client_user_can_read_self" on client_users
  for select
  using ((select auth.uid()) = id or (select auth.role()) = 'service_role');

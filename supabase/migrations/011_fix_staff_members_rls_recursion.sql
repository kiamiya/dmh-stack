-- ============================================================
-- DMH & Associés — Correction bug bloquant : récursion infinie RLS
-- sur "staff_members"
--
-- Bug réel introduit par la migration 010 : la policy
-- "staff_can_read_staff" a été élargie pour permettre à un membre staff
-- de lire toute l'équipe, avec :
--   exists (select 1 from staff_members s2 where s2.id = auth.uid())
-- Cette sous-requête interroge la table "staff_members" DEPUIS sa propre
-- policy RLS -- Postgres réévalue donc la même policy pour l'évaluer,
-- indéfiniment ("infinite recursion detected in policy for relation
-- staff_members", erreur 42P17).
--
-- Impact plus large que la seule table staff_members : toutes les
-- policies "staff_full_access" (companies, contacts, prospects,
-- interactions, messages_generated, deals, dmh_clients,
-- prospect_status_history) font `exists (select 1 from staff_members
-- where id = ...)`, donc évaluer N'IMPORTE QUELLE ligne sur N'IMPORTE
-- laquelle de ces tables déclenche la même récursion -- cohérent avec le
-- bug remonté ("quasiment toutes les pages").
--
-- Correctif standard Postgres/Supabase : une fonction SECURITY DEFINER
-- (exécutée avec les privilèges du propriétaire, qui contourne RLS sur
-- staff_members) plutôt qu'une sous-requête directe évaluée avec les
-- privilèges de l'utilisateur courant.
-- ============================================================

create or replace function is_staff_member(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from staff_members where id = uid);
$$;

-- staff_members (self-read + lecture de toute l'équipe)
drop policy if exists "staff_can_read_staff" on staff_members;
create policy "staff_can_read_staff" on staff_members
  for select
  using (
    (select auth.uid()) = id
    or is_staff_member((select auth.uid()))
    or (select auth.role()) = 'service_role'
  );

drop policy if exists "staff_full_access" on dmh_clients;
create policy "staff_full_access" on dmh_clients
  using (is_staff_member((select auth.uid())));

drop policy if exists "staff_full_access" on companies;
create policy "staff_full_access" on companies
  using (is_staff_member((select auth.uid())));

drop policy if exists "staff_full_access" on contacts;
create policy "staff_full_access" on contacts
  using (is_staff_member((select auth.uid())));

drop policy if exists "staff_full_access" on prospects;
create policy "staff_full_access" on prospects
  using (is_staff_member((select auth.uid())));

drop policy if exists "staff_full_access" on interactions;
create policy "staff_full_access" on interactions
  using (is_staff_member((select auth.uid())));

drop policy if exists "staff_full_access" on messages_generated;
create policy "staff_full_access" on messages_generated
  using (is_staff_member((select auth.uid())));

drop policy if exists "staff_full_access" on deals;
create policy "staff_full_access" on deals
  using (is_staff_member((select auth.uid())));

drop policy if exists "staff_full_access" on prospect_status_history;
create policy "staff_full_access" on prospect_status_history
  using (is_staff_member((select auth.uid())));

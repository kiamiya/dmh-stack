-- ============================================================
-- DMH & Associés — S16 : Rendez-vous / synchro calendrier
-- (Google Calendar / Microsoft Outlook)
--
-- Deux tables :
-- - `staff_calendar_connections` : tokens OAuth d'un membre staff.
--   AUCUN accès direct depuis le navigateur (même pour son propre
--   staff_id) — contient des secrets (access_token/refresh_token).
--   Seul `service_role` (Edge Functions) peut la lire/écrire. Le staff
--   consulte son statut de connexion via la fonction
--   `get_my_calendar_connections()` (security definer), qui ne renvoie
--   jamais les colonnes de tokens.
-- - `meetings` : RDV pris, RLS standard (client_isolation/
--   staff_full_access/client_user_access) — la prise de RDV publique
--   (prospect non authentifié) passe toujours par une Edge Function
--   (`service_role`), jamais un insert direct depuis le navigateur.
-- ============================================================

create table staff_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff_members(id) on delete cascade not null,
  provider text check (provider in ('google', 'microsoft')) not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  provider_account_email text,
  -- Généré côté application (Deno crypto), pas en défaut SQL — évite une
  -- dépendance à l'extension pgcrypto pour gen_random_bytes().
  booking_token text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (staff_id, provider)
);

alter table staff_calendar_connections enable row level security;

create policy "service_role_only" on staff_calendar_connections
  using ((select auth.role()) = 'service_role');

-- Sous-ensemble sûr des colonnes (jamais les tokens), filtré sur l'appelant.
create or replace function get_my_calendar_connections()
returns table (id uuid, provider text, provider_account_email text, booking_token text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select id, provider, provider_account_email, booking_token, created_at
  from staff_calendar_connections
  where staff_id = auth.uid();
$$;

create or replace function disconnect_my_calendar(connection_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from staff_calendar_connections where id = connection_id and staff_id = auth.uid();
end;
$$;

create table meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  staff_id uuid references staff_members(id) not null,
  contact_id uuid references contacts(id),
  company_id uuid references companies(id),
  deal_id uuid references deals(id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  external_calendar_provider text check (external_calendar_provider in ('google', 'microsoft')),
  external_event_id text,
  guest_name text,
  guest_email text,
  created_at timestamptz default now()
);

alter table meetings enable row level security;

create policy "client_isolation" on meetings
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on meetings
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on meetings
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = meetings.client_id
  ));

create index if not exists idx_meetings_client_id on meetings(client_id);
create index if not exists idx_meetings_staff_id on meetings(staff_id);
create index if not exists idx_meetings_contact_id on meetings(contact_id);
create index if not exists idx_meetings_company_id on meetings(company_id);
create index if not exists idx_meetings_deal_id on meetings(deal_id);
create index if not exists idx_staff_calendar_connections_staff_id on staff_calendar_connections(staff_id);

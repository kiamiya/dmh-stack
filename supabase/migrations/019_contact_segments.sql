-- ============================================================
-- DMH & Associés — S13 : Segments dynamiques sur Contacts
--
-- `rules` (jsonb) : tableau de {field, operator, value}, même forme que
-- les conditions d'automatisation (migration 017) — logique
-- d'évaluation partagée en esprit, mais recalculée côté client (pas de
-- vue matérialisée serveur, cohérent avec le volume de données actuel).
-- ============================================================

create table contact_segments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  name text not null,
  rules jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table contact_segments enable row level security;

create policy "client_isolation" on contact_segments
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on contact_segments
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on contact_segments
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = contact_segments.client_id
  ));

create index if not exists idx_contact_segments_client_id on contact_segments(client_id);

-- ============================================================
-- DMH & Associés — S9 : Champs personnalisés (Contacts/Entreprises)
--
-- Revient sur la dette technique actée dans TESTING.md ("pas de champs
-- personnalisés — changement d'architecture à part entière, à cadrer
-- séparément si DMH le souhaite un jour") : décision explicite de Loïc
-- suite à la demande de Delphine et à l'analyse de Brevo.com (2026-09-02).
--
-- Première étape du plan "parité Brevo" (S9-S16, voir PROGRESS.md).
-- Opportunités volontairement exclues ici : leur fiche détail arrive
-- en S10, les champs personnalisés s'y ajouteront à ce moment-là.
-- ============================================================

create table custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  entity_type text check (entity_type in ('contact', 'company')) not null,
  field_key text not null,
  label text not null,
  field_type text check (field_type in ('text', 'number', 'date', 'boolean', 'select')) not null,
  select_options text[],
  created_at timestamptz default now(),
  unique (client_id, entity_type, field_key)
);

alter table custom_field_definitions enable row level security;

create policy "client_isolation" on custom_field_definitions
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on custom_field_definitions
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on custom_field_definitions
  using (exists (
    select 1 from client_users
    where id = (select auth.uid()) and client_id = custom_field_definitions.client_id
  ));

-- ------------------------------------------------------------
-- Valeurs. Une seule colonne `value` (jsonb) plutôt que 4 colonnes
-- nullable par type — texte/nombre/booléen/date se représentent tous
-- proprement en JSON, plus simple que 4 colonnes dont 3 toujours nulles.
-- ------------------------------------------------------------
create table custom_field_values (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  entity_type text check (entity_type in ('contact', 'company')) not null,
  entity_id uuid not null,
  field_definition_id uuid references custom_field_definitions(id) on delete cascade not null,
  value jsonb,
  created_at timestamptz default now(),
  unique (entity_id, field_definition_id)
);

alter table custom_field_values enable row level security;

create policy "client_isolation" on custom_field_values
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on custom_field_values
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on custom_field_values
  using (exists (
    select 1 from client_users
    where id = (select auth.uid()) and client_id = custom_field_values.client_id
  ));

create index if not exists idx_custom_field_definitions_client_id on custom_field_definitions(client_id);
create index if not exists idx_custom_field_values_client_id on custom_field_values(client_id);
create index if not exists idx_custom_field_values_entity on custom_field_values(entity_type, entity_id);
create index if not exists idx_custom_field_values_field_definition_id on custom_field_values(field_definition_id);

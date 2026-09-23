-- ============================================================
-- DMH & Associés — S38-9 (CR réunion Delphine/Loïc du 17/09) : composition
-- de la fiche entreprise propre à chaque client DMH (blocs masqués,
-- réordonnés, déplacés entre les 3 colonnes de S38-8, blocs personnalisés
-- regroupant des champs du client). Une ligne par client ; absence de
-- ligne = affichage par défaut. Le JSON est validé côté application
-- (`apps/crm/src/lib/companyLayout.ts`, `normalizeCompanyLayout`) — une
-- valeur invalide retombe sur le défaut, jamais d'erreur d'affichage.
-- ============================================================

create table company_layouts (
  client_id uuid primary key references dmh_clients(id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references staff_members(id) on delete set null
);

alter table company_layouts enable row level security;

create policy "client_isolation" on company_layouts
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on company_layouts
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on company_layouts
  using (exists (
    select 1 from client_users
    where id = (select auth.uid()) and client_id = company_layouts.client_id
  ));

create index if not exists idx_company_layouts_updated_by on company_layouts(updated_by);

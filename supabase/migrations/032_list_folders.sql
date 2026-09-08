-- ============================================================
-- DMH & Associés — S32-segments, Lot C : dossiers pour les listes
-- (arbre à 2 niveaux, comme le mockup "Relais"). Rattachés à un client
-- DMH, décision de cadrage prise avec Loïc (comme les listes
-- elles-mêmes — même modèle RLS que contact_lists/company_lists/
-- opportunity_lists, pas de dossier transversal multi-clients).
--
-- `parent_id` nullable : null = dossier racine, non-null = sous-dossier
-- (2 niveaux dans l'UI, pas de limite en base). `on delete cascade` sur
-- `parent_id` : supprimer un dossier racine supprime ses sous-dossiers.
-- Les listes elles-mêmes ne sont JAMAIS supprimées par la suppression
-- d'un dossier — `folder_id` (ajouté sur les 3 tables *_lists) est
-- `on delete set null`, une liste déclassée reste intacte.
-- ============================================================

create table list_folders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  parent_id uuid references list_folders(id) on delete cascade,
  name text not null,
  created_by uuid references staff_members(id),
  created_at timestamptz default now()
);

alter table list_folders enable row level security;

create policy "client_isolation" on list_folders
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on list_folders
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on list_folders
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = list_folders.client_id
  ));

create index if not exists idx_list_folders_client_id on list_folders(client_id);
create index if not exists idx_list_folders_parent_id on list_folders(parent_id);

alter table contact_lists add column folder_id uuid references list_folders(id) on delete set null;
alter table company_lists add column folder_id uuid references list_folders(id) on delete set null;
alter table opportunity_lists add column folder_id uuid references list_folders(id) on delete set null;

create index if not exists idx_contact_lists_folder_id on contact_lists(folder_id);
create index if not exists idx_company_lists_folder_id on company_lists(folder_id);
create index if not exists idx_opportunity_lists_folder_id on opportunity_lists(folder_id);

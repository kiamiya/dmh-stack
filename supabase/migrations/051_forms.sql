-- ============================================================
-- DMH & Associés — S39-10 (CR réunion Loïc/Delphine du 09/10) : formulaires
-- créés dans le CRM, publiés sur une page (/f/<slug>) ou intégrés à un site
-- (iframe / extrait HTML), dont les réponses alimentent directement les
-- fiches contacts du client (modèle Brevo).
--
--   forms            : un formulaire d'un client DMH ; `fields` = liste
--                      ordonnée de champs (standards contrôlés ou champs
--                      personnalisés du CRM), validée côté application
--                      (`packages/forms/src/config.ts`).
--   form_submissions : chaque envoi reçu, avec le contact créé ou retrouvé.
--
-- Le public passe par l'Edge Function `form-public` (service_role) : aucun
-- accès anonyme direct à ces tables.
-- ============================================================

create table forms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references dmh_clients(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  title text not null,
  description text,
  fields jsonb not null default '[]',
  submit_label text not null default 'Envoyer',
  success_message text not null default 'Merci, votre message a bien été envoyé.',
  redirect_url text,
  consent_text text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  client_id uuid not null references dmh_clients(id) on delete cascade,
  data jsonb not null,
  contact_id uuid references contacts(id) on delete set null,
  -- Empreinte (SHA-256) de l'adresse IP + jour, jamais l'IP elle-même :
  -- sert uniquement à limiter les envois répétés (anti-spam).
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table forms enable row level security;
alter table form_submissions enable row level security;

create policy "service_role_access" on forms using ((select auth.role()) = 'service_role');
create policy "staff_full_access" on forms using (is_staff_member((select auth.uid())));
create policy "service_role_access" on form_submissions using ((select auth.role()) = 'service_role');
create policy "staff_full_access" on form_submissions using (is_staff_member((select auth.uid())));

create index if not exists idx_forms_client on forms(client_id);
create index if not exists idx_form_submissions_form_created on form_submissions(form_id, created_at desc);
create index if not exists idx_form_submissions_client on form_submissions(client_id);
create index if not exists idx_form_submissions_contact on form_submissions(contact_id);
create index if not exists idx_form_submissions_ip on form_submissions(ip_hash, created_at);

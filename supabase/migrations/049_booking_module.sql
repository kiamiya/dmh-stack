-- ============================================================
-- DMH & Associés — S39-2 (CR réunion Loïc/Delphine du 09/10) : module de
-- prise de rendez-vous sur le modèle de Brevo.
--
--   booking_pages : une page de réservation par client DMH (lien public
--                   /rdv/<slug>), un seul hôte (pas d'attribution d'équipe).
--   meeting_types : types de RDV de la page (durée, pause entre RDV, délai
--                   minimum, horizon, visio, plages hebdomadaires, questions
--                   de préqualification, rappels, redirection).
--   meetings      : réutilisée pour les RDV pris en ligne, avec un statut
--                   (acceptation manuelle par l'hôte, décision Loïc du 09/10)
--                   et les réponses du prospect.
--
-- Les colonnes JSON (`weekly_availability`, `questions`) sont validées côté
-- application (`packages/booking/src/config.ts`) — une valeur invalide est
-- ignorée, jamais une erreur d'affichage. Les pages publiques passent par
-- l'Edge Function `booking-public` (service_role) : aucun accès anonyme
-- direct à ces tables.
-- ============================================================

create table booking_pages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references dmh_clients(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text,
  host_staff_id uuid not null references staff_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meeting_types (
  id uuid primary key default gen_random_uuid(),
  booking_page_id uuid not null references booking_pages(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  duration_minutes int not null default 30 check (duration_minutes between 5 and 480),
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 240),
  min_notice_hours int not null default 24 check (min_notice_hours between 0 and 720),
  max_days_ahead int not null default 30 check (max_days_ahead between 1 and 365),
  video_provider text not null default 'teams' check (video_provider in ('teams', 'none')),
  location text,
  timezone text not null default 'Europe/Paris',
  weekly_availability jsonb not null default
    '[{"day":1,"start":"09:00","end":"17:00"},{"day":2,"start":"09:00","end":"17:00"},{"day":3,"start":"09:00","end":"17:00"},{"day":4,"start":"09:00","end":"17:00"},{"day":5,"start":"09:00","end":"17:00"}]',
  questions jsonb not null default '[]',
  reminder_hours int[] not null default '{24}',
  redirect_url text,
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_page_id, slug)
);

alter table meetings
  add column status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  add column meeting_type_id uuid references meeting_types(id) on delete set null,
  add column guest_phone text,
  add column guest_company text,
  add column guest_notes text,
  add column answers jsonb not null default '{}',
  -- Jeton du lien « reprogrammer / annuler » envoyé au prospect (généré par
  -- l'Edge Function, jamais exposé dans le CRM).
  add column manage_token text unique,
  -- Adresse publique du CRM au moment de la demande (liens des e-mails :
  -- gérer/annuler le RDV) — capturée depuis l'origine de la page publique.
  add column public_base_url text,
  add column online_meeting_url text,
  add column decided_at timestamptz,
  add column decided_by uuid references staff_members(id) on delete set null,
  add column reminders_sent int[] not null default '{}';

comment on column meetings.status is
  'pending = demande en ligne à valider par l''hôte ; confirmed = accepté (ou RDV créé dans le CRM) ; declined = refusé ; cancelled = annulé.';

alter table booking_pages enable row level security;
alter table meeting_types enable row level security;

create policy "service_role_access" on booking_pages
  using ((select auth.role()) = 'service_role');
create policy "staff_full_access" on booking_pages
  using (is_staff_member((select auth.uid())));

create policy "service_role_access" on meeting_types
  using ((select auth.role()) = 'service_role');
create policy "staff_full_access" on meeting_types
  using (is_staff_member((select auth.uid())));

create index if not exists idx_booking_pages_host on booking_pages(host_staff_id);
create index if not exists idx_meeting_types_page on meeting_types(booking_page_id);
create index if not exists idx_meetings_meeting_type on meetings(meeting_type_id);
create index if not exists idx_meetings_decided_by on meetings(decided_by);
create index if not exists idx_meetings_status_starts on meetings(status, starts_at);

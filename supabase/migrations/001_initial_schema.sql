-- ============================================================
-- DMH & Associés — Initial schema
-- Tables: dmh_clients, companies, contacts, prospects,
--         interactions, messages_generated, deals
-- All tables have RLS enabled.
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 dmh_clients
-- ------------------------------------------------------------
create table dmh_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  offer_type text check (offer_type in ('discovery', 'standard', 'expert')) not null default 'standard',
  retainer_amount numeric(10,2) not null,
  commission_rate numeric(5,4) not null,        -- ex: 0.09 pour 9%
  contract_start_date date,
  status text check (status in ('active', 'paused', 'cancelled')) not null default 'active',
  subdomain text unique not null,               -- ex: "acme" → acme.dashboard.dmh.fr
  brand_logo_url text,
  brand_primary_color text default '#1A73E8',
  brand_name text,                              -- nom affiché dans le dashboard
  existing_contacts jsonb default '[]',         -- liste contacts préexistants (exclus attribution)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS : chaque client ne voit que ses propres données
alter table dmh_clients enable row level security;
create policy "client_isolation" on dmh_clients
  using (auth.uid()::text = id::text or auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 5.2 companies
-- ------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  name text not null,
  siren text,
  naf_code text,
  naf_label text,
  legal_form text,
  employee_range text,
  revenue numeric(15,2),
  revenue_year int,
  city text,
  address text,
  website text,
  creation_date date,
  pappers_data jsonb,                           -- réponse brute API Pappers
  ai_score int check (ai_score between 1 and 10),
  ai_score_reason text,
  created_at timestamptz default now()
);

alter table companies enable row level security;
create policy "client_isolation" on companies
  using (client_id = (select id from dmh_clients where auth.uid()::text = id::text)
         or auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 5.3 contacts
-- ------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade not null,
  client_id uuid references dmh_clients(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  job_title text,
  email text,
  email_confidence text check (email_confidence in ('valid', 'accept', 'risky', 'not_found')),
  linkedin_url text,
  phone text,
  appointment_date date,                        -- date de prise de poste
  months_in_role int,                           -- calculé automatiquement
  data_source text,                             -- 'pharow', 'dropcontact', 'linkedin', 'manual'
  created_at timestamptz default now()
);

alter table contacts enable row level security;
create policy "client_isolation" on contacts
  using (client_id = (select id from dmh_clients where auth.uid()::text = id::text)
         or auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 5.4 prospects (table centrale du pipeline)
-- ------------------------------------------------------------
create type prospect_status as enum (
  'to_enrich',
  'enriched_pappers',
  'enriched_contact',
  'ready',
  'in_sequence',
  'replied',
  'meeting_booked',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
  'not_interested'
);

create table prospects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  status prospect_status not null default 'to_enrich',
  smartlead_contact_id text,                    -- ID du contact dans Smartlead
  waalaxy_contact_id text,
  first_contact_at timestamptz,                 -- premier email/message envoyé
  last_activity_at timestamptz,
  notes text,
  is_existing_contact boolean default false,    -- exclu du calcul d'attribution
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table prospects enable row level security;
create policy "client_isolation" on prospects
  using (client_id = (select id from dmh_clients where auth.uid()::text = id::text)
         or auth.role() = 'service_role');

-- Trigger : mettre à jour last_activity_at et first_contact_at automatiquement
create or replace function update_prospect_activity()
returns trigger language plpgsql as $$
begin
  update prospects set
    last_activity_at = now(),
    first_contact_at = coalesce(first_contact_at, now()),
    updated_at = now()
  where id = new.prospect_id;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5.5 interactions
-- ------------------------------------------------------------
create type interaction_type as enum (
  'email_sent', 'email_opened', 'email_clicked', 'email_replied', 'email_unsubscribed',
  'linkedin_request_sent', 'linkedin_connected', 'linkedin_message_sent', 'linkedin_replied',
  'call', 'meeting', 'note'
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade not null,
  client_id uuid references dmh_clients(id) on delete cascade not null,
  type interaction_type not null,
  channel text check (channel in ('email', 'linkedin', 'phone', 'in_person')) not null,
  subject text,                                 -- objet de l'email
  content text,                                 -- corps du message envoyé
  metadata jsonb,                               -- données brutes webhook Smartlead/Waalaxy
  occurred_at timestamptz not null default now(),
  created_at timestamptz default now()
);

alter table interactions enable row level security;
create policy "client_isolation" on interactions
  using (client_id = (select id from dmh_clients where auth.uid()::text = id::text)
         or auth.role() = 'service_role');

create trigger after_interaction_insert
  after insert on interactions
  for each row execute function update_prospect_activity();

-- ------------------------------------------------------------
-- 5.6 messages_generated
-- ------------------------------------------------------------
create table messages_generated (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade not null,
  client_id uuid references dmh_clients(id) on delete cascade not null,
  email_subject text,
  email_body text,
  linkedin_message text,
  followup_email text,                          -- variante relance J+7
  model_used text default 'claude-sonnet-4-6',
  prompt_version text,
  approved boolean default false,               -- validé par William avant injection
  injected_at timestamptz,                      -- date d'injection dans Smartlead
  created_at timestamptz default now()
);

alter table messages_generated enable row level security;
create policy "client_isolation" on messages_generated
  using (client_id = (select id from dmh_clients where auth.uid()::text = id::text)
         or auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 5.7 deals
-- ------------------------------------------------------------
create table deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  prospect_id uuid references prospects(id),
  company_name text not null,
  deal_value numeric(12,2) not null,
  status text check (status in ('negotiation', 'won', 'lost')) not null default 'negotiation',
  signed_at date,
  first_contact_at timestamptz,                 -- copié depuis prospects.first_contact_at
  attributed_to_dmh boolean,                   -- calculé par trigger
  commission_amount numeric(10,2),              -- calculé par trigger
  commission_paid boolean default false,
  attribution_report jsonb,                     -- rapport complet pour litiges éventuels
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table deals enable row level security;
create policy "client_isolation" on deals
  using (client_id = (select id from dmh_clients where auth.uid()::text = id::text)
         or auth.role() = 'service_role');

-- ------------------------------------------------------------
-- 5.8 Trigger d'attribution (module critique)
-- ------------------------------------------------------------
create or replace function calculate_attribution()
returns trigger language plpgsql as $$
declare
  v_first_contact timestamptz;
  v_interaction_count int;
  v_commission_rate numeric;
  v_is_existing boolean;
  v_attribution_report jsonb;
begin
  -- Seulement au passage au statut 'won'
  if new.status = 'won' and (old.status is null or old.status != 'won') then

    -- Récupérer le taux de commission du client
    select commission_rate into v_commission_rate
    from dmh_clients where id = new.client_id;

    -- Récupérer le premier contact DMH avec ce prospect
    select min(occurred_at) into v_first_contact
    from interactions
    where prospect_id = new.prospect_id
      and channel in ('email', 'linkedin');

    -- Compter les interactions DMH
    select count(*) into v_interaction_count
    from interactions
    where prospect_id = new.prospect_id;

    -- Vérifier si contact préexistant
    select is_existing_contact into v_is_existing
    from prospects where id = new.prospect_id;

    -- Construire le rapport d'attribution
    select jsonb_build_object(
      'first_contact_at', v_first_contact,
      'signed_at', new.signed_at,
      'months_between', extract(month from age(new.signed_at::timestamptz, v_first_contact)),
      'interaction_count', v_interaction_count,
      'is_existing_contact', v_is_existing,
      'interactions', (
        select jsonb_agg(jsonb_build_object(
          'type', type, 'occurred_at', occurred_at, 'channel', channel
        ) order by occurred_at)
        from interactions where prospect_id = new.prospect_id
      )
    ) into v_attribution_report;

    -- Règles d'attribution :
    -- 1. Au moins 1 interaction DMH
    -- 2. Deal signé dans les 18 mois suivant le premier contact
    -- 3. Contact non préexistant
    if v_first_contact is not null
       and v_interaction_count > 0
       and extract(epoch from (new.signed_at::timestamptz - v_first_contact)) / 2592000 <= 18
       and not coalesce(v_is_existing, false)
    then
      new.attributed_to_dmh := true;
      new.commission_amount := new.deal_value * v_commission_rate;
      new.first_contact_at := v_first_contact;
    else
      new.attributed_to_dmh := false;
      new.commission_amount := 0;
    end if;

    new.attribution_report := v_attribution_report;
  end if;

  return new;
end;
$$;

create trigger deal_attribution
  before update on deals
  for each row execute function calculate_attribution();

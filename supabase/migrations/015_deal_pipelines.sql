-- ============================================================
-- DMH & Associés — S10 : Pipelines & étapes personnalisables pour les
-- Opportunités (table `deals`)
--
-- Deuxième étape du plan "parité Brevo" (S9-S16, voir PROGRESS.md).
-- Remplace les 3 statuts fixes (negotiation/won/lost) par des étapes
-- personnalisables, regroupées en pipelines, sans casser la logique
-- d'attribution déjà validée (S6, migrations 001/008) : `deals.status`
-- reste la colonne pilotant `calculate_attribution()`, mais elle est
-- désormais dérivée automatiquement des drapeaux `is_won`/`is_lost` de
-- l'étape choisie quand `stage_id` est renseigné.
-- ============================================================

create table pipelines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz default now()
);

alter table pipelines enable row level security;

create policy "client_isolation" on pipelines
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on pipelines
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on pipelines
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = pipelines.client_id
  ));

-- `client_id` dénormalisé (dérivable via pipeline_id) pour garder des
-- policies RLS simples/rapides — même principe que
-- `prospect_status_history` (migration 010).
create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  pipeline_id uuid references pipelines(id) on delete cascade not null,
  name text not null,
  position int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz default now(),
  unique (pipeline_id, position)
);

alter table pipeline_stages enable row level security;

create policy "client_isolation" on pipeline_stages
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');

create policy "staff_full_access" on pipeline_stages
  using (is_staff_member((select auth.uid())));

create policy "client_user_access" on pipeline_stages
  using (exists (
    select 1 from client_users where id = (select auth.uid()) and client_id = pipeline_stages.client_id
  ));

alter table deals add column pipeline_id uuid references pipelines(id);
alter table deals add column stage_id uuid references pipeline_stages(id);
alter table deals add column probability int check (probability between 0 and 100);
alter table deals add column expected_close_date date;

-- ------------------------------------------------------------
-- Pipeline par défaut + 3 étapes (Négociation/Gagné/Perdu) pour chaque
-- client existant, backfill des deals existants depuis leur `status`
-- actuel — aucune rupture pour les deals déjà créés.
-- ------------------------------------------------------------
insert into pipelines (client_id, name, is_default)
select id, 'Pipeline par défaut', true from dmh_clients;

insert into pipeline_stages (client_id, pipeline_id, name, position, is_won, is_lost)
select p.client_id, p.id, s.name, s.position, s.is_won, s.is_lost
from pipelines p
cross join (
  values
    ('Négociation', 1, false, false),
    ('Gagné', 2, true, false),
    ('Perdu', 3, false, true)
) as s(name, position, is_won, is_lost)
where p.is_default;

update deals d
set pipeline_id = p.id, stage_id = ps.id
from pipelines p
join pipeline_stages ps on ps.pipeline_id = p.id
where p.client_id = d.client_id
  and p.is_default
  and (
    (d.status = 'negotiation' and ps.name = 'Négociation')
    or (d.status = 'won' and ps.name = 'Gagné')
    or (d.status = 'lost' and ps.name = 'Perdu')
  );

-- ------------------------------------------------------------
-- calculate_attribution() étendue : dérive `new.status` depuis l'étape
-- choisie *avant* sa logique existante (inchangée en dessous). Une seule
-- fonction modifiée plutôt qu'un second trigger empilé, pour éviter tout
-- problème d'ordre d'exécution entre triggers BEFORE sur la même table.
-- ------------------------------------------------------------
create or replace function calculate_attribution()
returns trigger language plpgsql as $$
declare
  v_first_contact timestamptz;
  v_interaction_count int;
  v_commission_rate numeric;
  v_is_existing boolean;
  v_attribution_report jsonb;
  v_previously_won boolean;
  v_stage_is_won boolean;
  v_stage_is_lost boolean;
begin
  if new.stage_id is not null then
    select is_won, is_lost into v_stage_is_won, v_stage_is_lost
    from pipeline_stages where id = new.stage_id;

    if v_stage_is_won then
      new.status := 'won';
    elsif v_stage_is_lost then
      new.status := 'lost';
    else
      new.status := 'negotiation';
    end if;
  end if;

  if TG_OP = 'INSERT' then
    v_previously_won := false;
  else
    v_previously_won := (old.status = 'won');
  end if;

  -- Seulement au passage au statut 'won' (ou à la création directe en 'won')
  if new.status = 'won' and not v_previously_won then

    select commission_rate into v_commission_rate
    from dmh_clients where id = new.client_id;

    select min(occurred_at) into v_first_contact
    from interactions
    where prospect_id = new.prospect_id
      and channel in ('email', 'linkedin');

    select count(*) into v_interaction_count
    from interactions
    where prospect_id = new.prospect_id;

    select is_existing_contact into v_is_existing
    from prospects where id = new.prospect_id;

    select jsonb_build_object(
      'first_contact_at', v_first_contact,
      'signed_at', new.signed_at,
      'months_between',
        extract(year from age(new.signed_at::timestamptz, v_first_contact)) * 12
        + extract(month from age(new.signed_at::timestamptz, v_first_contact)),
      'interaction_count', v_interaction_count,
      'is_existing_contact', v_is_existing,
      'interactions', (
        select jsonb_agg(jsonb_build_object(
          'type', type, 'occurred_at', occurred_at, 'channel', channel
        ) order by occurred_at)
        from interactions where prospect_id = new.prospect_id
      )
    ) into v_attribution_report;

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

create index if not exists idx_pipelines_client_id on pipelines(client_id);
create index if not exists idx_pipeline_stages_client_id on pipeline_stages(client_id);
create index if not exists idx_pipeline_stages_pipeline_id on pipeline_stages(pipeline_id);
create index if not exists idx_deals_pipeline_id on deals(pipeline_id);
create index if not exists idx_deals_stage_id on deals(stage_id);

-- ============================================================
-- DMH & Associés — S40 (suite) : nouvelle tentative automatique quand une
-- étape du pipeline d'enrichissement échoue (demande de Loïc, 2026-10-16).
--
-- Jusqu'ici une erreur passagère (décalage d'horloge, indisponibilité d'une
-- API, réponse Claude inexploitable…) laissait le prospect bloqué à son
-- statut : rien ne relançait l'étape. Ajouts :
--   1. `prospects.status_changed_at` : date du dernier changement de statut
--      (aucune colonne fiable n'existait — `updated_at` n'est pas tenu).
--   2. `pipeline_retries` : une ligne par (prospect, étape) relancée, avec le
--      nombre d'essais et la requête pg_net du dernier (réponse lisible dans
--      `net._http_response`).
--   3. `retry_failed_enrichments()` + pg_cron toutes les 10 min. Une étape est
--      relancée si le prospect est resté au même statut depuis plus de
--      10 min (laisse le temps à l'appel normal d'aboutir), au plus 3 fois
--      (la 2e au moins 15 min après la 1re, la 3e au moins 30 min après la
--      2e), et seulement :
--        - si la règle système de l'étape est active pour le client ;
--        - pour un statut atteint il y a moins de 48 h (pas de relance en
--          masse d'anciennes fiches : ce serait un rattrapage, pas un essai).
--      Étapes :
--        pappers      statut to_enrich                      -> enrich-pappers
--        dropcontact  enriched_pappers, demande non soumise -> enrich-dropcontact
--                     (une demande en cours est suivie par poll-dropcontact)
--        score        données Pappers présentes, pas de score -> score-prospect
--        messages     enriched_contact, offre du client renseignée
--                     -> generate-messages (sans offre : 422 certain, inutile)
--      Les Edge Functions vérifient elles-mêmes le statut attendu : une
--      relance arrivée trop tard ne peut pas faire régresser un prospect.
-- ============================================================

-- 1. Date du dernier changement de statut
alter table prospects add column if not exists status_changed_at timestamptz;
update prospects set status_changed_at = coalesce(updated_at, created_at) where status_changed_at is null;
alter table prospects alter column status_changed_at set default now();

create or replace function public.set_prospect_status_changed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists prospects_status_changed_at on prospects;
create trigger prospects_status_changed_at before update of status on prospects
  for each row execute function public.set_prospect_status_changed_at();

-- 2. Suivi des relances
create table if not exists pipeline_retries (
  prospect_id uuid not null references prospects(id) on delete cascade,
  client_id uuid not null references dmh_clients(id) on delete cascade,
  step text not null check (step in ('pappers', 'dropcontact', 'score', 'messages')),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  last_request_id bigint,
  created_at timestamptz not null default now(),
  primary key (prospect_id, step)
);

create index if not exists pipeline_retries_client_id_idx on pipeline_retries (client_id);

alter table pipeline_retries enable row level security;

drop policy if exists "staff_full_access" on pipeline_retries;
create policy "staff_full_access" on pipeline_retries
  using (is_staff_member((select auth.uid())));

-- 3. Relance
create or replace function public.retry_failed_enrichments()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_role_key text;
  v_candidate record;
  v_request_id bigint;
begin
  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets where name = 'app_service_role_key';

  if v_service_role_key is null or v_service_role_key = '' then
    return;
  end if;

  for v_candidate in
    with candidates as (
      select p.id as prospect_id, p.client_id, 'pappers'::text as step, 'enrich-pappers'::text as fn,
             'enrich_pappers'::text as rule_key
      from prospects p
      where p.status = 'to_enrich'
      union all
      select p.id, p.client_id, 'dropcontact', 'enrich-dropcontact', 'enrich_dropcontact'
      from prospects p
      join contacts c on c.id = p.contact_id
      where p.status = 'enriched_pappers'
        and c.dropcontact_request_id is null
      union all
      select p.id, p.client_id, 'score', 'score-prospect', 'enrich_dropcontact'
      from prospects p
      join companies co on co.id = p.company_id
      where p.status in ('enriched_pappers', 'enriched_contact', 'ready')
        and co.pappers_data is not null
        and co.ai_score is null
      union all
      select p.id, p.client_id, 'messages', 'generate-messages', 'generate_messages'
      from prospects p
      join dmh_clients d on d.id = p.client_id
      where p.status = 'enriched_contact'
        and coalesce(d.offer_description, '') <> ''
    )
    select c.prospect_id, c.client_id, c.step, c.fn
    from candidates c
    join prospects p on p.id = c.prospect_id
    left join pipeline_retries r on r.prospect_id = c.prospect_id and r.step = c.step
    where p.status_changed_at < now() - interval '10 minutes'
      and p.status_changed_at > now() - interval '48 hours'
      and coalesce(r.attempts, 0) < 3
      and (r.last_attempt_at is null or r.last_attempt_at < now() - r.attempts * interval '15 minutes')
      and exists (
        select 1 from automation_rules ar
        where ar.client_id = c.client_id
          and ar.system_key = c.rule_key
          and ar.enabled = true
      )
    order by p.status_changed_at
    limit 50
  loop
    select net.http_post(
      url => 'https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/' || v_candidate.fn,
      body => jsonb_build_object('prospect_id', v_candidate.prospect_id),
      headers => jsonb_build_object('Authorization', 'Bearer ' || v_service_role_key, 'Content-Type', 'application/json'),
      timeout_milliseconds => 60000
    ) into v_request_id;

    insert into pipeline_retries (prospect_id, client_id, step, attempts, last_attempt_at, last_request_id)
    values (v_candidate.prospect_id, v_candidate.client_id, v_candidate.step, 1, now(), v_request_id)
    on conflict (prospect_id, step) do update
      set attempts = pipeline_retries.attempts + 1,
          last_attempt_at = excluded.last_attempt_at,
          last_request_id = excluded.last_request_id;
  end loop;
end;
$$;

revoke execute on function public.retry_failed_enrichments() from public, anon, authenticated;

select cron.schedule('retry-failed-enrichments', '*/10 * * * *', 'select public.retry_failed_enrichments();');

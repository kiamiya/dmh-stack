-- ============================================================
-- DMH & Associés — S40-Q : file d'attente à débit limité pour les appels du
-- pipeline d'enrichissement (demande de Loïc, 2026-10-16).
--
-- Jusqu'ici chaque prospect déclenchait ses appels immédiatement : un import
-- de 1 000 contacts aurait lancé ~1 000 appels Pappers quasi simultanés, puis
-- autant de soumissions Dropcontact (limite de débit relevée, non
-- officielle : ~250 demandes / 10 min) — refus en cascade, relances, puis
-- tâches d'échec en nombre.
--
--   1. `enrichment_rate_limits` : plafond d'appels par minute et par Edge
--      Function (réglable sans migration : update de la table).
--   2. `enrichment_queue` : chaque appel est enfilé. `enqueue_enrichment()`
--      l'envoie tout de suite si le plafond de la minute écoulée n'est pas
--      atteint (petits volumes : aucun délai, comme avant) ; sinon il attend.
--      Un même appel déjà en attente pour le même prospect n'est pas doublé.
--   3. `dispatch_enrichment_queue()` + pg_cron chaque minute : envoie les
--      appels en attente, les plus anciens d'abord, dans la limite du plafond
--      restant ; purge les appels envoyés depuis plus de 7 jours.
--   4. `run_automation_rules()` (reprise de la 053) : l'action « Enrichir »
--      passe par `enqueue_enrichment()` au lieu d'appeler directement.
--   5. `retry_failed_enrichments()` (reprise de la 055) : relances via la
--      file, et jamais pour un appel encore en attente ou parti il y a moins
--      de 10 min (sinon un gros import en file serait relancé à tort).
--
-- Hors file : les consultations de résultat Dropcontact (`poll-dropcontact`,
-- 100 max / 5 min, plafonnées à 6 h par demande en 055) — ce sont des
-- lectures, pas des soumissions.
--
-- Débit avec les plafonds par défaut, pour 1 000 contacts : Pappers ~34 min,
-- Dropcontact, score et messages ~50 min chacun — chaîne complète en ~2-3 h,
-- bien sous l'objectif de 24 h du brief.
-- Garde-fou : apps/crm/src/lib/automationMigrations.test.ts.
-- ============================================================

-- 1. Plafonds par minute
create table if not exists enrichment_rate_limits (
  function_name text primary key
    check (function_name in ('enrich-pappers', 'enrich-dropcontact', 'score-prospect', 'generate-messages')),
  per_minute int not null check (per_minute between 1 and 1000)
);

insert into enrichment_rate_limits (function_name, per_minute) values
  ('enrich-pappers', 30),
  ('enrich-dropcontact', 20),
  ('score-prospect', 20),
  ('generate-messages', 20)
on conflict (function_name) do nothing;

alter table enrichment_rate_limits enable row level security;

drop policy if exists "staff_full_access" on enrichment_rate_limits;
create policy "staff_full_access" on enrichment_rate_limits
  using (is_staff_member((select auth.uid())));

-- 2. File d'attente
create table if not exists enrichment_queue (
  id bigserial primary key,
  prospect_id uuid not null references prospects(id) on delete cascade,
  client_id uuid not null references dmh_clients(id) on delete cascade,
  function_name text not null references enrichment_rate_limits(function_name),
  source text not null check (source in ('automation', 'retry')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  request_id bigint
);

create index if not exists enrichment_queue_pending_idx
  on enrichment_queue (function_name, created_at) where sent_at is null;
create index if not exists enrichment_queue_sent_idx
  on enrichment_queue (function_name, sent_at) where sent_at is not null;
create index if not exists enrichment_queue_prospect_idx
  on enrichment_queue (prospect_id, function_name);
create index if not exists enrichment_queue_client_idx
  on enrichment_queue (client_id);

alter table enrichment_queue enable row level security;

drop policy if exists "staff_full_access" on enrichment_queue;
create policy "staff_full_access" on enrichment_queue
  using (is_staff_member((select auth.uid())));

-- Envoi d'un appel de la file (usage interne)
create or replace function public.send_enrichment(p_queue_id bigint, p_service_role_key text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row enrichment_queue%rowtype;
  v_request_id bigint;
begin
  select * into v_row from enrichment_queue where id = p_queue_id for update;
  if not found or v_row.sent_at is not null then
    return null;
  end if;

  select net.http_post(
    url => 'https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/' || v_row.function_name,
    body => jsonb_build_object('prospect_id', v_row.prospect_id),
    headers => jsonb_build_object('Authorization', 'Bearer ' || p_service_role_key, 'Content-Type', 'application/json'),
    timeout_milliseconds => 60000
  ) into v_request_id;

  update enrichment_queue set sent_at = now(), request_id = v_request_id where id = p_queue_id;
  return v_request_id;
end;
$$;

revoke execute on function public.send_enrichment(bigint, text) from public, anon, authenticated;

-- Places restantes dans la minute écoulée pour une Edge Function
create or replace function public.enrichment_budget(p_function_name text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    coalesce((select per_minute from enrichment_rate_limits where function_name = p_function_name), 0)
    - (select count(*)::int from enrichment_queue
       where function_name = p_function_name and sent_at > now() - interval '1 minute')
  );
$$;

revoke execute on function public.enrichment_budget(text) from public, anon, authenticated;

-- Enfiler un appel : envoyé tout de suite s'il reste de la place, sinon en attente.
-- Renvoie l'identifiant de requête pg_net si l'appel est parti, sinon null.
create or replace function public.enqueue_enrichment(
  p_prospect_id uuid,
  p_client_id uuid,
  p_function_name text,
  p_source text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue_id bigint;
  v_service_role_key text;
begin
  -- Même appel déjà en attente pour ce prospect : rien à ajouter.
  if exists (
    select 1 from enrichment_queue
    where prospect_id = p_prospect_id and function_name = p_function_name and sent_at is null
  ) then
    return null;
  end if;

  insert into enrichment_queue (prospect_id, client_id, function_name, source)
  values (p_prospect_id, p_client_id, p_function_name, p_source)
  returning id into v_queue_id;

  if public.enrichment_budget(p_function_name) <= 0 then
    return null;
  end if;

  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets where name = 'app_service_role_key';

  if v_service_role_key is null or v_service_role_key = '' then
    return null;
  end if;

  return public.send_enrichment(v_queue_id, v_service_role_key);
end;
$$;

revoke execute on function public.enqueue_enrichment(uuid, uuid, text, text) from public, anon, authenticated;

-- 3. Répartiteur : chaque minute, les appels en attente dans la limite du plafond
create or replace function public.dispatch_enrichment_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_role_key text;
  v_limit record;
  v_budget int;
  v_queue_id bigint;
begin
  delete from enrichment_queue where sent_at < now() - interval '7 days';

  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets where name = 'app_service_role_key';

  if v_service_role_key is null or v_service_role_key = '' then
    return;
  end if;

  for v_limit in select function_name from enrichment_rate_limits loop
    v_budget := public.enrichment_budget(v_limit.function_name);
    continue when v_budget <= 0;

    for v_queue_id in
      select id from enrichment_queue
      where function_name = v_limit.function_name and sent_at is null
      order by created_at, id
      limit v_budget
    loop
      perform public.send_enrichment(v_queue_id, v_service_role_key);
    end loop;
  end loop;
end;
$$;

revoke execute on function public.dispatch_enrichment_queue() from public, anon, authenticated;

select cron.schedule('dispatch-enrichment-queue', '* * * * *', 'select public.dispatch_enrichment_queue();');

-- 4. Moteur : l'action « Enrichir » passe par la file
create or replace function run_automation_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_entity_type text := TG_ARGV[0];
  v_stage_changed boolean := false;
  v_stage_id_text text := null;
  v_status_changed boolean := false;
  v_status_text text := null;
  v_task_contact_id uuid := null;
  v_task_company_id uuid := null;
  v_task_deal_id uuid := null;
  rule record;
  cond record;
  act record;
  v_conditions_met boolean;
  v_field_value text;
  v_condition_value text;
  v_due_date date;
  v_assigned_to uuid;
  v_title text;
  v_task_type task_type;
  v_service_role_key text;
  v_request_id bigint;
  v_function text;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Colonnes propres à chaque table : lues uniquement dans leur branche.
  if v_entity_type = 'opportunity' then
    v_task_deal_id := new.id;
    if TG_OP = 'UPDATE' then
      v_stage_changed := (new.stage_id is distinct from old.stage_id);
      if new.stage_id is not null then
        v_stage_id_text := new.stage_id::text;
      end if;
    end if;
  elsif v_entity_type = 'prospect' then
    v_task_contact_id := new.contact_id;
    v_task_company_id := new.company_id;
    v_status_text := new.status::text;
    if TG_OP = 'UPDATE' then
      v_status_changed := (new.status is distinct from old.status);
    end if;
  elsif v_entity_type = 'contact' then
    v_task_contact_id := new.id;
  elsif v_entity_type = 'company' then
    v_task_company_id := new.id;
  end if;

  for rule in
    select * from automation_rules
    where client_id = new.client_id
      and entity_type = v_entity_type
      and enabled = true
      and (
        (trigger_type = 'record_created' and TG_OP = 'INSERT')
        or (
          trigger_type = 'stage_changed'
          and v_stage_changed
          and (
            not (trigger_config ? 'to_stage_id')
            or (trigger_config ->> 'to_stage_id') = v_stage_id_text
          )
        )
        or (
          trigger_type = 'status_changed'
          and v_status_changed
          and (
            not (trigger_config ? 'to_status')
            or (trigger_config ->> 'to_status') = v_status_text
          )
        )
      )
  loop
    v_conditions_met := true;

    for cond in select * from automation_conditions where rule_id = rule.id loop
      v_field_value := to_jsonb(new) ->> cond.field;
      v_condition_value := cond.value #>> '{}';

      if cond.operator = 'eq' and v_field_value is distinct from v_condition_value then
        v_conditions_met := false;
      elsif cond.operator = 'neq' and v_field_value is not distinct from v_condition_value then
        v_conditions_met := false;
      elsif cond.operator = 'gt'
        and not (v_field_value is not null and v_condition_value is not null and v_field_value::numeric > v_condition_value::numeric)
      then
        v_conditions_met := false;
      elsif cond.operator = 'lt'
        and not (v_field_value is not null and v_condition_value is not null and v_field_value::numeric < v_condition_value::numeric)
      then
        v_conditions_met := false;
      elsif cond.operator = 'contains'
        and (v_field_value is null or v_condition_value is null or v_field_value not ilike '%' || v_condition_value || '%')
      then
        v_conditions_met := false;
      elsif cond.operator = 'is_set' and v_field_value is null then
        v_conditions_met := false;
      elsif cond.operator = 'is_not_set' and v_field_value is not null then
        v_conditions_met := false;
      end if;

      exit when not v_conditions_met;
    end loop;

    for act in
      select * from automation_actions
      where rule_id = rule.id
        and (
          branch = 'always'
          or (branch = 'if_true' and v_conditions_met)
          or (branch = 'if_false' and not v_conditions_met)
        )
      order by position
    loop
      if act.action_type = 'create_task' then
        v_title := coalesce(act.action_config ->> 'title', 'Tâche automatique');
        v_due_date := case
          when act.action_config ? 'due_in_days'
          then (current_date + ((act.action_config ->> 'due_in_days')::int) * interval '1 day')::date
          else null
        end;
        v_assigned_to := case
          when act.action_config ? 'assigned_to' and act.action_config ->> 'assigned_to' is not null
          then (act.action_config ->> 'assigned_to')::uuid
          else null
        end;
        v_task_type := case
          when act.action_config ->> 'task_type' in ('call', 'email', 'meeting', 'data')
          then (act.action_config ->> 'task_type')::task_type
          else null
        end;

        insert into tasks (client_id, title, due_date, assigned_to, contact_id, company_id, deal_id, origin, task_type)
        values (
          new.client_id,
          v_title,
          v_due_date,
          v_assigned_to,
          v_task_contact_id,
          v_task_company_id,
          v_task_deal_id,
          'automation',
          v_task_type
        );
      elsif act.action_type = 'trigger_enrichment' and v_entity_type = 'prospect' then
        -- S40 : fournisseur -> Edge Function (jusqu'ici 'enrich-' || provider,
        -- ce qui excluait le scoring et la génération des messages).
        v_function := case act.action_config ->> 'provider'
          when 'pappers' then 'enrich-pappers'
          when 'dropcontact' then 'enrich-dropcontact'
          when 'score' then 'score-prospect'
          when 'messages' then 'generate-messages'
          else null
        end;

        -- S40-Q (056) : file d'attente à débit limité — envoi immédiat sous
        -- le plafond par minute du service, sinon le répartiteur s'en charge.
        if v_function is not null then
          v_request_id := public.enqueue_enrichment(new.id, new.client_id, v_function, 'automation');
        end if;
      end if;
    end loop;
  end loop;

  return new;
end;
$$;

-- 5. Relances : via la file, jamais en double d'un appel en attente
alter table pipeline_retries add column if not exists last_queue_id bigint;

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
  v_last_error text;
  v_step_label text;
  v_hint text;
  v_task_id uuid;
  v_queue_id bigint;
begin
  -- Sans clé de service, rien ne peut partir : inutile d'enfiler des relances.
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
    select c.prospect_id, c.client_id, c.step, c.fn,
           p.contact_id, p.company_id,
           coalesce(r.attempts, 0) as attempts, r.last_attempt_at, r.last_request_id, r.last_queue_id, r.failed_at
    from candidates c
    join prospects p on p.id = c.prospect_id
    left join pipeline_retries r on r.prospect_id = c.prospect_id and r.step = c.step
    where p.status_changed_at < now() - interval '10 minutes'
      and p.status_changed_at > now() - interval '48 hours'
      and exists (
        select 1 from automation_rules ar
        where ar.client_id = c.client_id
          and ar.system_key = c.rule_key
          and ar.enabled = true
      )
      -- S40-Q (056) : pas de relance tant qu'un appel de cette étape attend
      -- son tour dans la file ou vient de partir (gros import en cours).
      and not exists (
        select 1 from enrichment_queue q
        where q.prospect_id = c.prospect_id
          and q.function_name = c.fn
          and (q.sent_at is null or q.sent_at > now() - interval '10 minutes')
      )
      and (
        -- encore une relance possible
        (coalesce(r.attempts, 0) < 3
          and (r.last_attempt_at is null or r.last_attempt_at < now() - r.attempts * interval '15 minutes'))
        -- ou les 3 relances ont échoué : tâche pour l'équipe (une seule fois)
        or (r.attempts >= 3 and r.failed_at is null and r.last_attempt_at < now() - interval '30 minutes')
      )
    order by p.status_changed_at
    limit 50
  loop
    if v_candidate.attempts < 3 then
      v_request_id := public.enqueue_enrichment(v_candidate.prospect_id, v_candidate.client_id, v_candidate.fn, 'retry');
      select max(q.id) into v_queue_id
      from enrichment_queue q
      where q.prospect_id = v_candidate.prospect_id and q.function_name = v_candidate.fn;

      insert into pipeline_retries (prospect_id, client_id, step, attempts, last_attempt_at, last_request_id, last_queue_id)
      values (v_candidate.prospect_id, v_candidate.client_id, v_candidate.step, 1, now(), v_request_id, v_queue_id)
      on conflict (prospect_id, step) do update
        set attempts = pipeline_retries.attempts + 1,
            last_attempt_at = excluded.last_attempt_at,
            last_request_id = excluded.last_request_id,
            last_queue_id = excluded.last_queue_id;
    else
      v_step_label := case v_candidate.step
        when 'pappers' then 'données entreprise (Pappers)'
        when 'dropcontact' then 'email (Dropcontact)'
        when 'score' then 'score IA'
        else 'génération des messages'
      end;
      v_hint := case v_candidate.step
        when 'pappers' then 'Vérifier le SIREN ou la raison sociale exacte de l''entreprise, puis cliquer « Enrichir » sur sa fiche.'
        when 'dropcontact' then 'Vérifier le prénom, le nom et le site web de l''entreprise, puis cliquer « Enrichir » sur la fiche contact.'
        when 'score' then 'Le score est indicatif et ne bloque pas le pipeline ; signaler à l''équipe technique s''il manque sur plusieurs fiches.'
        else 'Vérifier la description de l''offre du client, puis signaler à l''équipe technique pour relancer la génération.'
      end;

      -- Requête du dernier essai : connue tout de suite si l'appel est parti
      -- à l'enfilage, sinon renseignée par le répartiteur dans la file.
      select coalesce(r.error_msg, left(r.content::text, 300)) into v_last_error
      from net._http_response r
      where r.id = coalesce(
        v_candidate.last_request_id,
        (select q.request_id from enrichment_queue q where q.id = v_candidate.last_queue_id)
      );

      insert into tasks (client_id, title, description, due_date, contact_id, company_id, origin, task_type, priority)
      values (
        v_candidate.client_id,
        'Enrichissement en échec : ' || v_step_label,
        'L''étape « ' || v_step_label || ' » du pipeline d''enrichissement automatique a échoué après 3 tentatives. '
          || v_hint
          || coalesce(E'\n\nDernière erreur : ' || v_last_error, E'\n\nDernière erreur : non disponible (réponse expirée).'),
        current_date,
        v_candidate.contact_id,
        v_candidate.company_id,
        'automation',
        'data',
        'high'
      )
      returning id into v_task_id;

      update pipeline_retries
      set failed_at = now(), failure_task_id = v_task_id
      where prospect_id = v_candidate.prospect_id and step = v_candidate.step;
    end if;
  end loop;
end;
$$;

revoke execute on function public.retry_failed_enrichments() from public, anon, authenticated;

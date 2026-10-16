-- ============================================================
-- DMH & Associés — S40 (suite) : tâche « Enrichissement en échec » et
-- plafond du suivi Dropcontact (demandes de Loïc, 2026-10-16).
--
--   1. Après les 3 relances automatiques (migration 054), si l'étape est
--      toujours bloquée 30 min après le dernier essai, une tâche est créée
--      pour l'équipe (une seule par prospect et par étape) : priorité haute,
--      échéance le jour même, rattachée au contact et à l'entreprise, avec
--      la dernière erreur renvoyée (lue dans `net._http_response`, conservée
--      6 h par pg_net) et la marche à suivre.
--
--   2. Plafond du suivi Dropcontact. `poll-dropcontact` relançait toutes les
--      5 min, sans limite de durée, chaque demande en cours : une demande
--      perdue ou en erreur permanente côté Dropcontact aurait été consultée
--      indéfiniment (288 appels d'Edge Function par jour et par prospect,
--      et le lot de 100 par passage se serait rempli de demandes mortes).
--      Désormais :
--        - `contacts.dropcontact_submitted_at` date chaque soumission
--          (trigger : aucune modification de l'Edge Function) ;
--        - une demande n'est plus consultée au-delà de 6 h (un contact seul
--          revient en quelques minutes) ;
--        - au-delà, elle est abandonnée (identifiant effacé) : l'étape
--          « dropcontact » de `retry_failed_enrichments()` la soumet à
--          nouveau, au plus 3 fois, puis la tâche d'échec est créée.
--      Au pire, un prospect coûte donc ~3 × 72 consultations et 3
--      soumissions, au lieu d'un nombre illimité.
-- ============================================================

-- 2a. Date de soumission Dropcontact
alter table contacts add column if not exists dropcontact_submitted_at timestamptz;
update contacts set dropcontact_submitted_at = now()
where dropcontact_request_id is not null and dropcontact_submitted_at is null;

create or replace function public.set_contact_dropcontact_submitted_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.dropcontact_request_id is null then
    new.dropcontact_submitted_at := null;
  elsif new.dropcontact_request_id is distinct from old.dropcontact_request_id then
    new.dropcontact_submitted_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists contacts_dropcontact_submitted_at on contacts;
create trigger contacts_dropcontact_submitted_at before update of dropcontact_request_id on contacts
  for each row execute function public.set_contact_dropcontact_submitted_at();

-- 2b. Suivi plafonné à 6 h, puis abandon (resoumission par les relances)
create or replace function public.poll_dropcontact_enrichments()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_role_key text;
  v_prospect record;
begin
  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets where name = 'app_service_role_key';

  if v_service_role_key is null or v_service_role_key = '' then
    return;
  end if;

  -- Demandes sans réponse depuis plus de 6 h : abandonnées. L'identifiant
  -- effacé, l'étape « dropcontact » des relances (054) les soumet à nouveau.
  update contacts c
  set dropcontact_request_id = null
  where c.dropcontact_request_id is not null
    and c.dropcontact_submitted_at < now() - interval '6 hours'
    and exists (
      select 1 from prospects p
      where p.contact_id = c.id
        and p.status = 'enriched_pappers'
    );

  for v_prospect in
    select p.id
    from prospects p
    join contacts c on c.id = p.contact_id
    where p.status = 'enriched_pappers'
      and c.dropcontact_request_id is not null
      and c.dropcontact_submitted_at > now() - interval '6 hours'
      and exists (
        select 1 from automation_rules r
        where r.client_id = p.client_id
          and r.system_key = 'enrich_dropcontact'
          and r.enabled = true
      )
    -- Les plus anciennes demandes d'abord : chacune finit par être consultée
    -- même quand plus de 100 sont en cours.
    order by c.dropcontact_submitted_at
    limit 100
  loop
    perform net.http_post(
      url => 'https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/enrich-dropcontact',
      body => jsonb_build_object('prospect_id', v_prospect.id),
      headers => jsonb_build_object('Authorization', 'Bearer ' || v_service_role_key, 'Content-Type', 'application/json'),
      timeout_milliseconds => 60000
    );
  end loop;
end;
$$;

revoke execute on function public.poll_dropcontact_enrichments() from public, anon, authenticated;

-- 1. Tâche « Enrichissement en échec »
alter table pipeline_retries add column if not exists failed_at timestamptz;
alter table pipeline_retries add column if not exists failure_task_id uuid references tasks(id) on delete set null;

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
    select c.prospect_id, c.client_id, c.step, c.fn,
           p.contact_id, p.company_id,
           coalesce(r.attempts, 0) as attempts, r.last_attempt_at, r.last_request_id, r.failed_at
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

      select coalesce(r.error_msg, left(r.content::text, 300)) into v_last_error
      from net._http_response r where r.id = v_candidate.last_request_id;

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

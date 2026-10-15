-- ============================================================
-- DMH & Associés — S40 : pipeline d'enrichissement automatique PAR DÉFAUT
-- pour chaque client DMH (brief §1.3.1 : CSV Pharow -> prospects enrichis +
-- messages générés sans intervention manuelle).
--
-- Jusqu'ici le moteur d'automatisation (030 -> 048) savait lancer un
-- enrichissement, mais seulement via des règles créées à la main, client par
-- client — aucune n'existait en production, donc rien ne partait. En plus :
-- Dropcontact est asynchrone et personne ne venait chercher le résultat, et
-- `generate-messages` / `score-prospect` n'étaient pas atteignables.
--
--   1. `automation_rules.system_key` : marque les 3 règles du pipeline
--      (désactivables, non supprimables depuis le CRM), unique par client.
--   2. `run_automation_rules()` : fournisseur -> Edge Function explicite
--      (pappers, dropcontact, score, messages). Reste identique à la 048.
--   3. Contrainte sur le fournisseur de l'action "Enrichir".
--   4. `seed_default_enrichment_rules(client)` : crée les 3 règles
--        - prospect créé (statut to_enrich)      -> Pappers
--        - statut -> enriched_pappers            -> Dropcontact + score IA
--        - statut -> enriched_contact            -> génération des messages
--      Idempotent (system_key) : ne recrée jamais une règle existante, même
--      désactivée.
--   5. Trigger sur `dmh_clients` (tout nouveau client) + rattrapage des
--      clients existants.
--   6. pg_cron toutes les 5 min : relance `enrich-dropcontact` pour les
--      prospects dont la demande Dropcontact est en cours (la fonction
--      consulte le résultat et passe le prospect à enriched_contact).
--
-- Garde-fou de la fonction partagée : apps/crm/src/lib/automationMigrations.test.ts.
-- ============================================================

-- 1. Règles système
alter table automation_rules add column if not exists system_key text;

create unique index if not exists automation_rules_client_system_key_idx
  on automation_rules (client_id, system_key)
  where system_key is not null;

-- 2. Moteur : fournisseur -> Edge Function
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

        select decrypted_secret into v_service_role_key
        from vault.decrypted_secrets where name = 'app_service_role_key';

        if v_function is not null and v_service_role_key is not null and v_service_role_key <> '' then
          select net.http_post(
            url => 'https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/' || v_function,
            body => jsonb_build_object('prospect_id', new.id),
            headers => jsonb_build_object('Authorization', 'Bearer ' || v_service_role_key, 'Content-Type', 'application/json')
          ) into v_request_id;
        end if;
      end if;
    end loop;
  end loop;

  return new;
end;
$$;

-- 3. Fournisseurs autorisés pour l'action "Enrichir"
alter table automation_actions drop constraint if exists automation_actions_enrichment_provider_check;
alter table automation_actions add constraint automation_actions_enrichment_provider_check
  check (
    action_type <> 'trigger_enrichment'
    or action_config ->> 'provider' in ('pappers', 'dropcontact', 'score', 'messages')
  );

-- 4. Règles par défaut d'un client
create or replace function public.seed_default_enrichment_rules(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_id uuid;
begin
  -- Prospect créé -> Pappers
  insert into automation_rules (client_id, name, enabled, entity_type, trigger_type, trigger_config, system_key)
  values (p_client_id, 'Pipeline · 1. Enrichissement Pappers', true, 'prospect', 'record_created', '{}'::jsonb, 'enrich_pappers')
  on conflict (client_id, system_key) where system_key is not null do nothing
  returning id into v_rule_id;

  if v_rule_id is not null then
    insert into automation_conditions (client_id, rule_id, field, operator, value)
    values (p_client_id, v_rule_id, 'status', 'eq', to_jsonb('to_enrich'::text));
    insert into automation_actions (client_id, rule_id, position, action_type, action_config, branch)
    values (p_client_id, v_rule_id, 0, 'trigger_enrichment', '{"provider": "pappers"}'::jsonb, 'always');
  end if;

  -- Entreprise enrichie -> Dropcontact + score IA
  v_rule_id := null;
  insert into automation_rules (client_id, name, enabled, entity_type, trigger_type, trigger_config, system_key)
  values (p_client_id, 'Pipeline · 2. Email Dropcontact + score IA', true, 'prospect', 'status_changed', '{"to_status": "enriched_pappers"}'::jsonb, 'enrich_dropcontact')
  on conflict (client_id, system_key) where system_key is not null do nothing
  returning id into v_rule_id;

  if v_rule_id is not null then
    insert into automation_actions (client_id, rule_id, position, action_type, action_config, branch)
    values
      (p_client_id, v_rule_id, 0, 'trigger_enrichment', '{"provider": "dropcontact"}'::jsonb, 'always'),
      (p_client_id, v_rule_id, 1, 'trigger_enrichment', '{"provider": "score"}'::jsonb, 'always');
  end if;

  -- Contact enrichi -> messages
  v_rule_id := null;
  insert into automation_rules (client_id, name, enabled, entity_type, trigger_type, trigger_config, system_key)
  values (p_client_id, 'Pipeline · 3. Génération des messages', true, 'prospect', 'status_changed', '{"to_status": "enriched_contact"}'::jsonb, 'generate_messages')
  on conflict (client_id, system_key) where system_key is not null do nothing
  returning id into v_rule_id;

  if v_rule_id is not null then
    insert into automation_actions (client_id, rule_id, position, action_type, action_config, branch)
    values (p_client_id, v_rule_id, 0, 'trigger_enrichment', '{"provider": "messages"}'::jsonb, 'always');
  end if;
end;
$$;

revoke execute on function public.seed_default_enrichment_rules(uuid) from public, anon, authenticated;

-- 5. Tout nouveau client + rattrapage des clients existants
create or replace function public.seed_default_enrichment_rules_on_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_enrichment_rules(new.id);
  return new;
end;
$$;

revoke execute on function public.seed_default_enrichment_rules_on_client() from public, anon, authenticated;

drop trigger if exists dmh_clients_default_enrichment_rules on dmh_clients;
create trigger dmh_clients_default_enrichment_rules after insert on dmh_clients
  for each row execute function public.seed_default_enrichment_rules_on_client();

select public.seed_default_enrichment_rules(id) from dmh_clients;

-- 6. Résultats Dropcontact (API asynchrone) : relance toutes les 5 minutes
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

  for v_prospect in
    select p.id
    from prospects p
    join contacts c on c.id = p.contact_id
    where p.status = 'enriched_pappers'
      and c.dropcontact_request_id is not null
      and exists (
        select 1 from automation_rules r
        where r.client_id = p.client_id
          and r.system_key = 'enrich_dropcontact'
          and r.enabled = true
      )
    -- Ordre aléatoire : une demande bloquée côté Dropcontact (erreur répétée)
    -- ne peut pas monopoliser le lot au détriment des autres.
    order by random()
    limit 100
  loop
    perform net.http_post(
      url => 'https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/enrich-dropcontact',
      body => jsonb_build_object('prospect_id', v_prospect.id),
      headers => jsonb_build_object('Authorization', 'Bearer ' || v_service_role_key, 'Content-Type', 'application/json')
    );
  end loop;
end;
$$;

revoke execute on function public.poll_dropcontact_enrichments() from public, anon, authenticated;

select cron.schedule('poll-dropcontact', '*/5 * * * *', 'select public.poll_dropcontact_enrichments();');

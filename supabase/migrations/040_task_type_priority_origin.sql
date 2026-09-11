-- ============================================================
-- DMH & Associés — correction Claude Design (audit des 12 écrans) :
-- l'écran Tâches du mockup montre des colonnes Type (Appel/Email/RDV/
-- Donnée), Priorité et Origine (Manuel/Automatisation/...) absentes de
-- notre table `tasks`. Ajout minimal, pas de rétro-remplissage inventé
-- (`task_type` reste nullable — on ne devine pas le type des tâches
-- déjà créées ; `priority` défaut 'normal' ; `origin` défaut 'manual',
-- mis à 'automation' uniquement par le trigger `run_automation_rules()`
-- qui insère déjà des tâches — jamais par un formulaire manuel).
-- ============================================================

create type task_type as enum ('call', 'email', 'meeting', 'data');
create type task_priority as enum ('low', 'normal', 'high');

alter table tasks add column task_type task_type;
alter table tasks add column priority task_priority not null default 'normal';
alter table tasks add column origin text not null default 'manual';

-- Redéfinition de run_automation_rules() (dernière version : migration
-- 035) — seul changement : origin = 'automation' sur les tâches créées
-- par ce trigger, reste identique sinon.
create or replace function run_automation_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_entity_type text := TG_ARGV[0];
  rule record;
  cond record;
  act record;
  v_conditions_met boolean;
  v_field_value text;
  v_condition_value text;
  v_due_date date;
  v_assigned_to uuid;
  v_title text;
  v_service_role_key text;
  v_request_id bigint;
begin
  if pg_trigger_depth() > 1 then
    return new;
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
          and v_entity_type = 'opportunity'
          and TG_OP = 'UPDATE'
          and new.stage_id is distinct from old.stage_id
          and (
            not (trigger_config ? 'to_stage_id')
            or (trigger_config ->> 'to_stage_id') = new.stage_id::text
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

        insert into tasks (client_id, title, due_date, assigned_to, contact_id, company_id, deal_id, origin)
        values (
          new.client_id,
          v_title,
          v_due_date,
          v_assigned_to,
          case when v_entity_type = 'contact' then new.id else null end,
          case when v_entity_type = 'company' then new.id else null end,
          case when v_entity_type = 'opportunity' then new.id else null end,
          'automation'
        );
      elsif act.action_type = 'trigger_enrichment' and v_entity_type = 'prospect' then
        select decrypted_secret into v_service_role_key
        from vault.decrypted_secrets where name = 'app_service_role_key';

        if v_service_role_key is not null and v_service_role_key <> '' then
          select net.http_post(
            url => 'https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/enrich-' || (act.action_config ->> 'provider'),
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

-- ============================================================
-- DMH & Associés — Correction bug bloquant : run_automation_rules()
-- (migration 017) référençait `new.stage_id`/`old.stage_id` directement
-- dans la requête SQL de sélection des règles — cette requête est
-- partagée par les 4 triggers (contacts/companies/deals/tasks), or seul
-- `deals` a une colonne `stage_id`. PL/pgSQL résout les champs d'un
-- RECORD au moment où l'instruction SQL contenant la référence
-- s'exécute, sans court-circuit possible à l'intérieur d'une même
-- requête — donc même protégée par `entity_type = 'opportunity'` dans
-- le même AND, la référence cassait dès la création d'un simple contact
-- ou d'une entreprise ("record \"new\" has no field \"stage_id\"").
--
-- Corrigé en calculant `v_stage_changed`/`v_stage_id_text` via de
-- simples affectations plpgsql, chacune protégée par un bloc IF
-- distinct — une instruction plpgsql n'est résolue/exécutée que si sa
-- branche est réellement empruntée, contrairement à une requête SQL
-- entière où toutes les références de colonnes doivent être valides dès
-- la planification.
-- ============================================================

create or replace function run_automation_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_entity_type text := TG_ARGV[0];
  v_stage_changed boolean := false;
  v_stage_id_text text := null;
  rule record;
  cond record;
  act record;
  v_conditions_met boolean;
  v_field_value text;
  v_condition_value text;
  v_due_date date;
  v_assigned_to uuid;
  v_title text;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if v_entity_type = 'opportunity' and TG_OP = 'UPDATE' then
    v_stage_changed := (new.stage_id is distinct from old.stage_id);
    if new.stage_id is not null then
      v_stage_id_text := new.stage_id::text;
    end if;
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
      end if;

      exit when not v_conditions_met;
    end loop;

    if not v_conditions_met then
      continue;
    end if;

    for act in select * from automation_actions where rule_id = rule.id order by position loop
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

        insert into tasks (client_id, title, due_date, assigned_to, contact_id, company_id, deal_id)
        values (
          new.client_id,
          v_title,
          v_due_date,
          v_assigned_to,
          case when v_entity_type = 'contact' then new.id else null end,
          case when v_entity_type = 'company' then new.id else null end,
          case when v_entity_type = 'opportunity' then new.id else null end
        );
      end if;
    end loop;
  end loop;

  return new;
end;
$$;

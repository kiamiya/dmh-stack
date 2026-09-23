-- ============================================================
-- DMH & Associés — S38-1 : RÉGRESSION du correctif 018.
--
-- Les réécritures de run_automation_rules() en 030, 035 puis 040 sont
-- reparties de la version 017 et ont réintroduit `new.stage_id` /
-- `old.stage_id` directement dans la requête SQL de sélection des règles.
-- Seule `deals` a une colonne `stage_id` : depuis l'application de 030
-- (2026-09-07), TOUTE insertion dans contacts / companies / prospects /
-- tasks échoue avec `record "new" has no field "stage_id"` — y compris
-- quand le client n'a aucune règle d'automatisation (la référence est
-- résolue à l'exécution de la requête, pas par ligne). Symptôme observé
-- en démo le 18/09 : import CSV "0 contact créé" (et 0 entreprise) —
-- aucune entreprise ni aucun contact créé en production depuis le 03/09.
--
-- Corrigé en reprenant la version 040 (origin = 'automation',
-- trigger_enrichment, is_not_set…) avec le schéma de 018 :
-- `v_stage_changed` / `v_stage_id_text` calculés par affectations
-- plpgsql protégées par un IF, jamais référencés dans la requête.
-- Garde-fou : apps/crm/src/lib/automationMigrations.test.ts vérifie que
-- la dernière définition de la fonction ne contient plus `new.stage_id`
-- dans la requête.
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
  v_service_role_key text;
  v_request_id bigint;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Seule `deals` (entity_type 'opportunity') a une colonne stage_id :
  -- ne jamais la référencer ailleurs que dans cette branche.
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

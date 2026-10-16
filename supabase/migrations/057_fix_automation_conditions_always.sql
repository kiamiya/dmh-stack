-- ============================================================
-- DMH & Associés — correctif du moteur d'automatisation : les conditions
-- d'une règle à action unique étaient ignorées depuis la migration 030.
--
-- En 017, une règle dont les conditions étaient fausses ne faisait rien.
-- La 030 (branches Oui/Non) a remplacé ce `continue` par un filtre sur la
-- branche des actions, où 'always' s'exécutait « toujours » — y compris
-- quand les conditions étaient fausses. Or le CRM enregistre en 'always'
-- l'action de toute règle sans branchement : depuis le 2026-09-07, chacune
-- de ces règles agissait en ignorant ses conditions (le commentaire de la
-- 030 la disait rétro-compatible, à tort).
--
-- Trouvé le 2026-10-16 en testant la file d'attente (056) : la règle
-- système « prospect créé, si statut = À enrichir » a lancé Pappers sur des
-- prospects créés au statut « Qualifié » (sans effet : la fonction les
-- refuse, mais un appel gaspillé par prospect).
--
-- `run_automation_rules()` reprise de la 056 à l'identique, seul le filtre
-- des actions change : 'always' et 'if_true' si les conditions sont
-- vraies, 'if_false' sinon. Une règle sans condition n'est pas concernée
-- (conditions vraies par défaut).
-- Garde-fou : apps/crm/src/lib/automationMigrations.test.ts.
-- ============================================================

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
          -- 057 : une action unique ('always') ne part que si les conditions
          -- sont vraies (comportement de la 017, perdu en 030).
          (branch in ('always', 'if_true') and v_conditions_met)
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

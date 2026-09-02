-- ============================================================
-- DMH & Associés — S12 : Moteur d'automatisation générique
-- (déclencheur/condition/action)
--
-- Périmètre v1 volontairement réduit par rapport au plan initial, pour
-- rester sûr et testable :
-- - Déclencheurs : `record_created` (INSERT) et `stage_changed`
--   (UPDATE de deals.stage_id, opportunités uniquement) — le cas
--   `field_updated` générique est écarté pour l'instant (détection
--   fiable d'un changement de champ arbitraire trop complexe/risquée
--   pour cette itération).
-- - Actions : uniquement `create_task` — `update_field` écarté
--   (nécessiterait du SQL dynamique sur des noms de colonnes, risque
--   d'injection à éviter). La contrainte CHECK ne liste QUE
--   'create_task' : plus honnête qu'une valeur acceptée en base mais
--   silencieusement ignorée à l'exécution.
-- - Conditions : combinées en ET uniquement (pas de groupes OU).
--
-- `pg_trigger_depth() > 1` en garde-fou contre toute récursion (ex. une
-- règle sur les tâches qui créerait une tâche en déclencherait une
-- autre à l'infini) — n'exécute jamais l'automatisation pour une ligne
-- insérée par l'automatisation elle-même.
-- ============================================================

create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  name text not null,
  enabled boolean not null default true,
  entity_type text check (entity_type in ('contact', 'company', 'opportunity', 'task')) not null,
  trigger_type text check (trigger_type in ('record_created', 'stage_changed')) not null,
  trigger_config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table automation_rules enable row level security;

create policy "client_isolation" on automation_rules
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');
create policy "staff_full_access" on automation_rules
  using (is_staff_member((select auth.uid())));
create policy "client_user_access" on automation_rules
  using (exists (select 1 from client_users where id = (select auth.uid()) and client_id = automation_rules.client_id));

create table automation_conditions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  rule_id uuid references automation_rules(id) on delete cascade not null,
  field text not null,
  operator text check (operator in ('eq', 'neq', 'gt', 'lt', 'contains', 'is_set')) not null,
  value jsonb,
  created_at timestamptz default now()
);

alter table automation_conditions enable row level security;

create policy "client_isolation" on automation_conditions
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');
create policy "staff_full_access" on automation_conditions
  using (is_staff_member((select auth.uid())));
create policy "client_user_access" on automation_conditions
  using (exists (select 1 from client_users where id = (select auth.uid()) and client_id = automation_conditions.client_id));

create table automation_actions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  rule_id uuid references automation_rules(id) on delete cascade not null,
  position int not null,
  action_type text check (action_type in ('create_task')) not null,
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table automation_actions enable row level security;

create policy "client_isolation" on automation_actions
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');
create policy "staff_full_access" on automation_actions
  using (is_staff_member((select auth.uid())));
create policy "client_user_access" on automation_actions
  using (exists (select 1 from client_users where id = (select auth.uid()) and client_id = automation_actions.client_id));

create index if not exists idx_automation_rules_client_id on automation_rules(client_id);
create index if not exists idx_automation_conditions_rule_id on automation_conditions(rule_id);
create index if not exists idx_automation_conditions_client_id on automation_conditions(client_id);
create index if not exists idx_automation_actions_rule_id on automation_actions(rule_id);
create index if not exists idx_automation_actions_client_id on automation_actions(client_id);

-- ------------------------------------------------------------
-- Exécution. `TG_ARGV[0]` porte le entity_type associé à la table sur
-- laquelle le trigger est attaché (une même fonction, 4 triggers).
-- ------------------------------------------------------------
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
begin
  -- Garde-fou anti-récursion : une ligne insérée PAR ce trigger (ex. une
  -- tâche créée par une action create_task) ne redéclenche jamais
  -- l'automatisation elle-même.
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

create trigger contacts_automation after insert on contacts
  for each row execute function run_automation_rules('contact');

create trigger companies_automation after insert on companies
  for each row execute function run_automation_rules('company');

create trigger deals_automation after insert or update on deals
  for each row execute function run_automation_rules('opportunity');

create trigger tasks_automation after insert on tasks
  for each row execute function run_automation_rules('task');

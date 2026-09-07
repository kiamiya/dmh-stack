-- ============================================================
-- DMH & Associés — S32 (design "Relais") : étendre le moteur
-- d'automatisation (migration 017) — branches Oui/Non + étape
-- "Enrichir" déclenchant réellement le pipeline d'enrichissement.
--
-- Décision avec Loïc (voir plan de session) : le moteur reste
-- synchrone (même transaction que l'INSERT/UPDATE déclencheur) — les
-- conditions doivent être évaluables au moment du déclenchement, pas
-- sur un résultat asynchrone futur (Dropcontact est asynchrone, cf.
-- enrich-dropcontact). "Enrichir" est une action "tire et oublie" : on
-- ne peut pas brancher dans la MÊME règle sur le résultat de CET
-- enrichissement.
--
-- Rétro-compatibilité stricte : les règles existantes n'ont aucune
-- action `if_true`/`if_false` (colonne `branch` par défaut 'always')
-- — leur comportement après cette migration doit être identique à
-- avant (à valider manuellement, voir TESTING.md, avant tout autre
-- test).
-- ============================================================

-- 1. Branche Oui/Non sur les actions.
alter table automation_actions
  add column branch text not null default 'always'
  check (branch in ('always', 'if_true', 'if_false'));

-- 2. `entity_type` gagne 'prospect' (contrainte retrouvée dynamiquement
--    via pg_constraint, comme en migration 016/028 — plus sûr qu'un nom
--    de contrainte deviné).
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'automation_rules'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%entity_type%'
  loop
    execute format('alter table automation_rules drop constraint %I', r.conname);
  end loop;
end $$;

alter table automation_rules
  add constraint automation_rules_entity_type_check
  check (entity_type in ('contact', 'company', 'opportunity', 'task', 'prospect'));

-- 3. `action_type` gagne 'trigger_enrichment'
--    (action_config: {"provider": "pappers" | "dropcontact"}).
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'automation_actions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%action_type%'
  loop
    execute format('alter table automation_actions drop constraint %I', r.conname);
  end loop;
end $$;

alter table automation_actions
  add constraint automation_actions_action_type_check
  check (action_type in ('create_task', 'trigger_enrichment'));

-- 4. Nouveau trigger sur prospects (record_created uniquement, comme
--    contacts/companies) — permet enfin de déclencher une automatisation
--    sur "nouveau prospect créé" (câblage jusqu'ici manuel/orchestré,
--    documenté comme tel depuis S2 dans enrich-pappers/index.ts).
create trigger prospects_automation after insert on prospects
  for each row execute function run_automation_rules('prospect');

-- 5. `pg_net` pour appeler une Edge Function depuis le trigger — pattern
--    standard Supabase pour ce besoin. Vérifié absent sur ce projet
--    avant cette migration (`supabase db query --linked`).
create extension if not exists pg_net;

-- 6. Emplacement du secret nécessaire à l'appel HTTP — la VALEUR n'est
--    JAMAIS posée ici (comme .env.local, jamais commitée). Loïc doit
--    remplacer la valeur lui-même après cette migration :
--      select vault.update_secret(
--        (select id from vault.secrets where name = 'app_service_role_key'),
--        '<vraie clé service_role>'
--      );
--    L'URL du projet n'est pas un secret (domaine public), posée en dur
--    dans la fonction ci-dessous.
select vault.create_secret('', 'app_service_role_key', 'Clé service_role — à remplacer manuellement, jamais commitée (S32)')
where not exists (select 1 from vault.secrets where name = 'app_service_role_key');

-- 7. Réécriture de run_automation_rules() : branches + trigger_enrichment.
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

    -- Avant (migration 017) : `if not v_conditions_met then continue;`
    -- sautait TOUTE la règle. Désormais : exécute les actions 'always'
    -- toujours, 'if_true' si les conditions passent, 'if_false' sinon —
    -- rétro-compatible (aucune règle existante n'a d'action if_true/
    -- if_false, donc ce filtre ne change rien pour elles).
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

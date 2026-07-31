-- ============================================================
-- DMH & Associés — Correctif du trigger d'attribution (S6)
-- Deux bugs trouvés en préparant les scénarios de test du trigger
-- calculate_attribution() (001_initial_schema.sql, section 5.8) :
--
-- 1) Le trigger ne se déclenchait que sur UPDATE ("before update on
--    deals"), jamais sur INSERT. Le brief §1.3.3 décrit "Dès la saisie
--    [d'un deal signé], le module d'attribution calcule automatiquement"
--    — un calcul dès la création, pas seulement lors d'un changement de
--    statut ultérieur. Le test "old.status is null or old.status !=
--    'won'" dans la fonction originale n'a de sens que si l'auteur
--    voulait déjà couvrir l'INSERT (status est "not null", donc old.status
--    ne peut jamais être null sur un UPDATE) — mais référencer un champ de
--    OLD pendant un INSERT lève une erreur PL/pgSQL ("record \"old\" is
--    not assigned yet"), donc ajouter "before insert or update" sans
--    adapter le corps de la fonction aurait planté à l'exécution.
--
-- 2) "months_between" dans attribution_report utilisait
--    extract(month from age(...)), qui ne renvoie que la composante mois
--    de l'intervalle (0-11), pas le nombre total de mois — faux pour tout
--    écart de plus d'un an. La vraie règle d'éligibilité (extract(epoch
--    from ...) / 2592000 <= 18) n'est pas affectée, seul ce champ
--    informatif du rapport (documenté "pour litiges éventuels") l'était.
-- ============================================================

create or replace function calculate_attribution()
returns trigger language plpgsql as $$
declare
  v_first_contact timestamptz;
  v_interaction_count int;
  v_commission_rate numeric;
  v_is_existing boolean;
  v_attribution_report jsonb;
  v_previously_won boolean;
begin
  if TG_OP = 'INSERT' then
    v_previously_won := false;
  else
    v_previously_won := (old.status = 'won');
  end if;

  -- Seulement au passage au statut 'won' (ou à la création directe en 'won')
  if new.status = 'won' and not v_previously_won then

    -- Récupérer le taux de commission du client
    select commission_rate into v_commission_rate
    from dmh_clients where id = new.client_id;

    -- Récupérer le premier contact DMH avec ce prospect
    select min(occurred_at) into v_first_contact
    from interactions
    where prospect_id = new.prospect_id
      and channel in ('email', 'linkedin');

    -- Compter les interactions DMH
    select count(*) into v_interaction_count
    from interactions
    where prospect_id = new.prospect_id;

    -- Vérifier si contact préexistant
    select is_existing_contact into v_is_existing
    from prospects where id = new.prospect_id;

    -- Construire le rapport d'attribution
    select jsonb_build_object(
      'first_contact_at', v_first_contact,
      'signed_at', new.signed_at,
      'months_between',
        extract(year from age(new.signed_at::timestamptz, v_first_contact)) * 12
        + extract(month from age(new.signed_at::timestamptz, v_first_contact)),
      'interaction_count', v_interaction_count,
      'is_existing_contact', v_is_existing,
      'interactions', (
        select jsonb_agg(jsonb_build_object(
          'type', type, 'occurred_at', occurred_at, 'channel', channel
        ) order by occurred_at)
        from interactions where prospect_id = new.prospect_id
      )
    ) into v_attribution_report;

    -- Règles d'attribution :
    -- 1. Au moins 1 interaction DMH
    -- 2. Deal signé dans les 18 mois suivant le premier contact
    -- 3. Contact non préexistant
    if v_first_contact is not null
       and v_interaction_count > 0
       and extract(epoch from (new.signed_at::timestamptz - v_first_contact)) / 2592000 <= 18
       and not coalesce(v_is_existing, false)
    then
      new.attributed_to_dmh := true;
      new.commission_amount := new.deal_value * v_commission_rate;
      new.first_contact_at := v_first_contact;
    else
      new.attributed_to_dmh := false;
      new.commission_amount := 0;
    end if;

    new.attribution_report := v_attribution_report;
  end if;

  return new;
end;
$$;

drop trigger if exists deal_attribution on deals;

create trigger deal_attribution
  before insert or update on deals
  for each row execute function calculate_attribution();

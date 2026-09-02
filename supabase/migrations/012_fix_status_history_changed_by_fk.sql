-- ============================================================
-- DMH & Associés — Correction bug bloquant : violation FK sur
-- prospect_status_history.changed_by
--
-- Bug réel trouvé en testant le nouveau formulaire "Ajouter un contact"
-- (apps/crm) : le trigger log_prospect_status_change() (migration 010)
-- insère toujours changed_by = auth.uid(), en supposant que l'utilisateur
-- courant est forcément un membre staff. Mais prospect_status_history.
-- changed_by référence staff_members(id) -- dès qu'un compte non-staff
-- (ex. un client, autorisé par la policy RLS "client_user_access" à
-- insérer/modifier un prospect) déclenche ce trigger, la contrainte FK
-- échoue et fait échouer l'INSERT/UPDATE entier sur "prospects" (erreur
-- Postgres 23503, HTTP 409 côté PostgREST).
--
-- Corrigé en ne renseignant changed_by que si l'UID courant est bien
-- présent dans staff_members -- sinon NULL, cohérent avec la sémantique
-- déjà documentée de cette colonne ("NULL si changement automatique").
-- La fonction reste SECURITY DEFINER (migration 010), donc cette lecture
-- de staff_members contourne RLS sans risque de récursion (même
-- mécanisme que is_staff_member(), migration 011).
-- ============================================================

create or replace function log_prospect_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  acting_staff_id uuid;
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    select id into acting_staff_id from staff_members where id = auth.uid();

    insert into prospect_status_history (prospect_id, client_id, old_status, new_status, changed_by)
    values (
      new.id,
      new.client_id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      acting_staff_id
    );
  end if;
  return new;
end;
$$;

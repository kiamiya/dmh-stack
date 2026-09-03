-- ============================================================
-- DMH & Associés — S14 : Fusion/dédoublonnage de contacts
--
-- Fonction RPC plutôt qu'une séquence d'updates séparés depuis le
-- navigateur : garantit l'atomicité (soit tout réussit, soit rien n'est
-- modifié) — les updates client-side successifs auraient pu laisser des
-- données à moitié réassignées en cas d'échec en cours de route.
--
-- `security definer` contourne RLS en interne (nécessaire pour toucher
-- plusieurs tables d'un coup), donc la vérification `is_staff_member()`
-- au tout début est le SEUL contrôle d'accès de cette fonction — pas de
-- filet de sécurité RLS derrière.
-- ============================================================

create or replace function merge_contacts(keep_id uuid, remove_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_keep_client_id uuid;
  v_remove_client_id uuid;
begin
  if not is_staff_member(auth.uid()) then
    raise exception 'insufficient_privilege: merge_contacts reserved to staff';
  end if;

  if keep_id = remove_id then
    raise exception 'keep_id and remove_id must differ';
  end if;

  select client_id into v_keep_client_id from contacts where id = keep_id;
  select client_id into v_remove_client_id from contacts where id = remove_id;

  if v_keep_client_id is null or v_remove_client_id is null then
    raise exception 'contact not found';
  end if;
  if v_keep_client_id <> v_remove_client_id then
    raise exception 'cannot merge contacts belonging to different clients';
  end if;

  -- contact_companies : unique (contact_id, company_id) — retire d'abord
  -- les relations en double avant de réassigner le reste.
  delete from contact_companies cc_remove
  where cc_remove.contact_id = remove_id
    and exists (
      select 1 from contact_companies cc_keep
      where cc_keep.contact_id = keep_id and cc_keep.company_id = cc_remove.company_id
    );
  update contact_companies set contact_id = keep_id where contact_id = remove_id;

  -- custom_field_values : unique (entity_id, field_definition_id) — même principe.
  delete from custom_field_values cfv_remove
  where cfv_remove.entity_type = 'contact' and cfv_remove.entity_id = remove_id
    and exists (
      select 1 from custom_field_values cfv_keep
      where cfv_keep.entity_type = 'contact' and cfv_keep.entity_id = keep_id
        and cfv_keep.field_definition_id = cfv_remove.field_definition_id
    );
  update custom_field_values set entity_id = keep_id
  where entity_type = 'contact' and entity_id = remove_id;

  -- Pas de contrainte unique sur ces colonnes : réassignation directe.
  update deals set contact_id = keep_id where contact_id = remove_id;
  update tasks set contact_id = keep_id where contact_id = remove_id;
  update prospects set contact_id = keep_id where contact_id = remove_id;

  delete from contacts where id = remove_id;
end;
$$;

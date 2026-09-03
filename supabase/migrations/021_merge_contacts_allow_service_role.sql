-- ============================================================
-- DMH & Associés — merge_contacts() (migration 020) n'autorisait que
-- les comptes staff authentifiés (is_staff_member(auth.uid())), alors
-- que auth.uid() est NULL pour le rôle service_role (scripts/tests) —
-- incohérent avec le reste du schéma où chaque contrôle d'accès
-- autorise explicitement `auth.role() = 'service_role'` en plus des
-- policies RLS normales. Trouvé en testant la fonction avec un script
-- jetable avant de l'exposer dans l'UI.
-- ============================================================

create or replace function merge_contacts(keep_id uuid, remove_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_keep_client_id uuid;
  v_remove_client_id uuid;
begin
  if not is_staff_member(auth.uid()) and auth.role() <> 'service_role' then
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

  delete from contact_companies cc_remove
  where cc_remove.contact_id = remove_id
    and exists (
      select 1 from contact_companies cc_keep
      where cc_keep.contact_id = keep_id and cc_keep.company_id = cc_remove.company_id
    );
  update contact_companies set contact_id = keep_id where contact_id = remove_id;

  delete from custom_field_values cfv_remove
  where cfv_remove.entity_type = 'contact' and cfv_remove.entity_id = remove_id
    and exists (
      select 1 from custom_field_values cfv_keep
      where cfv_keep.entity_type = 'contact' and cfv_keep.entity_id = keep_id
        and cfv_keep.field_definition_id = cfv_remove.field_definition_id
    );
  update custom_field_values set entity_id = keep_id
  where entity_type = 'contact' and entity_id = remove_id;

  update deals set contact_id = keep_id where contact_id = remove_id;
  update tasks set contact_id = keep_id where contact_id = remove_id;
  update prospects set contact_id = keep_id where contact_id = remove_id;

  delete from contacts where id = remove_id;
end;
$$;

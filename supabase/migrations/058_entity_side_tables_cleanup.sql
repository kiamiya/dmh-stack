-- ============================================================
-- DMH & Associés — lignes orphelines : nettoyage automatique à la
-- suppression d'une fiche + fusion de contacts complétée (2026-10-16,
-- demande de Loïc après la découverte de 8 lignes `field_provenance` et
-- 1 ligne `custom_field_values` rattachées à des fiches supprimées).
--
-- Cause : ces deux tables désignent leur fiche par (entity_type, entity_id)
-- — une référence polymorphe, sans clé étrangère possible —, donc rien ne
-- les nettoyait quand la fiche disparaissait : suppression directe, ou en
-- cascade (supprimer une entreprise supprime ses contacts), ou fusion de
-- contacts (`merge_contacts`, 021, qui transférait les champs personnalisés
-- mais pas la traçabilité des champs enrichis, apparue en 042).
--
--   1. Trigger `after delete` sur contacts, companies et deals : supprime
--      les lignes `field_provenance` / `custom_field_values` de la fiche
--      (se déclenche aussi pour chaque ligne supprimée en cascade).
--   2. Purge des orphelins existants.
--   3. `merge_contacts()` (reprise de la 021) transfère désormais aussi,
--      au lieu de les perdre ou d'échouer, ce que les tables apparues
--      depuis ont rattaché au contact supprimé :
--        - traçabilité des champs enrichis (042) — perdue avant ;
--        - appartenance aux listes (S20) et contacts d'opportunité (034) —
--          supprimées en cascade avant, donc perdues ;
--        - rendez-vous (049) — la fusion ÉCHOUAIT (clé étrangère) dès que
--          le contact supprimé avait un rendez-vous ;
--        - réponses de formulaire (051) — détachées avant.
--      Doublons évités grâce aux contraintes d'unicité de chaque table : la
--      ligne du contact conservé l'emporte.
-- ============================================================

-- 1. Nettoyage à la suppression d'une fiche
create or replace function public.delete_entity_side_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := TG_ARGV[0];
begin
  if v_entity_type in ('contact', 'company') then
    delete from field_provenance where entity_type = v_entity_type and entity_id = old.id;
  end if;
  delete from custom_field_values where entity_type = v_entity_type and entity_id = old.id;
  return old;
end;
$$;

revoke execute on function public.delete_entity_side_rows() from public, anon, authenticated;

drop trigger if exists contacts_delete_side_rows on contacts;
create trigger contacts_delete_side_rows after delete on contacts
  for each row execute function public.delete_entity_side_rows('contact');

drop trigger if exists companies_delete_side_rows on companies;
create trigger companies_delete_side_rows after delete on companies
  for each row execute function public.delete_entity_side_rows('company');

drop trigger if exists deals_delete_side_rows on deals;
create trigger deals_delete_side_rows after delete on deals
  for each row execute function public.delete_entity_side_rows('opportunity');

-- 2. Orphelins existants
delete from field_provenance f
where (f.entity_type = 'contact' and not exists (select 1 from contacts x where x.id = f.entity_id))
   or (f.entity_type = 'company' and not exists (select 1 from companies x where x.id = f.entity_id));

delete from custom_field_values v
where (v.entity_type = 'contact' and not exists (select 1 from contacts x where x.id = v.entity_id))
   or (v.entity_type = 'company' and not exists (select 1 from companies x where x.id = v.entity_id))
   or (v.entity_type = 'opportunity' and not exists (select 1 from deals x where x.id = v.entity_id));

-- 3. Fusion de contacts complète
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

  -- Entreprises rattachées (021)
  delete from contact_companies cc_remove
  where cc_remove.contact_id = remove_id
    and exists (
      select 1 from contact_companies cc_keep
      where cc_keep.contact_id = keep_id and cc_keep.company_id = cc_remove.company_id
    );
  update contact_companies set contact_id = keep_id where contact_id = remove_id;

  -- Champs personnalisés (021)
  delete from custom_field_values cfv_remove
  where cfv_remove.entity_type = 'contact' and cfv_remove.entity_id = remove_id
    and exists (
      select 1 from custom_field_values cfv_keep
      where cfv_keep.entity_type = 'contact' and cfv_keep.entity_id = keep_id
        and cfv_keep.field_definition_id = cfv_remove.field_definition_id
    );
  update custom_field_values set entity_id = keep_id
  where entity_type = 'contact' and entity_id = remove_id;

  -- Traçabilité des champs enrichis (042)
  delete from field_provenance fp_remove
  where fp_remove.entity_type = 'contact' and fp_remove.entity_id = remove_id
    and exists (
      select 1 from field_provenance fp_keep
      where fp_keep.entity_type = 'contact' and fp_keep.entity_id = keep_id
        and fp_keep.field_name = fp_remove.field_name and fp_keep.source = fp_remove.source
    );
  update field_provenance set entity_id = keep_id
  where entity_type = 'contact' and entity_id = remove_id;

  -- Listes (S20)
  delete from contact_list_members m_remove
  where m_remove.contact_id = remove_id
    and exists (
      select 1 from contact_list_members m_keep
      where m_keep.contact_id = keep_id and m_keep.list_id = m_remove.list_id
    );
  update contact_list_members set contact_id = keep_id where contact_id = remove_id;

  -- Contacts d'opportunité (034)
  delete from deal_contacts dc_remove
  where dc_remove.contact_id = remove_id
    and exists (
      select 1 from deal_contacts dc_keep
      where dc_keep.contact_id = keep_id and dc_keep.deal_id = dc_remove.deal_id
    );
  update deal_contacts set contact_id = keep_id where contact_id = remove_id;

  -- Références simples
  update deals set contact_id = keep_id where contact_id = remove_id;
  update tasks set contact_id = keep_id where contact_id = remove_id;
  update prospects set contact_id = keep_id where contact_id = remove_id;
  update meetings set contact_id = keep_id where contact_id = remove_id;
  update form_submissions set contact_id = keep_id where contact_id = remove_id;

  delete from contacts where id = remove_id;
end;
$$;

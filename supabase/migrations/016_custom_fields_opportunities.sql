-- ============================================================
-- DMH & Associés — S10 (suite) : étend les champs personnalisés
-- (migration 014, S9) aux Opportunités, maintenant que leur fiche
-- détail existe.
--
-- Les contraintes CHECK sur entity_type sont retrouvées et supprimées
-- dynamiquement (via pg_constraint) plutôt que par un nom supposé —
-- plus sûr qu'une convention de nommage devinée.
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'custom_field_definitions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%entity_type%'
  loop
    execute format('alter table custom_field_definitions drop constraint %I', r.conname);
  end loop;

  for r in
    select conname from pg_constraint
    where conrelid = 'custom_field_values'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%entity_type%'
  loop
    execute format('alter table custom_field_values drop constraint %I', r.conname);
  end loop;
end $$;

alter table custom_field_definitions
  add constraint custom_field_definitions_entity_type_check
  check (entity_type in ('contact', 'company', 'opportunity'));

alter table custom_field_values
  add constraint custom_field_values_entity_type_check
  check (entity_type in ('contact', 'company', 'opportunity'));

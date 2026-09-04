-- ============================================================
-- DMH & Associés — S25 : "tags" = nouveau type de champ personnalisé
-- "Choix multiples" (multiselect). Loïc désigne lui-même les tags comme
-- "aka attributs, aka propriété" — c'est exactement ce que les champs
-- personnalisés (migration 014, S9) sont déjà, il ne leur manquait que
-- ce type à choix multiples. Valeur stockée comme tableau JSON dans la
-- même colonne `value` jsonb (déjà utilisée pour `select`).
--
-- Contrainte retrouvée et recréée dynamiquement (via pg_constraint),
-- comme déjà fait pour entity_type en migration 016 — plus sûr qu'un nom
-- de contrainte deviné. (entity_type inclut déjà 'opportunity' depuis la
-- migration 016, rien à changer de ce côté.)
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'custom_field_definitions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%field_type%'
  loop
    execute format('alter table custom_field_definitions drop constraint %I', r.conname);
  end loop;
end $$;

alter table custom_field_definitions
  add constraint custom_field_definitions_field_type_check
  check (field_type in ('text', 'number', 'date', 'boolean', 'select', 'multiselect'));

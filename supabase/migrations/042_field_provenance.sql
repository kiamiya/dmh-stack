-- ============================================================
-- DMH & Associés — correction Claude Design (audit des 12 écrans) :
-- Fiche Contact du mockup montre un bloc "Champs enrichis" avec, PAR
-- CHAMP, la source qui l'a renseigné, une confiance et un âge, plus une
-- résolution de conflit si deux fournisseurs ont écrit des valeurs
-- différentes pour le même champ. Décision de cadrage confirmée par
-- Loïc : vrai besoin à construire, malgré l'absence de cas de conflit
-- réel aujourd'hui (un seul fournisseur actif par domaine : Pappers
-- pour les champs entreprise, Dropcontact pour l'email contact — les
-- deux n'écrivent jamais le même champ, donc le mécanisme de conflit
-- ne se déclenchera pas en pratique tant qu'un 2e fournisseur par champ
-- n'existe pas, mais le code le gère au cas général).
--
-- `client_id` dénormalisé (comme `automation_rules` etc.) pour un RLS
-- simple à 3 politiques, plutôt qu'un join vers `contacts`/`companies`.
-- `confidence` : 100 pour Pappers (donnée de registre légal,
-- authoritative, aucune ambiguïté) ; mappée depuis `email_confidence`
-- pour Dropcontact (valid=95/accept=75/risky=40/not_found=0) — jamais
-- un chiffre inventé, toujours dérivé d'une vraie réponse fournisseur.
-- ============================================================

create table field_provenance (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references dmh_clients(id) on delete cascade not null,
  entity_type text check (entity_type in ('contact', 'company')) not null,
  entity_id uuid not null,
  field_name text not null,
  source text not null,
  value text,
  confidence int check (confidence between 0 and 100),
  updated_at timestamptz not null default now(),
  -- une ligne par (champ, fournisseur) — pas par champ seul : deux
  -- fournisseurs distincts peuvent chacun avoir écrit le même champ,
  -- c'est justement ce qui permet de détecter un conflit (2 lignes,
  -- valeurs différentes) plutôt que la dernière écriture qui écrase
  -- silencieusement la précédente.
  unique (entity_type, entity_id, field_name, source)
);

alter table field_provenance enable row level security;

create policy "client_isolation" on field_provenance
  using (client_id = (select id from dmh_clients where (select auth.uid())::text = id::text)
         or (select auth.role()) = 'service_role');
create policy "staff_full_access" on field_provenance
  using (is_staff_member((select auth.uid())));

create index if not exists idx_field_provenance_entity on field_provenance(entity_type, entity_id);

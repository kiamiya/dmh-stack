-- ============================================================
-- DMH & Associés — correction post-CR 11/09 : fraîcheur réelle des
-- données de contact/entreprise (colonne réclamée par le mockup Claude
-- Design "Prospects", colonne "Fraîcheur"). Décision de cadrage
-- (confirmée par Loïc) : `updated_at` n'est bumpé QUE par un
-- enrichissement réel (`enrich-pappers`/`enrich-dropcontact`), jamais
-- par une édition manuelle du formulaire — sinon la "fraîcheur" ne
-- voudrait plus dire "depuis quand ces données sont-elles vérifiées ?".
-- ============================================================

alter table companies add column updated_at timestamptz;
update companies set updated_at = created_at where updated_at is null;
alter table companies alter column updated_at set default now();

alter table contacts add column updated_at timestamptz;
update contacts set updated_at = created_at where updated_at is null;
alter table contacts alter column updated_at set default now();

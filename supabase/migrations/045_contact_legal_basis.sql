-- ============================================================
-- DMH & Associés — S38-5 (CR réunion Delphine/Loïc du 17/09) : base
-- juridique RGPD du traitement de chaque contact, sur le modèle HubSpot
-- (sélection imposée à l'import de contacts). Défaut applicatif à l'import
-- en B2B : "intérêt légitime — prospect" (recommandation de Delphine).
--
-- Colonne nullable, SANS rétro-remplissage : pour les contacts déjà en
-- base, on ne sait pas quelle base juridique a été retenue — on ne
-- l'invente pas (null = "non renseignée", éditable sur la fiche contact).
-- ============================================================

create type contact_legal_basis as enum (
  'legitimate_interest_prospect',
  'legitimate_interest_client',
  'legitimate_interest_other',
  'contract',
  'consent',
  'not_applicable'
);

alter table contacts add column legal_basis contact_legal_basis;

comment on column contacts.legal_basis is
  'Base juridique RGPD du traitement (S38-5) — choisie à l''import, éditable sur la fiche ; null = non renseignée.';

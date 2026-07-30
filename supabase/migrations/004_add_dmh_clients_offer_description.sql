-- ============================================================
-- DMH & Associés — Support de la génération de messages Claude (S3)
-- Le brief (§1.3.1 étape 4) demande d'injecter dans le prompt "une
-- description en 2-3 phrases de l'offre du client DMH" — un champ absent
-- du schéma initial (dmh_clients n'avait rien pour ça).
-- ============================================================

alter table dmh_clients add column offer_description text;

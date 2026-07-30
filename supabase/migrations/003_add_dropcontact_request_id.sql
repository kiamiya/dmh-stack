-- ============================================================
-- DMH & Associés — Support de l'enrichissement Dropcontact (S3)
-- L'API Dropcontact est asynchrone (soumission -> request_id -> consultation
-- différée) contrairement à Pappers. On stocke le request_id en cours pour
-- pouvoir reprendre le suivi sans re-soumettre le contact à chaque appel.
-- ============================================================

alter table contacts add column dropcontact_request_id text;

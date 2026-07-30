-- ============================================================
-- DMH & Associés — Remplacement de Waalaxy par Lemlist
-- Décision Loïc du 2026-07-30 : le brief original (§1.2.4) documente
-- Waalaxy pour l'automatisation LinkedIn/cold outreach, remplacé par
-- Lemlist. Voir PROGRESS.md pour le détail de cet écart avec le brief.
-- ============================================================

alter table prospects rename column waalaxy_contact_id to lemlist_contact_id;

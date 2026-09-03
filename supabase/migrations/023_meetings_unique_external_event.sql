-- ============================================================
-- DMH & Associés — S19 : lier un événement de calendrier externe
-- (Google/Microsoft) à un contact/entreprise/opportunité.
--
-- Index unique partiel sur (external_calendar_provider, external_event_id)
-- — nécessaire pour un upsert propre depuis le CRM quand on (re)lie un
-- événement déjà existant sur le calendrier (évite un doublon de ligne
-- `meetings` si on relie le même événement deux fois). Partiel (where
-- external_event_id is not null) car les futures lignes créées par
-- d'autres flux internes sans événement externe associé ne doivent pas
-- être contraintes par cet index.
-- ============================================================

create unique index if not exists idx_meetings_external_event_unique
  on meetings (external_calendar_provider, external_event_id)
  where external_event_id is not null;

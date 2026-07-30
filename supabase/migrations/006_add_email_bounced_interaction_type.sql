-- ============================================================
-- DMH & Associés — Webhook Smartlead (S4, 2e item)
-- L'enum interaction_type couvrait déjà email_unsubscribed mais pas les
-- bounces (EMAIL_BOUNCE côté Smartlead). Ajout minimal, sans quoi le
-- webhook n'a aucune valeur d'enum à utiliser pour ce type d'événement.
-- ============================================================

alter type interaction_type add value 'email_bounced';

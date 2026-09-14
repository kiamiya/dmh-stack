-- ============================================================
-- DMH & Associés — Conformité Claude Design (Dashboard) : chaque
-- dashboard nommé peut porter une description courte et une couleur
-- de repère (mockup "Relais", sélecteur de tableau de bord), en plus
-- du nom déjà existant (migration 038). Colonnes optionnelles,
-- rétro-compatibles avec les dashboards déjà créés.
-- ============================================================

alter table dashboards add column description text;
alter table dashboards add column color text;

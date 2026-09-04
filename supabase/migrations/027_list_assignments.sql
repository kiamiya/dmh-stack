-- ============================================================
-- DMH & Associés — S23 : assigner une liste (d'un type) à une fiche
-- (d'un autre type). Colonnes FK nullables explicites plutôt qu'une
-- relation polymorphe générique — même convention que
-- deals.contact_id/company_id, tasks.contact_id/company_id/deal_id
-- (migration 013). Une seule liste assignée par type et par fiche (pas
-- une relation many-to-many).
-- ============================================================

alter table deals add column contact_list_id uuid references contact_lists(id);
alter table deals add column company_list_id uuid references company_lists(id);
alter table companies add column contact_list_id uuid references contact_lists(id);
alter table contacts add column company_list_id uuid references company_lists(id);

create index if not exists idx_deals_contact_list_id on deals(contact_list_id);
create index if not exists idx_deals_company_list_id on deals(company_list_id);
create index if not exists idx_companies_contact_list_id on companies(contact_list_id);
create index if not exists idx_contacts_company_list_id on contacts(company_list_id);

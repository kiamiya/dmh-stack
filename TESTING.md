# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ test exécuté par mes soins — en attente de ta relecture

Test fonctionnel du webhook Smartlead (`webhook-smartlead`, S4 — 2e et
dernier item), exécuté le 2026-07-30. Comme pour Pappers/Dropcontact, la
fonction a été lancée en local via Deno CLI, contre le **vrai** projet
Supabase (pas d'émulation locale).

### Pré-requis mis en place avant le test

- **Migration `006_add_email_bounced_interaction_type.sql` appliquée**
  (confirmation explicite donnée par toi) : ajoute la valeur `email_bounced`
  à l'enum `interaction_type`, absente jusque-là.
- **`SMARTLEAD_WEBHOOK_SECRET`** : la vraie valeur n'existe pas encore (se
  génère au moment de configurer le vrai webhook côté Smartlead, cf.
  `CLAUDE.md` — pas un compte à créer). J'ai mis une valeur de test locale
  (`local-test-placeholder-not-a-real-smartlead-secret`) dans `.env.local`
  uniquement pour pouvoir exécuter le test ci-dessous ; à remplacer par la
  vraie valeur quand le webhook sera réellement configuré côté Smartlead.
- **Email de test sur le contact existant** : le contact du prospect de
  test `1a646013-c0a2-48e9-b402-45332023f873` avait `email = null`
  (résultat `not_found` du test Dropcontact) — je lui ai mis un email
  fictif (`webhook-test-claude@example.com`) pour que le rattachement par
  email fonctionne pendant le test. Donnée de test, pas un vrai email.

### Ce que je n'ai pas pu tester (pas de compte/campagne Smartlead réels)

- L'appel réel Smartlead → notre fonction (suppose une fonction déployée
  avec une URL HTTPS publique + un webhook configuré côté Smartlead avec
  de vrais envois). J'ai simulé des payloads conformes au format documenté
  (recherche sur `api.smartlead.ai`, la doc n'était pas dans le brief).
- Le rattachement par email sur un cas réel : fonctionne dans le test avec
  un email fictif, mais la vraie robustesse (casse, alias, doublons entre
  clients) ne sera prouvée qu'avec de vrais webhooks.

### Étapes exécutées et résultat (11 scénarios, tous conformes)

1. **Signature invalide** → `401 { error: "Signature invalide" }`.
2. **`event_type` inconnu** (`SOMETHING_NEW`) → `200 { ok: true, skipped: "event_type non géré: ..." }`, ignoré proprement.
3. **Email sans contact correspondant** → `200 { ok: true, skipped: "contact introuvable pour cet email" }`.
4. **`EMAIL_SENT` (sequence_number: 1)** → interaction `email_sent` insérée, statut prospect avancé. **Point notable** : le statut était `enriched_contact` au moment du test (pas `ready` comme attendu — probablement changé entre-temps en explorant le CRM toi-même) ; la fonction l'a fait passer directement à `in_sequence`, ce qui reste correct (elle avance toujours vers l'état suivant, peu importe le point de départ).
5. **Rejeu du même `X-Request-Id`** → `200 { ok: true, deduplicated: true }`, **aucune nouvelle ligne insérée** (vérifié : le compte d'interactions n'a pas bougé).
6. **`EMAIL_OPEN`** → interaction `email_opened` journalisée, statut inchangé.
7. **`EMAIL_LINK_CLICK`** → interaction `email_clicked` journalisée (URL cliquée dans `content`), statut inchangé.
8. **`EMAIL_BOUNCE`** → interaction `email_bounced` journalisée — **confirme que la migration 006 fonctionne réellement** (nouvelle valeur d'enum utilisable en conditions réelles).
9. **`EMAIL_REPLY`** → interaction `email_replied` journalisée (corps de la réponse dans `content`), statut avancé `in_sequence` → `replied`.
10. **`LEAD_CATEGORY_UPDATED`** ("Interested" → "Meeting Booked") → interaction `note` journalisée (résumé du changement de catégorie), statut avancé `replied` → `meeting_booked`.
11. **`LEAD_UNSUBSCRIBED`** → interaction `email_unsubscribed` journalisée, statut inchangé (décision volontairement conservatrice, voir plan).

Vérifications complémentaires en base après coup : les 7 interactions
attendues sont bien présentes avec les bons champs (`metadata` contient le
payload brut + `x_request_id`, cohérent avec le commentaire du schéma
initial "données brutes webhook Smartlead/Waalaxy"). Le trigger existant
`update_prospect_activity` (déjà dans `001_initial_schema.sql`, jamais
modifié) s'est bien déclenché : `first_contact_at`/`last_activity_at` sont
renseignés automatiquement, sans code ajouté de notre côté pour ça.

### Ce qui reste hors périmètre de cette itération (à documenter, pas à faire)

- **Déployer** la fonction sur le vrai Supabase (`supabase functions
  deploy`) et **configurer réellement le webhook côté Smartlead**
  (dashboard/API, vraie URL HTTPS, vrai secret) : actions sur un système
  tiers, à faire une fois qu'un compte Smartlead + une campagne pilote
  existent. Pas bloquant pour considérer la brique **code** de S4 comme
  terminée.
- Validation du mapping catégorie de lead → statut sur un vrai webhook
  (les catégories Smartlead sont configurables par compte — la liste
  utilisée est une hypothèse documentée dans `PROGRESS.md`).

**Point à valider par toi si tu veux** : le comportement te semble-t-il
cohérent (notamment les 3 cas où le statut avance automatiquement — email
envoyé, réponse reçue, changement de catégorie) ? Si tu préfères une
approche plus prudente (par exemple : ne jamais avancer le statut
automatiquement, tout passer par une validation manuelle dans le CRM), dis-le
et j'ajuste avant qu'un vrai webhook soit branché.

## Outillage disponible pour les prochains tests

- **Deno CLI** installé en standalone (`winget install DenoLand.Deno`,
  sans admin/Docker) — pour exécuter une Edge Function directement :
  ```
  export PATH="$PATH:/c/Users/loicr/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe"
  cd supabase/functions/<nom-de-la-fonction>
  deno run --allow-net --allow-env --env-file=../../../.env.local index.ts
  ```
- **`pnpm run check-pappers -- <siren>`** pour tester rapidement le mapper Pappers sur une nouvelle entreprise.
- **`pnpm run import-pharow -- --client-id <uuid> <fichier.csv>`** pour importer un CSV Pharow (ou un CSV de test).
- **`pnpm exec supabase db push`** pour appliquer les migrations en attente sur la vraie base (toujours demander confirmation avant, cf. `CLAUDE.md`).
- **`pnpm --filter @dmh/crm dev`** pour lancer le CRM en local (port 5173).
- **Compte de test CRM** : `lrd@dmhassocies.com` (ton compte réel), lié à `staff_members` — accès à tous les clients depuis le CRM.
- **`webhook-smartlead`** : lancée en local (port 8000, cf. commande Deno ci-dessus), signature HMAC calculable avec `crypto.createHmac("sha256", secret).update(body).digest("hex")` préfixé de `sha256=`.
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers` (avec `offer_description`
  configurée), 4 prospects couvrant tous les statuts intermédiaires. Le
  prospect `1a646013-...` a maintenant : un contact avec un email de test
  (`webhook-test-claude@example.com`), 7 interactions Smartlead simulées,
  et un statut `meeting_booked` (progressé pendant ce test).

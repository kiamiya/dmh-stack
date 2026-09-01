# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ vérifié en local (mode démo) — en attente de ta relecture

**Refonte UX/UI du CRM interne (`apps/crm`) — Phase 4 (recherche cmd+K +
vues sauvegardées)**, branche `feat/crm-redesign`, exécuté le 2026-09-01.

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm typecheck` racine (10 packages) | ✅ vert |
| Raccourci `Ctrl+K` (ouvre la palette) | ✅ |
| Recherche instantanée dans la palette | ✅ testé avec "Ferronnerie" → 1 résultat |
| Navigation rapide (Prospects/Pipeline/Dashboard) | ✅ |
| Sélection d'un prospect → sous-page d'actions | ✅ |
| Changement de statut depuis la palette | ✅ toast de confirmation affiché |
| Vues sauvegardées : enregistrer, réinitialiser, réappliquer | ✅ testé de bout en bout — le filtre "Secteur mécanique" a bien été réappliqué après réinitialisation |
| Suppression d'une vue sauvegardée | présente dans l'UI, pas re-testée séparément (bouton "×") |

### Alerte fausse piste rencontrée pendant le test

Juste après l'ouverture de la palette pour la première fois, une vraie
erreur React (`Cannot read properties of null (reading 'useRef')`, dans
`cmdk`) est apparue — contrairement aux logs résiduels de HMR déjà
rencontrés en Phases 2/3, celle-ci semblait neuve. Un cache Vite
(`node_modules/.vite`) obsolète après l'ajout de `cmdk` en était la
cause — vidé puis serveur redémarré, plus aucune erreur (serveur ET
navigateur) sur les tests suivants. À garder en tête si l'erreur
réapparaît après un futur ajout de dépendance : vider le cache Vite en
premier réflexe.

### Limite connue (documentée, pas un bug)

La palette utilise sa propre instance du hook `useProspects()`,
indépendante de celle de la page actuellement affichée (aucun store
global/partagé dans ce projet). Résultat : changer le statut d'un
prospect depuis la palette fonctionne bien (toast + persistance réelle),
mais la liste visible sur `/` ne se rafraîchit pas automatiquement tant
qu'on ne navigue pas ou ne recharge pas. Pas corrigé dans cette phase —
introduirait un store partagé, un changement d'architecture plus large
qu'un ajustement de Phase 4. À signaler si tu veux qu'on le traite.

### Point à valider par toi

1. Teste `Ctrl+K`/`Cmd+K` toi-même, notamment le comportement décrit
   ci-dessus (staleness après changement de statut).
2. Dis-moi si la limite connue (liste pas rafraîchie) doit être corrigée
   maintenant ou peut attendre.
3. Feu vert pour la **Phase 5 (fil d'activité + indicateurs de
   stagnation)** — dernière phase obligatoire avant le mode sombre
   optionnel.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local`.
- `pnpm --filter @dmh/crm dev` (port 5173).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
- Si une erreur "Cannot read properties of null" apparaît après un ajout
  de dépendance : vider `apps/crm/node_modules/.vite` et redémarrer.

# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔴 bloqué sur une action de ta part (projet Supabase injoignable)

## Fonctionnalité concernée

Edge Function `supabase/functions/enrich-pappers` — enrichissement d'un
prospect via l'API Pappers (S2 du brief).

## Ce qui a été validé aujourd'hui (2026-07-30)

1. **Client + mapper Pappers** (`@dmh/pappers`) validés contre un vrai appel
   API (SIREN 356000000, La Poste). Deux bugs de mapping trouvés et
   corrigés (`employeeRange`, `revenue`/`revenueYear`) — détail dans
   `PROGRESS.md`.
2. **Outillage installé** : Deno CLI en standalone (`winget install
   DenoLand.Deno`), sans avoir besoin de Docker Desktop — Docker aurait
   nécessité WSL2 (non installé), des droits administrateur et un
   redémarrage, indisponibles dans cet environnement. Deno seul suffit pour
   exécuter la fonction directement, puisqu'on teste contre le vrai projet
   Supabase et pas une stack locale émulée.
3. **Edge Function exécutée réellement** avec `deno run --allow-net
   --allow-env --env-file=.env.local index.ts` : le code démarre, se
   type-check (`deno check`), et se connecte bien à l'infrastructure prévue.
   Un vrai bug de couplage a été trouvé et corrigé au passage : la fonction
   exigeait `SMARTLEAD_WEBHOOK_SECRET` (sans rapport avec Pappers) à cause
   d'un loader d'environnement trop large — remplacé par un loader scopé.

## Ce qui bloque maintenant

En rejouant l'appel après ce correctif, la fonction échoue à joindre
Supabase : **`SUPABASE_URL` (`hkonylfpcstbvxswyxyh.supabase.co`, la valeur
actuelle de `.env.local`) ne résout plus du tout en DNS** (`nslookup` renvoie
"Non-existent domain"). Ce n'est pas une faute de frappe — cette référence
correspond bien au projet lié localement (`supabase/.temp/project-ref`) —
mais le nom de domaine n'existe plus publiquement.

Cause la plus probable : le projet Supabase gratuit a été **mis en pause
pour inactivité** (comportement standard après une semaine sans usage), ou
il a été supprimé.

## Ce dont j'ai besoin de toi pour continuer

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard) et
   vérifie l'état du projet `FilumByDMH` (ref `hkonylfpcstbvxswyxyh`).
2. **S'il est en pause** : réactive-le (bouton "Restore"/"Resume"), attends
   qu'il repasse actif, puis dis-le-moi — je relance le test, aucune
   modification de `.env.local` ne devrait être nécessaire.
3. **S'il a été supprimé** : il faudra recréer un projet Supabase, réappliquer
   la migration (`supabase/migrations/001_initial_schema.sql` +
   `002_rename_waalaxy_to_lemlist.sql`), et me donner les 3 nouvelles valeurs
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) pour
   `.env.local`.

Tant que ça n'est pas résolu, aucun test contre la vraie base n'est possible
— pas seulement pour Pappers, pour tout le reste du projet aussi (CRM,
dashboard, etc.), donc ça vaut le coup de le régler maintenant plutôt que
plus tard.

## Étapes à exécuter une fois le projet Supabase de nouveau joignable

```
export PATH="$PATH:/c/Users/loicr/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe"
cd supabase/functions/enrich-pappers
deno run --allow-net --allow-env --env-file=../../../.env.local index.ts
```

puis, dans un autre terminal :

```
curl -X POST http://localhost:8000 -H "Content-Type: application/json" -d '{"prospect_id": "<uuid d'\''un prospect de test en statut to_enrich>"}'
```

Il faudra aussi un prospect de test réel (avec une entreprise liée ayant un
SIREN ou un nom) — je te proposerai d'en insérer un une fois la connexion
rétablie, avec ta confirmation avant d'écrire quoi que ce soit dans la vraie
base.

## Validation

- [ ] Projet Supabase réactivé/recréé et joignable.
- [ ] Edge Function testée en conditions réelles et conforme.
- [ ] Format de ce document toujours adapté pour toi.

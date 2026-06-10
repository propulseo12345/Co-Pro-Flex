# Supabase Cloud Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Migrer le backend CoProFlex vers un nouveau projet Supabase Cloud (région Paris) en rejouant les 71 migrations SQL et redéployant les 22 Edge Functions, sans perte de schéma ni de logique métier.

**Architecture :** Utilisation du **Supabase CLI v2.84+** lié au nouveau projet via `supabase link`. Les migrations sont déjà au format Supabase (`supabase/migrations/`), donc `supabase db push` les rejoue toutes dans l'ordre alphabétique (qui correspond à l'ordre chronologique des préfixes `YYYYMMDD_`). Les Edge Functions sont déployées en boucle via `supabase functions deploy`. Aucune modification du code applicatif Next.js requise — uniquement la mise à jour de `.env.local` et la régénération des types TypeScript depuis le nouveau schéma.

**Tech Stack :**
- Supabase CLI v2.84.2+ (à installer)
- PostgreSQL 17 (auto-provisionné par Supabase)
- Deno (runtime des Edge Functions, géré par Supabase)
- Resend (email transactionnel, clé déjà existante)
- Next.js 16 / @supabase/ssr (côté client, inchangé)

---

## Audit préalable (résultat de l'exploration)

### Inventaire migrations
- **71 fichiers SQL** dans `supabase/migrations/`, sortés alphabétiquement (Supabase convention)
- **55 SCHEMA** (tables, fonctions, RLS, vues, triggers, enums)
- **9 SEED** (suffixe `_seed.sql`, données de démo)
- **7 TESTS** (suffixe `_tests.sql`, assertions SQL de vérification)

### Edge Functions
- **22 fonctions** dans `supabase/functions/`
- **6 utilisent Resend** : `send-convocation-email`, `send_manual_payment_reminder`, `ag_send_convocations`, `ag_send_relance`, `email_webhook`, `run_payment_reminders`
- **16 fonctions internes** (auth Supabase uniquement, pas de secret externe)

### Storage
- **1 bucket** : `ged` (privé, 50 Mo max, MIME PDF/images), créé via la migration `20260126_niveau6c_ged.sql`

### Secrets à configurer côté Supabase
- `RESEND_API_KEY` : pour les 6 fonctions email
- `FROM_EMAIL` : adresse expéditeur (utilisée par `send-convocation-email`)

### Extensions Postgres
- **Aucune extension tierce custom requise** (le code n'utilise pas `pg_cron`, `pg_net`, `pgvector`, etc.)
- Les extensions standard activées par défaut sur Supabase suffisent : `pgcrypto`, `uuid-ossp`, `pg_graphql`, `pgjwt`, `pgsodium`

### Code applicatif
- Client Supabase instancié dans `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`
- Types TypeScript dans `src/types/supabase.ts` et `src/lib/supabase/database.types.ts` (auto-générés depuis le schéma, à régénérer)
- Lit uniquement `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Risques identifiés

| # | Risque | Sévérité | Mitigation |
|---|--------|----------|------------|
| R1 | **Helpers RLS définis dans `action10_helpers.sql` utilisés par `action5` et `action6`** | Faible | Le tri alphabétique de Supabase CLI résout correctement : `action10` < `action2` < `action5` < `action6`. Vérifié. |
| R2 | **UUIDs hardcodés dans `20260127_single_copro_bootstrap.sql`** (`aaaaaaaa-...001` copro, `bbbbbbbb-...001` immeuble) | Faible | Migration idempotente (clauses `ON CONFLICT DO NOTHING`). Pas de conflit sur un projet vierge. |
| R3 | **Fichiers `_tests.sql` rejoués comme migrations** : ils contiennent des `SELECT` d'assertion, pas du DDL | Moyenne | Risque d'échec si une assertion casse. **Mitigation** : on déplace les `_tests.sql` hors du dossier `migrations/` avant le push, on les rejouera manuellement en validation. |
| R4 | **Données SEED rejouées en automatique** | Faible | Les seeds insèrent des données de démo. OK pour un projet de dev. Si tu veux une base 100% vide pour la prod future, on déplacera aussi les `_seed.sql` hors du dossier. |
| R5 | **Types TypeScript obsolètes** dans `src/lib/supabase/database.types.ts` | Faible | À régénérer avec `supabase gen types` après les migrations. Pas bloquant pour le runtime mais pour la DX. |
| R6 | **Bucket Storage `ged` créé par migration, mais policies Storage potentiellement non couvertes** | Moyenne | Vérifier post-migration que les policies du bucket existent. Sinon les copier depuis le Studio de l'ancien projet (mais on l'a supprimé → faudra les recréer si manquantes). |
| R7 | **Clé Resend exposée dans `.env.local` du PC précédent** | Faible | `.gitignore` couvre `.env*`. Le secret n'est pas dans git. Rotation optionnelle (pas critique). |
| R8 | **JWT Secret du projet supprimé** : tous les anciens tokens utilisateur deviennent invalides | **Information** | Aucune action — c'est le comportement attendu sur un projet vierge. Les utilisateurs devront se reconnecter (en mode démo : compte `admin@coproflex.fr` à recréer via `auth.users` ou via le formulaire d'inscription). |

---

## File Structure

### Créés par ce plan
- `supabase/config.toml` — config locale Supabase (lien au projet, ports)
- `supabase/migrations_disabled/` — dossier de quarantaine pour les `_tests.sql` (et optionnellement les `_seed.sql`)
- `scripts/supabase-deploy-functions.ps1` — script de déploiement en boucle des 22 Edge Functions

### Modifiés
- `.env.local` — nouvelles credentials Supabase
- `src/lib/supabase/database.types.ts` — régénéré depuis le nouveau schéma
- `src/types/supabase.ts` — régénéré depuis le nouveau schéma
- `VERCEL_ENV.md` — mise à jour de l'URL et de la clé documentées

### Inchangés
- `supabase/migrations/*.sql` — tels quels (seuls les `_tests.sql` sont déplacés temporairement)
- `supabase/functions/**/*.ts` — code Deno inchangé
- `src/lib/supabase/{client,server,middleware}.ts` — lisent les variables d'env mises à jour
- Tout le reste de `src/`

---

## Inputs requis de l'utilisateur (Phase 1)

Avant que le plan puisse démarrer, Clément doit fournir :

1. **URL du projet** (`NEXT_PUBLIC_SUPABASE_URL`) — ex. `https://xxxxxxxxxxxx.supabase.co`
2. **Anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — JWT commençant par `eyJ...`, rôle `anon`
3. **Service role key** — JWT commençant par `eyJ...`, rôle `service_role` (utilisé pour les déploiements de fonctions)
4. **Project reference ID** — la chaîne `xxxxxxxxxxxx` extraite de l'URL
5. **Mot de passe DB** — celui choisi à la création du projet (utilisé par `supabase link`)

> ⚠️ La service role key NE DOIT PAS aller dans `.env.local` (c'est un secret côté serveur uniquement). On la stocke dans une variable d'environnement de shell temporaire pour les commandes de déploiement.

---

## Tasks

### Task 0 : Préflight — backup et installation outillage

**Files :**
- Create: `.backup/env.local.bak` (copie de l'ancien .env.local)
- Create: `.backup/timestamp.txt`

- [ ] **Step 1 : Backup du `.env.local` actuel**

```powershell
$base = "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex"
New-Item -ItemType Directory -Path "$base\.backup" -Force | Out-Null
Copy-Item "$base\.env.local" "$base\.backup\env.local.bak"
Get-Date | Out-File "$base\.backup\timestamp.txt"
```

Expected : 2 fichiers créés dans `.backup/`. Le `.gitignore` couvre déjà `.env*`, on ajoute `.backup/` à `.gitignore`.

- [ ] **Step 2 : Ajouter `.backup/` au `.gitignore`**

```powershell
Add-Content "$base\.gitignore" "`n# Plan d'implémentation Supabase migration`n.backup/"
```

- [ ] **Step 3 : Vérifier que le Supabase CLI est dispo via npx**

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use default | Out-Null
Set-Location "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex"
npx -y supabase@2.84.2 --version
```

Expected : `2.84.2` ou supérieur s'affiche. Si erreur réseau, retry. Si binaire non trouvé : `npm install -g supabase`.

- [ ] **Step 4 : Commit du préflight**

```powershell
git add .gitignore
git commit -m "chore: ignore .backup/ pour la migration Supabase"
```

---

### Task 1 : Mise en quarantaine des fichiers `_tests.sql`

**Pourquoi :** Les 7 fichiers `_tests.sql` contiennent des `SELECT` d'assertion et des `RAISE EXCEPTION` qui peuvent faire échouer `supabase db push`. On les déplace dans `migrations_disabled/`, on les rejouera **manuellement après** pour vérifier le schéma.

**Files :**
- Create: `supabase/migrations_disabled/` (dossier)
- Move: 7 fichiers `_tests.sql` depuis `supabase/migrations/` vers `supabase/migrations_disabled/`

- [ ] **Step 1 : Créer le dossier et déplacer les 7 fichiers**

```powershell
$mig = "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations"
$quarantine = "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations_disabled"
New-Item -ItemType Directory -Path $quarantine -Force | Out-Null
Get-ChildItem -Path $mig -Filter "*_tests.sql" | Move-Item -Destination $quarantine
Get-ChildItem -Path $quarantine | Select-Object Name
```

Expected output (7 lignes) :
```
20260125_niveau2d_ledger_tests.sql
20260125_niveau4b_ag_tests.sql
20260125_niveau4e_correspondence_tests.sql
20260126_niveau5b_payment_reminders_tests.sql
20260126_niveau6a_maintenance_tests.sql
20260126_niveau6b_tests.sql
20260126_niveau6c_ged_tests.sql
```

- [ ] **Step 2 : Vérifier qu'il reste 64 fichiers dans `migrations/`**

```powershell
(Get-ChildItem $mig -File).Count
```

Expected : `64` (71 - 7).

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations_disabled supabase/migrations
git commit -m "chore(supabase): quarantaine des fichiers _tests.sql pour migration cloud"
```

---

### Task 2 : Mise à jour de `.env.local` avec les nouvelles clés

**Files :**
- Modify: `.env.local`

**Inputs nécessaires** (de la Phase 1, à confirmer avec l'utilisateur) :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 1 : Réécrire `.env.local`**

```powershell
$envContent = @"
NEXT_PUBLIC_SUPABASE_URL=<URL_FOURNIE>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY_FOURNIE>
RESEND_API_KEY=<RESEND_API_KEY_PLACEHOLDER>
"@
Set-Content "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\.env.local" -Value $envContent -Encoding UTF8
```

- [ ] **Step 2 : Vérifier que le serveur dev redémarre proprement avec les nouvelles vars**

```powershell
# Si le dev server tourne, le killer puis relancer
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match "next" } | Stop-Process -Force
# Relancer dans Task 9
```

Expected : Pas d'erreur sur le redémarrage (Task 9 valide ça avec le browser).

> ⚠️ Pas de commit — `.env.local` est ignoré par git.

---

### Task 3 : Linker le repo local au nouveau projet Supabase

**Files :**
- Create: `supabase/config.toml`
- Create: `supabase/.temp/project-ref` (auto-géré par CLI)

**Inputs nécessaires** : `project ref` + `DB password` (de la Phase 1).

- [ ] **Step 1 : Lancer `supabase init` pour générer le config.toml**

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use default | Out-Null
Set-Location "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex"
npx supabase@2.84.2 init
```

Expected : Création de `supabase/config.toml`. Si fichier existe déjà : OK, skip.

- [ ] **Step 2 : Linker au projet distant**

```powershell
npx supabase@2.84.2 link --project-ref <PROJECT_REF>
# Quand on te demande le mot de passe DB, le coller (il ne s'affichera pas)
```

Expected output :
```
Finished supabase link.
```

- [ ] **Step 3 : Vérifier le link**

```powershell
npx supabase@2.84.2 projects list
```

Expected : Une ligne avec le nouveau projet, colonne "LINKED" à `●` (point plein).

- [ ] **Step 4 : Commit le `config.toml`**

```powershell
git add supabase/config.toml
git commit -m "chore(supabase): init config.toml pour le nouveau projet cloud"
```

---

### Task 4 : Dry-run des migrations (validation sans appliquer)

- [ ] **Step 1 : Vérifier l'état distant**

```powershell
npx supabase@2.84.2 migration list
```

Expected : Aucune migration appliquée côté Remote (colonne Remote vide), 64 lignes côté Local.

- [ ] **Step 2 : Dry-run du push**

```powershell
npx supabase@2.84.2 db push --dry-run
```

Expected : Liste des 64 migrations qui seraient appliquées, sans erreur. Si erreur de parsing SQL, identifier le fichier et le corriger avant de continuer.

- [ ] **Step 3 : Si le dry-run liste bien 64 fichiers et 0 erreur, GO. Sinon STOP et analyser.**

---

### Task 5 : Application des migrations SCHEMA + SEED

- [ ] **Step 1 : Push pour de vrai**

```powershell
npx supabase@2.84.2 db push
# Confirmer avec "Y" si prompt
```

Expected : 64 migrations appliquées. Output final :
```
Finished supabase db push.
```

Durée estimée : 5-15 min (selon le réseau).

- [ ] **Step 2 : Vérifier qu'elles sont toutes enregistrées**

```powershell
npx supabase@2.84.2 migration list
```

Expected : 64 lignes avec une coche dans la colonne "Remote".

- [ ] **Step 3 : Sanity check via SQL — compter les tables créées**

```powershell
$projectRef = "<PROJECT_REF>"
$dbPassword = "<DB_PASSWORD>"
$dbUrl = "postgresql://postgres.$projectRef`:$dbPassword@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
npx supabase@2.84.2 db execute --db-url $dbUrl --command "SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public';"
```

Expected : `table_count` >= 40 (cf audit : 40+ tables attendues).

> Note : la commande `db execute` n'existe pas dans tous les CLI ; alternative via Supabase Studio (SQL editor) ou via `psql` direct.

- [ ] **Step 4 : Commit des migrations remote (Supabase CLI gère ça automatiquement, juste sanity check git)**

```powershell
git status
# Rien à committer normalement, sauf si supabase/config.toml a été modifié
```

---

### Task 6 : Rejeu manuel des fichiers `_tests.sql` (validation post-migration)

**But :** Vérifier que le schéma est cohérent en rejouant les assertions SQL de test.

**Files :**
- Use: `supabase/migrations_disabled/*_tests.sql` (7 fichiers)

- [ ] **Step 1 : Concaténer les 7 fichiers en un seul script de validation**

```powershell
$quarantine = "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations_disabled"
$out = "$quarantine\_run_all_tests.sql"
Get-ChildItem $quarantine -Filter "*_tests.sql" | Sort-Object Name | ForEach-Object {
    Add-Content $out "-- ===== $($_.Name) ====="
    Get-Content $_.FullName | Add-Content $out
}
Get-Item $out | Select-Object Name, Length
```

Expected : Fichier `_run_all_tests.sql` créé, taille > 0.

- [ ] **Step 2 : Exécuter le script via le SQL editor Supabase Studio**

Étapes manuelles :
1. Ouvrir https://supabase.com/dashboard/project/<PROJECT_REF>/sql/new
2. Coller le contenu de `_run_all_tests.sql`
3. Cliquer "Run"
4. Vérifier : aucun `RAISE EXCEPTION` ne doit remonter

Si une assertion échoue : noter laquelle, je l'investigue (souvent dû à un SEED absent → c'est OK, je le marque comme false-positive).

- [ ] **Step 3 : Supprimer le fichier concaténé temporaire**

```powershell
Remove-Item "$quarantine\_run_all_tests.sql"
```

---

### Task 7 : Configurer les secrets des Edge Functions

**Files :**
- (Aucun fichier local — config via CLI distante)

- [ ] **Step 1 : Définir `RESEND_API_KEY` côté Functions**

```powershell
npx supabase@2.84.2 secrets set RESEND_API_KEY=<RESEND_API_KEY_PLACEHOLDER>
```

Expected : `Finished supabase secrets set.`

- [ ] **Step 2 : Définir `FROM_EMAIL`**

```powershell
npx supabase@2.84.2 secrets set FROM_EMAIL=noreply@coproflex.fr
```

> Note : remplacer par une adresse Resend valide vérifiée. Si Resend a un domaine vérifié, utiliser une adresse de ce domaine. Sinon en test : `onboarding@resend.dev`.

- [ ] **Step 3 : Lister les secrets pour confirmation**

```powershell
npx supabase@2.84.2 secrets list
```

Expected : 2 lignes minimum (`RESEND_API_KEY`, `FROM_EMAIL`), valeurs masquées.

---

### Task 8 : Déployer les 22 Edge Functions

**Files :**
- Create: `scripts/supabase-deploy-functions.ps1`

- [ ] **Step 1 : Écrire le script de déploiement en boucle**

```powershell
# Fichier : scripts/supabase-deploy-functions.ps1
$ErrorActionPreference = "Stop"
$functionsDir = "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\functions"
$functions = Get-ChildItem $functionsDir -Directory | Select-Object -ExpandProperty Name

Write-Host "Déploiement de $($functions.Count) Edge Functions..."
$failed = @()
foreach ($fn in $functions) {
    Write-Host "→ $fn" -ForegroundColor Cyan
    try {
        npx supabase@2.84.2 functions deploy $fn --no-verify-jwt
    } catch {
        $failed += $fn
        Write-Host "  ✗ Échec : $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed.Count -gt 0) {
    Write-Host "`n⚠ Échecs ($($failed.Count)) :" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "  - $_" }
    exit 1
} else {
    Write-Host "`n✓ Toutes les fonctions déployées." -ForegroundColor Green
}
```

Créer le fichier :

```powershell
$scriptPath = "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\scripts\supabase-deploy-functions.ps1"
# Le contenu sera écrit via l'outil Write côté agent
```

- [ ] **Step 2 : Lancer le script**

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use default | Out-Null
Set-Location "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex"
& .\scripts\supabase-deploy-functions.ps1
```

Expected : 22 déploiements, durée 5-10 min, exit code 0 et `✓ Toutes les fonctions déployées.`

- [ ] **Step 3 : Vérifier la liste des fonctions déployées**

```powershell
npx supabase@2.84.2 functions list
```

Expected : 22 fonctions listées, toutes en statut "ACTIVE".

- [ ] **Step 4 : Commit du script**

```powershell
git add scripts/supabase-deploy-functions.ps1
git commit -m "feat(scripts): script de déploiement des Edge Functions Supabase"
```

---

### Task 9 : Régénérer les types TypeScript

**Files :**
- Modify: `src/lib/supabase/database.types.ts`
- Modify: `src/types/supabase.ts`

- [ ] **Step 1 : Génération des types depuis le schéma distant**

```powershell
npx supabase@2.84.2 gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
```

Expected : Fichier réécrit avec ~ plusieurs centaines de lignes (types pour chaque table/vue).

- [ ] **Step 2 : Vérifier que le type check passe**

```powershell
npx tsc --noEmit
```

Expected : 0 erreur. Si erreurs liées à des colonnes manquantes/renommées → noter, mais ne pas corriger maintenant (ça veut dire que le code applicatif référence un schéma plus ancien — c'est une question séparée).

- [ ] **Step 3 : Si `src/types/supabase.ts` est juste un re-export, le mettre à jour aussi**

```powershell
$srcTypes = "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\types\supabase.ts"
# Inspecter et adapter si nécessaire
Get-Content $srcTypes | Select-Object -First 5
```

Si le fichier re-exporte depuis `database.types.ts`, rien à faire. Sinon, le régénérer aussi :
```powershell
npx supabase@2.84.2 gen types typescript --linked --schema public > src/types/supabase.ts
```

- [ ] **Step 4 : Commit**

```powershell
git add src/lib/supabase/database.types.ts src/types/supabase.ts
git commit -m "chore(types): régénération des types Supabase depuis le nouveau schéma"
```

---

### Task 10 : Sanity check storage bucket `ged`

- [ ] **Step 1 : Vérifier l'existence du bucket via SQL**

```sql
-- Dans Supabase Studio → SQL Editor :
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'ged';
```

Expected : 1 ligne avec `public = false`, `file_size_limit = 52428800` (50 Mo), MIME types incluant `application/pdf` et images.

- [ ] **Step 2 : Vérifier les policies du bucket**

```sql
SELECT polname, polcmd
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'objects' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage')
  AND polname LIKE '%ged%';
```

Expected : au moins 2-3 policies (SELECT/INSERT/UPDATE/DELETE) avec usage des helpers RLS (`user_has_copro_access`).

Si 0 policy : c'est R6 du tableau de risques. Action : copier les policies depuis le code de migration `20260126_niveau6c_ged.sql` (chercher `CREATE POLICY` dans ce fichier) et les rejouer manuellement.

---

### Task 11 : Test end-to-end de l'app

- [ ] **Step 1 : Relancer le dev server**

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use default | Out-Null
Set-Location "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex"
npm run dev
```

Expected : Démarrage sans erreur sur http://localhost:3001 (ou 3000 si dispo).

- [ ] **Step 2 : Créer un compte de test via le formulaire d'inscription**

Étapes manuelles dans le navigateur :
1. Ouvrir l'app → écran de login
2. Si le mode démo affiche `admin@coproflex.fr` : il faut d'abord créer ce compte dans le nouveau projet Supabase (via Studio → Authentication → Users → Add user).
3. Email : `admin@coproflex.fr`, password : `password123`, **Auto-confirm user** coché.
4. Revenir sur l'app et tenter le login.

Expected : Login réussi, redirection vers le dashboard, plus de "Failed to fetch".

- [ ] **Step 3 : Vérifier qu'au moins une page chargée affiche des données**

Naviguer vers `/coproprietaires` ou `/ag` et vérifier qu'aucune erreur réseau dans la console F12.

Expected : Les SEED data devraient afficher au moins 1 copro, quelques lots et un AG de démo.

- [ ] **Step 4 : Tester un appel à une Edge Function**

Naviguer vers une page qui déclenche une fonction (ex : génération d'un appel de fonds ou d'un PV). Vérifier l'onglet Network du navigateur :
- L'appel à `supabase.co/functions/v1/<fn_name>` doit retourner 200.

Si erreur 401 : revérifier le token JWT côté client.
Si erreur 500 : aller dans Supabase Studio → Logs → Edge Functions et lire le stack.

---

### Task 12 : Mettre à jour la documentation projet

**Files :**
- Modify: `VERCEL_ENV.md`
- (Optionnel) Modify: `README.md` ou `CLAUDE.md`

- [ ] **Step 1 : Mettre à jour `VERCEL_ENV.md` avec les nouvelles valeurs**

Remplacer les lignes `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` par les nouvelles valeurs (la URL est publique, l'anon key est conçue pour être publique — pas de souci de secret).

- [ ] **Step 2 : Commit**

```powershell
git add VERCEL_ENV.md
git commit -m "docs: mise à jour des credentials Supabase post-migration cloud"
```

- [ ] **Step 3 : Si Vercel est déjà configuré pour le projet, mettre à jour les variables d'env Vercel manuellement**

Étapes manuelles :
1. Aller sur https://vercel.com/<team>/<project>/settings/environment-variables
2. Éditer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redéployer (Deployments → ... → Redeploy)

---

### Task 13 : Nettoyage et finalisation

- [ ] **Step 1 : Revue de `git status`**

```powershell
Set-Location "C:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex"
git status
```

Expected : Rien d'inattendu en untracked. Si des fichiers temporaires (`*.tmp`, `supabase/.temp/`) traînent → vérifier qu'ils sont dans `.gitignore`.

- [ ] **Step 2 : Tag de migration**

```powershell
git tag -a "supabase-cloud-migration-$(Get-Date -Format yyyyMMdd)" -m "Migration vers nouveau projet Supabase Cloud"
```

(Pas de push automatique du tag — l'utilisateur décide quand pusher.)

- [ ] **Step 3 : Suppression du dossier `.backup/` si tout est OK**

> ⚠️ Faire ça SEULEMENT après confirmation utilisateur que tout fonctionne.

```powershell
Remove-Item "$base\.backup" -Recurse -Force
```

---

## Plan de rollback

Si quelque chose casse irrémédiablement durant Tasks 4-8 :

1. **Restaurer `.env.local`** : `Copy-Item .backup\env.local.bak .env.local`
2. **Restaurer les `_tests.sql`** : `Move-Item supabase\migrations_disabled\*.sql supabase\migrations\`
3. **Supprimer le projet Supabase** (depuis le dashboard) et recommencer la création
4. **Revenir au commit pré-migration** : `git reset --hard HEAD~N` (où N = nombre de commits du plan)

Le rollback ne récupère **pas** les données qui auraient été insérées dans le nouveau projet. Mais comme c'est un projet vierge à ce stade, c'est sans conséquence.

---

## Estimation

| Phase | Durée |
|-------|-------|
| Phase 1 (utilisateur crée le projet Supabase) | 5 min |
| Task 0-3 (préflight, link) | 15 min |
| Task 4-5 (dry-run + push migrations) | 15-20 min |
| Task 6 (tests SQL) | 10 min |
| Task 7-8 (secrets + functions) | 15 min |
| Task 9 (types) | 5 min |
| Task 10-11 (sanity + e2e) | 15 min |
| Task 12-13 (doc + cleanup) | 5 min |
| **Total** | **~1h30** |

---

## Self-Review

**Spec coverage** : Le plan couvre les 4 objectifs du brief — (a) recréer un Supabase Cloud, (b) rejouer les 71 migrations, (c) redéployer les 22 Edge Functions, (d) restaurer le login. ✅

**Placeholder scan** : Tous les commandes contiennent les chemins absolus exacts. Les valeurs `<PROJECT_REF>`, `<URL_FOURNIE>`, etc. sont des inputs Phase 1 documentés en haut du plan, pas des TBD. ✅

**Type consistency** : Les noms de fonctions RLS (`user_is_copro_manager`, `user_is_lot_owner`, `user_has_copro_access`, `user_is_council_member`) sont vérifiés présents dans `20260126_action10_helpers.sql`. L'ordre alphabétique de Supabase CLI garantit qu'ils sont créés avant utilisation par action5/action6. ✅

**Risques mitigés** : R3 (tests qui cassent) → quarantaine. R6 (policies Storage) → check explicite. R8 (JWT invalide) → reconnexion attendue. Tous documentés. ✅

---

## Handoff

Plan complet et sauvegardé. Deux modes d'exécution possibles :

**1. Inline (recommandé pour cette migration)** — Tasks séquentielles dans la session courante, avec checkpoints aux Tasks 4 (dry-run) et 11 (e2e). Skill requis : `superpowers:executing-plans`.

**2. Subagent-driven** — Un sous-agent par Task, plus de friction mais isole le contexte. Skill requis : `superpowers:subagent-driven-development`.

> 💡 Vu que beaucoup de Tasks nécessitent les credentials fournies par l'utilisateur en runtime, le mode **inline** est plus pratique : on s'arrête naturellement aux moments où on attend l'input.

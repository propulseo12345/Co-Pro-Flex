# Atlas — Routes API & Middleware

Cartographie de `src/app/api/**` et `middleware.ts`. Périmètre : 6 routes (mail ×2, banking ×4) + middleware racine.

> Verdict transversal : **AUCUNE route API ne vérifie la session/cabinet.** Tout `/api/**` est public (le middleware ne protège que des pages). Les mails utilisent des IDs propriétaire/copro codés en dur. Risque sécurité majeur à corriger avant prod.

---

## Middleware

| Fichier | Rôle |
|---------|------|
| `middleware.ts` | Délègue à `updateSession` |
| `src/lib/supabase/middleware.ts` | Logique réelle |

- **Matcher** : tout sauf `_next/static`, `_next/image`, `favicon.ico`, images. ⚠️ Couvre `/api/**` mais sans gate spécifique → aucun blocage API réel.
- **Auth** : `createServerClient` SSR (cookies) → `supabase.auth.getUser()` rafraîchit la session.
- **Protection** : si `!user` ET route dashboard (`/dashboard`, `/ag`, `/finance`, `/maintenance`, `/documents`, `/communication`, `/coproprietaires`, `/ventes-impayes`, `/settings`, `/portefeuille`) → redirige `/auth/login`.
- **Inverse** : si `user` ET route `/auth/*` → redirige `/portefeuille`.
- ⚠️ Pas de notion de cabinet/tenant ; pas de vérification de rôle ; `/onboarding` non protégé ; URL/clé Supabase ont des fallbacks `placeholder`.

---

## Routes Mail (Resend)

### `POST /api/mail/inbound` — `mail/inbound/route.ts`
- **Rôle** : webhook Resend pour emails entrants (à configurer Resend → Inbound).
- **Auth** : ❌ AUCUNE. Pas de vérification de signature webhook → n'importe qui peut injecter des mails.
- **Externe** : Resend (format inbound), via payload `any`.
- **Données** : `INSERT` dans table `mails`. `copro_id`/`owner_id` **codés en dur** (`DEFAULT_COPRO_ID 11111111…`, `DEFAULT_OWNER_ID f76855bb…`) → tous les mails entrants tombent sur la même copro. `status:'received'`.

### `POST /api/mail/send` — `mail/send/route.ts`
- **Rôle** : envoyer un email + le journaliser.
- **Auth** : ❌ AUCUNE (pas de getUser ; `owner_id` codé en dur).
- **Externe** : `resend.emails.send` (lib `@/lib/mail/resend`). FROM via `MAIL_FROM_ADDRESS`/`MAIL_FROM_NAME` (défaut `onboarding@resend.dev`).
- **Validation** : 400 si `to`/`subject`/`body`/`coproId` manquants.
- **Données** : `INSERT` dans `mails` (`status:'sent'`, `resend_id`). `coproId` vient du body (client), `owner_id` codé en dur.
- **Codes** : 400 (champs), 502 (Resend), 500 (DB).

---

## Routes Banking (GoCardless / agrégateur)

Toutes appellent `@/lib/banking/gocardless`. **Aucune auth, aucun lien copro/cabinet.**

### `GET /api/banking/institutions` — liste les banques FR
- `listInstitutions('FR')` → renvoie `{id,name,logo,bic}[]`. 500 si erreur.

### `POST /api/banking/connect` — démarre une connexion bancaire
- Body : `{institutionId, redirectUrl}` (400 si manquant). `createRequisition(...)` → `{requisitionId, link}`. Le `link` est l'URL d'auth banque.

### `GET /api/banking/callback` — retour post-auth banque
- GoCardless redirige avec `?ref=`. Re-redirige vers `/onboarding?bank_ref=<ref>&step=4`. Pas de validation du `ref`.

### `POST /api/banking/accounts` — récupère les comptes d'une requisition
- Body : `{requisitionId}` (400 si manquant). `getRequisitionAccounts(...)` → `{accounts}`. 500 si erreur.

---

## Services externes référencés
- **Resend** : `@/lib/mail/resend` (envoi + webhook inbound).
- **GoCardless Bank Account Data** : `@/lib/banking/gocardless` (`listInstitutions`, `createRequisition`, `getRequisitionAccounts`).
- **Supabase** : client serveur `@/lib/supabase/server` (clients castés `any` dans les routes mail).

## Lacunes à tracer
1. Sécuriser `/api/**` (session + scoping cabinet/copro) — actuellement ouvert.
2. Vérifier la signature des webhooks Resend (`inbound`).
3. Supprimer les `DEFAULT_OWNER_ID`/`DEFAULT_COPRO_ID` codés en dur.
4. Banking : associer requisition/comptes à une copro et persister (aucune écriture DB côté banking).
5. Retirer les casts `any` (viole la règle TS stricte).

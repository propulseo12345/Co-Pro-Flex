# AUTORISATION — Modèle d'autorisation de production CoProFlex

> Cible `db-cible`. Source d'audit : `_cartographie/T1-fonctions.md` (190 fonctions, 117 DEFINER, 189/190 exécutables `anon`, **0 garde de rôle**) + `_cartographie/01-copros-lots-personnes.md` (memberships sain, `coproprietaires.user_id` NULL 58/58, RLS désactivé partout en dev).
>
> **Verdict de départ : critique.** Le modèle ACL actuel est plat et permissif — n'importe quel client anonyme peut appeler `post_owner_payment`, `set_opening_balance` ou `create_ledger_transaction` et écrire dans le grand livre. Ce document définit le modèle cible : **RLS partout + tenance multi-cabinet + gardes in-function + bicéphale session-user / service_role**.
>
> **MULTI-CABINET (décision USER, posée dès la cible).** La racine de tenance n'est plus la copro mais le **CABINET** (organisation syndic, table `cabinets`, cf. 01 §1.0). Chaîne : `cabinets → copros → {lots, finance, AG, GED…}`. Quatre rôles + machine : **`platform_admin`** (équipe CoProFlex, **transverse**, hors cabinet) · **`gestionnaire`** (cloisonné à **SON** cabinet) · **`coproprietaire`** (rattaché à ses copros, cabinet transitif) · **`anon`** + **`service_role`** (machine). **Le cloisonnement cabinet est CENTRALISÉ dans les helpers** `user_has_copro_access`/`user_is_copro_manager` (§4) : un gestionnaire ne « passe » que sur les copros de son cabinet ; les policies de domaine appellent ces helpers et **n'ont pas à gérer le cabinet**. La couche schéma+RLS cabinet est posée maintenant ; les **écrans** de gestion de cabinet (CRUD, invitation gestionnaires) sont **différés** (finance d'abord).

---

## 0. Principes directeurs (cadre verrouillé)

1. **Deny by default.** Aucune fonction d'écriture n'est exécutable par `anon`. `REVOKE EXECUTE ... FROM anon, public` est le défaut ; on ne `GRANT` que ce qui est justifié.
2. **Défense en profondeur à 2 étages.** Étage 1 = RLS sur les tables (filtre les lignes). Étage 2 = garde in-function (`RAISE` si l'appelant n'a pas le droit métier). Les deux sont nécessaires : une fonction `SECURITY DEFINER` **bypasse** RLS, donc la garde in-function est sa seule protection.
3. **L'identité est portée par le JWT.** `auth.uid()` (claim `sub`) identifie l'utilisateur ; `auth.jwt()->>'role'` distingue `authenticated` (session-user) de `service_role` (machine de confiance).
4. **Le rôle métier vit dans `memberships`**, jamais dans le JWT. Un utilisateur est gestionnaire/copropriétaire **par copro** (multi-tenant). Le JWT ne dit que « authentifié » ; `user_is_copro_manager(copro)` tranche le reste.
5. **Lot-centric.** Le copropriétaire a accès à SES lots ; tout droit « own » se dérive de `lot_owners` actif via `coproprietaires.user_id`.
6. **Cabinet-centric (tenance).** Toute copro appartient à un **cabinet** (`copros.cabinet_id`). Un gestionnaire appartient à un cabinet (`profiles.cabinet_id`) et **n'accède qu'aux copros de son cabinet** ; un `platform_admin` est transverse. Ce filtre cabinet est **ajouté une seule fois, dans les helpers** (§4) — jamais répété dans les policies de domaine. On ne peut donc pas l'oublier sur une table fille.

---

## 1. RÔLES — matrice rôle → capacité

### 1.1 Les rôles Postgres / Supabase

| Rôle | Qui | JWT | Mode |
|---|---|---|---|
| **`anon`** | Visiteur non connecté | pas de `sub` | RLS appliqué, ACL minimale. **Aucune écriture, aucune fonction métier.** |
| **`authenticated`** | Session utilisateur connectée (`platform_admin`, gestionnaire OU copropriétaire) | `sub` = `auth.uid()`, `role=authenticated` | RLS appliqué + gardes in-function. Le rôle métier (et le **périmètre cabinet**) est résolu via `memberships` + `profiles.cabinet_id`. |
| **`service_role`** | Serveur Next.js / Edge Functions de confiance | `role=service_role` | **Bypass RLS.** Réservé aux traitements machine (callbacks providers, cron relances, post-as-you-go serveur). Jamais exposé au navigateur. |

> **Rôles métier (multi-cabinet) = 3 facettes du même rôle Postgres `authenticated`**, distinguées dynamiquement : **`gestionnaire`** (cloisonné à son cabinet), **`coproprietaire`** (ses lots), **`platform_admin`** (transverse, hors cabinet). `anon` est le visiteur. `service_role` est la **machine** (bicéphale, transverse). Le cloisonnement « gestionnaire ↔ cabinet » et la transversalité de `platform_admin` sont **portés par les helpers** (§4), pas par le JWT.

### 1.2 Rationalisation de l'enum `membership_role`

L'enum live a 5 valeurs (`admin, gestionnaire, membre_cs, coproprietaire, prestataire`) dont `prestataire`=0 ligne, `membre_cs`=1. Cible **3 valeurs** (fait foi : ENUMS §1.4 + 01 §1.8/§2 → `{gestionnaire, coproprietaire, platform_admin}`) ; **A13 : `admin` → `platform_admin`** :

| Valeur cible | Rôle d'accès | Note |
|---|---|---|
| `gestionnaire` | **gestionnaire (de cabinet)** | syndic d'une copro **de son cabinet** (pivot des gardes G-MGR) — son périmètre est **borné au cabinet** (`profiles.cabinet_id = copro.cabinet_id`, §4) |
| `coproprietaire` | **copropriétaire** | accès à ses lots ; cabinet **transitif** (via ses copros), jamais rattaché directement à un cabinet |
| `platform_admin` | **super-admin plateforme (équipe CoProFlex)** | **A13 : ex-`admin` renommé**. Rôle **transverse, hors cabinet** (`profiles.cabinet_id` NULL). **Englobé dans `user_is_copro_manager`** (le prédicat retourne `true` pour un `platform_admin` sur **toute** copro, **tout cabinet confondu**) : il dispose des capacités gestionnaire partout, sans ligne `membership` par copro. Ce n'est PAS une fusion d'enum : la valeur reste distincte, c'est le **prédicat** qui l'englobe. |
| ~~`membre_cs`~~ | → attribut conseil | **supprimé de l'enum** : un membre du CS est un `coproprietaire` + ligne `council_members` (`council_role`). PAS un rôle d'accès distinct ; la majorité simple CS s'appuie sur `council_members` (via `is_council_member`), pas sur ce flag. |
| ~~`prestataire`~~ | → supprimé | 0 ligne ; un prestataire n'a pas de compte d'accès copro dans la cible (il vit dans `tiers`/`providers`). |

> **Statut de `platform_admin` tranché (A13)** : `platform_admin` (ex-`admin`) n'est PAS fusionné dans `gestionnaire` au niveau de l'enum — il reste la 3ᵉ valeur (super-admin plateforme transverse). Deux niveaux d'englobement :
> - **Capacité gestionnaire partout** : `user_is_copro_manager` retourne `true` pour un `platform_admin` sur **toute copro de tout cabinet** (il bypasse le filtre cabinet), sans `membership` par copro.
> - **Helper dédié `user_is_platform_admin()`** : introduit (01 §5) pour les capacités **strictement transverses** — au minimum la policy ALL sur la table `cabinets` (un gestionnaire ne gère pas les cabinets ; cf. 01 §1.0/§3) et, plus tard, les écrans cross-cabinet de la console plateforme. C'est la seule garde qui **outrepasse** le cloisonnement cabinet.

### 1.3 Matrice rôle → capacité par domaine

`R` = lecture, `W` = écriture, `—` = aucun accès, `(own)` = limité à ses propres lots/données, `(svc)` = via service_role uniquement. Pour le **gestionnaire**, tout `R/W` est **borné à son cabinet** (filtre centralisé dans les helpers, §4). Le **`platform_admin`** est **transverse, tous cabinets confondus**.

| Domaine | anon | copropriétaire | gestionnaire (**borné à son cabinet**) | platform_admin (transverse) | service_role |
|---|---|---|---|---|---|
| **Cabinets** (organisation syndic) | — | — | R (**son cabinet seul**) | **R/W** (tous) | R/W |
| Copros / lots / tantièmes | — | R (sa copro) | R/W (copros du cabinet) | R/W (toutes) | R/W |
| Coproprietaires / lot_owners | — | R (soi + son lot) | R/W | R/W (toutes) | R/W |
| Memberships | — | R (soi) | R/W (sa copro) | R/W (toutes) | R/W |
| **Grand livre** (ledger_*) | — | R (dérivé : relevé de SES lots) | R/W (via RPC canoniques) | R/W (toutes) | R/W (post-as-you-go) |
| Budgets / appels de fonds | — | R (sa copro, ses lignes) | R/W | R/W (toutes) | R/W |
| Paiements copro (encaissement) | — | R (ses lots) | **W** (saisie fiche/rappro) | W (toutes) | W (import bancaire svc) |
| Factures / paiements fournisseurs | — | — | R/W | R/W (toutes) | W (callbacks) |
| Période / clôture / à-nouveau | — | — | R/W | R/W (toutes) | — |
| Reprise de mandat (opening balance) | — | — | **W** | W (toutes) | — |
| AG — gouvernance / vote / PV | — | R (sa copro) + **vote (own)** | R/W (anime la séance) | R/W (toutes) | — |
| Conseil syndical (majorité simple) | — | R + **vote (membre CS via `is_council_member`)** | R/W (org.) | R/W (toutes) | — |
| Mutations / état daté | — | — | **W (gestionnaire only)** | W (toutes) | — |
| Messagerie interne / mur | — | R/W (membre conv) | R/W | R/W (toutes) | — |
| Relances impayés | — | R (ses lots) | R/W | R/W (toutes) | W (cron envoi + callbacks) |
| Documents / GED | — | R (autorisés) | R/W | R/W (toutes) | — |
| Harnais de test / seed | — | — | — | — | **W (hors prod)** |

---

## 2. MODÈLE BICÉPHALE — session-user vs service_role

Deux têtes, deux contextes d'exécution. La règle : **toute action déclenchée par un humain dans le navigateur passe en session-user ; toute action machine sans humain au clavier passe en service_role.**

```
                    ┌────────────────────────────────────────┐
                    │  Requête entrante                       │
                    └───────────────┬────────────────────────┘
                                    │ JWT.role ?
                 ┌──────────────────┴───────────────────┐
                 │                                       │
        role = authenticated                    role = service_role
        (ou anon)                               (clé serveur, jamais navigateur)
                 │                                       │
        ┌────────▼─────────┐                   ┌─────────▼──────────┐
        │ TÊTE SESSION-USER│                   │  TÊTE SERVICE_ROLE │
        ├──────────────────┤                   ├────────────────────┤
        │ RLS APPLIQUÉ     │                   │ RLS BYPASSÉ        │
        │ auth.uid() connu │                   │ auth.uid() = NULL  │
        │ garde in-function│                   │ garde = vérif      │
        │  via memberships │                   │  des args + rôle   │
        └──────────────────┘                   └────────────────────┘
```

### 2.1 Quand chaque tête s'applique

| Cas d'usage | Tête | Pourquoi |
|---|---|---|
| Gestionnaire saisit un encaissement (`post_owner_payment`) depuis la fiche copro | **session-user** | humain identifié, garde `user_is_copro_manager(copro)` lit `auth.uid()` |
| Gestionnaire poste une facture, ouvre une période, valide une mutation | session-user | idem |
| Copropriétaire consulte son relevé, vote en AG | session-user | `auth.uid()` + droit « own » |
| Import bancaire batch → création d'écritures post-as-you-go | **service_role** | pas d'humain, traitement serveur de confiance |
| Cron d'envoi des relances (`get_pending_reminders_to_send`, `mark_reminder_sent`) | service_role | tâche planifiée |
| Callback provider email/SMS (`mark_notification_sent/failed`) | service_role | appel machine externe authentifié côté serveur |
| Seed / harnais de test (`seed_golden_loop`, `create_test_copro`) | service_role | jamais en prod publique |

### 2.2 Le drapeau dev/prod

- **PROD** : `service_role` est actif et porté **uniquement** par le backend (clé `service_role` jamais embarquée côté client). RLS `ENABLE` partout.
- **DEV** : on travaille principalement en `service_role` (ou RLS `DISABLE`) pour itérer sans friction. Voir §6.

### 2.3 Détecter la tête dans une fonction

```sql
-- Helper canonique : l'appel vient-il du backend de confiance ?
create or replace function public.is_service_call()
returns boolean language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'anon'
  ) = 'service_role';
$$;
```

---

## 3. CÂBLAGE IDENTITÉ — relier `coproprietaires` ↔ `auth.users`

**Problème.** `coproprietaires.user_id` est NULL sur 58/58 lignes. Conséquence : toutes les policies « own » (sur `coproprietaires`, `lot_owners`, `memberships`) et tous les helpers `user_is_lot_owner*` sont **inertes**. Sans câblage, le rôle copropriétaire et le portail anon→authenticated n'existent pas.

### 3.1 Chaîne d'identité cible (avec tenance cabinet)

```
cabinets (id) ◄── profiles.cabinet_id        (rattachement GESTIONNAIRE → cabinet ; NULL pour copropriétaire & platform_admin)
   ▲                    │
   │ copros.cabinet_id  │ 1:1
   │ (FK NOT NULL)      ▼
copros ──────── auth.users (id) ──1:1── profiles (id = auth.users.id)
                      │
                      │  (un user peut être lié à plusieurs coproprietaires : multi-copro, indivision)
                      ▼
            coproprietaires.user_id ──FK→ profiles.id   (NULL tant que non invité/non activé)
                      │
                      ▼
            lot_owners (coproprietaire_id, lot_id actif)  ──►  droits « own » sur le lot
                      │
            memberships (user_id, copro_id, role)         ──►  rôle d'accès par copro

Périmètre gestionnaire = { copros WHERE cabinet_id = profiles.cabinet_id }   (porté par les helpers §4)
Périmètre platform_admin = toutes les copros, tous cabinets (helper le bypasse)
Copropriétaire : rattaché à ses copros → cabinet TRANSITIF (jamais profiles.cabinet_id)
```

### 3.2 Plan de câblage (3 jalons)

**Jalon A — Invitation.** Le gestionnaire invite un copropriétaire par email. On crée une invitation (token + `coproprietaire_id` + `email`). Tant qu'elle n'est pas acceptée, `user_id` reste NULL (état nominal, pas une anomalie).

**Jalon B — Activation.** À l'acceptation, Supabase Auth crée `auth.users` → trigger `handle_new_user` crée `profiles`. Une RPC `link_coproprietaire_account(p_invite_token)` (DEFINER, garde : email du JWT = email invité) fait :
1. `coproprietaires.user_id := auth.uid()` (sur la/les lignes de l'invitation) ;
2. `INSERT memberships(user_id, copro_id, role='coproprietaire')`.

> L'appartenance au conseil syndical n'est **jamais** écrite en membership : elle reste dans `council_members` (cf. §1.2, `membre_cs` retiré de l'enum).

**Jalon C — Activation effective des helpers.** Une fois `user_id` peuplé, `user_owns_any_lot_in_copro`, `get_user_lot_ids`, etc. deviennent opérants **sans modification de code** (ils lisaient déjà `coproprietaires.user_id`). Le portail copropriétaire peut alors s'appuyer dessus.

### 3.3 Contraintes à ajouter

- `coproprietaires.user_id` : garder `FK→profiles ON DELETE SET NULL`, mais **pas** UNIQUE (un user = plusieurs coproprietaires possibles). 
- L'unicité métier « un user ne s'auto-invite pas deux fois sur la même personne » est portée par la table d'invitations.
- Trigger de cohérence : `memberships(user_id, copro_id)` ne doit exister pour un `coproprietaire` que s'il existe une ligne `coproprietaires` correspondante avec ce `user_id` dans cette copro.
- **`profiles.cabinet_id` (FK → cabinets, 01 §1.9)** : renseigné **pour les gestionnaires** (posé à l'invitation gestionnaire — écran différé, en attendant via RPC `service_role`/`platform_admin`), **NULL** pour copropriétaires et `platform_admin`. **Fail-closed** : un gestionnaire sans `cabinet_id` ne « passe » sur aucune copro (les helpers exigent `profiles.cabinet_id = copro.cabinet_id`). Le copropriétaire n'a **jamais** de `cabinet_id` direct (son cabinet est transitif via `lot_owners → lots → copros`).

---

## 4. HELPERS d'autorisation (cœur du modèle)

Tous sont `SECURITY DEFINER` (ils doivent lire `memberships`/`lot_owners` malgré la RLS de l'appelant), `STABLE`, `search_path = public`, et **renvoient FALSE si `auth.uid()` est NULL**. Ils sont la brique réutilisée par les policies RLS ET par les gardes in-function.

| Helper | Signature | Vérifie | Utilisé par |
|---|---|---|---|
| `user_is_platform_admin` | `() → bool` | ∃ membership `role='platform_admin'` pour `auth.uid()` (transverse, hors cabinet) — **AJOUTÉ (A13)** | policy ALL `cabinets` ; englobé par les 2 helpers ci-dessous ; capacités cross-cabinet |
| `user_has_copro_access` | `(p_copro_id uuid) → bool` | **`user_is_platform_admin()`** OU [∃ membership(uid, copro) — tout rôle — **ET** (si gestionnaire : `profiles.cabinet_id = copro.cabinet_id`)] — **PÉRIMÈTRE CABINET INTÉGRÉ** | policies SELECT de toutes les tables copro |
| `user_is_copro_manager` | `(p_copro_id uuid) → bool` | **`user_is_platform_admin()`** OU [membership `role='gestionnaire'` **ET** `profiles.cabinet_id = copro.cabinet_id`] — **PÉRIMÈTRE CABINET INTÉGRÉ** (un gestionnaire ne passe que sur les copros de SON cabinet) | **pivot** : toutes les gardes G-MGR + policies W |
| `user_owns_any_lot_in_copro` | `(p_copro_id uuid) → bool` | ∃ lot_owner actif via coproprietaires.user_id=uid | accès portail copropriétaire |
| `user_is_lot_owner` | `(p_lot_id uuid) → bool` | propriétaire actif du lot | policies « own » lot |
| `user_is_lot_owner_in_copro` | `(p_copro_id, p_lot_id) → bool` | idem borné copro | gardes paiement/relevé par lot |
| `user_is_lot_owner_or_manager` | `(p_copro_id, p_lot_id) → bool` | OR des deux | RPC mixtes (relevé) |
| `get_user_lot_ids` | `(p_copro_id uuid) → uuid[]` | lots actifs de l'utilisateur | filtrage relevés/listes |
| `is_council_member` | `(p_copro_id, p_user_id) → bool` | ∃ council_members(copro) lié à uid — **source UNIQUE du rôle conseil** (lit `council_members`) | vote CS, majorité simple, policies conseil |
| `is_council_president` | `(p_copro_id, p_user_id) → bool` | président du CS | actions réservées président |
| `is_conversation_member` | `(p_conversation_id, p_user_id) → bool` | membre de la conversation | messagerie |
| `can_view_content` | `(p_copro_id, p_visibility, p_user_id) → bool` | **visibilité SIMPLE par contenu** (G-INTERNAL, source = `content_visibility` sur `wall_posts`/`events`/`council_documents`) : `manager`(via `user_is_copro_manager`) / `+ conseil`(via `is_council_member`) / `+ tous`(via `user_has_copro_access`) selon `p_visibility` | policy SELECT `council_documents` (04 §3) ; principe de visibilité mur/events (08 §3) |
| `user_can_view_document` | `(p_document_id[, p_user_id]) → bool` | **visibilité SIMPLE par document (A4)** : `manager`(via `user_is_copro_manager`) / `+ conseil syndical`(via `is_council_member`) / `+ tous copropriétaires`(via `user_has_copro_access`) — selon `documents.visibility` fixée par le gestionnaire | GED. **À RÉÉCRIRE (A4)** : (1) **DROP de la table ACL fine `document_access`** — la confidentialité devient un simple champ `visibility ∈ {manager_only, council, all_owners}` sur le document ; (2) remplacer la branche CS `user_is_council_member(v_doc.copro_id)` par `is_council_member(v_doc.copro_id, auth.uid())` AVANT le DROP de `user_is_council_member`. Plus aucune jointure sur `document_access`. **`can_access_document` ABANDONNÉE** (cassée : référait la table inexistante `copro_members`) — seule `user_can_view_document` est conservée. |
| `is_service_call` | `() → bool` | JWT.role = service_role | branche bicéphale dans les RPC |

> Ces helpers existent déjà et sont **bien conçus** (verdict cartographie §2). On les **conserve** ; on ajoute `is_service_call` **et `user_is_platform_admin` (A13)**, et on **enrichit le corps** de `user_has_copro_access`/`user_is_copro_manager` du **filtre cabinet**. La nouveauté n'est pas la signature des helpers mais leur **branchement effectif** (RLS ON + gardes + périmètre cabinet) et le câblage `user_id`/`cabinet_id` (§3).
>
> **Périmètre cabinet CENTRALISÉ dans 2 helpers (décision USER multi-cabinet).** Le filtre « ce gestionnaire appartient-il au cabinet de cette copro ? » (`profiles.cabinet_id = copros.cabinet_id`) est ajouté **uniquement** dans `user_has_copro_access` et `user_is_copro_manager`, plus le bypass `platform_admin`. **Conséquence majeure** : **aucune policy de domaine ni aucune garde G-MGR/G-OWNER ne change** — elles appellent déjà ces helpers, donc héritent du cloisonnement cabinet **gratuitement**. On ne peut pas « oublier » le filtre cabinet sur une table fille puisqu'aucune table fille ne porte `cabinet_id` (seul `copros` le porte). C'est la défense en profondeur centralisée : un seul point de vérité pour la tenance.
>
> **Rôle conseil syndical — source unique `is_council_member` (lit `council_members`).** On **retire `user_is_council_member`** : il lisait `memberships.role`, or `membre_cs` n'est plus un rôle de membership mais un **attribut** porté par `council_members` (cf. §1.2 et ENUMS §1.4). Lire `memberships.role` pour le CS deviendrait structurellement faux. Alignement avec le blueprint 04 (§3/§5/§7-4, divergence tranchée) : **toutes** les policies et gardes du domaine conseil pointent désormais sur `is_council_member(p_copro_id, auth.uid())` — source unique.
>
> **RÉÉCRIRE `user_can_view_document` (dépendance bloquante au DROP de `user_is_council_member`).** Vérifié live : la branche `WHEN 'council'` de `user_can_view_document` fait `v_has_access := user_is_council_member(v_doc.copro_id)`. Si on droppe `user_is_council_member` sans la réécrire, `user_can_view_document` casse (fonction inexistante) et toute la lecture GED `council` tombe ; si on garde `user_is_council_member` pour ne pas casser, on viole la décision « source unique `is_council_member` ». **Fix** : remplacer cet appel par `is_council_member(v_doc.copro_id, auth.uid())` (signature 2 args), exactement comme `can_view_content` le fait déjà (vérifié live). `user_can_view_document` passe donc de « GARDER tel quel » à **RÉÉCRIRE**, à répercuter dans 06 §5 et INVENTAIRE §J. **Ordre de migration (§7)** : réécrire `user_can_view_document` **AVANT** le DROP de `user_is_council_member` (étape 2).

---

## 5. GARDES SUR LES 117 FONCTIONS DEFINER

### 5.1 Patron général (deny-by-default)

Pour **chaque** fonction d'écriture, à la création :

```sql
REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.<fn>(...) TO authenticated;   -- si appelable en session-user
-- + service_role si appel machine légitime
```

Puis garde en tête de corps, selon la convention de la cartographie :

```sql
-- G-MGR (gestionnaire d'une copro)
if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
  raise exception 'forbidden: manager required for copro %', p_copro_id
    using errcode = '42501';
end if;
```

| Classe | Patron de garde | ACL EXECUTE |
|---|---|---|
| **G-MGR** | `is_service_call() OR user_is_copro_manager(p_copro_id)` sinon RAISE 42501 | `authenticated`, `service_role` |
| **G-OWNER** | `user_is_lot_owner_in_copro / is_conversation_member / is_council_member` sinon RAISE | `authenticated`, `service_role` |
| **G-MIXTE** | `user_is_lot_owner_or_manager(...)` | `authenticated`, `service_role` |
| **G-SVC** | `is_service_call()` sinon RAISE (machine only) | `service_role` **uniquement** (REVOKE authenticated, anon) |
| **G-DEF-RO** | lecture : `user_has_copro_access(p_copro_id)` sinon RAISE | `authenticated` (+ `anon` SEULEMENT si endpoint public légitime — sinon non) |
| **G-INTERNAL** | helper pur / appelé par d'autres fonctions : pas de garde métier | `REVOKE anon` ; `authenticated` toléré si lecture inoffensive |
| **G-TRIG** | trigger : ne doit pas être appelable en direct | `REVOKE EXECUTE FROM public, anon, authenticated` (s'exécute dans le contexte du trigger) |

### 5.2 Disposition de masse

- **Triggers (45)** → G-TRIG : `REVOKE EXECUTE FROM public, anon, authenticated`. Ils tournent au déclenchement, pas en appel RPC.
- **Helpers d'autz/internes** → G-INTERNAL : restent DEFINER, `REVOKE anon`.
- **Toutes les RPC d'écriture finance/AG/mutations** → G-MGR (+ branche `service_role` quand post-as-you-go).
- **À supprimer (décisions USER)** : couche AG bespoke (`generate_combined_calls_from_ag`, `create_budget_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `get/mark_ag_pending_actions`, `finish_ag_session`), campagnes/mail (`generate_campaign_recipients`, `update_mail_campaign_stats`, `create_mail_system_folders`), surcharges doublons (`post_budget_call_for_funds` 7-args, `post_supplier_payment` 7-args, `generate_document_path` 3-args), artefacts dev (`ensure_dev_membership`, `get_default_copro_id`).
  - **`create_mail_system_folders`** : écrit dans `mail_folders` (vérifié live : `prosrc` cible `mail_folders`), table droppée par 08 §5 (bloc messagerie/mail). 08 §5 la liste déjà dans les fonctions droppées et T3-A3 l'aligne ; on la retire donc ici aussi de la liste « GARDÉES ». Conserver cette fonction alors que sa table cible n'existe plus la rendrait **orpheline** (appel d'une relation inexistante), ce qu'interdit la règle n°1 de ce document. Elle tombe **avec le bloc mail**, dans le même lot que `generate_campaign_recipients` / `update_mail_campaign_stats`. **Correction de classification** : T1 §J la marquait GARDER (G-MGR) ; reclasser en ABANDONNER avec le bloc mail (cf. annotation T1 §J).
- **`fusion tiers`** : `update_provider_stats` réécrit sur l'entité tiers unique (suppliers+providers fusionnés).
- **`allocate_payment` (cas INVOKER)** → **G-INTERNAL non exposée**. C'est la seule fonction d'écriture qui reste `SECURITY INVOKER` (imputation FIFO sur `payment_allocations`/`payments`/`call_for_funds_lines`) ; elle ne reçoit pas `p_copro_id` (signature `p_payment_id, p_call_line_ids, p_nature_filter`), donc pas de garde G-MGR directe possible. Décision (cf. §5.3) : `REVOKE EXECUTE FROM anon, public` ; `GRANT authenticated, service_role` ; elle n'est **jamais** appelée hors `post_owner_payment` (qui, lui, est DEFINER + G-MGR et porte le contrôle de rôle). Voir §5.3 pour la justification de sécurité.

#### 5.2.1 Île notifications AG — statut transitoire (NE PAS droper avant refacto webhook)

`create_ag_notification`, `mark_notification_sent`, `mark_notification_failed` sont **GARDÉES** (T1 §E) → règle n°1 (« aucune fonction conservée sans table cible ») impose que leurs tables cibles le soient aussi **tant que le rebranchement n'est pas fait**. Or le blueprint 04 (§1.8, §6 arbitrage 2, §7-2) marque `ag_notifications` / `ag_notification_events` / `ag_milestones` à droper.

Séquençage tranché (cohérent avec 04 §6-2 « DROP mais séquencé ») :

1. **État actuel (transitoire)** : `ag_notifications` + `ag_notification_events` sont **ÉCRITES par l'edge `email_webhook`** (faux mort T3-B) et `ag_milestones` **LUE par `useAGDelais`**. → Ces 3 tables **restent dans un blueprint avec RLS** (policies G-MGR / SELECT access), et les fonctions `create_ag_notification` / `mark_notification_*` restent gardées **G-MGR / G-SVC** (le callback provider passe en `service_role`). **Aucune n'est orpheline.**
2. **Pré-condition au drop** : rebrancher `email_webhook` (et `get/save_ag_milestone`) sur **`ag_envoi_tracking`** (canal légal réellement peuplé), prouvé iso-comportement sur HARNESS.
3. **Après refacto seulement** : droper les 3 tables ET `create_ag_notification` / `mark_notification_sent` / `mark_notification_failed` ensemble, dans le même lot.

> Tant que l'étape 2 n'est pas faite, **on ne drope ni la table ni la fonction** : un webhook qui écrit dans une table absente échoue silencieusement (perte de traçabilité d'envoi). L'ordre est : refacto edge → drop, jamais l'inverse.

##### Foyer schéma transitoire des 3 tables (auto-porté ici)

Le blueprint 04 ne **définit pas** la structure de `ag_notifications` / `ag_notification_events` / `ag_milestones` (il les liste seulement comme DROP : 04 §6, §7-2). Pour qu'aucune des 3 fonctions gardées (`create_ag_notification`, `mark_notification_sent`, `mark_notification_failed`) ne reste **orpheline de table** pendant la fenêtre transitoire, ce document **héberge** leur spec minimale de survie. Ces tables sont **TRANSITOIRES — à droper avec leurs fonctions à l'étape 3** (refacto `email_webhook` → `ag_envoi_tracking` prouvée sur HARNESS) ; elles **n'entrent PAS** dans le schéma cible définitif. La structure ci-dessous est volontairement réduite au strict nécessaire pour que l'edge `email_webhook` (faux mort) et `useAGDelais` continuent d'écrire/lire sans 500 jusqu'au rebranchement.

| Table transitoire | Colonnes minimales (survie) | Écrit/lu par | RLS transitoire |
|---|---|---|---|
| `ag_notifications` | `id uuid PK`, `ag_id uuid FK→ag_meetings ON DELETE CASCADE`, `copro_id uuid FK→copros ON DELETE CASCADE`, `coproprietaire_id uuid FK→coproprietaires ON DELETE SET NULL`, `channel notification_channel`, `status delivery_status NOT NULL default 'queued'`, `provider_ref text`, `error_message text`, `sent_at/created_at timestamptz` | écrit par `create_ag_notification` (session-user G-MGR) + `mark_notification_*` (callback provider G-SVC) ; edge `email_webhook` | gestionnaire : ALL si `user_is_copro_manager(copro_id)` · copropriétaire : SELECT de SES notifs (`coproprietaire_id` lié `auth.uid()`) · anon : aucune |
| `ag_notification_events` | `id uuid PK`, `notification_id uuid FK→ag_notifications ON DELETE CASCADE`, `copro_id uuid` (dénormalisé, cohérence via trigger), `event_type text`, `payload jsonb default '{}'`, `occurred_at/created_at timestamptz` | écrit par `mark_notification_sent/failed` + callback webhook (G-SVC) | gestionnaire : ALL via `user_is_copro_manager(copro_id)` · autres : aucune (journal interne) |
| `ag_milestones` | `id uuid PK`, `ag_id uuid FK→ag_meetings ON DELETE CASCADE`, `copro_id uuid FK→copros ON DELETE CASCADE`, `milestone_key text`, `due_date date`, `done boolean default false`, `created_at/updated_at timestamptz` | **lu** par `useAGDelais` / `get_ag_milestone` ; écrit par `save_ag_milestone` (G-MGR) | gestionnaire : ALL via `user_is_copro_manager(copro_id)` · copropriétaire : SELECT si `user_has_copro_access(copro_id)` (jalons visibles) · anon : aucune |

- **ACL des 3 fonctions gardées** (cohérent §5.1) : `create_ag_notification` → **G-MGR** (`is_service_call() OR user_is_copro_manager(p_copro_id)`), `GRANT authenticated, service_role`. `mark_notification_sent` / `mark_notification_failed` → **G-SVC** (`is_service_call()` sinon RAISE 42501), `REVOKE authenticated, anon` ; `GRANT service_role` **uniquement** (ce sont des callbacks provider). Toutes : `REVOKE EXECUTE FROM public, anon`.
- **RLS transitoire ON** sur les 3 tables (ENABLE prod / DISABLE dev, comme le reste — §6.2). Inutile de leur appliquer `FORCE` (pas des tables comptables).
- **À l'étape 3** : `DROP TABLE ag_notifications, ag_notification_events, ag_milestones` **+** `DROP FUNCTION create_ag_notification, mark_notification_sent, mark_notification_failed` dans le **même lot**, une fois `email_webhook` et `get/save_ag_milestone` rebranchés sur `ag_envoi_tracking` (resp. `step_data` du wizard, cf. 04 §7-2). Ce foyer transitoire disparaît alors entièrement.

> Pourquoi héberger la spec ici plutôt que dans 04 : la **cause** de la conservation est purement un impératif d'autorisation (« aucune fonction gardée sans table cible », règle n°1 de ce document). Le blueprint 04 décrit le schéma **cible définitif** où ces tables n'existent plus ; les y réintroduire brouillerait la cible. On les isole donc dans cette annexe transitoire d'AUTORISATION, avec une date de péremption claire (étape 3). **Alternative si l'on préfère rebrancher AVANT la re-baseline** : exécuter l'étape 2 en amont, droper les 3 tables ET retirer `create_ag_notification`/`mark_notification_*` de la liste « GARDÉES » (§5.2.1 / §7-6 / T1 §E) dès le départ — auquel cas cette annexe et le foyer transitoire tombent. Tant que l'USER n'a pas tranché ce rebranchement préalable, le foyer transitoire ci-dessus fait foi.

### 5.3 Les fonctions les plus dangereuses (traitement explicite)

Ce sont les portes d'écriture du grand livre et des soldes lot-centric. Aujourd'hui : DEFINER + exécutables `anon` + aucune garde = **n'importe qui poste des écritures comptables**. Cible :

| Fonction | Risque actuel | ACL cible | Garde in-function cible |
|---|---|---|---|
| **`create_ledger_transaction`** | route canonique d'écriture GL ouverte à anon | `REVOKE anon, public` ; `GRANT authenticated, service_role` | `is_service_call() OR user_is_copro_manager(p_copro_id)` sinon RAISE 42501. + vérifier que `p_period_id` appartient à `p_copro_id` ET `status='open'` (sinon RAISE) — empêche d'écrire dans une période close. |
| **`post_owner_payment`** | encaissement copro postable par anon (fraude/altération de soldes) | `REVOKE anon` ; `GRANT authenticated, service_role` | G-MGR sur `p_copro_id`. Branche `service_role` autorisée pour import bancaire. Garder l'idempotence (`p_idempotency_key`) comme garde anti-rejeu. Vérifier `p_lot_id ∈ p_copro_id`. |
| **`post_supplier_invoice`** | création de dette fournisseur + poste classe 6 par anon | `REVOKE anon` ; `GRANT authenticated, service_role` | G-MGR. Vérifier `p_supplier_id` (entité tiers) rattaché à `p_copro_id`. Période ouverte. Montants cohérents (HT+TVA=TTC) — déjà via trigger, mais re-RAISE explicite. |
| **`post_budget_call_for_funds`** | génération d'appels de fonds (crée des créances) par anon | `REVOKE anon` ; `GRANT authenticated, service_role` | G-MGR. Garder UNIQUEMENT la surcharge 10-args ; DROP la 7-args. Vérifier budget ∈ copro, clés de répartition complètes (`repartition_key_is_complete`). |
| **`set_opening_balance`** | reprise de mandat : injecte des soldes d'ouverture arbitraires par anon | `REVOKE anon` ; `GRANT authenticated` **seulement** (pas service_role : geste exclusivement humain de reprise) | G-MGR **strict** (`user_is_copro_manager`, **sans** branche service). Autorisé uniquement si la période est en mode ouverture / non approuvée. Une seule reprise par période (garde d'unicité). |
| **`allocate_payment`** | **`SECURITY INVOKER`** : sa seule protection est la RLS de `payment_allocations`/`payments`/`call_for_funds_lines`. Or §6.2 **DÉSACTIVE la RLS en dev** et une policy INSERT permissive suffit à laisser un non-gestionnaire imputer des paiements (altération des soldes lot-centric). Signature `(p_payment_id, p_call_line_ids, p_nature_filter)` → **pas** de `p_copro_id`, donc pas de garde G-MGR directe. | `REVOKE anon, public` ; `GRANT authenticated, service_role`. **Marquée G-INTERNAL non exposée** (cf. §5.2). | Pas de garde de rôle in-function possible (pas de `copro_id` en arg) ; le contrôle de rôle est porté par **`post_owner_payment`** (DEFINER + G-MGR), son **unique** appelant légitime. **Décision** : ne PAS l'exposer comme RPC publique ; toute imputation passe par `post_owner_payment`. Variante si un appel direct devient nécessaire un jour : la passer SECURITY DEFINER + dériver `copro_id` depuis `payments.copro_id` puis garde `user_is_copro_manager(copro_id)`. Pour l'instant : voie indirecte uniquement, et le `REVOKE anon` est non négociable (filet quand la RLS est OFF en dev). |

> Règle commune : pour les 5 fonctions DEFINER, la garde in-function est **non contournable** car DEFINER bypasse la RLS — c'est leur seul rempart, et toute nouvelle RPC d'écriture GL hérite du même patron. **Cas particulier `allocate_payment` (INVOKER)** : n'ayant pas de `copro_id` en argument, elle ne peut pas porter de garde de rôle ; on la **soustrait à l'exposition** (`REVOKE anon, public`, jamais appelée hors `post_owner_payment`) au lieu de compter sur la seule RLS — qui est désactivée en dev (§6.2). C'est ce qui ferme la dernière porte d'écriture restée ouverte à `anon` après le durcissement des 5 fonctions DEFINER.

---

## 6. RLS — stratégie d'activation (ON prod / OFF dev)

**Constat.** Les tables du domaine 01 (et la plupart des autres) ont `relrowsecurity = false` **alors que des policies bien écrites existent déjà**. La RLS est donc « débranchée » mais le câblage est prêt. **Nouvelle table `cabinets` incluse** dans le périmètre RLS (policy ALL `platform_admin`, SELECT son cabinet pour gestionnaire — 01 §3).

### 6.1 Principe

- **Les policies restent en place** (elles sont saines : SELECT `user_has_copro_access`, ALL/UPDATE `user_is_copro_manager`, SELECT own via `coproprietaires.user_id`).
- On bascule **uniquement le drapeau** `ENABLE/DISABLE ROW LEVEL SECURITY` selon l'environnement, sans toucher au code.

### 6.2 Bascule par environnement (idempotente)

```sql
-- À exécuter selon l'environnement cible (paramètre app.environment ou variable de déploiement)
do $$
declare t text;
begin
  foreach t in array array[
    'cabinets','copros','buildings','lots','lot_owners','coproprietaires',
    'repartition_keys','repartition_key_lines','memberships','profiles'
    -- + toutes les tables finance/AG/GED/messagerie
  ] loop
    if current_setting('app.environment', true) = 'production' then
      execute format('alter table public.%I enable row level security', t);
    else
      execute format('alter table public.%I disable row level security', t);
    end if;
  end loop;
end $$;
```

### 6.3 Pourquoi ça ne casse pas le dev

- **En dev**, on travaille en `service_role` (qui bypasse RLS de toute façon) **ou** RLS `DISABLE` → itération sans friction, boucle d'or testable sans se connecter en tant que copropriétaire.
- **En prod**, RLS `ENABLE` + session-user → cloisonnement réel par copro et par lot.
- Le **filet de sécurité reste les gardes in-function** : même si RLS est OFF en dev, les 5 fonctions dangereuses gardent leur `RAISE` (la garde in-function ne dépend pas de RLS). En prod, garde + RLS = double rempart.

### 6.4 FORCE RLS pour les tables comptables

Pour les tables du grand livre (`ledger_transactions`, `ledger_entries`, `accounting_periods`, `accounts`), ajouter `FORCE ROW LEVEL SECURITY` en prod : ainsi **même le propriétaire de la table** (hors `service_role`/`BYPASSRLS`) reste soumis aux policies. Cela protège l'exigence légale d'immutabilité (combinée aux triggers `trg_ledger_*_immutable`).

### 6.5 Pré-requis avant d'activer RLS en prod

1. **Câbler `coproprietaires.user_id`** (§3) — sinon les copropriétaires sont verrouillés dehors (policies « own » vides).
2. **Câbler `profiles.cabinet_id`** des gestionnaires (§3.3) — sinon, fail-closed, ils ne voient aucune copro (les helpers exigent `profiles.cabinet_id = copro.cabinet_id`). Vérifier que chaque copro a bien un `cabinet_id` (FK NOT NULL le garantit) rattaché au bon cabinet.
3. Vérifier qu'**au moins une policy INSERT/DELETE** existe ou que la création passe par RPC `service_role` (cas de `copros`/`cabinets` : pas de policy INSERT session-user → création via RPC, OK).
4. Re-tester la **COPRO-TEMPLATE** (qui remplace la boucle d'or, A1) en session-user gestionnaire **rattaché au cabinet template** (et non plus en service_role) pour prouver que les gardes + le filtre cabinet ne bloquent pas le parcours légitime, ET qu'un gestionnaire d'un **autre** cabinet est bien refusé.

---

## 7. Plan d'application (ordre)

0. **Couche tenance cabinet (multi-cabinet, dès la cible)** : créer la table `cabinets` (01 §1.0), brancher `copros.cabinet_id` en FK NOT NULL, ajouter `profiles.cabinet_id` (FK → cabinets), seed le cabinet template (01 §6). Ajouter `user_is_platform_admin()` et **enrichir** `user_has_copro_access`/`user_is_copro_manager` du filtre cabinet + bypass platform_admin (§4). Policy ALL `cabinets` pour `platform_admin`, SELECT son cabinet pour gestionnaire.
1. Rationaliser `membership_role` (→ gestionnaire / coproprietaire / **`platform_admin`** ; **A13** : ex-`admin` renommé ; `membre_cs` et `prestataire` retirés de l'enum — cf. §1.2).
2. Ajouter `is_service_call()` ; faire de `is_council_member` (lit `council_members`) la source unique du rôle CS. **RÉÉCRIRE d'abord `user_can_view_document`** : (a) **DROP de `document_access`** (A4 — confidentialité simple par document `visibility ∈ {manager_only, council, all_owners}`), (b) remplacer `user_is_council_member(v_doc.copro_id)` par `is_council_member(v_doc.copro_id, auth.uid())`, **PUIS retirer `user_is_council_member`** (qui lisait `memberships.role`). Cet ordre est non négociable : droper avant la réécriture casse la lecture GED `council`.
3. Mécanisme d'invitation + `link_coproprietaire_account` → câbler `user_id` (§3) ; câbler `profiles.cabinet_id` des gestionnaires (RPC `service_role`/`platform_admin` en attendant l'écran d'invitation gestionnaire, différé).
4. `REVOKE EXECUTE FROM public, anon` en masse ; `GRANT` ciblé `authenticated`/`service_role`.
5. Ajouter les gardes in-function (priorité absolue : les 5 fonctions §5.3).
6. Supprimer bespoke AG / campagnes / doublons / artefacts dev. **Exclure l'île notifications AG** (`ag_notifications`/`events`/`milestones` + `create_ag_notification`/`mark_notification_*`) : conservées avec RLS tant que `email_webhook` n'est pas rebranché sur `ag_envoi_tracking` (§5.2.1).
7. Activer RLS (prod) + `FORCE` sur tables GL ; garder OFF en dev.
8. Re-tester la **COPRO-TEMPLATE** (A1, remplace la boucle d'or) en session-user gestionnaire **rattaché au cabinet template** (preuve de non-régression) + vérifier le **refus cross-cabinet** (gestionnaire d'un autre cabinet → 0 accès).
9. Refacto edge `email_webhook` → `ag_envoi_tracking` prouvée sur HARNESS, **puis** drop de l'île notifications AG (tables + fonctions ensemble).

# Audit des 4 fondations transversales « rouges » — 2026-06-21

> Produit par un workflow ultracode (6 agents : 4 audits + 1 contre-vérif adversariale RLS + 1 synthèse).
> Vérifications confirmées **en base LIVE** (`qqfqrcolzmcbsvfaumiq`) + Security Advisor Supabase.
>
> **VERDICT GLOBAL : NON LIVRABLE EN PROD EN L'ÉTAT.** Les 4 fondations sont bien conçues, mais
> chacune porte ≥1 trou **bloquant**. Aucun n'est un effondrement structurel — tous circonscrits
> et réparables.

---

## 🚨 Bloquant n°1 (CRITIQUE) — 2 tables financières en accès libre depuis internet

**Verdict sécurité : MUR. Verdict RLS : orange (mais requalifié plus grave par l'attaquant).**

Deux tables créées **après** la migration RLS (0034) ont été oubliées — **RLS désactivée, 0 policy, sur le cloud LIVE** :
- `opening_balance_residual_items` (migration `0077_f8_opening_residual_tracing.sql:21`) — détail débiteur/créditeur de **reprise de mandat art.10**, avec `lot_id` et montants (données **nominatives**).
- `supplier_advances` (migration `0078_f8_supplier_advance_409.sql:20`) — **acomptes fournisseurs** (montants, solde).

**Aggravant trouvé par la contre-vérif :** sur ces 2 tables, le rôle `anon` (clé publique embarquée dans le frontend) a non seulement `SELECT` mais aussi `INSERT/UPDATE/DELETE/TRUNCATE`. → **Un internaute NON connecté peut LIRE *et DÉTRUIRE* des données financières nominatives de TOUS les cabinets**, depuis internet. Confirmé en base + 3 findings ERROR du Security Advisor (2× `rls_disabled_in_public` + 1× `security_definer_view`).

**La fondation RLS elle-même est SAINE** (l'attaquant l'a confirmée sur 5 vecteurs) : 79/81 tables protégées (cabinet + copro), helpers `SECURITY DEFINER` fail-closed et anti-récursion, 5 tables du grand livre en `FORCE`, pas de fail-open, 66/67 vues en `security_invoker` (la seule vue DEFINER, `tiers_directory`, filtre + masque les RIB → sûre). **Le trou = uniquement les 2 tables 0077/0078** + l'absence de garde-fou anti-récidive.

**À faire :** `enable row level security` + `revoke` anon + policies `p_mgr_all (user_is_copro_manager(copro_id))` (+ volet lot-centric pour la table residual) ; ajouter les 2 tables au registre de `apply_rls_environment()` ; **poser un gate de migration « toute table public sans RLS = échec »** ; rejouer le Security Advisor → 0 finding.

---

## 🟥 Bloquant n°2 — Sécurité des accès (MUR)

- **Aucune séparation de rôles applicative** : les layouts `(dashboard)` et `(gestionnaire)` ne testent que `user != null`, jamais le `role`/`memberships` → **un copropriétaire connecté peut charger toute l'UI gestionnaire** (seule la RLS limite les *données* affichées). → garde de rôle à ajouter dans les layouts.
- **Compte démo `lyes.triki@coproflex.fr` / `password123` actif sur le LIVE** (mot de passe en clair dans `src/app/auth/login/page.tsx:10-11` + bouton 1-clic). → à retirer avant tout vrai client.
- **Aucun parcours « mot de passe oublié »** (`resetPasswordForEmail` absent à 100%). → à implémenter.
- Mineurs : `leaked password protection` Supabase désactivée ; open-redirect possible sur le `next` du `auth/callback`.
- **OK :** clé `service_role` jamais exposée au navigateur (`admin.ts` en `server-only`), `.env*` gitignoré, middleware allowlist + double garde de layout, routes API banque/mail gardées (`requireAnyManager`/HMAC).

---

## 🟧 Bloquant n°3 — Correction des erreurs comptables (orange)

**Le moteur de contre-passation EXISTE et est de bonne facture** (migration `0071`, immutabilité GL respectée, câblé front : bouton « Contre-passer » + annulation d'appel). Mais couverture **partielle** :
- **Contre-passer un PAIEMENT copropriétaire** nette le grand livre **mais laisse `payment_allocations` et `amount_paid` intacts** → **créance fantôme « toujours payée »** + écart qui repart dans `v_lot_vs_gl_mismatch`. Le bouton Comptabilité l'autorise pourtant → casse la cohérence appel/paiement.
- **Pas de `cancel_supplier_invoice`** : impossible d'annuler proprement une facture fournisseur postée par erreur (hors avoir métier).
- **Pas de `unallocate_payment`** : impasse quand `cancel_call_for_funds` refuse strictement un appel avec paiement imputé.

**À faire :** `reverse_payment` (GL + `payment_allocations` + `amount_paid` + statut appel), `cancel_supplier_invoice`, `unallocate_payment` ; brider le gate front `canReverseSelected` pour interdire la contre-passation générique d'une tx `source_type='payment'`.

---

## 🟧 Bloquant n°4 — Conformité des annexes comptables (orange)

- **Convocation, PV, état daté = OK** (juridiquement corrects sur la forme). ⚠️ **La note « annexe 1 cassée » est OBSOLÈTE** : le câblage `fn_annexe_1..5` → PDF existe. **C'est le CONTENU qui est fautif.**
- **Annexe 1** : **pas de gate d'équilibre** (Total créances = Total dettes). Un grand livre déséquilibré part quand même → approbation des comptes potentiellement **NULLE** (art.11 décret 67-223).
- **Annexe 2** : ligne légale « **Solde (excédent/insuffisance) affecté aux copropriétaires** » **absente du rendu** + bloc travaux manquant (le SQL la calcule pourtant).
- **Annexe 3** : **réalisé par clé manquant** (seul le budget voté est rempli) — or c'est ce qui sert à approuver les comptes.
- **Annexes 4 & 5 : conformes** en structure.

**À faire :** gate d'équilibre bloquant (annexe 1), rendre la ligne « Solde affecté » + bloc travaux (annexe 2), peupler le réalisé par clé (annexe 3), + gates de cohérence croisée du fac-similé.

---

## Ordre de traitement recommandé

1. **URGENCE SÉCURITÉ** : boucher les 2 tables sans RLS sur le live (enable RLS + revoke anon + policies). *Faille exploitable anonymement depuis internet — à faire en premier.*
2. **Garde-fou anti-récidive RLS** : registre `apply_rls_environment()` + gate de migration « table public sans RLS = échec » + Security Advisor à zéro.
3. **Séparation des espaces** : garde de rôle dans les layouts (dashboard = copro ; gestionnaire = manager/platform_admin).
4. **Hygiène comptes** : retirer le démo `password123` du live, parcours mot de passe oublié, leaked password protection, valider le `next` du callback.
5. **Intégrité comptable** : `reverse_payment` / `cancel_supplier_invoice` / `unallocate_payment` + bridage du gate front ; prouver `v_lot_vs_gl_mismatch = 0` après réversion.
6. **Conformité annexes** : gates d'équilibre + lignes légales manquantes + réalisé par clé ; mettre à jour la note mémoire annexes.
7. **Vérif bout en bout** : rejouer tous les `cas_test_p0` (Playwright pour le front, SQL pour RPC + RLS) sur la golden loop, dont la non-régression des 5 tables GL (`rls=true` ET `forced=true`).

---

## Cas de test P0 à intégrer à la campagne (extraits)

- **RLS/anon** : avec la seule clé anon (sans session), `SELECT`/`INSERT`/`DELETE` sur `supplier_advances` et `opening_balance_residual_items` → **doit échouer** (aujourd'hui : passe).
- **Isolation** : utilisateur cabinet A → 0 ligne des cabinets/copros B sur ces tables.
- **Rôles** : copropriétaire connecté → URL espace gestionnaire → **doit être refusé**.
- **Reset mdp** : parcours « mot de passe oublié » de bout en bout → doit exister.
- **Démo** : login `lyes.triki/password123` sur la cible prod → **doit échouer** (compte retiré).
- **Contre-passation paiement** : reverse d'un paiement imputé → `v_lot_vs_gl_mismatch` doit rester à 0 (test qui **échoue aujourd'hui** = preuve du trou).
- **Annexe 1** : convocation sur golden loop → créances = dettes ; injecter un déséquilibre → blocage attendu (aujourd'hui : passe).
- **Annexe 2** : présence de la ligne « Solde affecté aux copropriétaires » (absente aujourd'hui).

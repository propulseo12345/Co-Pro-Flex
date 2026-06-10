# PROGRESS — Go Live CoProFlex

Suivi long terme du chantier "rendre l'app live". Audit global réalisé le 2026-05-30 à partir
des 28 retours Pastel (`Retour Pastel/pastel-comments-o0ngrlr3-exported-2026-05-30.csv`) +
exploration code des 6 domaines. Source de vérité des priorités.

Méthode validée avec l'utilisateur : **audit global → travail module par module → retours Pastel intégrés à chaque module.**

---

## Réalités d'architecture (découvertes à l'audit)

- L'app est **déjà 100% sur Supabase** (la doc CLAUDE.md disait "mock / Supabase prévu" — obsolète).
- **Deux espaces** (route groups) :
  - `(gestionnaire)` = niveau cabinet de syndic (portefeuille de copros, onboarding, paramètres cabinet).
  - `(dashboard)` = gestion d'UNE copropriété (sélectionnée via le portefeuille, stockée en sessionStorage `coproflex_active_copro_id`).
- **Dette de pages doublons** : génération ancienne (noms EN) vs nouvelle (noms FR). Beaucoup d'orphelines + pages `/preview/*` (prototypes). C'est la cause racine des 404 et des "ancienne page".
- `ensure_dev_membership` (RPC appelée par portefeuille + activeCopro) **absente des migrations locales** → en local, portefeuille peut charger `[]` et casser la navigation. À ressortir/créer en migration.
- Owner ID encore hardcodé par endroits (`f76855bb-...`) en attendant l'auth réelle.

---

## Thèmes transverses (à traiter, fort impact)

### T1 — Nettoyage des routes mortes / doublons (faible risque, gros gain UX)
Supprimer / rediriger. Couvre Pastel #18, #19, #20, #21, #25(part), #26, #27.

| Page morte | Vraie page (sidebar) | Action |
|---|---|---|
| `finance/invoices` (+ sous-routes) | `finance/factures` | supprimer + rediriger liens |
| `finance/bank-movements` | `finance/mouvements-bancaires` | supprimer |
| `finance/budget-current`, `finance/budget-works` | `finance/budgets` | supprimer + rediriger liens |
| `finance/unpaid`, `ventes-impayes/impayes` | `contentieux/impayes` | supprimer |
| `finance/transactions`, `transfer`, `releves-individuels`, `tantiemes`, `fonds-alur`, `etats-dates` | (à décider) | trier : garder/brancher ou supprimer |
| `maintenance/directory` | `maintenance/providers` | supprimer |
| `maintenance/providers/copro`, `/syndic` | onglets du hub providers | fusionner/supprimer |
| `legal/disputes` | `contentieux/litiges` | supprimer (identiques) |
| `social/*` (forum/messages inexistants) | `communication/*` | supprimer ou fusionner |
| `ag/resolutions-preview`, `ag/[id]/resolutions/new` | modal CustomResolution | supprimer doublon |
| `preview/*` (7 routes prototypes) | — | supprimer avant prod |

**Liens morts à corriger (404 confirmés) :**
- `BentoTresorerie.tsx:29,32` → `/finance/treasury`, `/finance/treasury/rapprochement` (#18, #21) → rediriger vers `/finance/comptabilite` + `/finance/mouvements-bancaires`.
- `BentoPriorites.tsx:63` → `/tasks` (inexistant).
- `BentoActivite.tsx:24` → `/activity` (inexistant).
- `BentoBudget.tsx:34,43` → `/finance/budget-current`, `/finance/budget` (#20) → `/finance/budgets`.
- `DashboardTopBar.tsx:35` → `/finance/invoices` (#19) → `/finance/factures`.
- `navigation.ts:98` → `/documents/etat-date` (inexistant).

### T2 — Sauvegardes silencieuses / erreurs avalées (intégrité données, bloquant)
- Onboarding `Step2Coproprietaires.tsx:53-74` : ajout copro échoue sans message (#8).
- `useServiceOrderDetailPage.ts:243` `handleSaveEdit` : affiche "✓ enregistré" mais ne persiste PAS en base.
- `PaymentModal.tsx` factures : `setTimeout` simulé + MOCK_FOURNISSEURS/COMPTES, ne crée pas d'écriture compta (#17).
- OS création : fallback localStorage silencieux (dette invisible).
- Onboarding api : comptes bancaires insérés en `account_type:'asset'` mais relus en `'bank'` → Step4 toujours vide.

### T3 — Infra dev : ressortir `ensure_dev_membership` en migration (débloque local).

---

## Backlog par module (audit + Pastel)

### A. Espace Gestionnaire (cabinet)
- [ ] #1 Portefeuille paraît cassé : `usePortefeuille.ts:164` `nombreLots:0` hardcodé, KPI à zéro, erreurs vue avalées, pas d'affordance "entrer dans la copro". Brancher les vraies données + CTA clair.
- [ ] #7 Onboarding Step1 : validation faible (SIRET non vérifié, champs libres). Ajouter validation + bouton "Importer depuis PDF" (extraction → pré-remplissage).
- [ ] #8 Onboarding Step2 : ajout copro échoue silencieusement (gestion erreur + cause RLS/membership).
- [ ] #9 `parametres-cabinet` + facturation/agenda/modeles/reporting/prestataires = **6 placeholders**. Décider quelles sections sont nécessaires pour le go-live, implémenter le minimum (infos cabinet, utilisateurs/accès, email/signature).
- [ ] Supprimer `onboarding/new` (redirect) + composants steps morts (Carnet/Contracts/Documents).
- [ ] Fix comptes bancaires asset/bank (Step4).

### B. Assemblées Générales (AG)
- [ ] #12 Recherche bibliothèque : résolutions custom non incluses (`useResolutionLibrary.ts` filtre seulement RESOLUTIONS_BANK ; custom isolées dans `useAgResolutionsPage.ts:41` ; masquées si `isFiltered` page `resolutions:130`).
- [ ] #11 Garde-fou : interdire ajout résolution si `meeting.status !== 'draft'` (`useAgAgendaPage.ts` handlers handleAddFromBank/handleAddCustom/handlePrefillObligatoires ; passer status à `AgendaActions`).
- [ ] #2 Lenteur agenda : 2 useEffect séquentiels + `getClosedPeriodForYear` agrège `accounting_entries` sans LIMIT (`accounting-period.ts:176-240`). Paralléliser + borner + skeleton.
- [ ] #4 Montant N-1 auto depuis comptes clôturés : marche seulement si période `closed` ; sinon vide sans message. Afficher feedback.
- [ ] #6 Défaut 5% fonds ALUR : `FondsALURModal.tsx:21` init `currentPourcentage || ''` → mettre `'5'` par défaut.
- [ ] #3 Lisibilité encadré résolution : `ResolutionDraggableItem.tsx` variant cards, boutons inline dans texte brut.
- [ ] #5 UI pop-up `CustomResolutionModal.tsx`.
- [ ] #10 Refonte UI "AG en cours" + `/ag/dashboard` (+ doublon `/ag` vs `/ag/dashboard`).
- [ ] #24 Refonte UI `/ag/new` (form monolithique, couplage CSS).

### C. Finance / Comptabilité
- [ ] #17 Flux facture→paiement→compta cassé : `PaymentModal` simulé, appelle `updateSupplierInvoice(status:'paid')` au lieu de l'Edge Function `pay_supplier_invoice` (qui crée l'écriture). → brancher l'Edge Function, retirer les mocks.
- [ ] #19 `DashboardTopBar.tsx:35` → `/finance/factures` + supprimer `finance/invoices`.
- [ ] #20 `BentoBudget.tsx:34,43` → `/finance/budgets` + supprimer budget-current/works.
- [ ] Trier les routes finance orphelines (cf. T1).

### D. Copropriétaires & Lots
- [ ] #13 Création copropriétaire impossible : pas de bouton/modal/`createCoproprietaire` dans `lib/owners/api.ts`. Le payload existe dans `lib/onboarding/api.ts:127`. Ajouter bouton + CreateModal + handleCreate.
- [ ] #14 Rôles copro (président CS / membre CS / simple) : enum DB existe (`council_role`), affichage OK, mais non assignable depuis `/coproprietaires` (champ "Fonction" = input texte libre non câblé). + besoin vues différenciées par rôle (inexistant). Gros sujet métier.
- [ ] #15 Clé ALUR = clé générale : toute clé `basis='tantiemes'` clone `tantiemes_generaux` (`lib/lots/api.ts:248,572`). CreateKeyModal ne propose que tantiemes/custom. Clarifier la sémantique ALUR.
- [ ] #16 Tableau lots : supprimer colonne fixe "Tantièmes" (`LotsRepartitionGrid.tsx:57,87,121`) redondante avec la clé "Charges générales".

### E. Maintenance
- [ ] #22 Simplifier workflow ordre de service : 12 statuts pour 6 étapes spec, double nomenclature divergente, étapes fantômes (A_ENVOYER, EN_COURS), FACTURE/PAYE greffés du financier, checklist non bloquante. Ramener au spec 6 étapes + ANNULE.
- [ ] Fix `handleSaveEdit` OS qui ne persiste pas (`useServiceOrderDetailPage.ts:243`).
- [ ] #23 UX prestataires : 4 représentations des mêmes données (hub + /copro + /syndic + /directory), split 360px non responsive (style inline), double filtre confus, CoproFlex mockée.
- [ ] Supprimer `maintenance/directory`, fusionner /copro /syndic dans le hub, `maintenance/ppt` → pointer direct `/conformite/ppt`.

### F. Communication / Contentieux / Documents
- [ ] #26/#27 Communication vs Social : `social/*` fantôme (forum/messages inexistants), doublon conceptuel avec `communication/mur` (lui réel). Décider : supprimer social, garder mur.
- [ ] #28 `contentieux/impayes` : UI dense (7 modales) à clarifier (hiérarchie workflow Relance→MED→Contentieux).
- [ ] Supprimer doublon `legal/disputes` (identique `contentieux/litiges`).
- [ ] Documents : `/documents/closing`, `/ledger/full` orphelines ; entrée sidebar "État daté" 404.
- [ ] #25 `/communication/mail` : fichier existe → si 404 réel, problème middleware/auth, à vérifier au runtime.

---

## 🔴 Chantier MAJEUR — Cohérence financière / source unique de vérité (test live 2026-05-30)

Constat utilisateur : « la logique métier des syndics a mal été implémentée, surtout les infos affichées ». Confirmé : **le même chiffre est calculé depuis des sources différentes selon l'écran, et le grand livre n'est presque jamais alimenté.**

- **Budget consommé** : Dashboard affiche 0 €, page Budget affiche 5 430 €.
  - Dashboard (`v_dashboard_kpis.budget_realise`, migration `20260403_fix_dashboard_kpis_tresorerie_codes.sql:95`) = SUM `ledger_entries` comptes classe 6 (charges) de la période courante → **0** car rien n'est écrit au grand livre.
  - Page Budget (`v_budgets_overview.total_spent`, via table **`budget_expenses`**, `src/lib/budget/api.ts:164`) = **5 430**.
  - → DEUX vérités parallèles : table `budget_expenses` vs `ledger_entries`. Non synchronisées.
  - **Même cause racine que #17** : payer une facture n'écrit pas d'écriture comptable (Edge Function `pay_supplier_invoice` jamais appelée) → le grand livre reste vide → tous les écrans qui le lisent affichent 0.
- **Trésorerie** : Dashboard 1 325,50 € vs Grand Livre 0 €.
  - Dashboard = solde cumulé comptes 512/502 (`v_account_balances`, non borné par période).
  - Grand Livre = trésorerie de l'**exercice sélectionné**, affiché sur **2027** (année vide) → 0. + périodes mal assignées (écriture datée 15/03/2026 rangée dans l'exercice 2027).
- **Principe de correction** : grand livre = source unique de vérité ; chaque action (facture, appel de fonds…) doit l'alimenter ; chaque écran lit depuis lui (ou une vue réconciliée). Prérequis de confiance pour le go-live.

## ⚡ Lenteur navigation — diagnostic (test live 2026-05-30) : NON bloquant
Cause = **compilation à la demande du serveur de dev (Turbopack)**, pas un vrai problème de perf. Preuve (logs dev) : 1ère visite `/finance/budgets` = 6,0 s (compile 5,9 s) ; **2ᵉ visite = 23 ms**. Rendu réel = 20-130 ms. En production (`next build`), tout est pré-compilé → navigation quasi instantanée. Facteur secondaire mineur : chaque page fetch ses données côté client sans cache (petit spinner) → à polir plus tard (skeletons/cache), pas urgent.

## Retours additionnels (Claude) — incomplets hors Pastel

### 🔴 Blocages go-live structurels (pas dans les 28 retours)
- **Auth réelle absente** : owner ID hardcodé (`f76855bb-...`) un peu partout, `/auth/login` existe mais pas branché. Pour un vrai live multi-gestionnaires : vraie connexion + re-activer RLS (désactivé en dev volontairement). C'est LE prérequis go-live.
- **`ensure_dev_membership` absent des migrations** → casse le portefeuille en local (T3).
- **Validation de formulaires systémiquement absente** (Zod/RHF "prévus" jamais branchés). #7 n'est qu'un symptôme : SIRET, montants, emails, IBAN — rien n'est validé nulle part.
- **Fallbacks localStorage silencieux** (OS, session AG) qui masquent des échecs Supabase → en prod = données fantômes par utilisateur, invisibles aux autres.

### 🟠 Features à moitié faites (pas signalées)
- **5 pages cabinet vides en plus de #9** : `facturation`, `agenda`, `modeles`, `reporting`, `prestataires` = toutes "arrive prochainement".
- **Onboarding comptes bancaires** : insérés en `account_type:'asset'`, relus en `'bank'` → Step 4 affiche toujours "0 compte" à la reprise (bug silencieux).
- **`handleSaveEdit` ordre de service** : dit "✓ enregistré" mais ne persiste pas en base.
- **`/ag/[id]/checklist`** partiellement faite ; **`/ag/[id]/minutes`** statut flou (alias de pv ?).
- **`/finance/transfer`** : formulaire de virement sans backend.
- **Marketplace prestataires CoproFlex** : 100% mockée (compteurs/notes fictifs).
- **Vue split prestataires** cassée < 1200px (largeur 360px en dur, style inline).
- **Conformité (DPE / PPT / Factur-X)**, dossiers, conseil-syndical, settings : NON audités en profondeur — état à vérifier.

### 🟡 Liens morts supplémentaires (404 que tu n'as pas encore croisés)
- `BentoPriorites.tsx:63` → `/tasks` (inexistant).
- `BentoActivite.tsx:24` → `/activity` (inexistant).
- `navigation.ts` "État daté" → `/documents/etat-date` (inexistant).
- `/social/forum`, `/social/messages` (liens cliquables dans la page social, routes inexistantes).
- Doublon `legal/disputes` ≡ `contentieux/litiges` ; orphelines `documents/closing`, `documents/ledger/full`.

## Ordre proposé (à valider)
1. **T1 nettoyage routes + liens morts** (rapide, débloque visuellement, traite 6 retours d'un coup).
2. Module **Gestionnaire** (porte d'entrée : onboarding #7/#8 + portefeuille #1 — sans ça on ne peut pas créer/entrer dans une copro).
3. Module **Copropriétaires & Lots** (#13/#14/#15/#16).
4. Module **AG** (le plus gros : #2,#3,#4,#5,#6,#10,#11,#12,#24).
5. Module **Finance** (#17 + reliquats routes).
6. Module **Maintenance** (#22/#23).
7. Module **Communication/Contentieux** (#26/#27/#28).

## État
- [x] Audit global (6 domaines) — 2026-05-30
- [x] Scan exhaustif des liens morts (`.planning/deadlinks.mjs`, statiques + dynamiques)
- [x] **Phase 1a — liens du dashboard/sidebar/réglages corrigés** (2026-05-30, tsc 0 erreur) :
  - Redirigés : BentoBudget→/finance/budgets, BentoTresorerie→/finance/comptabilite + /mouvements-bancaires, DashboardTopBar→/finance/factures, navigation "État daté"→/finance/etats-dates
  - Masqués (TODO go-live) : /tasks (BentoPriorites), /activity (BentoActivite), /settings/visibility + /invoices (settings)
- [x] **Phase 1b — approche REDIRECTIONS (choix user, non destructif)** — 2026-05-30, tsc 0 erreur, redirections testées en live (308) :
  - Constat : les "doublons" sont enchevêtrés (CSS modules dans les dossiers de route importés ailleurs, composants/hooks réutilisés) → suppression brutale = build cassé. D'où redirections au lieu de suppressions.
  - Redirections ajoutées dans `next.config.ts` : invoices→factures, bank-movements/transactions→mouvements-bancaires, budget-current/works→budgets, unpaid→contentieux/impayes (reminders préservé), ventes-impayes/impayes→contentieux/impayes, legal/disputes→contentieux/litiges, maintenance/directory→providers.
  - `search.ts` réécrit (routes canoniques uniquement, alignées sur navigation.ts).
  - Lien hub Maintenance `/maintenance/directory`→`/maintenance/providers`.
  - Suppression réelle des fichiers doublons = **dette tech différée** (refactor : déménager CSS, démêler composants).
- [x] `src/app/preview/*` (7 prototypes) **supprimés** — 2026-05-30.
- [x] Module **`/social`** (fantôme) **supprimé** + redirigé `/social/* → /communication` (user : events pas voulus). Vérifié live (308). tsc 0 erreur.
- [ ] **Reste de 1b** (différé, pas bloquant) :
  - Décision produit **ventes** : `/ventes-impayes/ventes` (réel) vs `/sales` (doublon EN), pas dans la sidebar — lié à #13 (à traiter avec le module copro/ventes).
  - Liens morts AG (`useAGContext.ts`/`AGQuickActions.tsx`, ~10) → avec la refonte module AG (#10).
  - `/settings/templates/[id]/preview` (useTemplatesPage) → route inexistante.
- [ ] Démarrage chantier **Cohérence financière** (voir section dédiée ci-dessus) — prochaine grosse étape après 1b
- [ ] Démarrage module Gestionnaire

# Plan de test maître — CoProFlex

> Document d'orchestration de la campagne de test fonctionnelle de l'application CoProFlex
> (SaaS de gestion de copropriété, marché français). Il chapeaute les 13 fichiers de cas de
> test par domaine (`TC_01` à `TC_13`) rangés dans ce même dossier `.planning/tests/`.
>
> Lecteur visé : un testeur (pas forcément développeur). Le vocabulaire technique est traduit
> quand il apparaît. Chaque domaine garde son détail dans son propre fichier ; ce maître sert
> à savoir **quoi tester, dans quel ordre, avec quelles données, et comment décider que c'est bon**.

---

## 1. Objectif & périmètre (app métier ; marketing exclu)

**But.** Vérifier que l'application de gestion de copropriété fait réellement ce qu'elle promet :
les parcours du syndic professionnel (le « gestionnaire ») de bout en bout, l'écran ET la trace
en base de données — en particulier le **grand livre** (le journal comptable légal, où chaque
opération laisse une trace en double : un débit d'un côté, un crédit de l'autre, du même montant).

**Dans le périmètre :**
- L'espace gestionnaire complet : connexion, portefeuille de copros, tableau de bord,
  onboarding (création/configuration d'une copro), assemblées générales, finance
  (budgets, appels de fonds, paiements, factures fournisseurs, banque, comptabilité),
  maintenance, documents (GED), copropriétaires & lots, ventes/mutations, impayés,
  conseil syndical, communication, paramètres.
- Les règles métier de copropriété (loi 65-557, décrets 67-223 et 2005-240, loi ALUR,
  loi Climat & Résilience) et leur traduction comptable au grand livre.
- Le cloisonnement des données entre copropriétés (RLS — la base refuse de montrer les
  données d'une copro à qui n'y a pas accès).

**Hors périmètre :**
- Le **site vitrine / marketing** (pages publiques `/`, `/tarifs`, `/contact`, `/faq`…) :
  testé seulement comme « reste accessible sans connexion » dans le domaine Auth, pas pour son contenu.
- Le **portail copropriétaire** et le **portail conseil syndical** (espaces non-gestionnaire) :
  pas encore livrés ; les rares cas qui en dépendent (rôle non-gestionnaire) sont marqués
  « à tester quand le portail existera ».
- Les **performances, la charge, l'accessibilité fine et la compatibilité multi-navigateurs** :
  hors de cette campagne fonctionnelle (à planifier séparément).
- Tout ce qui est explicitement recensé comme **écran mort, maquette ou stub** (voir §7) :
  on ne teste pas sa logique métier, seulement qu'il ne plante pas / qu'il redirige bien.

---

## 2. Environnement de test

**Application.** Lancée en local, mais branchée sur la **vraie base de production** (cloud) :

- Lancer le serveur de développement :
  ```bash
  npm run dev
  ```
  puis ouvrir `http://localhost:3000` (ou le port indiqué dans la console).
- L'app pointe sur le **cloud live Supabase `qqfqrcolzmcbsvfaumiq`** (RLS activé et forcé).
  Conséquence importante : **toute écriture est réelle**. Les tests destructifs (suppressions,
  clôtures, contre-passations) doivent se faire sur une copro jetable (voir §3), jamais sur une
  copro de référence.

**Compte de connexion (le seul existant).**
- Email : `lyes.triki@coproflex.fr` — Mot de passe : `password123`.
- Le plus simple : sur `/auth/login`, cliquer le bouton **« Connexion démo — Gestionnaire »**
  (connexion en 1 clic). Nom affiché dans l'app : **« Jean Dupont »**, rôle **gestionnaire**.
- À la connexion, on arrive sur le **portefeuille**.

**Choisir une copro (étape obligatoire avant presque tous les écrans).**
- Aller sur `/portefeuille` (« Mon Portefeuille ») et **cliquer une ligne de copropriété**.
  Ce clic « active » la copro : son identité est mémorisée dans la **session de l'onglet**
  (technique : `sessionStorage`, clés `coproflex_active_copro_id` / `…_name`), puis l'app
  bascule sur le tableau de bord de cette copro.
- Tant que l'onglet reste ouvert, le choix survit à un rafraîchissement (F5). **Si on ferme
  l'onglet ou on en ouvre un nouveau, le choix est perdu** : l'app retombe alors sur la
  **première copro par date de création** (aujourd'hui « Residence Paris Ivry », pas « Résidence Martin »).
- Il **n'y a pas de menu déroulant** pour changer de copro depuis la barre latérale (mode
  « single-copro »). Pour changer de copro, on **repasse toujours par le portefeuille**.
- Sans copro active, la plupart des écrans s'affichent vides (c'est normal, ce n'est pas un bug).

**Vérifier la base (pour les cas finance).** Pour confirmer l'effet d'une action sur le grand
livre, le testeur consulte côté app l'écran `/finance/comptabilite` (onglets Grand livre /
Balance), et si besoin la base cloud directement (tables `ledger_transactions` / `ledger_entries`).
Règle d'or : **un écran « vert » ne prouve pas une écriture équilibrée** — toujours croiser écran + grand livre.

---

## 3. Jeux de données

| Jeu de données | Identité | Contenu | Usage recommandé |
|---|---|---|---|
| **Résidence Martin** | copro **complète** | 6 copropriétaires, 7 lots, clés « Charges générales » + « Bâtiment A » + « Bâtiment B », **1000 tantièmes** | Copro principale de presque tous les domaines (structure riche, clés multiples, plusieurs lots par personne). |
| **Residence Paris Ivry** | copro **partielle** | 6 copropriétaires, 6 lots, **clé générale à 0** | Cas dégradés (clé incomplète, total = 0) et **2ᵉ copro pour tester le cloisonnement (RLS)**. C'est aussi la copro active par défaut sur session vierge. |
| **Le Clos Saint-Michel** (id `22222222…`) | **boucle d'or** finance | exercice 2026 ouvert, écritures de référence | Contrôles grand livre / balance / contre-passation **en LECTURE seule** (ne pas y écrire — immuabilité). Écarts résiduels connus (+0,16 / −423 / +30) = artefacts historiques, pas des bugs. |
| **`create_test_copro_seeded()`** | copro **jetable « HARNESS »** | clone d'un cycle complet | **À privilégier pour TOUS les tests destructifs / en écriture** (paiements, clôture, contre-passation, apurement, suppression de lots/clés, élection de conseil, idempotence). Une copro fraîche part à 0 écart. |

> **Recommandation forte : utiliser une copro JETABLE (`create_test_copro_seeded`) pour tout test
> destructif.** Le cloud est la base réelle : une suppression, une clôture ou une écriture passée
> sur Résidence Martin ou sur la boucle d'or y reste pour de bon. La copro HARNESS sert justement
> à « salir » sans conséquence, puis à être abandonnée.

**État actuel à connaître (au moment de la rédaction) :** les deux copros visibles (Martin et Ivry)
ont des **KPIs financiers à 0** et **aucune AG**. Le tableau de bord tombe donc sur son état vide
« Bienvenue sur CoProFlex ». Tous les cas « dashboard plein », « impayés réels », « grand livre non nul »
nécessitent une copro **enrichie** : boucle d'or 22222222 (lecture) ou HARNASS seedée (écriture).

**Données à préparer côté testeur :** un PDF de test (contrat, facture), une image `.jpg`, un `.docx`,
un fichier > 25 Mo (rejet GED), un CSV de relevé bancaire (import + idempotence), et pour la
communication des lignes seedées en base (`conversations`, `messages`, un mail `received`).

---

## 4. Critères d'entrée / de sortie

**Critères d'ENTRÉE (quand commencer la campagne) :**
1. L'app se lance (`npm run dev`) et se connecte au cloud `qqfqrcolzmcbsvfaumiq` sans erreur.
2. La connexion démo fonctionne et mène au portefeuille (smoke test `TC-AUTH-001` / `TC-DASH-001` vert).
3. Les jeux de données sont disponibles : Résidence Martin et Residence Paris Ivry visibles,
   la boucle d'or 22222222 lisible, et `create_test_copro_seeded()` exécutable.
4. Le testeur a accès aux outils navigateur (cookies, console) et, idéalement, à la base cloud
   en lecture pour vérifier le grand livre.

**Critères de SORTIE (quand considérer la campagne réussie) :**
- **100 % des cas P0 exécutés et PASS** (les P0 bloquent la mise en service : connexion,
  isolation RLS, écritures grand livre, idempotence, cycles finance/AG de bout en bout).
- **≥ 90 % des cas P1 PASS**, et tout P1 en échec a un ticket de bug ouvert avec sévérité.
- **≥ 80 % des cas P2 exécutés** (les P2 restants peuvent être différés s'ils sont documentés).
- **P3 = best effort** (cosmétique / placeholders connus) : exécution facultative, pas bloquante.
- **Aucun bug de sévérité « bloquant » ou « critique » ouvert et non traité** sur un parcours canonique.
- Tous les **écarts connus** rencontrés (maquettes Conformité, relances impayés non persistées,
  boutons stubs, absence de bouton déconnexion, compteur de lots à 0 du portefeuille…) sont
  **consignés** comme défauts identifiés, pas comptés comme « surprises ».

---

## 5. Matrice de couverture

327 cas de test au total, répartis sur 13 domaines. (Comptage réel par fichier.)

| # | Domaine | Fichier | Nb cas | P0 / P1 / P2 / P3 | Parcours clés |
|---|---|---|---:|---|---|
| 01 | Onboarding (création + config copro) | `TC_01_onboarding.md` | 25 | 11 / 9 / 4 / 1 | Assistant 8 étapes : identité → copropriétaires → lots & clés → banque → budget → AG & appels (D450-1/C701) → reprise de soldes (471/472) → finalisation. Smoke E2E complet. |
| 02 | Finance — budgets, appels, paiements, impayés, relances | `TC_02_finance_budgets_appels_paiements.md` | 31 | 10 / 10 / 9 / 2 | Cycle « appelé → encaissé → impayé → relancé » ; moteur `post_budget_call_for_funds` ; paiement D512/C450-x ; trop-perçu en avance 450-3 ; idempotence ; relances réelles. |
| 03 | Finance — factures, banque, comptabilité | `TC_03_finance_factures_banque_compta.md` | 31 | 11 / 9 / 9 / 2 | Facture D6xx/C401, paiement D401/C512, avoir inverse ; import CSV + rapprochement ; grand livre/balance/annexes ; clôture ; contre-passation ; apurement 12→450-2. |
| 04 | Assemblées générales (cycle complet) | `TC_04_assemblees_generales.md` | 26 | 13 / 8 / 5 / 0 | Wizard 9 étapes : planification → ODJ → convocation → envoi (convoked) → votes correspondance → présence → session (art.24/25/26 + passerelles) → clôture (close_ag PUIS prepare) → PV + activation (UNE fois) → finalisation. Garde 471/472. |
| 05 | Maintenance & entretien | `TC_05_maintenance.md` | 28 | 6 / 14 / 7 / 1 | Carnet d'entretien ; contrats avec PDF (GED) + renouvellement/résiliation ; ordres de service (workflow complet brouillon→clôturé) ; prestataires (tiers). |
| 06 | Documents / GED | `TC_06_documents_ged.md` | 22 | 4 / 9 / 9 / 0 | Import (bucket + ligne `documents`), dossiers, prévisualisation, soft-delete, **rétention légale bloquante** (PV/contrats non supprimables), liaisons, auto-classement, RLS. |
| 07 | Conformité (DPE / PPT / Factur-X) | `TC_07_conformite.md` | 19 | 2 / 10 / 5 / 2 | **MAQUETTE sans backend** : affichage + validation de formulaires + non-persistance (F5 efface). Piège du repli sur le 1er mock. Aucune écriture base. |
| 08 | Copropriétaires, lots & clés | `TC_08_coproprietaires_lots.md` | 23 | 10 / 9 / 3 / 1 | Annuaire ; grille Lots × clés (tantièmes = clé générale, source unique) ; création/édition/mutation de lot (`lot_owners`) ; clés spéciales subset/all_lots ; RLS. |
| 09 | Ventes (mutations + état daté) & impayés | `TC_09_ventes_impayes.md` | 25 | 5 / 11 / 8 / 1 | Mutation draft→validated, états datés art.5 (snapshots immuables), transfert lot-centric (`lot_owners`, zéro écriture GL) ; impayés en LECTURE réelle mais **actions de relance simulées (non persistées)**. |
| 10 | Conseil syndical | `TC_10_conseil_syndical.md` | 21 | 7 / 9 / 4 / 1 | Membres (lecture seule, peuplés par l'AG via `ELECT_COUNCIL` + `activate_ag_decisions`) ; rapports d'activité (auto-save, workflow brouillon→validé→publié) ; publication vers AG ; RLS. |
| 11 | Dashboard & portefeuille (multi-copro) | `TC_11_dashboard_portefeuille.md` | 25 | 5 / 12 / 8 / 0 | Connexion → portefeuille (KPIs consolidés) → choix copro active (sessionStorage) → dashboard (trésorerie/AG/budget/ODS/priorités). États vide/erreur/plein. Bascule de copro sans fuite. |
| 12 | Paramètres & cabinet | `TC_12_settings_cabinet.md` | 22 | 8 / 8 / 6 / 0 | Réglage des relances (pause, paliers J+N, dry-run `run_payment_reminders`) ; modèles de PV ; banque de résolutions (3 niveaux Système/Cabinet/Copro, verrous). |
| 13 | Authentification & communication | `TC_13_auth_communication.md` | 29 | 12 / 9 / 8 / 0 | Login démo/manuel/refus, gardes de session, RLS ; hub Communication ; messagerie (realtime), mur (likes/commentaires via triggers), boîte mail (Resend + autorisation serveur). |
| | **TOTAL** | **13 fichiers** | **327** | **104 / 127 / 85 / 11** | |

---

## 6. Ordre d'exécution recommandé

L'idée : d'abord prouver que « ça démarre et que rien ne fuit » (smoke), puis dérouler le métier
dans son ordre logique (du plus amont — login, création de copro — au plus aval — finance, comm),
en traitant les P0 avant les P1 puis les P2.

### Phase 0 — Smoke test (avant tout le reste)
Quelques cas P0 qui, s'ils échouent, rendent inutile la suite :
1. `TC-AUTH-001` Connexion démo 1 clic.
2. `TC-DASH-001` Arrivée sur le portefeuille + liste des copros.
3. `TC-DASH-011` Choisir une copro → atterrir sur son dashboard.
4. `TC-AUTH-004` / `TC-DASH-002` Accès direct sans session → redirection login (sécurité de base).
5. Un cas RLS de cloisonnement (`TC-FIN-GL-003` ou `TC-MNT-028`) pour valider l'étanchéité inter-copro.

### Phase 1 — P0 dans l'ordre métier (priorité absolue, doivent tous passer)
Suivre le **fil de vie d'une copro** :
1. **Auth & accès** (`TC_13` partie Auth) — fondations de session.
2. **Portefeuille / dashboard** (`TC_11`) — navigation et copro active.
3. **Onboarding** (`TC_01`) — créer une copro jetable de bout en bout (le smoke E2E `TC-ONB-025`
   fournit une copro propre pour la suite). Ordonner : identité → copropriétaires → lots/clés →
   banque → budget → appels → reprise → finalisation.
4. **Copropriétaires & lots** (`TC_08`) — structure (lots, clés, mutations) sur copro jetable.
5. **AG** (`TC_04`) — cycle complet, en respectant l'ordre **`close_ag` PUIS `prepare_ag_decisions`**,
   et l'activation **une seule fois** à l'étape PV ; tester la garde 471/472.
6. **Finance** (`TC_02` puis `TC_03`) — appels, paiements, factures, banque, comptabilité,
   clôture, contre-passation. **Toujours croiser écran + grand livre** ; destructif sur HARNESS.
7. **Conseil syndical** (`TC_10`) — élection via AG, puis rapports.
8. **GED, Maintenance, Ventes/Impayés, Settings, Communication** — le reste des P0.

### Phase 2 — P1 (objectif ≥ 90 % PASS)
Mêmes domaines, dans le même ordre logique, en complétant les variantes, cas d'erreur et règles métier.

### Phase 3 — P2 (objectif ≥ 80 % exécutés)
Filtres, tris, recherches, exports, états vides, cas cosmétiques persistés.

### Phase 4 — P3 (best effort)
Placeholders et écrans simulés connus (boutons sans effet, maquette Conformité, etc.). On
**confirme le comportement actuel** (souvent « ne fait rien ») et on le consigne.

> Conseil transverse : à chaque action finance, vérifier que **Σ débit = Σ crédit** ; à chaque
> changement de copro, vérifier qu'**aucune donnée de la copro précédente ne reste affichée**.

---

## 7. Écrans morts / doublons recensés (NE PAS tester comme fonctionnalité)

Agrégé depuis les sections « Écrans morts / doublons » des 13 domaines. Ces écrans existent dans le
code mais ne sont pas le parcours canonique : ne pas écrire de cas fonctionnel dessus (au plus,
vérifier qu'ils ne plantent pas ou redirigent bien).

### Maquettes complètes (aucune persistance, F5 efface)
- **Conformité entière** : `/conformite/dpe`, `/conformite/ppt`, `/conformite/facturx` — données
  « en dur », jamais en base ; boutons « Télécharger PDF / PDF-A3 / Générer Factur-X » simulés ;
  repli silencieux sur la 1ʳᵉ copro fictive quand on sélectionne une vraie copro.
- **`/settings/info`** (Informations de la copropriété) — lots/clés en dur, rien n'est lu/écrit.
- **`/settings`** (hub paramètres) — page de liens en dur, carte « Copropriété » vide.

### Pages bouchons « arrive prochainement » (`PlaceholderPage`)
- `/parametres-cabinet`, `/facturation`, `/prestataires` (niveau cabinet), `/modeles`,
  `/agenda`, `/reporting` (toutes côté gestionnaire).

### Doublons morts (remplacés par le canonique)
- **Finance** : `/finance/invoices/*` (ancienne pile factures sans GL — le canonique est `/finance/factures`),
  `/finance/budget-current`, `/finance/budget-works` (vues lecture seule doublons des onglets `/finance/budgets`),
  `/finance/bank-movements` (doublon de `/finance/mouvements-bancaires`),
  `/finance/cles-repartition` + `/new` + `/[id]`, `/finance/tantiemes` (doublons de la grille `/coproprietaires/lots` — **écrivent dans les MÊMES tables, ne pas y toucher**).
- **Copro** : `/coproprietaires/repartition` (redirige vers `/coproprietaires/lots`).
- **AG** : `/ag` (ancienne liste → `/ag/dashboard`), `/ag/[id]/preparation`, `/ag/[id]/checklist`,
  `/ag/[id]/minutes`, `/ag/resolutions-preview`, `/ag/[id]/resolutions/new`, `/ag/resolutions/select-ag`,
  ainsi que `DesignationMultiplePanel` (élection conseil simulée, non persistée).
- **Maintenance** : `/maintenance/directory` (annuaire mort), `/maintenance/providers/copro`,
  `/maintenance/providers/syndic`, `/maintenance/providers/coproflex` (avis/devis simulés),
  modal « Nouveau contrat » du hub (création sans PDF — le canonique est `/maintenance/contracts/new`).
- **Ventes/Impayés** : `/sales`, `/ventes-impayes` (hub mock), `/ventes-impayes/ventes/nouvelle` (mock vide),
  `/ventes-impayes/impayes`, `/finance/unpaid`, `/finance/etats-dates`, `/legal/disputes` (toutes redirigées).
- **GED** : hook `useGedPage` (mocké, remplacé par `useGedPageSupabase`) + une quinzaine de composants
  `ged/components/*` non importés.
- **Auth/Comm** : `UserMenu`, `UserSwitcher`, `AuthStatus`/`HighBar` (aucun bouton de déconnexion
  réellement monté), module « Événements » communication (pas de route).

### Stubs / boutons sans effet (à signaler, pas à tester comme feature)
- `/finance/transfer` (virement : bouton sans handler), `/finance/diagnostic` (debug),
  `/documents/closing` (arrêté des comptes statique), boutons « Export PDF/CSV » TODO de Budgets/Appels,
  boutons relance de `/finance/unpaid` (`alert()` factices), modale « Catégoriser » d'un mouvement
  bancaire (`categorizeBankMovement` neutralisée depuis migration 0014 — la vraie voie est le rapprochement),
  bouton « Synchroniser » banque (mock à délai aléatoire), export « PDF » des contrats (produit un `.txt`),
  export PDF du rapport conseil (`alert(...)`), upload de fichier d'annexe conseil (TODO),
  écran `/contentieux/litiges` (coquille vide), hook `useImpayesMutations` (relances réelles **codées
  mais non câblées** — les actions impayés actuelles sont simulées en mémoire).

### Limites connues non bloquantes (à consigner pendant les tests)
- **Portefeuille** : compteur de lots toujours à « 0 lots » (le hook ne requête pas `lots`) ;
  compteurs « alertes » / « maintenance » des lignes copro toujours à 0 ; tendance Encaisse « +4.2 % » codée en dur.
- **GED** : panneau « Droits d'accès » (niveau de confidentialité / utilisateurs / historique)
  écrit dans un store mémoire, non persisté ; échec de suppression d'un document protégé remonte
  seulement via `console.error` (vérifier qu'un message utilisateur existe).
- **Communication** : auteur des commentaires du mur retombe sur « Utilisateur » après reload ;
  labels/dossiers de mail créés en mémoire seulement.
- **Annexes / PDF convocation** : PDF de convocation (annexe 1) connu pour être cassé — ne pas envoyer.

---

## 8. Suivi des bugs (gabarit de fiche)

Chaque anomalie rencontrée donne lieu à une fiche. Modèle à recopier :

```
### BUG-<NNN> : <titre court et factuel>

- **Domaine / cas de test :** <ex. Finance — TC-FIN-PAY-003>
- **Sévérité :** Bloquant | Critique | Majeur | Mineur | Cosmétique
  (Bloquant = empêche de continuer / corruption grand livre ; Critique = parcours P0 cassé sans
   contournement ; Majeur = P1 cassé ou contournement lourd ; Mineur = gêne limitée ; Cosmétique = visuel.)
- **Priorité du cas concerné :** P0 | P1 | P2 | P3
- **Environnement :** app locale `npm run dev` sur cloud `qqfqrcolzmcbsvfaumiq` ;
  compte démo « Jean Dupont » ; copro = <nom + id> ; navigateur = <Chrome/Firefox + version> ;
  date/heure = <…>.
- **Préconditions / jeu de données :** <état requis, ex. « copro HARNESS seedée, exercice ouvert »>
- **Étapes de reproduction :**
  1. <action 1>
  2. <action 2>
  3. <action 3>
- **Résultat ATTENDU :** <ce que le métier / le cas de test prévoit, écran ET base/grand livre>
- **Résultat OBTENU :** <ce qui se passe réellement, écran ET base/grand livre>
- **Effet base de données :** <écriture grand livre observée ou absente ; Σdébit=Σcrédit ? ligne créée/non créée>
- **Reproductible :** Toujours | Intermittent | Une seule fois
- **Preuves :** <captures d'écran, export CSV grand livre, logs console, requête SQL de contrôle>
- **Impact métier :** <conséquence pour le syndic / le copropriétaire / la conformité légale>
- **Notes / contournement :** <s'il existe>
```

**Bonnes pratiques de consigne :**
- Pour tout cas **finance**, joindre la **preuve grand livre** (capture de `/finance/comptabilite`
  ou requête SQL) : un bug comptable se prouve par les écritures, pas par l'écran.
- Distinguer un **vrai bug** d'une **limite connue déjà recensée au §7** : si c'est déjà documenté,
  référencer la limite plutôt que d'ouvrir un doublon (sauf si la gravité diffère de l'attendu).
- Un **faux vide / refus silencieux** (l'écran montre « 0 » au lieu d'une erreur quand la session a
  expiré ou que RLS refuse) est **toujours un bug à remonter** (règle « jamais de refus silencieux »).

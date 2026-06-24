# CONTEXT — Glossaire métier CoProFlex (copropriété + comptabilité)

> **Vocabulaire canonique** du domaine. Un mot = une définition = ses synonymes bannis.
> Lu par les humains **et** les agents avant de coder, pour tuer l'éparpillement (un même concept nommé de dix façons → on recopie le mauvais exemple).
> Format : **terme** en gras + définition (ce que c'**est**) + `_Avoid_:` synonymes bannis. Termes légaux/comptables : ligne `Implémentation:` pointant la fonction SQL, pour que définition humaine et code ne divergent jamais.
> Jumeau technique (jargon de code) : [docs/claude/glossaire-technique.md](docs/claude/glossaire-technique.md). Un mot ne va que dans **un** des deux.
> **Enrichissement obligatoire au fil de l'eau** (y compris PR de rename/typo) : si tu croises ou renommes un terme métier ambigu, ajoute-le ou tranche son `_Avoid_` ici, dans la même PR.

---

## Structure (lots / tantièmes)

- **Clé de répartition** — règle de ventilation d'une catégorie de charges entre les lots. `Implémentation:` `repartition_keys`. _Avoid_: « grille », « ventilation » en libellé canonique.
- **Quote-part** — poids d'un lot dans une clé donnée. `Implémentation:` `repartition_key_lines.weight` (**SOURCE UNIQUE**). _Avoid_: déduire la quote-part d'ailleurs.
- **Tantième / Millième** — expression de la quote-part (millième = base 1000). **Trois sens à distinguer** : (1) tantième de copropriété = poids dans la clé *générale*, base des majorités AG ; (2) base de répartition d'une clé ; (3) tantième de charges d'une clé spéciale. _Avoid_: **stocker des colonnes `tantiemes_*` sur le lot** (supprimées du schéma — vaut aussi pour vues/tests legacy). Base légale : art. 5 & 10 loi 65-557 ; art. 5 décret 67-223.
- **Lot** — unité de gestion (jamais le copropriétaire). Appels, créances, réconciliation se font **par lot** ; le solde par personne se dérive en sommant ses lots. `Implémentation:` `lots`. Cf. règle lot-centric.

## Finance / Grand livre

- **Grand livre** — registre unique et **source de vérité** de tous les chiffres. Toute opération = une écriture en partie double. _Avoid_: maquiller/forcer un chiffre hors du GL ; stocker un solde figé qu'on retourne.
- **Les 4 natures de cotisation — à NE JAMAIS mélanger** (`accounts.nature`, enum `account_receivable_nature`, source de vérité) :

  | Nature | Créance (appel) | Produit / réserve | Solde en attente | Régime |
  |--------|-----------------|-------------------|------------------|--------|
  | **Courant** (art. 14-1) | 450-1 | **701** | **478** (ex-120) | charges courantes |
  | **Travaux votés** (art. 14-2 / vote 24-25-26) | 450-2 | **702** | **12** (ex-110) | travaux |
  | **Avance / fonds de roulement** (art. 35) | 450-3 | **1031** | — | **REMBOURSABLE au vendeur** en mutation |
  | **Fonds travaux ALUR** (art. 14-2 II) | 450-5 | **105** → **705** | — | **NON remboursable**, acquis au syndicat |

  \+ **450-4** emprunts, **459** créances douteuses. **_Avoid_ croisé clé** : *avance art. 35 ≠ fonds de travaux ALUR* (même mot « fonds », régime opposé — la confusion la plus piégeuse du domaine).
- **Appel de fonds** — le *document* / la créance (côté 450-x). Canonique `appel de fonds` ≡ `call_for_funds`. _Avoid_: « provision », « cotisation » (jamais comme synonyme).
- **Provision** — le *produit* appelé d'avance sur budget voté : **701** courant / **702** travaux. _Avoid_: confondre avec l'appel (document) ou la cotisation ALUR.
- **Cotisation** — réservé au **fonds ALUR** (art. 14-2 II), contrepartie le **105**. _Avoid_: l'employer pour le courant/travaux (jamais 701/702).
- **Compte courant** (banque) — le compte payeur unique : **512**. Tous les décaissements en partent. _Avoid_: multiplier les 512 par nature (modèle V1 = un seul courant).
- **Livret fonds travaux ALUR** — épargne séparée (compte **502**). On n'y paie jamais un fournisseur directement : utiliser le fonds = **virement interne 502→512** puis paiement depuis le courant. `Implémentation:` `settle_alur_transfer_cash` (D512/C502). Fond. : loi 65-557 art.18 (compte séparé) + art.14-2 II.

## Clôture / Annexes

- **Exercice comptable** — période annuelle de gestion. Cycle : `open` (**seul** statut où l'écriture au GL est permise) → `closed` (clôture **technique**) → `approved` (comptes **approuvés en AG**, dès lors **intangible** : jamais de réouverture). L'exercice n'est **pas voté** ; c'est l'**approbation des comptes** qui se vote. `Implémentation:` `accounting_periods` ; `close_period` / `approve_period` / `reopen_period` (refuse `approved`). _Avoid_: « period »/« période » en libellé métier ; **clôture d'exercice ≠ clôture d'AG** ; exercice ≠ année civile si `exercice_debut ≠ janvier`.
- **Cut-off** — rattachement d'une opération au bon exercice (art. 14-3, droits constatés) : la **charge** va à l'exercice de la **prestation**, le **paiement** à l'exercice **ouvert**. 4 instruments : **408** charges à payer (passif, `D 6x / C 408`) · **486** charges constatées d'avance (actif, `D 486 / C 6x` — _Avoid_: l'appeler « charge à payer ») · **487** produits constatés d'avance (passif) · **461/462** produits à recevoir. Tous contre-passés en N+1. `Implémentation:` `reverse_period_cutoff`. (Pas de 418 dans notre plan copro.)
- **Régularisation N+1 (oubli post-approbation)** — une charge/produit oublié·e après approbation se régularise en N+1 comme **opération exceptionnelle** : charge **678** « Autres opérations exceptionnelles » / produit **718** « Produits exceptionnels ». _Avoid_: **672/772** (vocabulaire du PCG général ; en copro `672 = Travaux urgents art.18` et `772 n'existe pas`) ; rouvrir l'exercice approuvé.
- **Soldes en attente** — **12** (ex-110) = solde en attente **TRAVAUX** (_Avoid_: 110) ; **478** (ex-120) = solde en attente **COURANT** (_Avoid_: 120). ⚠️ Noms de code internes trompeurs : `mv_120`/`result_to_478` suivent le **courant** (478), `mv_110`/`result_to_12` le **travaux** (12) — lire le `code`, pas le nom.
- **Annexes 1-5** (modèles arrêté du 14 mars 2005, mod. 2016/2020) : **1** = état financier après répartition (bilan global, équilibré) ; **2** = compte de gestion général (5 colonnes : N-1 / N voté / N réalisé / N+1 / N+2) ; **3** = ventilation des charges courantes **par clé** (mêmes 5 colonnes) ; **4** = travaux/opérations exceptionnelles **TERMINÉS** (status `closed`) ; **5** = travaux votés **NON clôturés** (status `validated`, contrôle Σ col. E = compte 12). _Avoid_: classer 4/5 **par article de vote** — c'est par **avancement** (terminé / en cours). `Implémentation:` `fn_annexe_1..5`.
- **Annexe 6** — liste individualisée des soldes des copropriétaires, **indissociable de l'annexe 1**. 7 colonnes : `N° · Nom · Total répartition · Solde précédent · Annulation appels · Solde après répartition DÉBITEUR · Solde après répartition CRÉDITEUR` (débiteur/créditeur séparés, **sans compensation**). **Dérivée du GL**, rien de stocké. **Lien d'or** : Σ débiteurs = créances copro de l'annexe 1 ; Σ créditeurs = dettes copro. _Avoid_: confondre avec l'annexe 1 ; stocker une valeur. Fond. : arrêté 14 mars 2005 + décret 2005-240 art.11.
- **Affectation du résultat** — écritures de répartition de l'excédent/déficit sur le compte de chaque copropriétaire, **datées à la date de tenue de l'AG** (art.14-1). `Implémentation:` `approve_period` / `regularize_period` (reçoivent `held_at`). _Avoid_: dater du jour du clic.

## AG / Gouvernance

- **Conseil syndical** — organe élu de contrôle (art. 21 ; comptes 624/706). _Avoid_: « CS » en libellé externe sans le développer.
- **AG ordinaire vs extraordinaire** ; **majorités art. 24/25/26** et **chaîne de statuts AG** → **RENVOI** à [docs/claude/business-rules.md](docs/claude/business-rules.md) (source unique — ne pas dupliquer ici).
- **Budget prévisionnel** — voté **globalement** en une résolution (art. 24 II) ; le détail par clé/poste vit dans la structure (`budget_lines`, un budget = un acte de vote). _Avoid_: un vote séparé par clé par défaut ; figer un modèle mono-clé.

## Ventes / État daté

- **Mutation** — transfert de propriété d'un lot. `Implémentation:` `mutations` (workflow 6 jalons). _Avoid_: vente / cession / transfert en libellé canonique.
- **Pré-état daté** (type `pre`, information avant compromis, **non opposable**) vs **État daté** (art. 5 décret 67-223, type `final`, pièce **opposable** à la signature, parties **figées/immuables**, 3 parties : débiteur 45x / créditeur 45x *hors 450-5 ALUR* / acquéreur).
- **Opposition (art. 20)** — acte du syndic notifié au notaire pour retenir sur le prix les sommes dues par le vendeur.

## Maintenance / Tiers

- **Tiers** — annuaire unique ; le rôle est porté par des flags. `Implémentation:` `tiers`. _Avoid_: recréer un enum `tiers_type` ou des tables `suppliers`/`providers` (inexistantes).
  - **Fournisseur** (`is_supplier`, facture → 401/408) · **Prestataire** (`is_provider`, ordre de service) · **Notaire** (`is_notary`).
- **Syndic** (mandataire légal du syndicat, art. 18) / **Cabinet** (entité SaaS multi-copro, `cabinets`) / **Gestionnaire** (rôle applicatif back-office, `user_is_copro_manager`). _Avoid_: « manager » en libellé métier français.
- **Carnet d'entretien (réglementaire)** — document de synthèse légal (décret 2001-477) : identité syndic, assurances + échéances, gros travaux réalisés + entreprises, contrats de maintenance, PPT. Généré comme **vue agrégée → PDF**, jamais stocké. _Avoid_: le confondre avec le **journal d'interventions** (`logbook_entries`, le « cahier de bord » du quotidien) qui est l'une de ses sources.
- **Ordre de service (OS)** — demande d'intervention à un prestataire. Statuts canoniques : enum SQL `service_order_status` (draft/sent/awaiting_provider/scheduled/in_progress/completed/closed/cancelled/refused). _Avoid_: « envoyé » par une machine (l'envoi = geste humain).
- **Sinistre** — événement de dommage (dégât des eaux, incendie…) suivi de la déclaration à l'expertise à l'indemnité. Fiche reliant police d'assurance + OS + carnet ; `lot_id` nullable = commun (vide) / privatif (rempli → base du recours). Indemnité = produit **713**. Fond. : art.9-1 loi 65-557, convention IRSI.
- **PPT** — Plan Pluriannuel de Travaux. `Implémentation:` `planned_works`. _Avoid_: confondre avec DTG (diagnostic technique global).

## GED / Communication

- **Document** — référentiel unique des pièces. `Implémentation:` `documents` (toute pièce générée s'y enregistre). _Avoid_: un système parallèle (`ag_documents` = journal technique avec `document_id` obligatoire, pas un 2ᵉ référentiel).
- **Délai légal (jours francs)** — se calcule **toujours** sur la date d'**expédition** (horloge métier), jamais sur un horodatage technique d'envoi (art.13 décret 67-223).
- **Préférence de communication** — canal par copro pour le routage, **+ opt-out individuel** sur les catégories **non légales** (RGPD).

---

_Sources d'extraction : `accounts` + migrations `0025/0026/0056/0059/0075` ; `.planning/FACSIMILE_ANNEXES_2026-06-15.md` + arrêté 14 mars 2005 (annexes/état daté) ; `.planning/CARTE_DOUBLONS.md` (doublons EN/FR, vivant) ; `REFONTE_DECISIONS_2026-06-23.md`._

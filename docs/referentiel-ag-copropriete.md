# Référentiel Métier — Assemblée Générale de Copropriété

> **Source** : Cours de Sophie De Winter, formatrice en gestion de syndic.
> **Usage** : Document de référence pour vérifier la conformité d'un outil de gestion de syndic et identifier les fonctionnalités à développer.

---

## Table des matières

1. [Principes fondamentaux](#1-principes-fondamentaux)
2. [Convocation de l'AG](#2-convocation-de-lag)
3. [Ordre du jour](#3-ordre-du-jour)
4. [Documents joints à la convocation](#4-documents-joints-à-la-convocation)
5. [Participation et représentation](#5-participation-et-représentation)
6. [Tenue et déroulement de l'AG](#6-tenue-et-déroulement-de-lag)
7. [Votes et majorités](#7-votes-et-majorités)
8. [Procès-verbal](#8-procès-verbal)
9. [Opposabilité, contestation et exécution](#9-opposabilité-contestation-et-exécution)
10. [Cession de lots et formalités](#10-cession-de-lots-et-formalités)

---

## 1. Principes fondamentaux

### Rôle de l'AG

- L'AG est l'**organe décisionnel exclusif** du syndicat des copropriétaires.
- C'est le **seul lieu** où se forme la volonté collective.
- Les règles de convocation, tenue et décision sont **d'ordre public** (le règlement de copropriété ne peut y déroger).

### Textes de référence

| Texte | Objet principal |
|---|---|
| Loi du 10 juillet 1965 | Statut de la copropriété |
| Décret du 17 mars 1967 | Fonctionnement de l'AG |
| Loi SRU | Réformes urbanisme/copropriété |
| Loi ALUR (24 mars 2014) | Accès au logement, urbanisme rénové |
| Loi Macron | Simplifications diverses |
| Loi ELAN + Ordonnance du 30 octobre 2019 | Modernisation (visioconférence, vote par correspondance) |
| Loi du 10 avril 2024 | Habitat dégradé — accélération et simplification |

### Implications pour un outil de gestion

- L'outil doit garantir la **traçabilité complète** du processus AG (convocation → vote → PV → notification).
- Toute fonctionnalité doit respecter les textes d'ordre public listés ci-dessus.

---

## 2. Convocation de l'AG

### 2.1 Périodicité

- **Minimum 1 AG par an** (article 7 al. 1 du décret de 1967) — obligation impérative.
- Le règlement de copropriété peut prévoir 2+ AG/an.

### 2.2 Qui convoque ?

| Situation | Qui convoque | Base légale |
|---|---|---|
| Cas normal | Le syndic en exercice (exclusivement) | Art. 7 décret 1967 |
| Demande du conseil syndical ou copropriétaires ≥ 1/4 des voix | Le syndic (obligation) | Art. 8 décret 1967 |
| Syndic défaillant après mise en demeure (8 jours) | Président du conseil syndical | Art. 8 décret 1967 |
| Empêchement du syndic | Président du conseil syndical | Art. 18 loi 1965, Ord. 30.10.2019 |
| Absence de syndic (non renouvelé, démissionnaire, mandat expiré) | Tout copropriétaire | Loi du 6 août 2015 |
| À défaut de tout convocateur | Président du Tribunal (ordonnance sur requête) | — |
| Catastrophe technologique (parties communes endommagées) | Le syndic (obligation) | Art. 38-1 loi 1965 |

> **Règle clé** : La convocation envoyée par un syndic dont le mandat expire entre l'envoi et la tenue de l'AG reste valide (Arrêt du 17 octobre 2017).

### 2.3 Formes de convocation (4 formes exclusives)

| Mode | Détails | Preuve |
|---|---|---|
| **Lettre recommandée AR** | Présentation au domicile élu ou réel du copropriétaire (art. 64 décret) | Avis de réception |
| **Remise contre récépissé / émargement** | Initiative du syndic, d'ordre public (art. 64 al. 2). Délai allongé pour permettre LRAR de rattrapage (21 jours après émargement) | Récépissé / feuille d'émargement |
| **Acte d'huissier** | Non prévu au décret mais toujours possible (art. 651 NCPC) | Acte d'huissier |
| **Voie électronique** | Sous réserve d'accord exprès du copropriétaire (art. 42.1 loi 1965, art. 64-1 décret 1967) | Accusé électronique |

> **Attention voie électronique** : prévoir un délai de 15 jours (acceptation/refus par le destinataire) + 3 jours (remise postale de secours) + 21 jours = **39 jours minimum avant l'AG**.

**C'est au syndic de rapporter la preuve de la régularité de la convocation.** À défaut, nullité de plein droit.

### 2.4 Délais

| Règle | Délai |
|---|---|
| Délai normal de convocation | **21 jours francs** avant la date de l'AG (depuis décret 1er mars 2007) |
| Point de départ du délai (LRAR) | Lendemain de la 1ère présentation |
| Point de départ du délai (émargement) | Lendemain de la remise |
| Exception : urgence | Délai réduit possible |
| Exception : règlement de copropriété | Peut prévoir un délai spécifique |

### 2.5 Types d'AG spéciales

| Type | Conditions | Délai de convocation | Majorité spéciale |
|---|---|---|---|
| **AG d'urgence** (art. 37 décret) | Travaux urgents de sauvegarde de l'immeuble | Dispensé du délai normal | — |
| **AG sur demande** (art. 8 décret) | Demande du CS ou copropriétaires ≥ 1/4 voix | 21 jours (délai normal) | — |
| **AG à la demande d'un copropriétaire** (art. 8-1 décret, art. 17-1-AA loi) | Tout copropriétaire, à ses frais, pour questions ne concernant que ses droits/obligations | 45 jours après paiement des frais du syndic | — |
| **AG catastrophe technologique** (art. 38-1 loi) | Dommages parties communes (hors catastrophe naturelle) | Convocation sous 15 jours, tenue dans les 2 mois | Majorité des présents/représentés |

### 2.6 Affichage, date et lieu

- **Affichage** de la date d'AG obligatoire dans les parties communes (décret 27 juin 2019) — pour permettre l'inscription de questions à l'ODJ. Non prescrit à peine de nullité.
- **Date et heure** : fixées librement par le convocateur.
- **Lieu** : en principe, lieu de situation de l'immeuble. Modifiable ponctuellement à la majorité art. 24.

### Fonctionnalités attendues dans l'outil

- [ ] Planification de l'AG annuelle avec rappels automatiques
- [ ] Gestion multi-mode de convocation (LRAR, émargement, électronique, huissier)
- [ ] Calcul automatique des délais selon le mode de convocation
- [ ] Suivi des accusés de réception / preuves de convocation
- [ ] Gestion des consentements pour la voie électronique
- [ ] Affichage de la date d'AG (génération de l'avis à afficher)
- [ ] Workflow spécifique pour AG d'urgence (délais réduits)
- [ ] Workflow pour AG sur demande (vérification quorum 1/4 voix, mise en demeure)
- [ ] Facturation spécifique pour AG art. 8-1 (aux frais du demandeur)

---

## 3. Ordre du jour

### 3.1 Principes

- L'ODJ **précise chacune des questions** soumises à délibération (art. 9 décret 1967).
- L'AG ne peut prendre de décision valide **que sur les questions inscrites à l'ODJ** (art. 13 décret).
- Exception : l'AG peut examiner sans effet décisoire des questions non inscrites (art. 13 loi 1965).
- Les questions doivent être formulées **en termes affirmatifs**.

### 3.2 Rédaction de l'ODJ

| Règle | Détail |
|---|---|
| Précision | L'ODJ doit être précis et non équivoque |
| Unicité | Une question = un point à l'ODJ (pas de questions complexes/multiples regroupées) |
| Collaboration | Le syndic établit l'ODJ avec le conseil syndical (ou à défaut certains copropriétaires) |

### 3.3 Inscription de questions par les copropriétaires

- Tout copropriétaire ou le conseil syndical peut notifier au syndic des questions à inscrire **à tout moment avant l'envoi de la convocation** (art. 10 décret 1967).
- Le syndic **ne peut refuser** les questions notifiées (pas de pouvoir d'appréciation de l'opportunité).
- Si les questions arrivent **après l'envoi de la convocation** → inscription à l'AG suivante.

### Fonctionnalités attendues dans l'outil

- [ ] Éditeur d'ordre du jour collaboratif (syndic + conseil syndical)
- [ ] Réception et suivi des demandes d'inscription de questions par les copropriétaires
- [ ] Vérification automatique : 1 question = 1 résolution (alerte si question complexe)
- [ ] Formulation en termes affirmatifs (aide à la rédaction)
- [ ] Horodatage des demandes (avant/après envoi convocation)
- [ ] Report automatique des questions tardives à l'AG suivante

---

## 4. Documents joints à la convocation

### 4.1 Principe

- La convocation doit être accompagnée des **documents nécessaires à l'information des copropriétaires** (art. 11 décret).
- Permettent de se prononcer **en connaissance de cause**.
- L'absence ou l'insuffisance de documents peut entraîner la **nullité des décisions**, sous réserve de la preuve d'un préjudice (appréciation in concreto par le juge).

### Fonctionnalités attendues dans l'outil

- [ ] Checklist automatique des documents obligatoires selon les résolutions inscrites à l'ODJ
- [ ] Attachement de documents à chaque résolution
- [ ] Alerte si documents manquants avant envoi de la convocation
- [ ] Archivage des documents joints pour traçabilité

---

## 5. Participation et représentation

### 5.1 Droit fondamental de participation

Trois modes de participation :
1. **Présence physique**
2. **Mandataire** (représentation)
3. **Vote par correspondance** (depuis loi ELAN)
4. **Visioconférence / audioconférence** (depuis loi ELAN, sous réserve d'autorisation préalable par AG)

### 5.2 Règles de la représentation par mandataire

| Règle | Détail |
|---|---|
| Liberté de choix | Le mandataire peut être copropriétaire ou non |
| Limite de mandats | Max **3 délégations** par mandataire |
| Exception | Peut dépasser 3 si le total des voix (propres + mandants) ≤ **10% des voix du syndicat** |
| Unicité du mandataire | Un copropriétaire multi-lots = 1 seul mandataire |
| Subdélégation | Autorisée sauf interdiction expresse dans le mandat (Ord. 20.10.2019) |

### 5.3 Personnes interdites de mandat

- Le syndic, son conjoint/partenaire PACS/concubin
- Les ascendants et descendants du syndic et de son conjoint/PACS/concubin
- Les préposés du syndic, leur conjoint/PACS/concubin
- Les ascendants et descendants des préposés du syndic

### 5.4 Forme du mandat

| Caractéristique | Règle |
|---|---|
| Écrit | Obligatoire, signé par le mandant |
| Signature mandataire | Non prescrite à peine de nullité |
| Temporalité | Établi avant l'AG ou au plus tard lors de sa tenue |
| Portée | Valable pour une AG déterminée uniquement |
| Mandat en blanc | Possible — distribué par le Président du CS ou de l'AG (jamais par le syndic) |
| Mandat permanent | Possible (ex: administrateur de biens gérant les lots), doit être présenté en AG ou notifié au syndic |
| Mandat impératif | Les votes du mandataire engagent le mandant même si consignes non respectées |

> **Sanction** : Si le nombre de pouvoirs dépasse le maximum autorisé → **nullité de l'AG** sans recherche d'incidence sur les votes.

### 5.5 Cas particuliers

| Situation | Règle de participation |
|---|---|
| **Personne morale** | Représentée par son représentant légal/statutaire (présente) ou par mandataire art. 22 (représentée) |
| **Indivision** | Tous peuvent assister mais votent d'**une seule voix** via un mandataire commun. À défaut d'accord → désignation par le Président du TGI |
| **Démembrement** (usufruit, etc.) | Mandataire commun. À défaut d'accord → représentation de plein droit par le **nu-propriétaire** |
| **Époux** copropriétaires communs/indivis | Chaque époux peut recevoir personnellement des délégations de vote (art. 22) |
| **Incapables** (mineurs, majeurs protégés) | Représentation légale |

### 5.6 Vote par correspondance (loi ELAN)

- Formulaire conforme au modèle fixé par arrêté, joint à la convocation.
- Retour **3 jours francs** au plus tard avant l'AG.
- Si la résolution est **amendée en séance** → le votant par correspondance est assimilé à un **défaillant** (pas un opposant).
- Le formulaire est ignoré si le copropriétaire (ou son mandataire) est **présent** à l'AG.

### 5.7 Visioconférence / audioconférence

- Décision préalable en AG pour le choix des supports techniques et le coût.
- Le système doit garantir : **identification des copropriétaires** + **retransmission continue et simultanée**.
- Proscrire les moyens non sécurisés (sous peine de nullité).

### Fonctionnalités attendues dans l'outil

- [ ] Gestion des mandats : création, vérification du nombre, alerte dépassement
- [ ] Contrôle automatique des interdictions de mandat (syndic, préposés, famille)
- [ ] Calcul automatique de la règle des 10% pour les mandats multiples
- [ ] Gestion des cas particuliers (indivision, démembrement, personne morale)
- [ ] Module de vote par correspondance (formulaire, réception, horodatage, gestion des amendements)
- [ ] Module de participation à distance (visioconférence avec identification sécurisée)
- [ ] Feuille de présence numérique (noms, voix, mode de participation)

---

## 6. Tenue et déroulement de l'AG

### 6.1 Feuille de présence

- **Obligatoire** pour chaque AG.
- Mentionne : noms des copropriétaires présents, représentés ou ayant voté par correspondance + nombre de voix.
- **Certifiée exacte** par le président de séance.
- Son absence ou irrégularité → **nullité possible de l'AG**.

### 6.2 Bureau de l'AG

Désigné en début de séance :

| Rôle | Mission |
|---|---|
| **Président de séance** | Dirige les débats, veille au respect de l'ODJ, certifie la feuille de présence, signe le PV |
| **Scrutateur(s)** | Assistent le président, contrôlent les votes, vérifient les résultats |
| **Secrétaire de séance** | Rédige le PV (en principe le syndic, sauf décision contraire) |

### 6.3 Déroulement des délibérations

- Questions examinées **dans l'ordre prévu** par la convocation.
- Chaque résolution : **débat** puis **vote**.
- Aucune décision valide sur question non inscrite à l'ODJ.
- La liberté de discussion est un droit : toute atteinte = **irrégularité** pouvant entraîner nullité.
- Le président peut limiter les interventions excessives.

### 6.4 Vote

- Le **droit de vote est fondamental** : sa méconnaissance entraîne la nullité des décisions (sans recherche d'incidence sur la majorité).
- Le vote est **public**.
- Chaque copropriétaire dispose de voix proportionnelles à sa **quote-part de parties communes** (tantièmes).

### Fonctionnalités attendues dans l'outil

- [ ] Feuille de présence numérique dynamique (mise à jour en temps réel)
- [ ] Désignation du bureau (président, scrutateurs, secrétaire) avec traçabilité
- [ ] Suivi de l'ordre des résolutions (respect de l'ODJ)
- [ ] Interface de vote en temps réel avec décompte automatique par tantièmes
- [ ] Enregistrement vote par vote (pour, contre, abstention) par copropriétaire

---

## 7. Votes et majorités

### 7.1 Les 4 niveaux de majorité

| Majorité | Définition | Usage | Abstentions |
|---|---|---|---|
| **Article 24** | Majorité des voix **exprimées** (présents, représentés, vote par correspondance) | Décisions courantes d'administration | **Non comptées** |
| **Article 25** | Majorité des voix de **tous** les copropriétaires du syndicat | Décisions importantes (désignation/révocation syndic, certains travaux) | **Assimilées à des votes contre** |
| **Article 26** | Double majorité : majorité des **membres** du syndicat + **2/3 des voix** de tous les copropriétaires | Décisions les plus graves (atteinte aux droits des copropriétaires) | — |
| **Unanimité** | Tous les copropriétaires | Protection des droits individuels (destination immeuble, modification quote-part, etc.) | — |

### 7.2 Mécanisme de la passerelle (art. 25-1)

```
Résolution soumise à l'art. 25
        │
        ▼
  Art. 25 atteint ? ──── OUI ──→ Décision adoptée
        │
       NON
        │
        ▼
  ≥ 1/3 des voix de tous les copropriétaires ? ──── OUI ──→ Second vote immédiat à l'art. 24
        │
       NON
        │
        ▼
  Résolution rejetée
```

**Exceptions à la passerelle** :
- Certaines décisions art. 26 sont exclues.
- **Travaux d'économie d'énergie (art. 25 f)** : si le 1/3 n'est pas atteint, possibilité de reconvoquer dans 3 mois à la majorité art. 24.

**Passerelle art. 26** : Si obtention de la moitié des copropriétaires présents/représentés/vote par correspondance + 1/3 des voix de tous les copropriétaires → possibilité de passage.

### 7.3 Domaine de l'unanimité

- Modification de la destination ou des modalités de jouissance des **parties privatives**
- Modification de la **destination de l'immeuble** (aliénation parties communes indispensables)
- Modification de la **quote-part de parties communes** ou de la **répartition des charges**
- **Emprunt bancaire** au nom du SDC (sauf exceptions prévues par la loi)

**Exceptions à l'unanimité pour les emprunts** :
1. Préfinancement de subventions publiques → même majorité que les travaux
2. Emprunt au bénéfice des seuls copropriétaires participants → même majorité que les travaux
3. Travaux art. 24 II a-e et art. 25 f → tous réputés adhérents, droit de refus dans les 2 mois de la notification du PV, paiement dans les 6 mois

### 7.4 Notion d'opposition

- L'opposition se définit **en fonction de la position prise par la majorité**.
- Si une résolution est **rejetée** : les « opposants » sont ceux qui ont voté **pour**.
- Le PV doit alors mentionner le nom des copropriétaires ayant voté POUR.

### Fonctionnalités attendues dans l'outil

- [ ] Attribution automatique de la majorité requise selon le type de résolution
- [ ] Calcul automatique du quorum et des résultats pour chaque majorité (art. 24, 25, 26, unanimité)
- [ ] Détection automatique de la passerelle art. 25-1 (seuil 1/3 atteint ?)
- [ ] Gestion du second vote immédiat (passerelle)
- [ ] Gestion de la passerelle art. 26
- [ ] Cas particulier travaux économie d'énergie (reconvocation 3 mois)
- [ ] Calcul correct des abstentions selon la majorité applicable
- [ ] Enregistrement des opposants au sens juridique (inversion selon résultat)
- [ ] Vérification des règles d'emprunt collectif

---

## 8. Procès-verbal

### 8.1 Contenu obligatoire (art. 17 décret 1967)

Le PV doit mentionner :
- Date et lieu de l'AG
- Noms du président, secrétaire et scrutateurs
- Copropriétaires présents, représentés ou ayant voté par correspondance
- Texte de chaque résolution
- Résultat précis des votes
- En cas de rejet : nom des copropriétaires ayant voté POUR

### 8.2 Signature

- Signé **en fin de séance** par le président, le secrétaire et les scrutateurs.
- L'absence de signature = irrégularité → **nullité possible**.

### 8.3 Notification

- Notification à **tous les copropriétaires** dans un délai de **1 mois** après l'AG.
- Par LRAR ou voie électronique (si consentement).
- La notification fait courir le délai de contestation.
- **À défaut de notification → le délai de contestation ne court pas.**

### Fonctionnalités attendues dans l'outil

- [ ] Génération automatique du PV à partir des données de l'AG
- [ ] Inclusion automatique de toutes les mentions obligatoires
- [ ] Enregistrement du résultat détaillé de chaque vote
- [ ] Mention des opposants au sens juridique
- [ ] Workflow de signature numérique (président, secrétaire, scrutateurs)
- [ ] Notification automatique du PV (LRAR, électronique)
- [ ] Suivi du délai de 1 mois pour la notification
- [ ] Archivage du PV et des preuves de notification

---

## 9. Opposabilité, contestation et exécution

### 9.1 Opposabilité des décisions

- Les décisions s'imposent à **tous les copropriétaires** (y compris absents, opposants, et copropriétaires postérieurs).
- Opposabilité subordonnée à la **notification régulière du PV**.
- **Modification du règlement de copropriété** : opposable aux acquéreurs uniquement après **publication au fichier immobilier**.

### 9.2 Exécution des décisions

- Le syndic a le **pouvoir et l'obligation** d'exécuter les décisions (art. 18 loi 1965).
- Les décisions peuvent être exécutées **avant même la notification du PV** et avant l'expiration du délai de contestation.

**Caractère suspensif du délai de recours pour les travaux** :

| Majorité du vote | Exécution |
|---|---|
| Article 24 | Exécution **immédiate** (pas de caractère suspensif) |
| Travaux urgents | Exécution **immédiate** |
| Article 25 | Exécution **suspendue** pendant le délai de 2 mois (sauf urgence) |
| Article 26 | Exécution **suspendue** pendant le délai de 2 mois (sauf urgence) |

### 9.3 Contestation

- Droit réservé aux copropriétaires **opposants ou défaillants**.
- **Délai de forclusion : 2 mois** à compter de la notification du PV.
- À l'expiration → décisions **définitives**.
- L'annulation d'une décision est **rétroactive**, mais les actes d'exécution déjà réalisés peuvent être maintenus (appréciation souveraine du juge).

### Fonctionnalités attendues dans l'outil

- [ ] Suivi de l'état de chaque décision (votée → notifiée → contestable → définitive → exécutée)
- [ ] Calcul automatique du délai de contestation (2 mois à partir de la notification)
- [ ] Alerte pour le caractère suspensif des travaux art. 25/26
- [ ] Suivi de l'exécution des décisions par le syndic
- [ ] Registre des contestations éventuelles
- [ ] Gestion de la publication au fichier immobilier (modifications du RC)

---

## 10. Cession de lots et formalités

### 10.1 Informations à fournir à l'acquéreur

| Document | Objet |
|---|---|
| Dossier de diagnostic technique | Plomb, amiante, termites, gaz, DPE, ERNMT… |
| Carnet d'entretien | État de l'immeuble |
| Règlement de copropriété + EDD | Opposables si publiés au fichier immobilier |
| **État daté** | Situation financière du lot vis-à-vis du syndicat |

### 10.2 État daté (art. 5 décret 1967)

Établi par le syndic à destination du notaire, en **3 parties** :

| Partie | Contenu |
|---|---|
| **1ère partie** | Sommes dues **par le vendeur** au syndicat (provisions, charges impayées, avances) |
| **2ème partie** | Sommes dues **par le syndicat** au vendeur (avances art. 45-1…) |
| **3ème partie** | Sommes incombant **au nouvel acquéreur** (reconstitution des avances, provisions non exigibles) |

- **Annexe** : quote-part du lot dans le budget prévisionnel et dépenses hors BP pour les 2 exercices précédents + procédures en cours.
- Montant : **380 € TTC** (décret 21 février 2020).
- Engage la **responsabilité du syndic** quant aux renseignements fournis.

### 10.3 Formalités envers le syndic

#### Notification du transfert (art. 6 décret)

- Pour tout transfert de propriété ou constitution de droits réels (usufruit, nue-propriété, usage, habitation).
- Rend le transfert **opposable au syndicat**.
- **Sans notification** : l'ancien propriétaire conserve sa qualité vis-à-vis du syndicat (convocation AG, action en nullité).

#### Avis de mutation

- Envoyé par le **notaire** au syndic en **LRAR** dans les **15 jours** du transfert de propriété.
- Déclenche le délai de **15 jours** pour l'opposition du syndic.

#### Opposition (art. 20 loi 1965)

- Le syndic doit faire opposition dans les **15 jours** de la réception de l'avis de mutation.
- Par **acte extrajudiciaire** (huissier) — pas par LRAR.
- Opposition tardive = **privée de tout effet** + responsabilité du syndic engagée.

### Fonctionnalités attendues dans l'outil

- [ ] Génération automatique de l'état daté (3 parties + annexe)
- [ ] Calcul automatique des sommes dues/à recevoir par lot
- [ ] Workflow de mutation : avis de mutation → opposition → mise à jour copropriétaire
- [ ] Suivi des délais (15 jours avis, 15 jours opposition)
- [ ] Alerte pour opposition dans les délais
- [ ] Mise à jour automatique de l'annuaire des copropriétaires après mutation
- [ ] Archivage des notifications art. 6

---

## Synthèse des modules fonctionnels pour un outil de gestion de syndic

| Module | Fonctionnalités clés | Priorité |
|---|---|---|
| **Convocation** | Multi-mode (LRAR, émargement, électronique, huissier), calcul délais, preuves, consentements | Haute |
| **Ordre du jour** | Éditeur collaboratif, inscription questions copropriétaires, vérification unicité | Haute |
| **Documents** | Checklist par résolution, attachement, alertes documents manquants | Haute |
| **Participation** | Feuille de présence, mandats, contrôle cumul, vote par correspondance, visioconférence | Haute |
| **Vote** | Décompte par tantièmes, 4 majorités, passerelle automatique, opposants juridiques | Haute |
| **Procès-verbal** | Génération auto, mentions obligatoires, signature, notification, archivage | Haute |
| **Suivi décisions** | État des décisions, délais contestation, caractère suspensif, exécution | Moyenne |
| **Mutations** | État daté, avis de mutation, opposition, mise à jour copropriétaires | Moyenne |
| **AG spéciales** | Workflows urgence, demande copropriétaires, catastrophe technologique | Basse |

---

## Comment utiliser ce document avec Claude Code

### Pour vérifier l'existant
Demande à Claude Code :
> « En te basant sur le référentiel `referentiel-ag-copropriete.md`, audite le code/les fonctionnalités existantes et identifie les écarts de conformité avec les règles métier décrites. »

### Pour planifier les prochaines actions
Demande à Claude Code :
> « En te basant sur le référentiel `referentiel-ag-copropriete.md` et les fonctionnalités déjà développées, propose les prochaines actions à prioriser en respectant l'ordre de priorité du tableau de synthèse. »

### Pour valider une fonctionnalité spécifique
Demande à Claude Code :
> « Vérifie que notre module de vote respecte toutes les règles décrites dans la section 7 (Votes et majorités) du référentiel, notamment la passerelle art. 25-1 et le calcul des abstentions. »

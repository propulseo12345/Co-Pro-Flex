# COPROFLEX — PRODUCT BRIEF STRATÉGIQUE
_Généré le 2026-04-09_

---

## A. DESCRIPTION PRODUIT

| Champ | Valeur |
|-------|--------|
| **Nom** | CoProFlex |
| **Pitch 1 phrase** | La plateforme tout-en-un pour syndics et copropriétaires — AG en quelques clics, finances en temps réel, documents centralisés. |
| **Tagline site** | "Le logiciel de copropriété que les gestionnaires adorent" |
| **Catégorie** | SaaS B2B de gestion de copropriété (marché français) |
| **Proposition de valeur** | Remplace 3 à 5 outils distincts par une seule plateforme ; conçu pour la loi française (loi 1965, ALUR) ; opérationnel en < 1 semaine |

---

## B. FONCTIONNALITÉS DÉTECTÉES

### Module 1 — Dashboard
- KPIs principaux (solde, impayés, AG à venir)
- Alertes critiques
- Raccourcis actions
- **Route :** `/dashboard`

### Module 2 — Assemblées Générales (AG)
- Création AG ordinaire / extraordinaire
- 14 résolutions pré-rédigées personnalisables
- Votes en temps réel avec calcul automatique majorités (art. 24, 25, 25-1, 26, 26-1, Unanimité)
- Vote par correspondance
- Feuille de présence + signature numérique
- Génération PDF : convocation + procès-verbal
- **Route :** `/ag`

### Module 3 — Finance
- **Budgets** : prévisionnel, travaux, ALUR
- **Appels de fonds** : génération, échéancier (unique/semestriel/trimestriel/personnalisé), suivi paiements
- **Impayés** : relances auto (J+15, J+30, J+60, J+90), mise en demeure, contentieux
- **Comptabilité** : journaux, grand livre, balance
- **Factures** : création, validation, paiement
- **Route :** `/finance`

### Module 4 — Maintenance
- Carnet d'entretien numérique
- Contrats prestataires (alertes renouvellement)
- Ordres de service (workflow 11 étapes : Brouillon → Clôturé)
- Annuaire prestataires
- **Route :** `/maintenance`

### Module 5 — Documents (GED)
- Catégories : PV, règlements, contrats, diagnostics
- Upload / download / prévisualisation
- Archivage et droits d'accès par rôle
- **Route :** `/documents`

### Module 6 — Communication
- Messagerie privée syndic ↔ copropriétaires
- Mur communautaire
- Événements
- **Route :** `/communication`

### Module 7 — Copropriétaires
- Annuaire complet
- Gestion des lots (numéro, type, étage, surface, tantièmes)
- Préférences de communication
- **Route :** `/coproprietaires`

### Module 8 — Ventes & Impayés
- Workflow vente de lot (6 étapes V2)
- Questionnaire syndic (pré-état daté, état daté, certificat art. 20)
- Suivi recouvrement
- **Routes :** `/ventes-impayes/ventes`, `/ventes-impayes/impayes`

### Module 9 — Contentieux
- Suivi dossiers contentieux
- **Route :** `/contentieux`

### Module 10 — Paramètres
- Info copropriété, templates de documents, reminders automatiques
- **Route :** `/settings`

### Module 11 — Onboarding
- Stepper guidé pour la configuration initiale

### Intégrations techniques détectées
- **Banking** : API open banking (connexion comptes bancaires, institutions)
- **Email** : Resend (emails transactionnels + recommandés digitaux)
- **Recommandé digital** : service de courrier recommandé intégré

---

## C. CIBLE CLIENT

| Segment | Description | Plan adapté |
|---------|-------------|-------------|
| **Syndic bénévole** | Président CS gérant sa résidence seul, petite copropriété | Essentiel |
| **Syndic professionnel indépendant** | Gestionnaire gérant plusieurs copropriétés | Professionnel |
| **Cabinet de syndic** | Structure multi-gestionnaires, > 10 copropriétés | Entreprise |

**Rôles utilisateurs identifiés :**
- `ADMIN` (super-admin plateforme)
- `SYNDIC` (accès total)
- `PRESIDENT_CS` (lecture + vote AG + documents CS)
- `MEMBRE_CS` (lecture + vote AG)
- `COPROPRIETAIRE` (vote AG + consultation finances propres + documents)
- `LOCATAIRE` (accès documents limité)

**Géographie :** France uniquement (loi 1965, ALUR, comptabilité française)

---

## D. MODÈLE DE DONNÉES MÉTIER

```
ICopropriete
├── nom, adresse, nombreLots, totalTantiemes
├── siretSyndic, exerciceDebut, anneeConstruction
└── ParametresCopropriete (tantièmes, clés répartition, plan comptable)

ILot (appartient à ICopropriete)
├── numero, type (appartement/cave/parking/...)
├── etage, surface, tantiemes
└── proprietaireId → ICoproprietaire

ICoproprietaire
├── nom, prenom, email, telephone
├── lots[], totalTantiemes
├── roleCS, preferenceCommunication
└── isResident

IBudget
├── annee, type (COURANT | TRAVAUX)
├── statut (Brouillon → Approuvé → Clôturé)
└── categories[] → postes[] (montantN1, montantN, montantRealise)

IAppelFonds
├── budgetId, dateEcheance, montantTotal
├── mode (UNIQUE | SEMESTRIEL | TRIMESTRIEL | PERSONNALISE)
└── lignes[] (par copropriétaire : montantDu, montantPaye)

IImpaye
├── coproprietaireId, montantDu, joursRetard
├── statut (EN_RETARD → RELANCE_1/2 → MISE_EN_DEMEURE → CONTENTIEUX → REGULARISE)
└── historiqueActions[] (EMAIL | COURRIER | APPEL | MISE_EN_DEMEURE | HUISSIER)

OrdreService (11 statuts)
└── Brouillon → À envoyer → Envoyé → Accepté/Refusé → Planifié → En cours → Réalisé → Facturé → Payé → Clôturé

Vente (workflow 6 étapes V2)
└── lotIds, vendeur, acquereur, documents (pré-état daté, état daté, certificat art.20...)

Portefeuille → multi-copropriétés pour un gestionnaire
```

---

## E. CONCURRENTS PROBABLES

| Concurrent | Positionnement | Forces supposées |
|------------|----------------|------------------|
| **ICS** (Informatique et Copropriété) | Leader historique | Intégration comptable avancée, réseau syndics |
| **Thétralink** | Syndics pro | Complétude fonctionnelle, ancienneté |
| **SEIITRA** | Syndics pro | Comptabilité spécialisée copropriété |
| **Gercop** | Petites structures | Prix accessible, simplicité |
| **Crypto (Crypto Soft)** | Syndics pro | Écosystème étendu |
| **Sof-Copro** | Syndics pro | Conformité réglementaire |
| **Powimo** | Syndics pro | Interface moderne, cloud |
| **Cotoit / Matera** | Syndics bénévoles | UX simple, prix bas, notoriété digitale |

**Avantage différenciant CoProFlex :**
> Interface moderne, tout-en-un (vs 3-5 outils), conçu nativement pour la loi française, espace copropriétaire 24/7, opérationnel en < 1 semaine, tarification transparente au lot.

---

## F. STACK TECHNIQUE

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styles** | CSS Modules (dark theme natif) |
| **UI** | Lucide React, Recharts (graphiques) |
| **Drag & Drop** | @dnd-kit |
| **PDF** | jsPDF + jspdf-autotable, pdfjs-dist |
| **ZIP** | JSZip |
| **Dates** | date-fns, date-fns-tz |
| **Backend / BDD** | Supabase (PostgreSQL + Auth + Storage) |
| **Email** | Resend |
| **Hébergement** | Vercel |
| **Tests** | Playwright (E2E) |
| **Banking** | API Open Banking (institutions, comptes, callback OAuth) |

---

## G. STADE MVP

- [x] Architecture front-end complète (tous modules UI)
- [x] Données mockées fonctionnelles
- [x] Supabase partiellement intégré (auth + quelques modules)
- [x] Site marketing complet (LP, tarifs, comparaison, FAQ, blog, légal)
- [x] Déployé en production sur Vercel
- [ ] Migration complète vers Supabase (en cours)
- [ ] Beta avec utilisateurs réels
- [ ] Lancé commercialement

**URL prod :** https://co-pro-flex-iota.vercel.app

---

## H. VARIABLES POUR ANALYSE STRATÉGIQUE

```yaml
produit:
  nom: "CoProFlex"
  description: "La plateforme tout-en-un pour syndics et copropriétaires — AG, finances et documents centralisés en un seul outil."
  categorie: "SaaS de gestion de copropriété"

cible:
  principale: "Syndics professionnels indépendants + cabinets syndic"
  secondaire: "Syndics bénévoles (présidents CS)"
  taille_entreprise: "Solo à PME (1 à 50 gestionnaires)"
  geographie: "France"

probleme:
  douleur_1: "Dispersion des outils (3 à 5 logiciels pour gérer une copropriété)"
  douleur_2: "AG chronophages : recomptage manuel des votes, PV rédigé après coup"
  douleur_3: "Copropriétaires qui appellent pour chaque info (solde, document, date AG)"

solution:
  mecanisme_unique: "Tout-en-un natif loi française + espace copropriétaire autonome 24/7"
  features_cles:
    - "Votes AG en temps réel avec calcul automatique (art. 24/25/26)"
    - "Finance : appels de fonds automatisés + relances impayés"
    - "GED partagée syndic ↔ copropriétaires"
    - "Workflow vente de lot intégré"
    - "Open banking (connexion comptes bancaires)"

concurrents:
  - nom: "ICS"
    forces: "Leader historique, intégration comptable avancée"
  - nom: "Thétralink"
    forces: "Complétude fonctionnelle, ancienneté marché"
  - nom: "SEIITRA"
    forces: "Comptabilité spécialisée copropriété"
  - nom: "Powimo"
    forces: "Interface moderne, cloud natif"
  - nom: "Matera / Cotoit"
    forces: "UX simple, notoriété digitale, syndics bénévoles"

business:
  modele: "SaaS abonnement au lot/mois"
  plans:
    essentiel: "1,90€/lot/mois (jusqu'à 3 copropriétés)"
    professionnel: "2,90€/lot/mois (illimité) — plan recommandé"
    entreprise: "Sur devis (cabinets multi-gestionnaires)"
  essai: "30 jours gratuit sans carte bancaire"
  remise_annuelle: "-17% (2 mois offerts)"
  facturation: "Mensuelle par carte ou prélèvement SEPA"

stade: "MVP front-end complet, migration Supabase en cours, pré-lancement"
traction_actuelle: "0 utilisateurs (pré-lancement)"
```

---

## INFORMATIONS MANQUANTES (à compléter manuellement)

1. **Budget marketing** — montant mensuel alloué à l'acquisition
2. **Objectif de traction** — nombre de clients cibles à 6/12 mois
3. **Interlocuteur commercial** — qui gère les ventes ?
4. **Modèle de go-to-market** — direct (SEO/Ads) ? partenariats ? démarchage syndics ?
5. **Nom légal de la société** — entité juridique derrière CoProFlex
6. **Hébergement données** — Supabase France ? EU ? (important pour pitch RGPD)
7. **Roadmap** — fonctionnalités prévues après migration Supabase
8. **Prix de la concurrence** — fourchettes réelles ICS/Thétralink (non disponibles dans le code)

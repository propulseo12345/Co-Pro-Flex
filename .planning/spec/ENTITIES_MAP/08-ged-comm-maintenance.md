# Fiche 08 — GED, Communication & Maintenance (carnet d'entretien / OS / contrats)

> **Statut : BROUILLON** — Date : 2026-05-30 — Rang 8 (DERNIER, clôture de l'audit logique métier CoProFlex)
> Projet Supabase `iyfesbjnkpynmwlsmxnp`, schéma `public`. Audit LECTURE SEULE.
> Données DEV faibles (audit du SCHÉMA + LOGIQUE, pas du volume).

---

## 1. Identité (périmètre rang 8)

Le rang 8 **boucle l'audit**. Il couvre quatre sous-domaines transverses qui touchent tous les rangs précédents :

| Sous-domaine | Rôle métier | Tables clés |
|---|---|---|
| **GED / documents** | Coffre-fort documentaire légal de la copro (extranet ALUR) | `documents`, `document_links`, `document_access`, `document_versions`, `document_folders`, bucket `ged` |
| **Carnet d'entretien / technique** | Obligation art.18 + décret 2001-477 ; DTG/PPT loi Climat | `logbook_entries`, `technical_documents`, `insurance_policies` |
| **Maintenance / OS / contrats** | DÉCLENCHEUR amont de l'engagement de dépense (→ facture rang 4) | `service_orders`, `service_order_events`, `contracts`, `providers` |
| **Communication** | Mur, messagerie, événements, mails/notifications (RGPD) | `wall_posts/_comments/_likes`, `conversations/_members`, `messages`, `events`, `ag_notifications`, `mail_campaigns/_recipients`, `mails` |

**Vision d'ensemble** : la GED est le **justificatif** (pièce) de tout flux ; l'OS est l'**amont de l'engagement** (OS → supplier_invoice → ledger rang 4, alimente 408 à la clôture). Le carnet d'entretien est le **registre légal de la maintenance**.

---

## 2. Modèle de données + source de vérité

**GED** : `documents` (catégorie légale via enum `document_category` 20 valeurs, confidentialité 4 niveaux, rétention `retention_years`, `expiration_date`, `deletion_blocked`). Liens : `document_links` (polymorphe `entity_type`/`entity_id`, **sans FK**), plus FK directes `service_order_id`/`invoice_id`/`contract_id`/`ag_id`. Versioning : `document_versions`. Stockage : bucket `ged` (privé). **Source de vérité documentaire = `documents` + bucket `ged`.**

**Carnet/technique** : `logbook_entries` (24 col, FK `contract_id`/`service_order_id`/`provider_id`/`document_id`), `technical_documents` (12 col, DPE/DTG/PPT), `insurance_policies` (FK `contract_id`). **Carnet légal = `logbook_entries` (registre) + documents liés (pièces).**

**Maintenance** : `service_orders` (42 col, workflow 11 statuts, FK `provider_id`/`supplier_invoice_id`/`logbook_entry_id`), `service_order_events` (audit trail), `contracts` (FK `provider_id`, `tacit_renewal`/`auto_generate_orders`), `providers`. **Engagement = `service_orders` ; charge réalisée = grand livre (rang 4).**

**Communication** : 18 tables. Notifications légales AG = `ag_notifications` (+ `ag_notification_events` tracking Resend). Bulk = `mail_campaigns`/`mail_recipients`. `mails` = orpheline (0 ligne, structure ancienne). **Source canonique notifications AG = `ag_notifications`** (à acter, cf §6).

---

## 3. Règles métier + loi

| Obligation légale | Source | État schéma |
|---|---|---|
| **Carnet d'entretien** (travaux, contrats, assurances, échéances) | Art.18 loi 65-557 + décret 2001-477 art.5 | `logbook_entries` SANS colonnes assurance ; lien contrat faible (P1) |
| **Extranet sécurisé** (accès copropriétaires aux documents) | Loi ALUR art.18 (depuis 2020) | `document_access` VIDE, RLS bucket OK (P1) |
| **Conservation 10 ans** (PV AG, comptes, factures, diagnostics) | Loi 65-557 + jurisprudence | Trigger `calculate_document_expiration` OK ; archivage auto absent |
| **DTG / PPT** (justifiés par diagnostics) | Loi Climat 2021 art.49 | `technical_documents` VIDE, pas de lien `planned_works` (P1/P2) |
| **DPE collectif** (validité 10 ans, alerte renouvellement) | Réglementation thermique | `validity_date` NULLABLE, pas de vue d'alerte tech (P1/P2) |
| **RGPD** (droit à l'oubli, traçabilité accès) | RGPD | Pas de soft-delete/anonymisation messagerie ; denorm email figé (P2) |
| **Workflow OS** (engagement → facture → charge → 408) | Décision actée clôture 408/486 | Ponts CASSÉS (P0, cf §5) |

---

## 4. État réel en base (preuves)

**Conforme (confirmé) :**
- **GED-01/11** Bucket `ged` privé (`public=false`), 6 policies RLS (`ged_membre_read` impose check `documents.confidentiality`), edge `get_document_signed_url` (JWT, membership, signed URL clampée 60s–1h).
- **GED-02** `document_category` = 20 valeurs couvrant toutes catégories légales.
- **GED-03** Trigger rétention `calculate_document_expiration` fonctionnel (`contrat`=15, `pv_ag`/`facture`/`diagnostic`=10, `reglement`/`plan`=0 perpétuel).
- **GED-04** Trigger `prevent_protected_document_deletion` + 10 docs `deletion_blocked=true`.
- **GED-09** Confidentialité 4 niveaux (`public`/`council`/`manager`/`restricted`) + fonction `can_access_document()`.
- **GED-12** `document_versions` structure OK (UNIQUE doc/version), `create_document_version()` présente (0 donnée).
- **GED-14** `document_folders` = 56 dossiers (52 system + 4 user), `create_document_system_folders()` opérationnelle.
- **LE-07** Edge `maintenance-workflow` + `create_logbook_from_service_order()` : pont OS → carnet automatisé (design OK).
- **LE-08** RLS structure logbook/documents/technical alignée ALUR.

**Refuted (écartés par la vérif) :**
- *GED-10* : les paths préfixés `11111111-aaaa…` sont un **UUID `copro_id` valide**, pas du legacy.
- *COMM-F3* : architecture pièce jointe 1:1 (`attachment_id`) = conforme MVP.
- *COMM-F11 / R8-D-05* : `service_order_events` = audit trail maintenance (pas communication).
- *R8-D-07* : l'enum `content_visibility` n'a PAS de valeur `public` (`all_members`/`council_only`/`managers_only`) — pas d'exposition extranet involontaire.

---

## 5. Mal implémenté / dette P0–P3 (tracée + action)

> **HORS PÉRIMÈTRE — COMM-F1 (RLS non activé sur 18 tables communication).** Le sous-agent l'a classé P0, mais le RLS désactivé en phase dev est **volontaire et hors périmètre de l'audit** (décision actée — RLS/auth = chantier séparé). À traiter au durcissement go-live avec tout le RLS, **pas** dans le plan de correction de cohérence. Non comptabilisé en P0 ici.

### P0 — Bloquant production

| ID | Constat | Preuve | Action |
|---|---|---|---|
| **R8-D-01** | `supplier_invoices.document_id` NULL partout | 6/6 NULL ; FK existe ; pas d'EF `post_supplier_invoice` | EF créant le document `facture` à l'approbation, lier `document_id` |
| **R8-D-02** | `service_orders.supplier_invoice_id` NULL | 0/2 ; OS-2026-0003 `closed` sans facture | Trigger `supplier_invoices.related_service_order_id` → MAJ `service_orders.supplier_invoice_id` |
| **R8-D-03** | `ledger_transactions.source_id` NULL pour 100 % factures | `create_ledger_transaction()` jamais appelée par le flux facture | EF post-écriture `source_type='supplier_invoice'`, `source_id=invoice.id` (recoupe rang 4 D-02) |
| **M-09** | OS-2026-0003 `closed` sans facture/carnet/montant, `created_by` NULL | audit trail compromis | CHECK (M-01) + corriger l'OS dangling + investiguer `created_by` null |
| **R8-D-11** | THÈME : ponts OS→facture→écriture→carnet cassés (EF/triggers manquants) | 3 ponts à 0 % | `post_supplier_invoice()`, trigger invoice→OS, auto-création logbook |

### P1 — Conformité légale / intégrité forte

| ID | Constat | Action |
|---|---|---|
| **GED-05** | `document_access` VIDE → extranet ALUR non implémenté | octroi/audit d'accès + RLS sur la table (périmètre go-live, cf §7) |
| **LE-01** | `logbook_entries` sans volet assurances (décret 2001-477) | lier assurance au carnet ou vue agrégée |
| **LE-03** | `technical_documents` vide, pas de lien `planned_works` (PPT) | peupler + lier DTG/PPT/planned_works (rang 5 ALUR) |
| **M-01** | Workflow OS sans CHECK statut↔données (closed sans facture/montant) | CHECK : `closed` ⇒ `actual_amount` + facture obligatoires |
| **COMM-F2** | 3 systèmes : `ag_notifications` / `mail_campaigns` / `mails` | acter canonique AG, bulk ; **droper `mails`** |
| **CONTRACT-01** | `auto_generate_orders`/`tacit_renewal` sans automatisation | job de génération OS récurrents + alerte renouvellement |

### P2/P3

| ID | Constat | Action |
|---|---|---|
| **GED-13** | `document_links` polymorphe sans FK (orphelins possibles) | privilégier FK directes typées ; contraindre/déprécier le polymorphe |
| **LE-02** | Pas de vue d'alerte des échéances techniques (DPE/DTG/contrôles) | vue unifiée (`technical_documents.validity_date` + `contracts.end_date` + assurances) |
| **COMM-F4** | RGPD messagerie : pas de soft-delete/anonymisation, email figé | soft-delete + anonymisation (droit à l'oubli) |
| **ARCH-01** | Conservation 10 ans déclarée mais archivage non automatisé | job d'archivage/purge selon `retention_years`/`expiration_date` |
| **EVT-01** [P3] | Modules sociaux (mur, événements) : maturité/priorité à confirmer | décision de périmètre go-live vs post-MVP |

---

## 6. Sources divergentes → source unique

| Sujet | Sources concurrentes | Source unique cible |
|---|---|---|
| **Notifications AG** | `ag_notifications`, `mail_campaigns`, `mails` | `ag_notifications` (légal AG) ; `mail_campaigns` (bulk) ; **droper `mails`** |
| **Pièce justificative** | `documents` + liens polymorphes + FK directes | `documents` ; lien via FK directes typées (déprécier polymorphe) |
| **Engagement dépense** | `service_orders` / `budget_expenses` / `contracts` | `service_orders` (ponctuel) + `contracts` (récurrent) → `supplier_invoices` (rang 4) |
| **Échéances techniques** | `technical_documents.validity_date`, `contracts.end_date`, `insurance_policies` | vue unifiée d'alertes (à créer) |

---

## 7. Questions expert (rang 8)

1. **Extranet ALUR** (accès copropriétaires en ligne, obligation depuis 2020) : périmètre go-live ou différé si pas de copro réelle au lancement ? (`document_access` vide).
2. **Carnet d'entretien** : intégrer les références d'assurance dans `logbook_entries`, ou un lien vers `insurance_policies` suffit-il légalement ?
3. **Contrats à reconduction tacite** : génération auto d'OS récurrents attendue au go-live, ou création manuelle acceptable en V1 ?
4. **Table `mails`** (orpheline) : confirmer la suppression au profit de `ag_notifications` + `mail_campaigns` ?
5. **RGPD messagerie** : rétention/anonymisation/droit à l'oubli — go-live ou post-MVP ?
6. **DTG/PPT** : obligatoires pour les copros cibles (taille/âge) ? Niveau d'intégration avec budget travaux/ALUR ?
7. **Modules sociaux** (mur, messagerie, événements) : prioritaires au go-live ou secondaires vs cœur financier/légal ?

---

## 8. Vue d'ensemble & clôture de l'audit

### 8.1 Le rang 8 boucle les 3 thèmes récurrents
1. **Ponts d'alimentation cassés** (thème dominant) : OS → facture → écriture → carnet. `service_orders.supplier_invoice_id`, `supplier_invoices.document_id`, `ledger_transactions.source_id` **tous NULL à 100 %**. Même cause racine qu'au rang 4 (edge functions ledger non appelées) → ni charge, ni pièce, ni carnet ne se créent automatiquement.
2. **Source unique non respectée** : 3 systèmes de communication ; pièces liées tantôt en polymorphe, tantôt en FK directe.
3. **Intégrité/conformité** : RLS désactivé sur 18 tables communication (policies pourtant écrites) ; `document_access` vide (extranet ALUR) ; carnet d'entretien incomplet.

### 8.2 4e thème ajouté par le rang 8 : RÉTENTION / CONFORMITÉ DOCUMENTAIRE
Conservation 10 ans **déclarée** (triggers OK) mais **archivage non automatisé** ; extranet ALUR non implémenté ; RGPD messagerie absent. Non bloquant au go-live technique, mais **obligation légale** à planifier.

### 8.3 Ce qui est SAIN au rang 8 (à préserver)
La **GED est le sous-système le plus mature de l'app** : bucket privé, RLS par confidentialité, signed URLs sécurisées, 20 catégories légales, rétention calculée, protection anti-suppression, versioning, 56 dossiers système. **Ne pas refondre — câbler.**

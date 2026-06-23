# Grilling contexte v2 — journal de session (2026-06-24)

**But** : étoffer le cadrage v2 *avant* construction. Décisions prises au fil du grilling +
questions ouvertes à griller (alimentées par l'audit `audit-contexte-v2`). Document vivant.

> Boussole + décisions matures → à consolider dans `REFONTE_DECISIONS_2026-06-23.md` après la session.

## 🧭 Boussole (principe directeur transverse)

- **B0 — « Le plus simple qui reste conforme »** : simplicité par défaut (clean & simple, effort
  utilisateur minimal), **jamais au prix d'une obligation légale ou de la justesse comptable**.
  Dès qu'un raccourci casserait une règle de droit ou le grand livre, on garde le strict
  nécessaire pour rester conforme.

## 🏠 Structure & personnes du lot

- **S1 — Détention** : **un titulaire par lot** = nom d'une personne **OU** nom d'une société
  (personne morale). L'**indivision** se gère **dans le libellé** (« Indivision DURAND »), sans
  modéliser chaque indivisaire. Un compte, un payeur, un interlocuteur.
  *(Implique : tout titulaire a un contact email/adresse ; une société a un représentant.)*
- **S2 — Usufruit / nue-propriété** : **usufruitier = titulaire/payeur** ; **nu-propriétaire =
  champ optionnel** (nom + email) pour le convoquer aux **AG de gros travaux** (où il vote).
  Pas de séparation comptable courant/travaux automatique (réglé entre eux).
- **S3 — Occupant / locataire** : **optionnel, pour info seulement** (sinistres, urgences,
  affichage hall, accès parties communes). **Aucune gestion locative** (ni quittance ni charges
  récupérables — métier du bailleur, pas du syndic).
- **S4 — Lots & annexes** : **chaque lot juridique** = une entrée (numéro + type
  habitation/cave/parking/commerce + ses tantièmes) car l'état daté et les annexes l'exigent par
  lot. **Regroupés par propriétaire** à l'affichage et aux appels (un relevé, un appel agrégé).

## 📥 Onboarding & reprise de mandat (échelle cabinet)

- **S5 — Saisie clés/tantièmes** : **format Excel standardisé à remplir** (lots × clés × tantièmes),
  **stratégique pour onboarder un cabinet entier** (migration de portefeuille depuis l'ancien
  logiciel) + **saisie manuelle** possible. Clé générale par défaut, contrôle auto Σ tantièmes.
- **S6 — Périmètre de reprise (cabinet)** : on importe la **structure** (copros/lots/tantièmes/
  clés/personnes) **+ les soldes de départ** à la date de bascule (point de départ comptable
  par lot). **Historique passé non ré-importé** (AG closes, écritures antérieures → archive/PDF
  dans la GED). « Reprise de mandat » propre, industrialisée.

- **S7 — Mandat de syndic** : on modélise le **mandat** (dates début/fin, durée, **alerte de
  renouvellement** = remise en concurrence légale) **+ honoraires de base en forfait** annuel
  (alimente le budget, charge **621**). Prestations particulières (vacations) = optionnel / au
  fil de l'eau.

## 💰 Finance & structure des comptes

- **F1 — Comptes bancaires de la copro** (répond au trou T7) : **une fiche par compte bancaire**
  (IBAN/BIC, type **courant / travaux / livret**, solde), **plusieurs possibles** par copro, chacune
  **reliée à son compte comptable** (512.x / 502). Fin du « 512 » codé en dur. Pivot du paiement
  (choix du compte), du rapprochement bancaire, du RIB et du fonds travaux sur compte séparé.

## 🗺️ Planning / méta-arbitrages

- **PLAN-1 — Minimum légal dès la V1** : pour tout acte à valeur légale (convocation, état daté,
  mise en demeure…), on **remonte en V1 le strict minimum** des infos obligatoires dont dépend sa
  validité : **n° carte pro + signataire du syndic**, **consentement email horodaté** du
  copropriétaire (sinon envoi papier), mentions du mandat (S7). Le reste reste « plus tard ».
  *(Application directe de B0 ; répond aux trous transverses T1 et T10 de l'audit.)*
- **TECH-1 — PDF v2 = HTML→PDF** (confirme `REFONTE_DECISIONS` l.204/250, **déjà orienté**) :
  templates **HTML/CSS** → moteur **headless (type Chrome/Puppeteer)** en server function, pour
  rendu riche (tableaux comptables) + **white-label par cabinet** trivial. jsPDF (v1) abandonné en v2.

## ✅ Audit de contexte (retour)

- **Audit livré** : 147 trous / 18 domaines → `AUDIT_CONTEXTE_v2_2026-06-24.json` (brut) +
  `CARTOGRAPHIE_CONTEXTE_v2_2026-06-24.md` (lisible, en cours). Convergence : S1-S7 couvrent T1/T2/T3/T4.
- **Top bloquants restants à griller** : T7 compte bancaire (en cours) · T6 couche « engagé » ·
  T5 vue d'ancienneté unique · T12 régularisation multi-clés (vérif golden) · T11 doctrine états
  dérivés/événementiels · T8 seuil art.21 · T9 traçabilité des actes.
- **Angles morts** : stratégie PDF · numérotation continue des pièces · remboursement vers un
  copro · multi-bâtiment/ASL · transmission art.18-2 · perf des vues GL à l'échelle cabinet ·
  portabilité RGPD · recalcul d'appels après modificatif de tantièmes.

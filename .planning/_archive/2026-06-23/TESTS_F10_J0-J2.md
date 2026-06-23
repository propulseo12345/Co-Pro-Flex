# Checklist de test F10 — tranches J0 / J1 / J2 (à dérouler par Lyes)

> Environnement : app locale (`npm run dev` → http://localhost:3000) + Supabase locale (Docker démarré).
> Comptes démo (mdp `password123` pour les trois) :
> - `admin@coproflex.fr` (admin plateforme)
> - `gestionnaire@coproflex.fr` (gestionnaire)
> - `jean.dupont@email.fr` (copropriétaire)
> Copro de test : **22222222 « Le Clos Saint-Michel »** (boucle d'or — Portefeuille → cliquer).
> Rappel cadre : écarts connus +0,16 / −423 / +30 sur la boucle d'or = artefacts historiques attendus (G3), pas des bugs.

## 1. Parcours facture fournisseur (J0.3 + J2.8 — LE test prioritaire)

- [ ] **Saisie réelle** : Finance → Factures → « Nouvelle facture » (`/finance/factures/new`) → saisir une facture mono-poste (fournisseur à la volée OK) → elle persiste après refresh (plus de mock).
- [ ] **Brouillon → validation** : créer une facture **brouillon** depuis la liste → bouton « envoyer en compta » → le statut passe à validé **ET** une écriture apparaît au grand livre : **Débit 6xx (charge) / Crédit 401 (fournisseur)** pour le montant total. (Finance → Comptabilité → grand livre/journaux.)
- [ ] **Garde-fous validation** : tenter de valider un brouillon **sans ligne** → refus avec message (pas de validation silencieuse) ; re-valider une facture déjà validée → pas de double écriture (idempotent).
- [ ] **Paiement** : payer la facture validée → statut payé **ET** écriture **Débit 401 / Crédit 512 (banque)**. Limites connues (parkées, pas des bugs) : paiement = montant total uniquement, compte 512 générique.
- [ ] **Avoir** (J0.3) : fiche d'une facture validée → « créer un avoir » → total ou partiel (prorata) → le **net à payer** de la facture se réduit d'autant ; l'avoir n'apparaît PAS dans les KPIs « à payer »/retards.

## 2. Cloisonnement & sécurité (J1)

- [ ] **Copropriétaire ≠ gestionnaire** : connecté `jean.dupont@email.fr` → aucun accès aux écrans back-office (finance, factures, comptabilité…) ; pas de données d'une autre copro nulle part.
- [ ] **Messagerie/mur cloisonnés** : les messages créés par `gestionnaire@` n'apparaissent pas comme écrits par un autre compte (owner = session réelle, plus de owner_id en dur).
- [ ] *(info)* L'isolation **entre cabinets** (A ne voit jamais B, lecture + écriture + RPC) est prouvée par les gates SQL `gate_rls_multitenant_isolation` + `gate_rls_definer_guards` (CI bloquante) — le seed local n'a qu'un cabinet, donc pas testable à la main en l'état.

## 3. Tour des modules (J2 — un parcours type chacun, rapide)

- [ ] **Budget** : ouvrir le budget de l'exercice → lignes/totaux cohérents avec la compta.
- [ ] **AG** : ouvrir une AG existante → ordre du jour/résolutions s'affichent ; banque de résolutions éditable (Paramètres).
- [ ] **GED** : uploader un document → il apparaît dans sa catégorie, prévisualisation OK.
- [ ] **Maintenance** : créer/consulter un ordre de service → workflow de statuts visible.
- [ ] **Communication** : envoyer un message → visible côté destinataire.
- [ ] **Conseil syndical** : liste des membres + décisions s'affichent.
- [ ] **Dashboard** : KPIs (solde, impayés, AG à venir) non vides et plausibles vs compta.

## Si quelque chose cloche

Noter : page + action + attendu vs obtenu (+ capture). On triera bug réel / artefact connu / amélioration.

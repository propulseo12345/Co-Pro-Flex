# Session State — 2026-06-24 (PARTIE C : C.11 Communication P1-P3 cadrés)

## Branch / Commit
`refonte-v2-cadrage` @ `f35da48` (dirty: 2 fichiers — `REFONTE_DECISIONS_2026-06-23.md` + `HYGIENE_REPO` antérieur). **Non commité, non poussé.**

## Completed This Session
- **C.11 Communication, 3 PARTIAL cadrés** (lot `G24-C11-P`, dans `REFONTE_DECISIONS_2026-06-23.md`) :
  - **P1** — preuve d'envoi : 3 horodatages distincts (`sent_at` app / `proof_deposited_at`+`proof_provider` LRE qualifié / `delivered_at`), alimentés par API+webhook prestataire, jamais inventés ; délai 21 j francs = `coalesce(proof_deposited_at, sent_at)` via horloge métier.
  - **P2** — tracking **fournisseur-agnostique** : couple `provider`+`provider_message_id`, table unique `delivery_events`, 1 adaptateur/prestataire. **⚠️ Prestataire V1 = Brevo (remplace « Resend câblé » de D41).**
  - **P3** — opt-out RGPD : séparer canal (routage) / consentement ; **1 drapeau global `accepts_optional_comms` par personne** ; légal jamais désinscriptible ; extensible par-catégorie en P1.
- Registre `CHANTIERS.md` mis à jour.

## Next Task
- Reprendre **C.11-P4** (idempotence & reprise des envois en masse — anti double-convocation, clé d'idempotence calquée D32), puis **P5** (source unique des destinataires) et **P6** (modération du mur : soft-delete auditable). Puis C.12→C.17.
- Cadence : 1 question, vérif base réelle, ma reco + `AskUserQuestion`.
- Effort conseillé : `Max`.

## Blockers
- None.

## Key Context
- Tour de contrôle = `CHANTIERS.md`. Triage des trous = `TRIAGE_PARTIE_C_2026-06-24.md` (PARTIAL C.11 = lignes 260-267).
- ⚠️ **2 fichiers dirty non commités** — penser à `git add` + commit + push (`gh auth switch lyestriki-29`) avant ou en début de prochaine session.
- Backlog inchangé : compte 718, annexe 6, GED unifiée, `MEMORY.md` > limite à compacter.

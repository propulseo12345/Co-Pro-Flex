# Spec — Réparation du cycle de clôture / finalisation d'AG (chantier #2)

> Date : 2026-06-09 · Branche : `finance-drift-rebranchement`
> Contexte : 2ᵉ des 3 chantiers (Seed E2E ✅ fait · **Clôture d'AG** · Bibliothèque de résolutions).
> Décor de test (chantier #1) en place sur la copro harness `5d3ed408` (« Le Clos Saint-Michel démo »).

## 1. Objectif (en clair)

Une assemblée générale (AG) suit un cycle : on tient la séance, on vote, on lève la
séance, on applique les décisions, on rédige et signe le procès-verbal (PV), puis l'AG
est « classée ». Aujourd'hui **la fin de ce cycle est cassée à plusieurs endroits** :
des boutons appellent des fonctions qui n'existent pas en base, il y a un doublon inutile,
et une AG ne peut jamais atteindre l'état « finalisée ».

But du chantier : **remettre un seul chemin propre, réparer ce qui est cassé, et supprimer
le code mort** — sans créer de bug en cascade, et avec une preuve empirique à chaque étape.

## 2. État actuel constaté (vérifié en base)

### Le chemin qui marche aujourd'hui
`session_active` → (page Clôture) → `closed` → (page PV : `activate_ag_decisions`) → `pv_signed`.
L'état **`finalized` est inatteignable**.

### Ce qui est cassé : 4 fonctions appelées par l'appli mais absentes en base (erreur 42883)
| Écran / bouton | Fonction appelée | Statut |
|---|---|---|
| Bouton « Terminer l'AG » (page Session) | `finish_ag_session` | absente |
| Page Finalisation (chargement) | `get_ag_pending_actions` | absente |
| Activation manuelle d'une décision | `mark_ag_action_activated` | absente |
| Génération d'appels combinés | `generate_combined_calls_from_ag` | absente |

### Doublon mort
`rpc_finalize_ag_session` = copie quasi conforme de `close_ag`, **zéro appelant**.

### Ce qui existe et fonctionne
`close_ag` (+ edge `ag_close`), `prepare_ag_decisions`, `activate_ag_decisions`,
`generate_calls_from_ag_payload`, `archive_ag`.

### Risque de double exécution comptable
**Aucun.** Le canal manuel est mort (fonction absente) et `activate_ag_decisions` est
idempotent (il ne traite que les décisions en attente, et les unicités métier protègent
le grand livre).

## 3. Décisions prises (avec l'utilisateur)

1. **Activation des décisions** : reste à l'étape PV (statu quo) → l'AG passe en `pv_signed`.
2. **Page Finalisation** : reconstruite en **page de revue lecture seule** + un bouton « Finaliser ».
3. **Clôture** : passe exclusivement par `close_ag` (on supprime l'UPDATE direct).
4. **Finalisation autorisée** uniquement depuis `pv_signed` ou `pv_sent` (PV signé) — le plus rigoureux.
5. **Étiquettes (enum `ag_status`)** : on **garde les 10 valeurs** (ne pas recréer le type),
   on **documente**, on **corrige l'incohérence TS** (le type front a 9 valeurs, il manque `archived`),
   et on **branche `archive_ag`** (l'état « archivée » existe mais aucun bouton n'y mène).

## 4. Le cycle canonique cible

```
draft → convoked → session_active → closed → pv_generated → pv_signed → [finalized] → archived
        (front)      (start_ag)    (close_ag)   (front)        (front)    (finalize_ag) (archive_ag)
                                       │                          │
                                       │              [PV] activate_ag_decisions
                                       │              (crée budgets/appels/conseil, poste le GL)
                                  fige les votes
```

- `closed` : posé **uniquement par `close_ag`** (qui fige aussi les votes non figés). On retire l'UPDATE direct.
- Activation : **inchangée**, à l'étape PV via `activate_ag_decisions` (tout-ou-rien, idempotent).
- `pv_generated` / `pv_signed` / `pv_sent` : posés par le front (UPDATE direct, tolérés — transitions de gestion sans impact comptable).
- `finalized` : posé par la **nouvelle fonction `finalize_ag`** (remplace l'UPDATE direct `markAgFinalized`).
- `archived` : posé par `archive_ag` (fonction existante, à brancher côté appli).

## 5. Les 2 fonctions à créer

### `get_ag_pending_actions(p_ag_id uuid)` — lecture seule
- `LANGUAGE sql STABLE SECURITY DEFINER` ; garde `user_has_copro_access` (re-requête du `copro_id`).
- Renvoie **toutes** les décisions de l'AG (jointure `ag_pending_actions × ag_resolutions` pour le titre + variables).
- Rappels de schéma vérifiés : `ag_pending_actions.status` est un **TEXT** (`pending`/`activated`/`failed`),
  `action_type` est l'enum `ag_action_type` ; colonnes : `id, ag_id, resolution_id, action_type, target_table,
  target_id, payload, status, error_message, activated_at, result_data, created_at` (**pas d'`updated_at`**).
- Pas de garde « gestionnaire » (simple lecture).

### `finalize_ag(p_ag_id uuid)` — écriture
- `LANGUAGE plpgsql SECURITY DEFINER`. Gardes :
  - `23503` si l'AG est introuvable ;
  - `42501` si l'appelant n'est ni gestionnaire (`user_is_copro_manager`) ni appel service (`is_service_call`) ;
  - `23514` si `status NOT IN ('pv_signed','pv_sent')` ;
  - `23514` s'il existe une décision de l'AG dont `status <> 'activated'` ;
  - **idempotent** si déjà `finalized`.
- Action : `UPDATE ag_meetings SET status='finalized'`.
- **Ne rappelle JAMAIS `activate_ag_decisions`** (déjà fait à l'étape PV) → évite le rejet d'immuabilité du grand livre.

## 6. Dépollution (le vrai ménage du code)

| # | Cible | Action | Risque |
|---|---|---|---|
| 1 | `rpc_finalize_ag_session` | supprimer (DROP, nouvelle migration) | faible |
| 2 | `ClosureRecap.tsx` handleClose (UPDATE direct `closed`) | recâbler → `prepare_ag_decisions` puis `closeAg` (ordre strict) | moyen |
| 3 | `finishAgSession` (useAgSessionPage:465/472/617 + wrapper meetings.api:154-165 + index.ts:13) | recâbler → `closeAg`, puis supprimer wrapper + type fantôme | moyen |
| 4 | `loadPendingActions` (finalisation.api:28-33) | recâbler sur la nouvelle `get_ag_pending_actions` | moyen |
| 5 | `markAgFinalized` (UPDATE direct, finalisation.api:279-292) | remplacer par `finalize_ag` | moyen |
| 6 | Page Finalisation (page.tsx + useFinalisationPage + Bloc*) | reconstruire en revue lecture seule + bouton Finaliser | élevé |
| 7 | Wrappers fantômes `generateCombinedCallsFromAg` / `markActionActivated` + types fantômes (supabase.ts) | supprimer | faible |
| 8 | Enum `ag_status` | `COMMENT ON TYPE` + ajouter `archived` au type TS (regen) + brancher `archive_ag` | faible |

## 7. Risques de cascade & neutralisation

| Point chaud | Neutralisation |
|---|---|
| Garde `archive_ag` exige `pv_*`/`finalized` | on **ne recrée pas** l'enum (on garde toutes les valeurs) |
| Immuabilité du grand livre (décisions déjà postées) | `finalize_ag` ne relance **jamais** l'activation |
| Ordre `prepare` → `close` (sinon décisions vides) | séquencement strict imposé dans le recâblage de la clôture |
| Équilibre du grand livre (contrôle différé au commit) | activation déjà tout-ou-rien, inchangée |
| Incohérence type TS (9 valeurs) vs base (10) | corrigée avant de brancher `archive_ag` |

**Méthode de preuve** : chaque tranche est testée sur la copro harness jetable
(`create_test_copro_seeded`) **avant** tout commit (re-run / `ON DELETE` empiriques),
+ `tsc --noEmit` + vitest verts.

## 8. Ordre d'implémentation (tranches verticales testables)

- **T0** — `DROP rpc_finalize_ag_session`. Test : fonction absente, vitest finance + boucle d'or inchangés, edge `ag_close` appelle toujours `close_ag`.
- **T1** — Clôture : recâbler `ClosureRecap` (`prepare_ag_decisions` puis `closeAg`) + les 3 `finishAgSession` → `closeAg` ; supprimer le wrapper + type fantôme. Test bout en bout sur harness : `session_active` → clôture → `closed`, votes figés, décisions matérialisées, plus de 42883.
- **T2** — Créer `get_ag_pending_actions` (lecture), recâbler `loadPendingActions`. Test : SELECT renvoie les décisions ; appel anonyme = refusé.
- **T3** — Créer `finalize_ag` (gardes statut + toutes activées + idempotence). Test : `pv_signed` + tout activé → `finalized` ; une décision en attente → refus ; re-run → no-op ; non-gestionnaire → refus.
- **T4** — Reconstruire la page Finalisation en revue lecture seule + bouton Finaliser (`finalize_ag`). Test : page charge, bouton marche, plus aucun 42883.
- **T5** — Brancher `archive_ag` (bouton sur AG finalisée) + corriger le type TS (`archived`, regen). Test : `archive_ag` → `archived`, badge affiché.
- **T6** — Nettoyage final : supprimer types/wrappers fantômes résiduels, `COMMENT ON TYPE ag_status`, MAJ CLAUDE.md (cycle AG canonique). Test : `tsc --noEmit` + vitest verts, `grep` des **3 fonctions fantômes restantes** (`finish_ag_session`, `mark_ag_action_activated`, `generate_combined_calls_from_ag`) = 0. (`get_ag_pending_actions` n'est pas fantôme : elle est créée en T2.)

## 9. Hors périmètre / différé

- **Retrait effectif d'étiquettes** (recréer le type enum pour enlever `in_progress`) : non planifié
  (coût migration pour un bénéfice quasi nul ; aucune donnée ne porte ces valeurs).
- **Plier la pose de `pv_generated`/`pv_signed`/`pv_sent` dans des RPC** (au lieu d'UPDATE directs) :
  toléré pour l'instant (transitions de gestion sans impact comptable).
- **Déclencheur métier d'`archive_ag`** (bouton manuel vs automatique après X mois) : bouton manuel gestionnaire par défaut, à affiner.

## 10. Critères de « terminé »

- Plus aucune fonction fantôme appelée : `grep` = 0 sur `finish_ag_session`, `mark_ag_action_activated`, `generate_combined_calls_from_ag` (et `get_ag_pending_actions` résout désormais vers une vraie fonction).
- Une AG peut aller proprement de `session_active` à `finalized` puis `archived`, chaque transition par une fonction à gardes (ou un UPDATE de gestion toléré pour le PV).
- `tsc --noEmit` + vitest verts ; boucle d'or (`22222222`) et seed E2E inchangés.
- Preuve empirique sur la copro harness pour chaque tranche touchant la base.

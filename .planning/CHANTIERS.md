# CHANTIERS — Tour de contrôle CoProFlex v2

> **But** : ne plus jamais perdre un chantier commencé puis oublié quand on change d'angle.
> **À consulter en début de session** (`/token-saver start`) et **à mettre à jour dès qu'un chantier change d'état**.
> Règle : un chantier qui passe en `📐 design validé` ou `⏸️ parké` SANS prochaine action datée est un signal d'alerte — soit on le relance, soit on l'archive explicitement.

## Légende statuts
- 💡 **Idée** — évoquée, pas encore cadrée.
- 📐 **Design validé** — brainstorming/spec faits, **pas encore implémenté** (zone de risque d'oubli n°1).
- 🚧 **En cours** — implémentation/cadrage actif.
- ⏸️ **Parké** — commencé puis arrêté (à relancer ou archiver — **ne pas laisser pourrir**).
- ✅ **Livré** — fini + vérifié (DoD).
- 🗄️ **Archivé** — abandonné volontairement (garder la trace pour ne pas re-proposer).

---

## Chantiers actifs / en attente

| Chantier | Statut | Dernière activité | Prochaine action | Réf |
|---|---|---|---|---|
| **Grilling cadrage PARTIE C** (PARTIAL résiduels) | 🚧 En cours | 2026-06-24 : C.6 ✅, C.7 ✅, C.9 en cours (P1-P3 faits) | Finir C.9 (P4 Chatel, P5 statuts OS) puis C.10→C.17 + PARTIAL restants | `TRIAGE_PARTIE_C_2026-06-24.md` · `REFONTE_DECISIONS_2026-06-23.md` |
| **GLOSS- Glossaires v2** (métier + technique) | 🚧 Contenu créé | 2026-06-24 : `CONTEXT.md` + `glossaire-technique.md` créés, imports CLAUDE.md + règle rules-v2.md + methodo câblés | **PR + push** (seul reste de la DoD) | `docs/superpowers/specs/2026-06-24-glossaires-v2-design.md` |
| **Anti-fragmentation du code** (modules profonds, deletion test) | 💡 Idée | 2026-06-24 : noté hors-scope du glossaire | brainstorming → spec dédiée | spec glossaire §8.1 |
| **Capitaliser les 5 principes de conception** dans `methodo-coproflex` | 💡 Idée | 2026-06-24 : noté hors-scope du glossaire | brainstorming → spec dédiée | spec glossaire §8.2 |
| **Golden exhaustif « Domaine des Tilleuls »** (tests) | 📐 Design validé | grilling 2026-06-22 : plan + valeurs attendues | EN ATTENTE GO USER pour dérouler | `.planning/tests/PLAN_GOLDEN_EXHAUSTIF.md` |
| **Portail copropriétaire** (8 pages, server-first) | 📐 Design validé | 2026-06-10 : design validé, zéro implémentation | `/writing-plans` session dédiée | `docs/superpowers/specs/2026-06-10-portail-coproprietaire-design.md` |
| **Refonte UI/UX manager-first** + espaces copro/CS | 💡 Idée (direction) | direction posée | brainstorming → frontend-design (stack réelle CSS Modules) | mémoire `ui_ux_refonte_direction` |
| **Migration TanStack Start** (`v2-tanstack/`) | 🚧 En cours | from-scratch en cours, moteur=parité | dérouler features par catégorie + ordre de dépendance | `REFONTE_CARTOGRAPHIE/CHAINES/VERIFICATIONS_2026-06-22.md` |

---

## Actions techniques repérées au fil du grilling (backlog build)
> Petites actions concrètes découvertes pendant le cadrage, à ne pas perdre (≠ chantiers).

- **Chart** : ajouter le compte `718` « Produits exceptionnels » (absent du seed) + vérifier `677` (dans la règle `charge_nature` 0059 mais absent du seed). *(C.7-P5, 2026-06-24)*
- **Annexe 6** : implémenter la liste individualisée des copropriétaires au format légal 7 colonnes. *(C.7-P1, 2026-06-24)*
- **RPC à créer** : `record_legal_proceeding` (table `legal_proceedings` sans fonction d'écriture). *(C.5-P3)*
- **Mémoire** : `MEMORY.md` dépasse la limite (25,1 KB > 24,4 KB) → compacter (1 ligne/entrée, fusionner/élaguer les entrées périmées). *(2026-06-24)*

---

## Journal des changements d'état
- **2026-06-24** : création du registre. Chantier GLOSS- : contenu créé + câblé (reste PR+push). Grilling PARTIE C : C.6 + C.7 cadrés, C.9 en cours (P1-P3 faits).

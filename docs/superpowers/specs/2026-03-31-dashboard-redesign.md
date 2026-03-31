# Dashboard Redesign — Action Board

**Date** : 2026-03-31
**Preview de référence** : `.planning/previews/dashboard-v3-action.html`
**Direction validée** : Bento Action Board — chaque bloc est un launchpad avec actions intégrées.

---

## 1. Utilisateurs cibles

- **Syndic professionnel** : cockpit opérationnel quotidien (alertes, actions, suivi)
- **Conseil syndical / président** : vue stratégique (santé financière, budget, AG)

## 2. Principes UX

- **Bento grid** : blocs de tailles variées créant un rythme visuel
- **Action-oriented** : chaque bloc embarque au minimum un CTA
- **Contexte riche** : pas juste "12 avril" mais "AG ordinaire · 14 résolutions · dans 12 jours"
- **Priorités visuelles** : couleurs + barres latérales + badges deadline (pas d'emojis)
- **Zéro graphique** : que du texte, des chiffres, des badges, des listes, des boutons
- **Progressive disclosure** : résumé en dashboard, détail au clic

## 3. Layout

### Top Bar

- Background : `#161822`, border-radius 12px, border subtle
- Gauche : "Dashboard" (24px/700) + "Résidence Les Lilas · Exercice 2026" (14px, `#94a3b8`)
- Droite : boutons pill rapides — "Créer ODS" (primary), "Appel de fonds" (ghost), "Nouvelle facture" (ghost)

### Grille Bento

- 4 colonnes, gap 16px
- Responsive : 2 colonnes < 1200px, 1 colonne < 768px

## 4. Blocs

### Bloc 1 — Trésorerie (span 2 cols)

- Layout flex horizontal : infos à gauche, actions à droite
- Label : "TRÉSORERIE" (10px uppercase `#64748b`)
- Valeur : "847 291 €" (32px bold `#22c55e`, monospace tabular-nums)
- Détail : "Compte courant 612 450 € · Fonds travaux 234 841 €" (13px `#94a3b8`)
- Actions : "Voir les comptes" (ghost) + "Rapprocher" (ghost)

### Bloc 2 — Prochaine AG (span 1)

- Label : "PROCHAINE AG"
- Valeur : "12 avril 2026" (22px bold `#e2e8f0`)
- Contexte : "AG ordinaire · 14 résolutions" (13px `#94a3b8`)
- Badge countdown : "dans 12 jours" (pill, bg `rgba(59,130,246,0.1)`, text `#60a5fa`)
- Action : "Préparer l'AG" (primary blue, pleine largeur)

### Bloc 3 — Budget (span 1)

- Label : "BUDGET 2026"
- Valeur : "68 %" (28px bold `#3b82f6`)
- Barre de progression : 4px hauteur, arrondie, fill `#3b82f6` à 68%
- Détail : "184 500 € consommés sur 271 320 €" (12px `#94a3b8`)
- Action : "Voir le budget" (ghost, pleine largeur)

### Bloc 4 — Ordres de Service (span 2)

- Label : "ORDRES DE SERVICE" + badge "7 ouverts"
- 3 mini-cards (bg `#131620`, radius 8px, padding 12px 16px) :
  1. Dot rouge + "2 urgents" + noms + lien "Traiter →" (rouge)
  2. Dot bleu + "3 en cours" + noms + lien "Suivre →" (bleu)
  3. Dot gris + "2 programmés" + noms + lien "Planifier →" (gris)
- Action : "Créer un ordre de service" (primary blue, pleine largeur)

### Bloc 5 — Priorités (span 2)

- Label : "À TRAITER MAINTENANT"
- 5 items en mini-cards (bg `#131620`, radius 8px, margin-bottom 8px) :
  - Barre colorée latérale (3px, couleur par sévérité)
  - Nom tâche (14px `#e2e8f0`) + ligne contexte (12px `#64748b`)
  - Badge deadline + bouton outline coloré
- Items de référence :
  1. Rouge | "Relance impayés lot 3B" / contexte / "J+92" / bouton "Relancer"
  2. Rouge | "Fuite toiture bât. C" / contexte / "Urgent" / bouton "Créer ODS"
  3. Orange | "Voter devis ravalement" / contexte / "AG 12/04" / bouton "Comparer"
  4. Orange | "Contrat ascenseur" / contexte / "15/04" / bouton "Renouveler"
  5. Bleu | "Appel de fonds T2" / contexte / "01/04" / bouton "Préparer"

### Bloc 6 — Activité récente (span 2)

- Label : "ACTIVITÉ RÉCENTE" + lien "Tout voir →"
- 6 items : dot coloré + description (13px) + temps relatif à droite (12px `#64748b`)
- Hover : bg `rgba(148,163,184,0.03)`

## 5. Design tokens

### Couleurs (dark mode uniquement)

| Token | Valeur | Usage |
|-------|--------|-------|
| Background | `#0f1117` | Fond de page |
| Card bg | `#1a1d2e` | Blocs bento |
| Mini-card bg | `#131620` | Sous-blocs imbriqués |
| Top bar bg | `#161822` | En-tête |
| Border | `rgba(148,163,184,0.08)` | Borders principales |
| Text main | `#e2e8f0` | Texte principal |
| Text secondary | `#94a3b8` | Sous-titres |
| Text tertiary | `#64748b` | Labels, timestamps |
| Primary | `#3b82f6` | CTA, accents |
| Success | `#22c55e` | Montants positifs |
| Danger | `#ef4444` | Urgences, retards |
| Warning | `#f59e0b` | Alertes, attention |

### Typographie

| Contexte | Taille | Poids | Détail |
|----------|--------|-------|--------|
| Labels | 10px | 600 | UPPERCASE, letter-spacing 0.5px |
| Badges | 11px | 500-600 | Pill, border-radius 8px |
| Body | 13px | 500 | Contenu courant |
| KPI value | 28-32px | 700 | Monospace, tabular-nums |
| Titre page | 24px | 700 | Top bar |

### Boutons

| Type | Style |
|------|-------|
| Primary | bg `#3b82f6`, white, radius 8px |
| Ghost | bg `rgba(148,163,184,0.06)`, `#94a3b8`, border subtle |
| Outline colored | transparent, border 1px solid [color], text [color] |
| Pill (top bar) | border-radius 20px, padding 8px 16px |

### Interactions

- Hover cards : border-color → `rgba(148,163,184,0.15)`
- Hover buttons primary : bg `#2563eb`, translateY(-1px), shadow bleue
- Hover outline : bg `rgba(color, 0.1)`
- Hover activity items : bg `rgba(148,163,184,0.03)`

## 6. Responsive

| Breakpoint | Colonnes | Adaptation |
|------------|----------|------------|
| > 1200px | 4 colonnes | Layout complet |
| 768–1200px | 2 colonnes | Spans réduits à 2 max |
| < 768px | 1 colonne | Tout empilé |

## 7. Données

### KPIs affichés

1. Trésorerie (solde global, CC, FT)
2. Prochaine AG (date, type, résolutions, délai)
3. Budget (% consommé, montants)
4. Ordres de service (ouverts, par statut)
5. Priorités (tâches à traiter, par sévérité)
6. Activité récente (derniers événements)

### KPIs explicitement exclus

- Impayés (pas en KPI principal)
- Contrats (pas sur le dashboard)
- Multi-copropriété (pas dans cette version)

## 8. Composants à créer / modifier

| Composant | Action | Fichier |
|-----------|--------|---------|
| DashboardPage | Réécrire | `src/app/(dashboard)/dashboard/page.tsx` |
| dashboard.module.css | Réécrire | `src/app/(dashboard)/dashboard/dashboard.module.css` |
| DashboardHeader → TopBar | Réécrire | `src/features/dashboard/main/components/` |
| KpiCards → BentoGrid | Remplacer | Nouveaux blocs bento |
| PrioritiesSection | Refondre | Nouveau design mini-cards |
| ActivitySection | Refondre | Nouveau design avec dots |
| QuickActionsSection | Supprimer | Intégré dans la TopBar |
| DashboardStates | Garder | Loading/Error/Empty (adapter skeleton) |

## 9. Hors scope

- Charts / graphiques
- Multi-copropriété (vue d'ensemble)
- Personnalisation drag-and-drop
- Command palette (Cmd+K)
- Notifications center
- AI insights

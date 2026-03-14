# Wizard — Nouvel appel de fonds ponctuel

**Date :** 2026-03-14
**Statut :** Design validé
**Module :** Finance > Appels de fonds

---

## 1. Objectif

Permettre aux syndics de créer des appels de fonds supplémentaires ponctuels depuis la page appels de fonds, via un wizard en modale multi-étapes. Deux cas d'usage :

- **Appel exceptionnel** : dépense imprévue, non rattachée à un budget voté en AG (fuite, sinistre, urgence).
- **Complément budget** : appel supplémentaire sur un budget existant (courant ou travaux) déjà voté.

## 2. Contraintes

- Répartition exclusivement via clés de répartition existantes (pas de montants manuels par lot).
- Appel créé en **brouillon** — émission manuelle séparée.
- Échéancier : paiement unique ou multiple (2-4 appels étalés).
- Étape récapitulatif obligatoire avant validation.
- Le champ `callType` ('exceptional' vs 'complement') n'est pas persisté en DB — il sert uniquement à conditionner l'affichage du champ `budget_id`. Un appel exceptionnel a `budget_id = null`, un complément a `budget_id` renseigné.
- Le champ "Motif / Description" (étape 1) n'a pas de colonne en DB. Il est affiché dans le récap uniquement. **Migration requise** : ajouter `description TEXT NULL` à `call_for_funds` et mettre à jour le payload de l'Edge Function `generate_call_for_funds`.
- **Exercice courant** : le wizard utilise le `selectedPeriod` déjà sélectionné sur la page appels de fonds (passé en prop). Si aucun exercice n'est sélectionné, le bouton "Générer les appels" est désactivé.

## 3. Architecture UX

### Déclenchement

Le bouton "Générer les appels" sur la page `/finance/appels-fonds` ouvre la modale.

### Structure modale

- **Overlay** sombre semi-transparent
- **Modale** centrée, largeur ~700px, max-height 85vh, corps scrollable
- **Header fixe** : titre "Nouvel appel de fonds" + bouton fermer (X)
- **Stepper horizontal** : 4 pastilles numérotées avec labels — Type · Montant · Échéancier · Récap
- **Corps** : contenu de l'étape courante
- **Footer fixe** : boutons "Précédent" / "Suivant" (ou "Créer en brouillon" à l'étape 4)

Navigation linéaire (pas de saut entre étapes). Bouton "Suivant" désactivé tant que la validation de l'étape n'est pas satisfaite.

## 4. Étapes du wizard

### Étape 1 — Type & Contexte

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Type d'appel | 2 cartes radio | Oui | "Exceptionnel" (icône AlertTriangle, sous-texte "Dépense imprévue, hors budget voté") / "Complément budget" (icône FileText, sous-texte "Complément sur un budget existant") |
| Budget rattaché | Dropdown | Oui si complément | Visible uniquement si type = "Complément budget". Liste des budgets de l'exercice sélectionné (courant + travaux). Affiche : nom + montant voté. |
| Libellé | Input texte | Oui | Max 100 caractères. Placeholder : "Ex: Réparation fuite toiture" |
| Motif / Description | Textarea | Non | 2-3 lignes. Placeholder : "Contexte ou justification de l'appel" |

**Validation Suivant :** type sélectionné + (si complément → budget sélectionné) + libellé non vide.

### Étape 2 — Montant & Clé de répartition

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Montant total | Input numérique + suffixe "€" | Oui | > 0, formatage séparateur milliers |
| Clé de répartition | Dropdown | Oui | Clés actives de la copro. Chaque option : nom + nb lots (ex: "Charges générales — 12 lots"). **Source** : `listRepartitionKeys` de `@/lib/lots/api.ts` (retourne `RepartitionKeyWithTotals` avec `total_weight`, `lots_count`, `is_complete`), pas celle de `@/lib/finance/api.ts` qui ne retourne que `{id, name}`. |

**Aperçu clé** (affiché dès sélection) — encart info :
- Nombre de lots concernés
- Total tantièmes de la clé
- Montant min / max par lot (calculé en live : `montant × lot_weight / total_weight`)

**Validation Suivant :** montant > 0 + clé sélectionnée.

### Étape 3 — Échéancier

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Mode de paiement | 2 cartes radio | Oui | "Paiement unique" (icône Calendar) / "Échéancier multiple" (icône CalendarRange) |

**Si paiement unique :**
- Date d'échéance : date picker, défaut = aujourd'hui + 30 jours.

**Si échéancier multiple :**
- Nombre d'appels : selector 2 / 3 / 4 (boutons radio inline).
- Tableau des échéances éditables :

| # | Date échéance | Montant | % |
|---|---------------|---------|---|
| 1 | date picker | input € | calculé |
| 2 | date picker | input € | calculé |

Défaut : répartition équitable (montant / nb appels), dates espacées de 30 jours à partir de J+30. Montants ajustables manuellement. Indicateur vert/rouge en temps réel sur la somme.

**Validation Suivant :** date(s) renseignée(s) + si multiple : somme = montant total (±1 centime) + dates strictement croissantes (date1 < date2 < date3...).

### Étape 4 — Récapitulatif

**Bloc 1 — Résumé de l'appel :**
- Type (badge "Exceptionnel" ou "Complément budget — {nom}")
- Libellé
- Montant total
- Clé de répartition
- Échéancier (ex: "3 appels : 01/05, 01/06, 01/07")
- Motif (si renseigné, texte secondaire)

**Bloc 2 — Ventilation par lot :**

| Lot | Tantièmes | Quote-part | Montant dû |
|-----|-----------|------------|------------|
| A01 | 150/1029 | 14.58 % | 1 822 € |
| B03 | 85/1029 | 8.26 % | 1 033 € |

Footer : ligne total en gras. Si > 10 lots, hauteur fixe avec scroll.

> **Note :** La colonne "Propriétaire" n'est pas affichée dans le récap car `RepartitionKeyLineDetailed` ne contient pas le nom du propriétaire (le join ownership n'est pas dans `v_repartition_key_lines_detailed`). Le lot ref suffit pour identifier. Si le nom est nécessaire ultérieurement, une query parallèle sur `v_lots_with_owners` sera ajoutée.

**Bloc 3 — Avertissement** (si échéancier multiple) :
Encart info bleu : "X appels en brouillon seront créés. Vous pourrez les émettre individuellement depuis la page détail."

**Action :** Bouton "Créer en brouillon" (primary).

## 5. Comportement post-création

1. Modale se ferme.
2. La page appels de fonds se rafraîchit (invalidation query React Query).
3. Toast de confirmation : "Appel créé en brouillon".

## 6. Architecture technique

### Composants (nouveaux)

```
src/features/finance/appels-fonds/
├── components/
│   └── CreateCallWizard/
│       ├── CreateCallWizard.tsx          # Modale orchestrateur
│       ├── CreateCallWizard.module.css   # Styles
│       ├── StepType.tsx                  # Étape 1
│       ├── StepAmount.tsx                # Étape 2
│       ├── StepSchedule.tsx              # Étape 3
│       ├── StepRecap.tsx                 # Étape 4
│       └── index.ts
```

### Hook

```
src/features/finance/appels-fonds/
├── hooks/
│   └── useCreateCallWizard.ts     # État du wizard, validation, soumission
```

### State du wizard (hook)

```typescript
interface WizardState {
  step: 1 | 2 | 3 | 4;

  // Étape 1
  callType: 'exceptional' | 'complement' | null;
  budgetId: string | null;
  label: string;
  description: string;

  // Étape 2
  totalAmount: number;
  repartitionKeyId: string | null;

  // Étape 3
  scheduleMode: 'single' | 'multiple' | null;
  singleDueDate: string;                          // ISO date
  installments: { dueDate: string; amount: number }[];
  installmentCount: 2 | 3 | 4;
}
```

### Données requises (queries)

- **Budgets de l'exercice** : `listBudgets(coproId, periodId)` — déjà existant.
- **Clés de répartition** : `listRepartitionKeys(coproId)` de **`@/lib/lots/api.ts`** (retourne `RepartitionKeyWithTotals` avec `total_weight`, `lots_count`). Ne pas utiliser celle de `@/lib/finance/api.ts` qui ne retourne que `{id, name}`.
- **Lignes de la clé sélectionnée** : `listRepartitionKeyLines(coproId, keyId)` de `@/lib/lots/api.ts`. Retourne `RepartitionKeyLineDetailed` avec `lot_ref`, `weight`, `share_pct`. Nécessaire pour le calcul de la ventilation (aperçu étape 2 + tableau récap étape 4).

### Soumission

Appelle `createCall()` (Edge Function `generate_call_for_funds`) pour chaque échéance :
- **Paiement unique** → 1 appel à `createCall`.
- **Échéancier multiple** → N appels à `createCall` (séquentiels, label suffixé " — 1/N", " — 2/N"...).

> **UNIQUE constraint** : `call_for_funds` a un UNIQUE sur `(copro_id, period_id, label, issue_date)`. Pour les multi-échéances, c'est le **suffixe dans le label** qui garantit l'unicité (ex: "Réparation fuite — 1/3", "Réparation fuite — 2/3"). Le `issue_date` est identique (today) pour tous les appels du batch. Si le label saisi par l'utilisateur + suffixe existe déjà, l'Edge Function renverra une erreur de doublon — le toast affichera "Un appel avec ce libellé existe déjà".

Payload par appel :
```typescript
{
  copro_id: string;
  period_id: string;              // exercice sélectionné sur la page
  repartition_key_id: string;
  label: string;                  // + suffixe " — i/N" si multiple
  trimester: null;                // pas de trimestre pour ponctuel
  issue_date: today;              // date de création
  due_date: string;               // date d'échéance de cet appel
  total_amount: number;           // montant de cet appel
  budget_id: string | null;       // si complément, sinon null
  description: string | null;     // motif (après migration DB)
}
```

### Invalidation post-création

```typescript
queryClient.invalidateQueries({ queryKey: ['calls'] });
queryClient.invalidateQueries({ queryKey: ['call-campaigns'] });
```

## 7. Edge cases

- **Aucune clé active** : message d'information dans le dropdown, bouton Suivant désactivé.
- **Aucun budget pour l'exercice** : si type "Complément", dropdown vide avec message. L'utilisateur peut revenir et choisir "Exceptionnel".
- **Montant avec centimes** : le calcul de ventilation par lot peut produire des arrondis. Le dernier lot reçoit le delta (ajustement centime).
- **Fermeture modale** : confirmation si des données ont été saisies ("Annuler la création ?").
- **Erreur réseau** : toast d'erreur, la modale reste ouverte, bouton réactivé.
- **Échéancier multiple — création partielle** : si un appel sur N échoue, les appels déjà créés restent en brouillon. Toast d'erreur mentionnant le nombre créés/échoués.
- **Dates d'échéance non croissantes** : validation bloque le passage à l'étape suivante si les dates ne sont pas strictement croissantes.
- **Doublon de label** : si l'Edge Function retourne une erreur UNIQUE constraint, afficher "Un appel avec ce libellé existe déjà pour cet exercice".
- **Pas d'exercice sélectionné** : le bouton "Générer les appels" est désactivé si aucun exercice n'est sélectionné sur la page.

## 8. Migration DB requise

```sql
ALTER TABLE call_for_funds ADD COLUMN description TEXT NULL;
```

Mettre à jour l'Edge Function `generate_call_for_funds` pour accepter et persister le champ `description`.
Mettre à jour `CreateCallPayload` côté TypeScript pour inclure `description?: string`.

## 9. Limitations connues

- **Pas de groupement d'échéances** : les appels multiples créés par le wizard ne sont pas liés entre eux en DB (pas de `batch_id`). Chaque appel est indépendant. Amélioration future possible.
- **Pas de nom propriétaire dans le récap** : le tableau de ventilation affiche le lot ref + tantièmes mais pas le nom du propriétaire (nécessiterait un join supplémentaire). Suffisant pour le MVP.

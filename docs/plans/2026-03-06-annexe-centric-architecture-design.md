# Design : Architecture centralisee des annexes comptables

Date: 2026-03-06
Statut: Valide

## Contexte

Les annexes comptables (Decret 2005-240) sont centrales dans la gestion d'une copropriete. Aujourd'hui chaque module (budget, finance, dashboard) fait ses propres requetes SQL sans garantie de coherence. Les 6 fonctions SQL fn_annexe_* sont deployees mais ne servent qu'a la page comptabilite et la convocation AG.

## Objectif

Faire des fonctions annexes la **couche de lecture standard** pour tout le reporting financier : dashboard, stats budget, stats finance, espace client coproprietaire. Les vues operationnelles existantes restent pour le CRUD quotidien.

## Approche retenue : "Deux couches, une source"

### Pourquoi pas les autres approches

- **Tout annexe (remplacement total)** : les annexes agregent trop pour le CRUD quotidien. Impossible de gerer une facture individuelle via fn_annexe_2. Risque de regression enorme.
- **Vues materialisees** : premature. Ajoute de la complexite operationnelle (pg_cron, refresh). A envisager si la performance devient un probleme.

### Architecture

```
TABLES SUPABASE (source unique)
  accounts, ledger_entries, budgets, invoices, payments...
         |                              |
  COUCHE OPERATIONNELLE          COUCHE REPORTING
  (existante, inchangee)         (nouvelle)
         |                              |
  v_calls_overview               fn_annexe_1()
  v_budgets_overview             fn_annexe_2()
  v_unpaid_by_lot                fn_annexe_3()
  v_supplier_invoices            fn_annexe_4()
  v_bank_movements               fn_annexe_5()
                                 fn_annexe_1_detail()
                                 fn_dashboard_kpis()  <- NOUVEAU
         |                              |
  PAGES SYNDIC (CRUD)            CONSOMMATEURS
  Factures, Appels,              Dashboard KPIs
  Mouvements, Saisie             Budget stats (bandeau)
  (inchange)                     Finance stats (bandeau)
                                 Espace Client (annexes)
                                 Convocation AG (PDF)
```

## Elements a construire

### 1. fn_dashboard_kpis() — SQL function

Nouvelle fonction qui agrege fn_annexe_1 + fn_annexe_2 + fn_annexe_4 en un seul appel.

```sql
fn_dashboard_kpis(p_copro_id uuid, p_period_id uuid) -> JSONB
```

Retourne :
```json
{
  "tresorerie": 38245.50,
  "total_impayes": 2450.00,
  "provisions_travaux": 52200.00,
  "budget_vote": 40400.00,
  "budget_realise": 36716.00,
  "budget_pct": 90.88,
  "travaux_en_cours": 33000.00,
  "nb_travaux_ouverts": 2
}
```

Sources par KPI :
- tresorerie : fn_annexe_1 -> section_i.tresorerie.total
- total_impayes : fn_annexe_1 -> section_ii.creances.total
- provisions_travaux : fn_annexe_1 -> section_i.provisions.total
- budget_vote/realise : fn_annexe_2 -> totaux charges
- travaux : fn_annexe_4 -> operations avec solde > 0

### 2. useAnnexeSummary hook

Hook React centralise qui charge les KPIs une seule fois et les partage.

```typescript
useAnnexeSummary(coproId, periodId)
  -> { kpis, isLoading, error, refresh }
```

Strategie de cache :
- Premier chargement -> 1 seul RPC (fn_dashboard_kpis)
- Donnees gardees en useState, pas de re-fetch entre navigations
- Refresh explicite : bouton "Actualiser" ou apres mutation
- Annexes completes (tableaux legaux) chargees a la demande via useAnnexeData

### 3. BudgetAnnexeStats — Composant bandeau

En haut de la page budget, affiche les stats depuis fn_annexe_2 :
- Budget vote total
- Realise total
- Pourcentage consommation
- Ecart

Ne modifie pas le reste de la page budget.

### 4. FinanceAnnexeStats — Composant bandeau

En haut de la page finance, affiche les stats depuis fn_annexe_1 :
- Tresorerie
- Creances
- Provisions
- Dettes

Ne modifie pas le reste de la page finance.

### 5. Page Documents/Annexes — Espace Client

Nouvelle page accessible aux coproprietaires avec deux onglets :

**Vue simplifiee (defaut)** : Cartes visuelles avec KPIs cles
- Tresorerie (annexe 1)
- Budget consomme % (annexe 2)
- Travaux en cours (annexe 4)
- Charges par cle (annexe 3)
- Mon compte perso (annexe 1 detail filtre)

**Vue legale** : Les 5 annexes au format reglementaire exact
- Reutilise les composants Annexe1-5Table existants
- Bouton telecharger PDF

Securite : RLS existant via user_has_copro_access(). L'annexe 1 detail filtree par owner_id pour l'espace client.

### 6. Migration dashboard

Le hook useDashboardMainPage remplace v_dashboard_kpis par fn_dashboard_kpis.

### 7. Invalidation mutations

Les hooks de mutation existants (useBudgetMutations, useFinanceData) ajoutent un callback refresh() du useAnnexeSummary apres chaque mutation reussie. Via un AnnexeContext React.

## Data flow

```
Syndic saisit une facture
  -> supplier_invoices INSERT -> trigger -> ledger_entries INSERT
  -> Prochaine navigation / refresh
  -> useAnnexeSummary.refresh()
  -> fn_dashboard_kpis() SQL
     -> fn_annexe_1() + fn_annexe_2() + fn_annexe_4()
     -> lit ledger_entries + budgets + accounting_periods
  -> JSONB agrege
  -> Dashboard + Budget Stats + Finance Stats -> TOUS a jour
```

## Ce qu'on ne touche PAS

- Vues operationnelles (v_calls_overview, v_budgets_overview, etc.)
- Pages CRUD syndic (factures, appels de fonds, mouvements bancaires)
- Hooks de mutation existants (on ajoute juste un callback refresh)
- Composants Annexe1-5Table (deja construits)
- Fonctions fn_annexe_1..5 (deja deployees)

## Phases de deploiement

Phase 1 : fn_dashboard_kpis + useAnnexeSummary + AnnexeContext + migration dashboard
Phase 2 : BudgetAnnexeStats + FinanceAnnexeStats (bandeaux stats)
Phase 3 : Page Documents/Annexes (vue simplifiee + legale + PDF)
Phase 4 : Invalidation mutations (wiring refresh via context)

## Criteres de succes

- Dashboard, page budget et page finance affichent les memes chiffres pour les memes metriques
- Un coproprietaire peut consulter ses annexes (simplifiees + legales) dans Documents/Annexes
- Apres une saisie comptable, un refresh montre les donnees a jour partout
- Zero regression sur les pages existantes

## Equipe d'implementation

- **Chef de projet** : coordonne les 4 phases, valide la coherence
- **Expert Backend** : fn_dashboard_kpis, migration SQL, RLS
- **Expert Frontend** : hooks, composants, pages, context
- **Expert Corpo** : validation conformite legale, format annexes, UX coproprietaire

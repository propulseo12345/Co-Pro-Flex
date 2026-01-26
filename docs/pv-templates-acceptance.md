# Critères d'acceptation - Système de Templates PV

## Résumé de l'implémentation

### Architecture

Le système de templates PV est composé de plusieurs couches :

1. **Types et Modèles** (`src/types/models/pv-template.ts`)
   - `IPVTemplate` : Entité template stockée
   - `IPVTemplateSpec` : Spécification JSON du contenu
   - `IPVSection` : Configuration d'une section
   - `IPVRenderContext` : Contexte de rendu avec toutes les données
   - `IPVVariableDefinition` : Définition d'une variable

2. **Catalogue de Variables** (`src/lib/constants/pv-variables.ts`)
   - 40+ variables documentées par catégorie
   - Validation des variables utilisées
   - Helpers pour extraction et vérification

3. **Moteur de Rendu** (`src/lib/services/pv-template-renderer.ts`)
   - Syntaxe Mustache simplifiée : `{{variable.key}}`
   - Boucles : `{{#each collection}}...{{/each}}`
   - Conditionnels : `{{#if condition}}...{{else}}...{{/if}}`
   - Helpers de formatage : `{{formatDate}}`, `{{formatNumber}}`, etc.

4. **Service de Templates** (`src/lib/services/pv-template.service.ts`)
   - CRUD complet des templates
   - Multi-tenant (isolation par organisation)
   - Import/Export JSON
   - Template système par défaut

5. **Service d'Export** (`src/lib/services/pv-export.service.ts`)
   - Export HTML natif
   - Export PDF via jsPDF
   - Export DOCX (structure XML)

6. **Hook React** (`src/hooks/modules/usePVTemplates.ts`)
   - Gestion d'état des templates
   - Actions CRUD
   - Preview et export

7. **Pages UI**
   - `/settings/templates` : Liste des templates
   - `/settings/templates/[id]` : Éditeur de template

---

## Critères d'acceptation (Given/When/Then)

### 1. Liste des templates

```gherkin
Scenario: Affichage de la liste des templates
  Given l'utilisateur accède à /settings/templates
  When la page se charge
  Then la liste des templates de l'organisation s'affiche
  And le template système "Template Standard" est visible
  And les templates créés par l'organisation sont visibles
  And le template par défaut est marqué avec une étoile

Scenario: Création d'un nouveau template
  Given l'utilisateur est sur la page des templates
  When l'utilisateur clique sur "Nouveau template"
  And remplit le nom "Mon Template AG"
  And clique sur "Créer"
  Then un nouveau template est créé
  And l'utilisateur est redirigé vers l'éditeur

Scenario: Duplication d'un template
  Given un template "Template A" existe
  When l'utilisateur clique sur "Dupliquer"
  Then un nouveau template "Template A (copie)" est créé
  And l'utilisateur peut le modifier indépendamment
```

### 2. Éditeur de template

```gherkin
Scenario: Modification du contenu d'une section
  Given l'utilisateur édite un template
  When il clique sur une section pour la développer
  And clique sur "Modifier le contenu"
  Then l'éditeur de code HTML s'affiche
  And l'utilisateur peut modifier le contenu avec variables

Scenario: Insertion de variable
  Given l'utilisateur édite le contenu d'une section
  When il clique sur "Variables"
  Then la palette de variables s'affiche
  And l'utilisateur peut cliquer sur une variable pour l'insérer

Scenario: Activation/Désactivation de section
  Given une section "Annexes" est activée
  When l'utilisateur clique sur le toggle
  Then la section est désactivée
  And elle n'apparaît plus dans le preview

Scenario: Modification des paramètres globaux
  Given l'utilisateur est sur l'onglet "Paramètres"
  When il change la couleur principale en #ff0000
  Then le preview se met à jour
  And les titres s'affichent en rouge
```

### 3. Preview live

```gherkin
Scenario: Aperçu avec données de test
  Given l'utilisateur édite un template
  And le panel preview est visible
  When il modifie le contenu d'une section
  Then le preview se met à jour automatiquement
  And les variables sont remplacées par des données de test

Scenario: Erreurs de rendu
  Given l'utilisateur utilise une variable invalide {{foo.bar}}
  When le preview se génère
  Then un message d'erreur s'affiche
  And la variable invalide est affichée entre crochets [foo.bar]
```

### 4. Export multi-format

```gherkin
Scenario: Export HTML
  Given un template valide est sélectionné
  When l'utilisateur clique sur "Exporter > HTML"
  Then un fichier HTML est téléchargé
  And le fichier contient le PV rendu complet

Scenario: Export PDF
  Given un template valide est sélectionné
  When l'utilisateur clique sur "Exporter > PDF"
  Then un fichier PDF est généré
  And le PDF respecte la mise en page définie
  And les tableaux sont correctement formatés

Scenario: Export Word
  Given un template valide est sélectionné
  When l'utilisateur clique sur "Exporter > Word"
  Then un fichier .docx est téléchargé
  And le document est éditable dans Word
```

### 5. Sécurité et multi-tenant

```gherkin
Scenario: Isolation des templates par organisation
  Given l'organisation A a créé un template "Template A"
  And l'organisation B existe
  When l'organisation B accède à ses templates
  Then elle ne voit pas "Template A"
  And elle voit uniquement le template système

Scenario: Protection du template système
  Given le template "Template Standard" est un template système
  When l'utilisateur tente de le modifier
  Then un message indique que les templates système ne peuvent pas être modifiés
  And l'option "Dupliquer" est proposée

Scenario: Pas de code arbitraire
  Given l'utilisateur édite un template
  When il insère du JavaScript <script>alert('xss')</script>
  Then le code est échappé dans le rendu
  And aucun script n'est exécuté
```

---

## Checklist QA (15 points)

### Préparation
- [ ] **1. Accéder à la page** `/settings/templates`
- [ ] **2. Vérifier** que le template système est présent

### Tests de création
- [ ] **3. Créer un nouveau template** avec nom "Test QA"
- [ ] **4. Vérifier** la redirection vers l'éditeur
- [ ] **5. Dupliquer** le template système

### Tests d'édition
- [ ] **6. Modifier** le titre dans les paramètres
- [ ] **7. Changer** la couleur principale
- [ ] **8. Désactiver** une section non obligatoire
- [ ] **9. Modifier** le contenu d'une section
- [ ] **10. Insérer** une variable via la palette

### Tests de preview
- [ ] **11. Vérifier** que le preview se met à jour
- [ ] **12. Tester** une variable invalide → message d'erreur

### Tests d'export
- [ ] **13. Exporter** en HTML → fichier téléchargé
- [ ] **14. Exporter** en PDF → fichier généré

### Tests de gestion
- [ ] **15. Définir** un template comme défaut
- [ ] **16. Supprimer** un template

---

## Fichiers créés

### Types
- `src/types/models/pv-template.ts` - Définitions TypeScript

### Constantes
- `src/lib/constants/pv-variables.ts` - Catalogue des 40+ variables

### Services
- `src/lib/services/pv-template-renderer.ts` - Moteur de rendu
- `src/lib/services/pv-template.service.ts` - Gestion CRUD
- `src/lib/services/pv-export.service.ts` - Exports multi-format

### Hooks
- `src/hooks/modules/usePVTemplates.ts` - Hook React

### Pages
- `src/app/(dashboard)/settings/templates/page.tsx` - Liste
- `src/app/(dashboard)/settings/templates/templates.module.css` - Styles liste
- `src/app/(dashboard)/settings/templates/[id]/page.tsx` - Éditeur
- `src/app/(dashboard)/settings/templates/[id]/editor.module.css` - Styles éditeur

### Documentation
- `docs/pv-templates-acceptance.md` - Ce fichier

---

## Catalogue de variables disponibles

### Copropriété
| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{copro.nom}}` | Nom de la copropriété | Résidence Les Jardins |
| `{{copro.adresse}}` | Adresse complète | 12 rue des Lilas, 75020 Paris |
| `{{copro.nombre_lots}}` | Nombre de lots | 42 |
| `{{copro.total_tantiemes}}` | Total tantièmes | 10000 |

### Assemblée Générale
| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{ag.type}}` | Type d'AG | Ordinaire |
| `{{ag.date}}` | Date complète | 15 mars 2025 |
| `{{ag.heure_debut}}` | Heure de début | 18h30 |
| `{{ag.lieu}}` | Lieu | Salle des fêtes |

### Statistiques
| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{stats.presents_count}}` | Nombre présents | 15 |
| `{{stats.representes_count}}` | Nombre représentés | 8 |
| `{{stats.quorum_pourcentage}}` | Quorum (%) | 73% |
| `{{stats.quorum_atteint}}` | Quorum atteint ? | Oui |

### Variables de résolution (dans boucle)
| Variable | Description |
|----------|-------------|
| `{{resolution.numero}}` | Numéro de résolution |
| `{{resolution.titre}}` | Titre |
| `{{resolution.majorite}}` | Majorité requise |
| `{{vote.pour}}` | Tantièmes POUR |
| `{{vote.contre}}` | Tantièmes CONTRE |
| `{{vote.resultat}}` | ADOPTÉE/REJETÉE |

---

## Notes pour les développeurs

### Intégration future Supabase

Pour migrer vers Supabase :

1. Créer table `pv_templates` avec colonnes :
   - `id`, `organization_id`, `name`, `spec` (JSONB), `created_at`, etc.

2. Remplacer les fonctions localStorage par des appels Supabase :
   ```typescript
   // Avant
   const templates = getTemplatesFromStorage();

   // Après
   const { data: templates } = await supabase
     .from('pv_templates')
     .select('*')
     .eq('organization_id', orgId);
   ```

3. Ajouter des policies RLS pour l'isolation multi-tenant

### Extension du catalogue de variables

Pour ajouter de nouvelles variables :

1. Ajouter la définition dans `pv-variables.ts`
2. Mapper la valeur dans `buildScope()` du renderer
3. Documenter l'exemple d'utilisation

### Support de templates .docx personnalisés

Pour supporter des templates Word personnalisés :

1. Utiliser une bibliothèque comme `docxtemplater`
2. Créer un interface `TemplateRenderer`
3. Implémenter `DocxTemplateRenderer`
4. Permettre l'upload de fichiers .docx comme base

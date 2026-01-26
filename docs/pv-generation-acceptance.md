# Critères d'acceptation - Génération du Procès-Verbal (PV)

## Résumé des corrections apportées

### Bug corrigé : Chargement infini sur l'étape 7

**Cause racine identifiée :**
1. Le hook `useAGStepGuard` n'avait pas de timeout de sécurité
2. Incohérence des clés localStorage : `ag-session-{agId}` vs `ag-session-state-{agId}`
3. Absence de gestion d'erreurs avec try-catch dans la validation
4. Pas de feedback utilisateur en cas d'erreur silencieuse

**Corrections appliquées :**
- `src/hooks/modules/useAGStepGuard.ts` : Ajout de timeout 5s, try-catch, logs de debug
- `src/lib/constants/ag-workflow.ts` : Correction de la lecture des deux clés possibles pour la session
- `src/app/(dashboard)/ag/[id]/pv/page.tsx` : Ajout d'état de chargement avec timeout 10s, meilleure gestion des erreurs

---

## Critères d'acceptation (Given/When/Then)

### 1. Accès à la page PV

```gherkin
Scenario: Accès à la page PV avec prérequis valides
  Given l'utilisateur a complété les étapes précédentes (ordre du jour, session)
  And des résolutions ont été votées
  When l'utilisateur accède à la page /ag/{agId}/pv
  Then la page s'affiche en moins de 5 secondes
  And le résumé de l'AG est visible (nombre de résolutions adoptées/rejetées)

Scenario: Accès à la page PV sans prérequis
  Given l'utilisateur n'a pas complété l'ordre du jour
  When l'utilisateur accède à la page /ag/{agId}/pv
  Then un message d'erreur clair est affiché
  And l'utilisateur est redirigé vers l'ordre du jour après 100ms

Scenario: Timeout de chargement
  Given une erreur réseau ou des données corrompues
  When le chargement dépasse 10 secondes
  Then un message de timeout est affiché
  And l'utilisateur peut rafraîchir la page ou revenir en arrière
```

### 2. Génération du PV

```gherkin
Scenario: Génération réussie du PV
  Given l'utilisateur est sur la page PV
  And les données de l'AG sont disponibles
  When l'utilisateur clique sur "Générer le PV"
  Then une barre de progression s'affiche
  And chaque étape de génération est visible (6 étapes)
  And le pourcentage de progression augmente
  And le PV est généré en moins de 10 secondes

Scenario: Génération idempotente
  Given un PV a déjà été généré pour cette AG
  When l'utilisateur demande une nouvelle génération sans forceRegenerate
  Then le document existant est retourné
  And aucune duplication n'est créée

Scenario: Retry en cas d'échec
  Given une erreur se produit pendant la génération
  When le job échoue
  Then le système retente automatiquement (max 3 fois)
  And l'utilisateur peut retenter manuellement si nécessaire
```

### 3. Contenu du PV

```gherkin
Scenario: PV contient toutes les sections requises
  Given un PV a été généré
  When l'utilisateur prévisualise le PDF
  Then le PV contient l'en-tête avec type/date/lieu de l'AG
  And le PV contient la feuille de présence
  And le PV contient le quorum calculé
  And le PV contient chaque résolution avec ses votes (pour/contre/abstention)
  And le PV contient le statut de chaque résolution (adoptée/rejetée/ajournée)
  And le PV contient la mention passerelle si applicable
  And le PV contient la section signatures

Scenario: Variables remplacées dans le texte
  Given des variables ont été définies ({nom_syndic}, {modalite_paiement})
  When le PV est généré
  Then les variables sont remplacées par leurs valeurs
  And les variables manquantes sont affichées entre crochets [variable]
```

### 4. Signature électronique

```gherkin
Scenario: Signature sur place
  Given l'utilisateur choisit le mode "Sur place"
  When un signataire signe sur le canvas
  Then la signature est capturée en base64
  And le signataire est marqué comme "signé"
  And la date de signature est enregistrée

Scenario: Tous les signataires ont signé
  Given le président, secrétaire et scrutateur ont signé
  When le dernier signe
  Then le PV est marqué comme "fully_signed"
  And le bouton "Terminer" devient actif
```

### 5. Archivage et distribution

```gherkin
Scenario: Archivage GED automatique
  Given un PV signé
  When l'utilisateur clique sur "Archiver dans la GED"
  Then le document est archivé dans /documents/ag/proces-verbaux/{année}/
  And un ID de document GED est retourné
  And le statut passe à "archived"

Scenario: Envoi aux copropriétaires
  Given un PV archivé
  And des copropriétaires avec email
  When l'utilisateur clique sur "Envoyer aux copropriétaires"
  Then un email est envoyé à chaque copropriétaire avec email
  And les échecs sont tracés (email manquant)
  And un récapitulatif est affiché (X envoyés, Y échecs)
```

---

## Checklist QA (10 points)

### Préparation
- [ ] **1. Créer une AG de test** avec au moins 3 résolutions
- [ ] **2. Voter sur les résolutions** (mix adoptées/rejetées)
- [ ] **3. Définir les rôles** (président, secrétaire, scrutateur)

### Tests fonctionnels
- [ ] **4. Accès à la page PV**
  - Vérifier que la page charge en < 5s
  - Vérifier le résumé (nombre résolutions adoptées/rejetées)
  - Tester l'accès sans prérequis → redirection

- [ ] **5. Génération du PV**
  - Cliquer sur "Générer le PV"
  - Vérifier la barre de progression (0% → 100%)
  - Vérifier les 6 étapes de génération
  - Temps total < 10s

- [ ] **6. Aperçu PDF**
  - Cliquer sur "Aperçu PDF"
  - Vérifier présence de l'en-tête
  - Vérifier la feuille de présence
  - Vérifier les résolutions avec votes
  - Vérifier la section signatures

- [ ] **7. Téléchargement**
  - Cliquer sur "Télécharger PDF"
  - Vérifier que le fichier se télécharge
  - Ouvrir le fichier et vérifier le contenu

### Tests de signature
- [ ] **8. Signature sur place**
  - Ouvrir le modal des signataires
  - Dessiner une signature sur le canvas
  - Valider et vérifier le badge "Signé"
  - Répéter pour les 3 signataires

### Tests de robustesse
- [ ] **9. Test offline**
  - Désactiver le réseau
  - Tenter d'accéder à la page
  - Vérifier le message "Hors-ligne"
  - Réactiver et rafraîchir

- [ ] **10. Test d'erreur**
  - Supprimer les données localStorage
  - Accéder à la page PV
  - Vérifier le message d'erreur clair
  - Vérifier les options de récupération

---

## Fichiers modifiés/créés

### Corrections du bug loading infini
- `src/hooks/modules/useAGStepGuard.ts` - Timeout + try-catch + logs
- `src/lib/constants/ag-workflow.ts` - Fix clé localStorage session
- `src/app/(dashboard)/ag/[id]/pv/page.tsx` - Gestion erreurs + timeout

### Nouveau système de génération PV
- `src/lib/services/pv-generation.service.ts` - Service jobs asynchrones
- `src/hooks/modules/usePVGeneration.ts` - Hook React avec polling
- `src/components/features/ag/PVGeneration/PVGenerationProgress.tsx` - UI progression
- `src/components/features/ag/PVGeneration/PVGenerationProgress.module.css` - Styles

### Signature électronique
- `src/lib/services/electronic-signature.service.ts` - Architecture extensible

### Distribution
- `src/lib/services/pv-distribution.service.ts` - Archivage GED + envoi emails

### Tests
- `src/lib/services/__tests__/pv-generation.service.test.ts` - Tests unitaires

---

## Notes pour les développeurs

### Intégration future Supabase
Les services actuels utilisent localStorage. Pour migrer vers Supabase :

1. Remplacer les fonctions `getJobs()`/`saveJobs()` par des appels à l'API Supabase
2. Utiliser Supabase Realtime pour le polling au lieu de setInterval
3. Stocker les PDFs dans Supabase Storage

### Intégration providers signature (DocuSign/Yousign)
Le service `electronic-signature.service.ts` expose une interface `SignatureProviderInterface`.
Pour ajouter un nouveau provider :

1. Créer une classe implémentant l'interface
2. L'enregistrer dans le constructeur du service
3. Configurer les credentials via `configureProvider()`

### Template Word personnalisable
L'architecture actuelle utilise jsPDF. Pour supporter des templates .docx :

1. Créer une interface `PVTemplateRenderer`
2. Implémenter `HtmlTemplateRenderer` (actuel) et `DocxTemplateRenderer`
3. Utiliser une lib comme `docx-templates` ou `docxtemplater`

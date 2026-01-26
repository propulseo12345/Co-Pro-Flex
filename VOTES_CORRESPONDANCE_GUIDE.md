# Guide : Votes par Correspondance

## Vue d'ensemble

Le système de votes par correspondance permet de saisir les votes de chaque copropriétaire pour toutes les résolutions de l'assemblée générale, résolution par résolution.

---

## Accès à la Fonctionnalité

### Depuis la Feuille de Présence

1. Accédez à la feuille de présence : `/ag/{agId}/feuille-presence`
2. Dans le tableau des copropriétaires, vous verrez une nouvelle colonne **"Votes"**
3. Chaque ligne contient un bouton **"📊 Saisie des votes"**

```
Copropriétaire │ Lot(s) │ Tantièmes │ Statut │ Signature │ Votes
────────────────────────────────────────────────────────────────────
Jean Dupont    │ A101   │ 100       │ Présent│ [Signer]  │ [📊 Saisie des votes]
Marie Martin   │ A102   │ 120       │ Absent │           │ [📊 Saisie des votes]
```

---

## Fonctionnalités

### 1. Saisie des Votes

**Accès :** Cliquer sur **"Saisie des votes"** devant un copropriétaire

**Page de vote :**
- **En-tête** : Nom du copropriétaire + Total de tantièmes
- **Barre de progression** : Nombre de votes complétés / Total de résolutions
- **Liste complète des résolutions** : Toutes les résolutions de l'AG

### 2. Pour chaque résolution

Chaque résolution affiche :
- **Numéro** de la résolution (avec ✓ si votée)
- **Titre** de la résolution
- **Texte complet** de la résolution
- **3 boutons de vote** :
  - ✓ **Pour** (vert)
  - ✕ **Contre** (rouge)
  - − **Abstention** (gris)
- **Horodatage** du vote (affiché après avoir voté)

### 3. Enregistrement

Deux options d'enregistrement :

#### 💾 **Sauvegarder le brouillon**
- Enregistre les votes en cours
- Permet de revenir plus tard
- Les votes ne sont pas validés

#### ✅ **Valider le vote**
- Finalise le vote par correspondance
- Vérifie que tous les votes sont renseignés
- **Attention** : Une fois validé, le vote ne peut plus être modifié
- Affiche un avertissement si des résolutions ne sont pas votées

---

## Statuts des Votes

### 🟡 **BROUILLON**
- Vote en cours de saisie
- Peut être modifié à tout moment
- Bouton "Sauvegarder le brouillon" disponible

### 🟢 **VALIDÉ**
- Vote finalisé et enregistré
- Ne peut plus être modifié
- Bannière verte "Ce vote par correspondance a été validé"

---

## Interface Détaillée

### Barre de Progression

```
┌─────────────────────────────────────────┐
│ Progression          12 / 14 votes       │
│ ████████████████░░░░ 85%                 │
└─────────────────────────────────────────┘
```

### Carte de Résolution

```
┌─────────────────────────────────────────────────────────┐
│ Résolution #1 ✓                                          │
│                                                          │
│ Approbation du budget prévisionnel                      │
│ L'assemblée générale approuve le budget...               │
│                                                          │
│ [✓ Pour]  [✕ Contre]  [− Abstention]                    │
│                                                          │
│ Vote enregistré le 09/12/2025 à 14:30                   │
└─────────────────────────────────────────────────────────┘
```

- **Carte blanche** : Résolution non votée
- **Carte verte** : Résolution votée (avec bordure verte)
- **Bouton actif** : Le choix de vote sélectionné (coloré)

---

## Flux d'Utilisation

### Scénario Complet

```
1. Ouvrir la feuille de présence
   ↓
2. Cliquer sur "Saisie des votes" pour un copropriétaire
   ↓
3. Pour chaque résolution :
   - Lire le titre et le texte
   - Cliquer sur Pour / Contre / Abstention
   - ✓ Le vote est enregistré automatiquement
   ↓
4. Progression mise à jour : 1/14 → 2/14 → ... → 14/14
   ↓
5. Deux options :
   a) "Sauvegarder le brouillon" → Revenir plus tard
   b) "Valider le vote" → Finaliser (irréversible)
```

---

## Stockage des Données

Les votes sont stockés dans le **localStorage** :

```javascript
// Clé de stockage
vote-correspondance-{agId}-{coproprietaireId}

// Structure de données
{
  id: "vote-123456789",
  agId: "ag-123",
  coproprietaireId: "cp1",
  votes: [
    {
      resolutionId: "res-1",
      choix: "POUR",
      dateVote: "2025-12-09T14:30:00.000Z"
    },
    {
      resolutionId: "res-2",
      choix: "CONTRE",
      dateVote: "2025-12-09T14:31:00.000Z"
    }
  ],
  dateEnregistrement: "2025-12-09T14:25:00.000Z",
  dateModification: "2025-12-09T14:31:00.000Z",
  statut: "VALIDE"
}
```

---

## Cas d'Usage

### 1. Vote Complet
```
Copropriétaire : Jean Dupont
14 résolutions → 14 votes
Tous les votes : POUR, CONTRE ou ABSTENTION
✅ Validation sans avertissement
```

### 2. Vote Partiel
```
Copropriétaire : Marie Martin
14 résolutions → 10 votes complétés, 4 non votés
⚠️ Avertissement : "4 vote(s) n'est/ne sont pas renseigné(s)"
Option de valider quand même ou annuler
```

### 3. Modification de Brouillon
```
1. Saisie de 5 votes
2. Sauvegarder le brouillon
3. Fermer la page
4. Revenir plus tard
5. Les 5 votes sont toujours là
6. Continuer la saisie
```

### 4. Vote Validé
```
1. Tous les votes complétés
2. Cliquer sur "Valider le vote"
3. Bannière verte de confirmation
4. Retour automatique à la feuille de présence
5. Boutons de vote désactivés si on réouvre
```

---

## Validation et Contrôles

### Avant Validation

- ✓ Comptage automatique des votes complétés
- ✓ Barre de progression en temps réel
- ✓ Indication visuelle des résolutions votées (✓)

### À la Validation

1. **Vérification** : Tous les votes sont-ils renseignés ?
2. **Si non** : Dialogue de confirmation
   ```
   4 vote(s) n'est/ne sont pas renseigné(s).
   Voulez-vous quand même valider ?
   [Annuler] [Valider quand même]
   ```
3. **Si oui** : Validation immédiate

### Après Validation

- ✓ Statut passe à "VALIDÉ"
- ✓ Bannière de confirmation affichée
- ✓ Tous les boutons de vote désactivés
- ✓ Message : "Ce vote par correspondance a été validé"

---

## URLs et Navigation

### URLs Directes

```
Saisie des votes :
/ag/{agId}/votes-correspondance/{coproprietaireId}

Exemple :
/ag/ag-1733724123/votes-correspondance/cp1
```

### Navigation

```
Feuille de présence
  │
  ├─→ [Saisie des votes] → Page de vote copropriétaire 1
  ├─→ [Saisie des votes] → Page de vote copropriétaire 2
  └─→ [Saisie des votes] → Page de vote copropriétaire 3
```

---

## Messages et Notifications

### Messages de Succès

✅ **"Modifications enregistrées"**
- S'affiche pendant 3 secondes après "Sauvegarder le brouillon"
- Bannière bleue en haut de la page

✅ **"Vote par correspondance validé avec succès !"**
- S'affiche après "Valider le vote"
- Alerte JavaScript
- Puis retour automatique à la feuille de présence

### Messages d'Avertissement

⚠️ **"X vote(s) n'est/ne sont pas renseigné(s)"**
- S'affiche si validation avec votes incomplets
- Permet d'annuler ou de continuer

---

## Responsive Design

### Sur Desktop
- 3 boutons de vote côte à côte (Pour | Contre | Abstention)
- Tableau complet visible
- Actions en sticky en bas de page

### Sur Mobile/Tablette
- Boutons de vote en colonne (verticaux)
- Tableau avec scroll horizontal
- Actions en pleine largeur

---

## Bonnes Pratiques

### Pour l'Administrateur

1. **Préparer les résolutions** avant d'ouvrir les votes
2. **Informer les copropriétaires** que les votes sont disponibles
3. **Vérifier régulièrement** la progression des votes
4. **Ne valider** qu'après confirmation avec le copropriétaire

### Pour le Copropriétaire

1. **Lire attentivement** chaque résolution
2. **Sauvegarder régulièrement** le brouillon (toutes les 5 résolutions)
3. **Ne valider** que lorsque tous les votes sont corrects
4. **Vérifier** avant de valider (la validation est irréversible)

---

## Dépannage

### Les résolutions ne s'affichent pas
→ Vérifier que les résolutions ont bien été ajoutées à l'ordre du jour

### Le bouton "Valider" ne marche pas
→ Vérifier qu'au moins un vote a été saisi

### Les votes ne sont pas sauvegardés
→ Vérifier que le localStorage du navigateur est actif

### Impossible de modifier après validation
→ C'est normal, la validation est définitive

---

## Évolutions Futures Possibles

- 📧 Export des votes par email (PDF)
- 📊 Statistiques des votes en temps réel
- 🔔 Notifications de rappel pour les votes non complétés
- 📱 Application mobile dédiée
- 🔐 Signature électronique des votes
- 📄 Génération automatique du procès-verbal

---

**Date de création** : Décembre 2025
**Version** : 1.0

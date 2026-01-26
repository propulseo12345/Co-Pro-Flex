# Plan de Tests Manuels - Page Convocation

## Contexte

Ce document décrit les tests manuels à effectuer pour valider le correctif du bug "Chargement infini" sur la page Convocation (étape 3 du workflow AG).

## Prérequis

- Application lancée en mode développement (`npm run dev`)
- Navigateur avec DevTools ouvert (onglet Console)

---

## Cas de Test

### Test 1 : Accès via navigation normale (depuis étapes précédentes)

**Objectif** : Vérifier que l'accès depuis le workflow AG fonctionne correctement.

**Étapes** :
1. Aller sur `/ag/new` et créer une nouvelle AG (remplir les champs obligatoires)
2. Passer à l'étape "Ordre du jour" et ajouter au moins une résolution
3. Cliquer sur "Continuer vers Convocations"

**Résultat attendu** :
- ✅ La page s'affiche sans erreur
- ✅ Les données de l'AG (date, lieu, format) sont visibles dans l'aperçu
- ✅ La liste des copropriétaires s'affiche
- ✅ Les résolutions sont visibles dans la preview

---

### Test 2 : Accès direct via URL (refresh)

**Objectif** : Vérifier que l'accès direct via URL fonctionne après un refresh.

**Étapes** :
1. Effectuer le Test 1 pour avoir une AG valide
2. Noter l'URL (ex: `/ag/abc123/convocation`)
3. Rafraîchir la page (F5 ou Cmd+R)

**Résultat attendu** :
- ✅ La page s'affiche correctement après le refresh
- ✅ Toutes les données sont restaurées depuis localStorage
- ✅ Pas de "Chargement..." infini

---

### Test 3 : agId invalide

**Objectif** : Vérifier la gestion d'un ID AG inexistant.

**Étapes** :
1. Aller directement sur `/ag/invalid-id-12345/convocation`

**Résultat attendu** :
- ✅ Message d'erreur clair affiché : "Assemblée générale non trouvée"
- ✅ Code erreur visible : `ERR-CONVOC-006`
- ✅ Boutons "Réessayer" et "Retour aux AG" fonctionnels
- ✅ Pas de crash ou de boucle infinie

---

### Test 4 : Génération PDF lente > timeout

**Objectif** : Vérifier le comportement en cas de timeout.

**Étapes** :
1. Dans `useConvocationData.ts`, modifier temporairement le timeout à 100ms
2. Aller sur une page convocation valide

**Résultat attendu** :
- ✅ Message d'erreur après timeout : "Le chargement a pris trop de temps"
- ✅ Code erreur : `ERR-CONVOC-005`
- ✅ Bouton "Réessayer" permet de relancer le chargement
- ✅ Option "Télécharger le PDF (mode dégradé)" si copropriétaires disponibles

---

### Test 5 : Échec fetch copropriétaires

**Objectif** : Vérifier le mode dégradé partiel.

**Étapes** :
1. Dans `useConvocationData.ts`, ajouter une erreur simulée au chargement des copropriétaires
2. Charger une page convocation

**Résultat attendu** :
- ✅ Bannière "Mode dégradé actif" affichée
- ✅ Liste des copropriétaires chargée depuis les mocks
- ✅ Preview de l'AG toujours disponible
- ✅ Actions d'envoi fonctionnelles

---

### Test 6 : Retry après erreur

**Objectif** : Vérifier que le bouton Réessayer fonctionne.

**Étapes** :
1. Provoquer une erreur (Test 3 ou 4)
2. Cliquer sur "Réessayer"

**Résultat attendu** :
- ✅ Nouvelle tentative de chargement
- ✅ Spinner affiché pendant le chargement
- ✅ Si les données sont disponibles, la page s'affiche correctement

---

### Test 7 : Vérifier pas de loop useEffect (profiling)

**Objectif** : S'assurer qu'il n'y a pas de boucle infinie dans les effets.

**Étapes** :
1. Ouvrir React DevTools > Profiler
2. Activer l'enregistrement
3. Charger une page convocation
4. Attendre 10 secondes
5. Arrêter l'enregistrement

**Résultat attendu** :
- ✅ Nombre de re-renders stable (< 5 après le chargement initial)
- ✅ Pas de pattern "infinite loop" dans le profiler
- ✅ Console sans warnings de dépendances useEffect

---

### Test 8 : Vérifier états d'envoi mock

**Objectif** : Tester les interactions avec les méthodes d'envoi.

**Étapes** :
1. Charger une page convocation valide
2. Sélectionner "Email" pour un copropriétaire avec email
3. Essayer de sélectionner "Recommandé" pour un copropriétaire sans adresse
4. Utiliser le bouton "Tout en Recommandé"
5. Vérifier le récapitulatif des coûts

**Résultat attendu** :
- ✅ Méthodes Email/Avis électronique désactivées si pas d'email
- ✅ Méthodes Recommandé/Lettre simple désactivées si pas d'adresse
- ✅ Message d'alerte si on essaie de sélectionner une méthode non disponible
- ✅ "Tout en X" ne sélectionne que les copropriétaires éligibles
- ✅ Coût total calculé correctement

---

## Codes d'erreur de référence

| Code | Signification |
|------|---------------|
| `ERR-CONVOC-001` | Échec chargement données AG |
| `ERR-CONVOC-002` | Échec chargement résolutions |
| `ERR-CONVOC-003` | Échec chargement copropriétaires |
| `ERR-CONVOC-004` | Échec génération PDF |
| `ERR-CONVOC-005` | Timeout chargement |
| `ERR-CONVOC-006` | AG non trouvée |
| `ERR-CONVOC-007` | Échec envoi email |
| `ERR-CONVOC-008` | Échec envoi courrier |
| `ERR-CONVOC-009` | ID AG invalide |

---

## Checklist de validation

- [ ] Test 1 - Navigation normale ✅
- [ ] Test 2 - Accès direct URL ✅
- [ ] Test 3 - agId invalide ✅
- [ ] Test 4 - Timeout ✅
- [ ] Test 5 - Mode dégradé ✅
- [ ] Test 6 - Retry ✅
- [ ] Test 7 - Pas de loop ✅
- [ ] Test 8 - États d'envoi ✅

---

## Notes de régression

Après chaque modification du code de la page Convocation, exécuter au minimum les tests 1, 2 et 3 pour valider qu'il n'y a pas de régression sur le bug "Chargement infini".

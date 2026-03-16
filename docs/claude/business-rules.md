# Règles Métier Critiques — CoProFlex

## Votes en AG (Loi française)

| Article | Majorité | Usage |
|---------|----------|-------|
| Article 24 | Majorité simple (présents/représentés) | Décisions courantes |
| Article 25 | Majorité absolue (tous les copros) | Travaux d'amélioration |
| Article 25-1 | Passerelle 25→24 | Si échec art. 25 avec 1/3 des voix |
| Article 26 | Double majorité (2/3 tantièmes + majorité copros) | Actes de disposition |
| Article 26-1 | Passerelle 26→25 | Si échec art. 26 avec 1/2 des voix |
| Unanimité | 100% des tantièmes | Aliénation parties communes |

## Calcul des majorités

```typescript
// Article 24 : Majorité simple des présents
const seuilArt24 = Math.floor(tantiemesPresents / 2) + 1;

// Article 25 : Majorité absolue de tous
const seuilArt25 = Math.floor(totalTantiemes / 2) + 1;

// Article 26 : Double majorité
const seuilArt26Tantiemes = Math.floor(totalTantiemes * 2 / 3) + 1;
const seuilArt26Copros = Math.floor(totalCoproprietaires / 2) + 1;
```

## Workflow Ordres de Service

```
BROUILLON → ENVOYE → EN_ATTENTE_PRESTATAIRE → INTERVENTION_PROGRAMMEE → INTERVENTION_REALISEE → CLOTURE
                  ↘                        ↘                        ↘
                   ANNULE                  ANNULE                   ANNULE
```

## Échéanciers Appels de Fonds

| Mode | Appels | Répartition |
|------|--------|-------------|
| UNIQUE | 1 | 100% |
| SEMESTRIEL | 2 | 50% / 50% |
| TRIMESTRIEL | 4 | 25% × 4 |
| PERSONNALISE | N | Configurable |

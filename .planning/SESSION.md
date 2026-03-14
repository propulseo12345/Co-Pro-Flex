# Session State — 2026-03-14 13:15

## Branch
v2

## Completed This Session
- Pipeline envoi convocations: migration DB + types + page de garde PDF + dispatch multi-canal + modale progression + Edge Function email + JSZip
- GED: sous-dossiers multi-niveaux (subFolderName avec '/'), composant SubFolderTree récursif
- GED: favoris (colonne is_starred + toggle optimiste + onglet réel)
- GED: preview inline (iframe PDF / img) + téléchargement blob (sans quitter la page)
- GED: fix catégorie upload (category_default du dossier, plus de mapping par icône)
- GED: UI cleanup (suppression KPI bar, stats dans sidebar, réduction taille header)
- Convention sous-dossiers GED documentée (spec)

## Next Task
Retravail module Appels de fonds — générateur PDF + archivage GED + refonte UI

## Blockers
None

## Key Context
- Appels de fonds: table call_for_funds existe, émission fonctionne, mais PAS de générateur PDF (stub dans emission-appel.service.ts)
- Convention sous-dossiers: Appels de fonds {exercice}/T{n} - {mois} {année}
- autoFileToGED supporte maintenant des chemins multi-niveaux via '/'

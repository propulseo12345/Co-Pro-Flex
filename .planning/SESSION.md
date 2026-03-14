# Session State — 2026-03-14 13:20

## Branch
v2

## Completed This Session
- Pipeline envoi convocations complet: migration DB (ag_envoi_tracking + 3 RPCs) + types + page de garde PDF + dispatch multi-canal + modale progression + Edge Function email (Resend+stub) + JSZip
- GED: sous-dossiers multi-niveaux (subFolderName avec '/'), SubFolderTree récursif
- GED: favoris (is_starred en DB + toggle optimiste + onglet réel)
- GED: preview inline (iframe PDF / img) + téléchargement blob
- GED: fix catégorie upload (category_default du dossier cible)
- GED: UI cleanup (KPI supprimé, stats sidebar, taille réduite, boutons renommés)
- Spec convention sous-dossiers GED pour tous modules

## Next Task
Retravail complet module Appels de fonds: générateur PDF + archivage GED + refonte UI

## Blockers
None

## Key Context
- Appels de fonds: table call_for_funds existe, émission fonctionne, MAIS pas de générateur PDF (stub dans emission-appel.service.ts)
- Convention sous-dossiers: Appels de fonds {exercice}/T{n} - {mois} {année}
- autoFileToGED supporte chemins multi-niveaux via '/'

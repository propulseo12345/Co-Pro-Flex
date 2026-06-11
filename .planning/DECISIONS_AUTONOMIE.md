# Décisions & questions — run autonome J2→J10

> Mandat 2026-06-11 (cf. mémoire `autonomy-mandate-j2-j9`) : dérouler le master plan en autonomie
> jusqu'à J10. **Je ne bloque pas** : je tranche en expert + journalise ici (section A), et je PARQUE
> les points incertains (section B). On revoit la section B **à la fin**, quand tout le reste est fait.

---

## A. Décisions tranchées en autonomie (expert, réversibles)

| Date | Bloc | Décision | Raison | Réversibilité |
|------|------|----------|--------|---------------|
| 2026-06-11 | J2.8 | Brouillon facture sans ligne = autorisé mais NON validable (RPC refuse `23514`) | Validé avec Lyes (capture rapide préservée + écriture équilibrée garantie) | — (validé) |
| 2026-06-11 | J2.8 | Paiement routé vers RPC `post_supplier_payment` (pas l'edge) | Contourne le souci d'auth de l'edge ; RPC déjà idempotente/gardée | Facile (rebrancher l'edge si son auth est fiabilisée) |

## B. Questions en attente (à trancher avec Lyes À LA FIN)

> Format : [bloc] question — défaut pris en attendant — impact si on change.

- **[J2.8] Paiement partiel depuis l'UI Factures** — défaut pris : le bouton « Payer » règle le **total** de la facture (`amount = montant`, clé d'idempotence `pay-<id>-<date>`). La RPC `post_supplier_payment` gère pourtant le partiel. Impact si on veut le partiel : ajouter un champ montant dans le modal de paiement + clé d'idempotence par montant/séquence. Non bloquant (le cas courant = paiement total).
- **[J2.8] Sous-compte banque (512-x) au paiement** — défaut pris : le `compteId` choisi dans le modal est conservé en affichage mais la RPC poste sur le 512 générique (lookup `code='512'`). Impact si multi-comptes bancaires : étendre `post_supplier_payment` pour accepter un `account_id` 512 cible. Non bloquant tant qu'une copro a un seul 512.

### Issues de l'audit sécurité 2026-06-12 — défauts pris, à revoir
- **[banking] Lien requisition↔copro non modélisé** — défaut pris : les 4 routes `/api/banking/*` exigent désormais un rôle gestionnaire (fin de l'IDOR anonyme), mais un gestionnaire d'un AUTRE cabinet pourrait encore lire une réquisition dont il connaît l'UUID. Fix complet = table `bank_requisitions(copro_id, requisition_id, created_by)` + contrôle d'appartenance. À faire avec le chantier rapprochement bancaire (J2-bis).
- **[mail/send] Destinataires libres pour le gestionnaire** — défaut pris : l'envoi exige le rôle gestionnaire SUR la copro (fin du relais inter-cabinets), mais les destinataires restent libres (légitime : fournisseurs, notaires). Pas de rate-limit. À durcir si abus constaté.
- **[relances] Secrets à poser au déploiement** : `RESEND_INBOUND_SECRET` (webhook entrant Next), `RESEND_WEBHOOK_SECRET` (edge email_webhook, désormais OBLIGATOIRE), `REMINDERS_CRON_SECRET` (chemin cron de run_payment_reminders). Sans eux : webhooks → 503 (refus propre), relances → manuel seulement.
- **[deps] Bumps majeurs parqués** : jspdf 3→4.2.1 (revalider ~25 générateurs PDF) ; @supabase/ssr 0.8→0.12 (tester login/refresh/logout 2 espaces) ; pdfjs 6.x en veille. `npm audit fix` simple + next 16.2.9 = faits dans la PR deps.

### Issues de la revue adversariale 0047 — TRANCHÉES avec Lyes le 2026-06-11 (après-midi)

- **[0047/portail] Politique RLS des vues maintenance pour les copropriétaires** — ✅ **Validé : rien maintenant** (le portail vient APRÈS la logique métier, ordre déjà acté). Les vues restent gestionnaire ; le périmètre copropriétaire (contrats ? carnet ? — communicables en droit) sera tranché **au design J3**, avec des vues portail dédiées épurées si besoin. État technique prêt : `v_contracts_overview` en LEFT JOIN, commentaires « gestionnaire uniquement » posés sur les vues KPIs.
- **[0047] `critical_unpaid_count`** — ✅ **Renommer en `unpaid_lots_count`** (la colonne dit ce qu'elle compte) + mettre à jour `usePortefeuille` + remplacer le `0` en dur de `lib/dashboard/api.ts` par la vraie valeur + aligner les statuts « prochaine AG » des deux côtés. La vraie criticité (≥ 90 j) viendra avec le chantier relances. **→ à faire en J2-bis.**
- **[OS] Boutons « Facturé »/« Payé »** — ✅ **Maintenant, dans J2-bis** : retirer FACTURE/PAYE du graphe de transitions + badge dérivé de la facture liée (`invoices_count`/`invoiced_total` déjà exposés par la vue). Règle « aucun faux bouton ».

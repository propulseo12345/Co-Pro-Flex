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

### Issues de la revue adversariale 0047 (2026-06-11) — parquées, à trancher avant le portail copro (J3)

- **[0047/portail] Politique RLS des vues maintenance pour les copropriétaires** — état prouvé : `tiers` est manager-only (un copropriétaire verrait un hub prestataires VIDE) ; `v_contracts_overview` passée en LEFT JOIN (le copropriétaire voit ses contrats, `provider_name` à NULL) ; `v_dashboard_kpis`/`v_maintenance_stats` documentées « fiables gestionnaire uniquement » (un copropriétaire verrait des chiffres partiels présentés comme des totaux). À trancher au design du portail J3 : qu'expose-t-on aux copropriétaires (prestataires ? contrats avec nom du prestataire ? aucun KPI agrégé ?) — soit policies dédiées, soit vues portail spécifiques.
- **[0047] `critical_unpaid_count` : libellé menteur** — c'est en réalité « nb de lots en impayé échu » (aucun seuil de criticité), fidèle au legacy ; le champ n'est rendu nulle part aujourd'hui, et `lib/dashboard/api.ts` renvoie un `critical_unpaid_count: 0` EN DUR (même nom, autre sémantique). Options : renommer en `unpaid_lots_count`, ou définir une vraie criticité (ex. `days_overdue >= 90`) et l'utiliser aux deux endroits. + Aligner les statuts « prochaine AG » (vue : draft/convoked ; dashboard api : + session_active/in_progress).
- **[OS] Boutons « Facturé »/« Payé » = no-op silencieux** — ces statuts n'existent plus sur les OS (la vérité vit sur `supplier_invoices` + paiements). La vue expose maintenant `invoices_count`/`invoiced_total` : retirer FACTURE/PAYE du graphe de transitions front et afficher un badge dérivé de la facture liée (posted → « Facturé », payée → « Payé »). UI à faire (J2-bis ou polish J10).

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

*(vide pour l'instant — se remplit au fil du run)*

# Glossaire — backlog à intégrer (passe groupée fin de cadrage)

> **Option A** (décidée 2026-06-25) : on n'édite PAS les glossaires terme par terme pendant le
> grilling (les concepts s'imbriquent, un arbitrage suivant peut déplacer une définition). On
> accumule ici le vocabulaire **ratifié**, et on fait l'enrichissement d'un coup en fin de cadrage
> (effort `ultracode`, comme la passe des 230 termes du 2026-06-24).
>
> Cibles : `CONTEXT.md` (métier/compta) · `docs/claude/glossaire-technique.md` (technique).
> Ne lister ici que les termes **tranchés**. Source = dossier de cadrage d'origine.

## Glossaire métier (`CONTEXT.md`)

| Terme | Définition courte | Source |
|---|---|---|
| Arrêter les comptes ≠ Approuver les comptes | « Arrêter » = acte du **syndic** à la clôture (fige + immutabilité). « Approuver » = vote de l'**AG** (art. 24). Deux actes, deux personnes. | C17-6 |
| Refus d'approbation en AG | L'exercice **reste clôturé** (non approuvé), pas de réouverture automatique ; réouverture = geste manuel du syndic en cas d'erreur réelle. Le refus est tracé dans la résolution d'AG, pas dans le statut de période. Continuité comptable préservée (à-nouveaux). | C17-6 |
| Période comptable (cycle) | 3 temps : **ouvert** (exercice en cours) → **clôturé** (arrêté des comptes) → **approuvé** (AG). « Approuvé » = verrou (intangibilité). | C17-6 |
| Mutation : signé ≠ validé | « Signé » = acte signé chez le notaire (fait juridique). « Validé » = le syndic acte ensuite le transfert du compte au nouvel acquéreur. | C17-6 |
| Ordre de service : refusé ≠ annulé | « Refusé » = le prestataire décline. « Annulé » = le syndic retire l'OS. Deux fins distinctes. | C17-6 |
| Grand livre = source unique des montants | Réalisé + impayés dérivent du GL, seul juge ; on ne maquille jamais, on corrige la cause. | EXP-7 |
| Support éditeur (super-admin) | Compte « support de l'éditeur » : **lecture seule par défaut** sur les données d'un cabinet client. Ne tient JAMAIS la compta d'un syndic (art. 18). Voir break-glass. | C17-8 |
| Break-glass | Écriture admin **exceptionnelle et encadrée** : fenêtre bornée dans le temps + motif obligatoire + journalisée + gestionnaire notifié. Pour une **remédiation technique d'urgence**, pas pour faire la compta à la place du syndic. Décidé **dès V1**. | C17-8 |
| Anti-cumul admin / gestionnaire | Une même personne n'est jamais à la fois admin-éditeur ET gestionnaire (juge ≠ partie). Comptes séparés, verrou en base. Vaut aussi pour le fondateur. | C17-8 |
| Journal d'audit | Table qui enregistre qui-a-fait-quoi-quand-pourquoi. Prérequis du break-glass → devient **prérequis V1**. Recoupe C17-2 (audit des annulations). | C17-8 / C17-2 |
| Rattrapage à deux vitesses | Si un job automatique saute des jours : l'**émission** d'appels est rejouée à sa **date d'exigibilité passée** (écriture comptable fidèle, mais jamais dans une période clôturée → alerte), la **relance** est rattrapée à **aujourd'hui** (jamais antidatée). Émission = on date l'**obligation** ; relance = on date l'**acte**. | C17-5 |
| Date d'exigibilité ≠ date d'édition (appel) | L'appel se date à son **exigibilité** (1er du trimestre, vraie et votée), pas au jour d'envoi ; affichage transparent « exigible le 1er · édité le 4 ». Pas un antidatage : on date l'obligation, pas le courrier. | C17-5 |
| Mode d'émission des appels | Réglage **au choix du gestionnaire**, par copro : « préparé + validation 1 clic » (**défaut** prudent) ou « automatique à échéance ». Le cron lit ce réglage copro par copro. | C17-5 |
| Annexe 1 — équilibre (créances = dettes) | Le bilan de la copro : colonne gauche (trésorerie + créances) = colonne droite (provisions/avances + dettes), au centime. **Égalité GLOBALE** (pas sous-total par sous-total). Une approbation des comptes sur annexe fausse est **annulable sur recours** (2 mois, art. 42). | EXP-4 |
| « Après répartition » / écart = résultat non affecté | Tant que le résultat de l'exercice n'est pas **affecté** (réparti sur les 450), les 2 colonnes diffèrent **exactement du résultat** = état transitoire **légitime**, pas un bug. + nuance **travaux gelés** (compte 12 garde un solde jusqu'à activation AG). | EXP-4 |
| Pop-up d'équilibre à deux visages | Garde-fou annexe 1 : **JAMAIS bloquant**. Pop-up à l'envoi, message adapté — 🟢 vert pédagogique avant affectation (« écart = résultat non affecté, normal »), 🔴 rouge alarmant après (« annexe fausse, risque juridique »). Le **passage outre est tracé** (qui/quand/écart, branché [[C17-2]]). | EXP-4 |

## Glossaire technique (`docs/claude/glossaire-technique.md`)

| Terme | Définition courte | Source |
|---|---|---|
| Machine à états | Liste de statuts d'un dossier (OS, vente, exercice) = son tableau d'avancement. Doctrine : **enum technique en anglais** dans la base = seule horloge de référence, **libellé français à l'affichage** uniquement. | C17-6 |
| Statut dérivé (voyant dérivé) | Indicateur **affiché mais pas stocké** : calculé en direct depuis un objet lié (OS qui lit l'état de sa facture, période qui lit le refus d'AG). « Afficher sans recopier ». | C17-6 |
| RPC de transition gardée | Tout changement de statut passe par une fonction SQL gardée (jamais un UPDATE front cru). Étend `set_ag_status` (C17-1) à OS/mutation. ~2 RPC à créer (OS, mutation) ; période a déjà ses RPC. | C17-6 / C17-1 |
| Garde-fou B8 (CI anti-dérive) | Test CI qui compare les valeurs d'enum SQL aux clés des maps de libellés front et casse si divergence (vaccin anti-drift type `sent_to_notary`). | C17-6 |
| Idempotence / empreinte naturelle | Un job/écriture rejoué ne double pas l'effet (clé naturelle). | C17-3 |
| Horloge métier (date explicite) | Date d'effet métier explicite + NOT NULL, jamais `now()` implicite (7 colonnes). | C17-4 |
| Audit des annulations | Annulation = colonnes typées + traçabilité (qui/quand/pourquoi). | C17-2 |
| Webhooks : porte unique en base | Entrée des webhooks par un seul point gardé en base, jamais de service_role qui shunte. | C17-7 |
| Flag `profiles.is_platform_admin` | Le droit super-admin vit sur `profiles` (posé hors flux : seed/console), PAS dans `memberships` ; `platform_admin` retiré de l'enum `membership_role` (une seule source de vérité). | C17-8 |
| Portier lecture / portier écriture | Les 2 pivots RLS : `user_has_copro_access` (lecture) et `user_is_copro_manager` (écriture). Le bypass admin ne vaut QUE pour le portier lecture ; retiré du portier écriture. | C17-8 |
| Table `support_session` | Support de la fenêtre break-glass : `admin_id, copro_id, motif, expires_at` ; consommée par le portier écriture pendant la fenêtre. Exige RLS FORCE généralisé (sinon la lecture seule est sans valeur). | C17-8 |
| Registre `cron_runs` | Cahier de bord des jobs automatiques : 1 ligne par (job, copro, date métier) + statut/horaires/résumé/erreur. La clé (job, copro, date) = **idempotence du rattrapage** (rejouer un jour déjà fait ne refait rien → jamais de double facturation). L'edge écrit son résultat ; pg_cron reste le déclencheur. | C17-5 |
| Alertes informatives (non bloquantes) | Une alerte (« aucun run réussi depuis N jours », renouvellement contrat…) **signale mais ne bloque jamais** un flux métier ; lue à l'écran (pull), pas poussée en V1. | C17-5 |

---

## Termes en attente (dossiers pas encore grillés — NE PAS intégrer tant que non tranché)

- Prochains dossiers à griller (ordre conseillé) : **EXP-5, EXP-3, EXP-6, EXP-1, C16-1, C15-5…** → leurs termes seront ajoutés ci-dessus au fur et à mesure qu'ils sont tranchés.

# Systeme de relances — Appels de fonds

**Date** : 2026-03-14
**Statut** : Design valide
**Scope** : Popup de relance par lot/appel avec stepper vertical 3 phases + apercu editable

---

## 1. Contexte

Le module appels de fonds affiche un bouton "Relancer" sur chaque ligne impayee dans la page detail. Ce bouton doit ouvrir une modale montrant le cycle de relance pour ce lot/appel specifique, avec 3 phases par defaut (configurables plus tard par le syndic).

L'infrastructure DB existe deja : tables `payment_reminders`, `payment_reminder_rules`, vues `v_unpaid_with_reminders`. L'API et les hooks React Query existent aussi (`useUnpaidWithReminders`, `usePaymentReminders`, `runPaymentReminders`).

---

## 2. Cycle de relance (template par defaut)

| Phase | Label | Delai | Canal par defaut | Type DB |
|-------|-------|-------|-----------------|---------|
| 1 | Relance amiable | J+15 apres echeance | Email | `amiable` |
| 2 | Relance formelle | J+30 apres echeance | Email + courrier | `formelle` |
| 3 | Mise en demeure | J+60 apres echeance | PDF recommande AR (telechargement, envoi postal prevu plus tard) | `mise_en_demeure` |

Les delais et le nombre de phases seront configurables par copro dans une version future (via `payment_reminder_rules`). Pour cette version, le template 3 phases est code en dur.

---

## 3. UX — Modale de relance

### Declenchement

Clic sur "Relancer" dans la colonne Actions du tableau `CoproTable` (page detail `/finance/appels-fonds/[callId]`).

### Structure de la modale

**Header** :
- Nom du coproprietaire
- Reference du lot
- Montant impaye sur cet appel
- Label de l'appel (ex: "T1 2026 — Charges generales")

**Stepper vertical** (3 etapes) :

Chaque etape est une ligne horizontale :
- **Icone ronde gauche** : check vert (envoyee), cercle bleu pulse (active), cercle gris (verrouillee)
- **Contenu** :
  - Label de la phase + delai entre parentheses
  - Si envoyee : "Envoyee le JJ/MM/AAAA par [canal]" en texte vert
  - Si active : bouton "Apercu et envoi"
  - Si verrouillee : "Disponible apres la phase precedente" en texte gris
- **Ligne verticale** reliant les etapes (trait plein vert pour les phases passees, pointille gris pour les futures)

**Phase active — Apercu et envoi** :

Quand le syndic clique "Apercu et envoi" :
1. Le contenu du courrier s'affiche dans un textarea editable (pre-rempli avec un template)
2. Selecteur de canal : email / courrier / les deux (pre-selectionne selon la phase)
3. Pour la mise en demeure : bouton "Telecharger le PDF" en plus du bouton envoi
4. Bouton "Envoyer la relance" pour confirmer

**Apres envoi** :
- La phase passe en statut "envoyee" avec date + canal
- La phase suivante se deverrouille
- Toast de confirmation

**Footer modale** : Bouton "Fermer"

---

## 4. Donnees persistees

Chaque relance envoyee cree un enregistrement dans `payment_reminders` :

```
call_line_id  UUID     — Ligne d'appel concernee
lot_id        UUID     — Lot concerne
phase         INTEGER  — 1, 2 ou 3
reminder_type TEXT     — 'amiable' | 'formelle' | 'mise_en_demeure'
channel       TEXT     — 'email' | 'courrier' | 'both'
content       TEXT     — Contenu du courrier (tel qu'envoye)
sent_at       TIMESTAMPTZ
call_id       UUID     — Appel de fonds parent
```

Ces donnees seront reutilisees dans l'onglet Contentieux pour le suivi des impayes.

### Verification de la table existante

La table `payment_reminders` existe deja. Les champs necessaires (`reminder_type`, `channel`, `sent_at`) sont probablement presents. Verifier et ajouter les champs manquants (`call_line_id`, `phase`, `content`, `call_id`) par migration si necessaire.

---

## 5. Architecture des composants

```
src/features/finance/appels-fonds/
├── components/
│   ├── RelanceModal.tsx          # Modale principale
│   ├── RelanceStepper.tsx        # Stepper vertical 3 phases
│   ├── RelancePreview.tsx        # Apercu + edition + envoi
│   └── ... (composants existants)
├── hooks/
│   └── useRelance.ts             # Charge historique relances pour un call_line, envoie relance
├── services/
│   └── relance-templates.ts      # Templates de contenu par phase
└── styles/
    └── RelanceModal.module.css   # Styles modale + stepper
```

### Hook useRelance

```typescript
interface UseRelanceReturn {
  // Historique des relances pour cette ligne
  reminders: PaymentReminder[];
  // Phase courante (la prochaine a envoyer)
  currentPhase: number; // 1, 2 ou 3
  // Phases avec leur statut
  phases: PhaseStatus[];
  // Envoyer une relance
  sendReminder: (content: string, channel: string) => Promise<void>;
  // Loading
  isLoading: boolean;
  isSending: boolean;
}

interface PhaseStatus {
  phase: number;
  label: string;
  type: string;
  defaultChannel: string;
  delayDays: number;
  status: 'sent' | 'active' | 'locked';
  sentAt?: string;
  sentChannel?: string;
}
```

### Integration dans CoproTable

Le bouton "Relancer" dans `CoproTable` ouvre `RelanceModal` en passant la `CallLineDetailed` selectionnee. La modale gere son propre state via `useRelance(callLineId)`.

---

## 6. Templates de contenu

Chaque phase a un template pre-rempli avec des variables :

```
{coproprietaire}  — Nom du coproprietaire
{lot}             — Reference du lot
{montant}         — Montant impaye
{echeance}        — Date d'echeance de l'appel
{appel}           — Label de l'appel
{copropriete}     — Nom de la copropriete
{syndic}          — Nom du syndic
{date}            — Date du jour
```

Templates par defaut :
- **Relance amiable** : ton cordial, rappel du montant et de l'echeance
- **Relance formelle** : ton ferme, mention des penalites possibles
- **Mise en demeure** : ton juridique, mention de l'article 19 de la loi du 10 juillet 1965, delai de 8 jours

---

## 7. Lien avec le futur onglet Contentieux

Les donnees de relance (`payment_reminders`) alimenteront un futur onglet "Contentieux" dans le module impayes/ventes. Ce design ne couvre pas cet onglet mais garantit que les donnees necessaires sont persistees :
- Historique complet des relances par lot/appel
- Phase atteinte (permet de savoir qui est en mise en demeure)
- Contenu envoye (preuve en cas de litige)

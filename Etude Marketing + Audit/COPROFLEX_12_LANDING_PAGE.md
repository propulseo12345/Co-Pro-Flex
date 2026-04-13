# COPROFLEX — 12. LANDING PAGE BUILDER
_Senior Conversion Copywriter + UX Designer + Front-end Architect — avril 2026_

---

## Brief consolidé

- **Produit** : CoProFlex — SaaS de gestion de copropriété pour syndics indépendants
- **ICP** : Sylvie, gérante indépendante, 60-200 copros, sous pression de Matera + réglementation 2026
- **Problème central** : perte de mandats, épuisement, peur de disparaître face aux néo-syndics et aux logiciels legacy
- **Mécanisme unique** : outil moderne natif + espace copropriétaire de niveau Matera + conformité 2026 (PPT, DPE, e-invoicing)
- **Top 3 concurrents mentionnables** : Matera (adversaire), ICS/Powimo (outils datés)
- **Objectif de la page** : DEMANDER UNE DÉMO (pas de free trial qui dilue les leads)
- **Ton** : direct, émotionnel-rationnel, militant sans être agressif — cohérent avec le positionnement "Résistance"
- **Stack** : Next.js 16 (déjà en place) + Tailwind + shadcn/ui

---

## Structure complète de la page (section par section)

### 1. NAV BAR (sticky, minimaliste)

```
[Logo CoProFlex]    Produit | Conformité 2026 | Tarifs | Blog     [Se connecter] [Demander une démo]
```

- CTA principal : *Demander une démo* (bouton violet plein)
- CTA secondaire : *Se connecter* (texte simple)

---

### 2. HERO SECTION

**Objectif conversion :** Capter l'attention en 3 secondes, susciter une identification émotionnelle, offrir un CTA clair.

**Layout :** Split 60/40. Gauche = texte. Droite = screenshot produit (dashboard avec badge "PPT 2026" visible).

**Headline (H1) :**
> # Le logiciel des syndics qui tiennent bon.

**Sub-headline :**
> Matera gagne des mandats chaque mois. Vos logiciels ont 15 ans. Vos copropriétaires veulent un accès 24/7. **CoProFlex vous donne les armes pour rester dans le jeu.** Un outil moderne, une expérience copropriétaire de nouvelle génération, et la conformité 2026 clé en main.

**CTAs :**
- **Primary :** [Demander une démo de 20 min] → bouton violet
- **Secondary :** [Voir le produit en 90 secondes] → lien texte avec play icon

**Micro-preuve sous CTA (à ajouter dès 3 clients) :**
> *« Utilisé par 3 cabinets indépendants. Conforme PPT, DPE 2026 et e-invoicing Factur-X. Hébergé en France. »*

**UX notes :**
- Pas d'animation superflue. Pas de slider hero.
- Le screenshot droite doit être statique, net, en haute résolution, et montrer une vraie interface CoProFlex (pas un mockup bidon)
- CTA visible sans scroll sur mobile et desktop
- Chargement <1 seconde

---

### 3. SOCIAL PROOF BAR (à activer dès que possible)

**Objectif :** crédibiliser immédiatement.

Contenu provisoire (si 0 client) :
> *« Construit à côté de gérants de syndic indépendants en France. Pas de VCs, pas de promesses creuses — juste un outil qui marche. »*

Contenu cible (à 5+ clients) :
> Logos 3-5 cabinets clients + *« +120 copropriétés gérées via CoProFlex »*

---

### 4. PROBLÈME — « Ce qui menace votre cabinet en 2026 »

**Objectif conversion :** provoquer une identification émotionnelle immédiate. Le visiteur doit se dire "c'est exactement ma situation".

**Layout :** 3 blocs côte à côte (icônes + titre + 2 lignes chacun)

**H2 :** Ce qui menace votre cabinet en 2026 (et vos concurrents font comme si de rien n'était).

| Bloc 1 | Bloc 2 | Bloc 3 |
|---|---|---|
| 🎯 **Matera gagne du terrain** | ⚖️ **La loi change (encore)** | 🖥️ **Votre outil vous ralentit** |
| Chaque mois, les néo-syndics vous retirent des mandats. Leur argument n°1 ? Un espace copropriétaire que vous n'avez pas. | PPT, DPE collectif, e-invoicing Factur-X... En 2026, vous devez tracker 5 nouvelles obligations. Votre logiciel actuel ne sait pas les gérer. | Votre logiciel a 15 ans. Il plante, il est lent, votre gestionnaire le déteste, et vos copropriétaires vous appellent pour des infos qu'ils devraient voir seuls. |

**CTA transitionnel après la section :**
> *« Vous vous reconnaissez ? Voyons comment on peut remettre les choses dans l'ordre. »*
> [Demander une démo de 20 min]

---

### 5. SOLUTION — « Ce que CoProFlex change »

**Objectif :** répondre point par point aux 3 problèmes. Pas une liste de features — une promesse de transformation.

**H2 :** *Un outil moderne, pensé pour les syndics qui ne lâchent rien.*

**Layout :** 3 blocs en miroir du précédent (parallélisme visuel)

| Avant | Avec CoProFlex |
|---|---|
| Matera vous retire des mandats avec leur extranet | **Un espace copropriétaire qui vaut le leur** — app mobile, votes en ligne, accès 24/7, messagerie, documents — natif, pas rajouté |
| Vous gérez le PPT et le DPE sur Excel | **Module Conformité 2026 intégré** — PPT Tracker, DPE collectif, suivi des travaux, Factur-X e-invoicing en natif |
| Votre gestionnaire passe 15h/semaine en saisie | **L'automatisation qui vous redonne un jour** — appels de fonds, relances impayés, convocations, recommandés digitaux automatisés |

---

### 6. COMMENT ÇA MARCHE

**Objectif :** réduire la friction "c'est trop compliqué à implémenter". Montrer qu'on vous tient la main.

**H2 :** *Opérationnel en moins d'une semaine. Oui, une semaine.*

**Layout :** 4 étapes horizontales avec icônes.

1. **Démo 20 minutes** — On regarde votre portefeuille et on qualifie ensemble.
2. **Migration accompagnée** — On reprend votre compta ICS, Crypto ou Powimo. Vous ne ressaisirez rien.
3. **Formation 1 journée** — Vos gestionnaires sont autonomes sur tous les modules.
4. **Go-live** — Vos premières AG passent dans CoProFlex dès la semaine suivante.

**Preuve quantifiée :**
> *« Migration moyenne : 4 jours ouvrés. Formation : 6 heures. Temps avant première AG réussie : 7 jours. »*

---

### 7. FEATURES (enfin !) — « Tout ce dont vous avez besoin, rien de plus »

**Objectif :** rassurer les rationnels (gestionnaires seniors) qui veulent une liste concrète.

**H2 :** *Tout ce dont un syndic indépendant a besoin. Jamais un module en plus.*

**Layout :** grid 2×5 ou 3×4, icône + titre + 1 ligne.

- **AG digitales** — Convocation, vote en ligne, PV auto, calcul des majorités art. 24/25/26
- **Comptabilité copro** — Budgets, appels de fonds, grand livre, annexes légales
- **Impayés automatisés** — Relances J+15, J+30, J+60, mise en demeure, contentieux
- **Espace copropriétaire** — App mobile, documents, solde, votes, messagerie
- **PPT & DPE 2026** — Tracker, échéanciers, rappels auto
- **Maintenance & OS** — Workflow 11 étapes, contrats prestataires, alertes
- **E-invoicing Factur-X** — Conforme réforme 2026
- **Open banking** — Connexion comptes, rapprochement auto
- **Ventes de lot** — Pré-état daté, état daté, certificat art. 20
- **Communication** — Messagerie, événements, mur communautaire

**CTA :** *[Voir toutes les fonctionnalités en détail]*

---

### 8. CAS D'USAGE / TÉMOIGNAGES

**Objectif :** preuve sociale. Si 0 client, remplacer par un "manifesto fondateur".

**H2 :** *Les syndics qui ont repris le contrôle*

**Layout v1 (sans clients) :**
Section "Manifeste" — Étienne face caméra (photo ou vidéo), 200 mots :
> *« J'ai construit CoProFlex parce que je suis convaincu qu'il existe une place en France pour les gérants de syndic indépendants. Pas une place résiduelle — une place centrale. Matera et les réseaux n'ont pas le monopole du service client. Vous avez la proximité, l'expérience, la réactivité. Ce qui vous manque, c'est un outil à la hauteur. C'est ce que CoProFlex essaie d'être. On construit avec vous, pas pour vous. »* — Étienne, fondateur

**Layout v2 (à 3-5 clients) :** 3 cartes témoignages avec photo, nom, cabinet, citation de 3 lignes, résultat quantifié ("passé de 80 à 120 copros sans embaucher", "0 mandat perdu à Matera depuis 6 mois", etc.)

---

### 9. TARIFS (simple et sans pièges)

**Objectif :** Dédier une section au pricing pour éliminer les doutes. Transparence = argument.

**H2 :** *Une tarification claire. Sans frais cachés.*

**Layout :** 3 cartes (plus l'Enterprise "à partir de").

| STARTER | **ÉTABLI** ⭐ | CABINET |
|---|---|---|
| **79 €/mois** | **349 €/mois** | **990 €/mois** |
| Jusqu'à 10 copros | Jusqu'à 50 copros | Jusqu'à 200 copros |
| 1 user | 5 users | Illimité |
| Essai gratuit 30 jours | Essai gratuit 30 jours | Démo sur RDV |
| [Démarrer] | **[Démarrer]** | [Contacter] |

Sous le tableau :
> *« Plus de 200 copropriétés ? Le plan Cabinet Sur Mesure démarre à 1 990 €/mois. [En savoir plus] »*
> *« -15% en facturation annuelle. Migration depuis ICS/Crypto/Powimo incluse à partir du plan Établi. »*

---

### 10. FAQ

**Objectif :** lever les 8 objections les plus fréquentes.

**Format :** accordions, max 8 questions.

1. **"Et si j'ai déjà 15 ans d'historique sur ICS ?"** → Réponse : notre équipe migre pour vous, ressaisie zéro, délai moyen 4 jours
2. **"CoProFlex est conforme au plan comptable copropriété 2005 ?"** → Oui, audit par expert-comptable indépendant, attestation fournie
3. **"Que se passe-t-il si je ne suis pas satisfait ?"** → 30 jours satisfait ou remboursé après go-live
4. **"Vos serveurs sont en France ?"** → Oui, Supabase EU/France, RGPD conforme
5. **"Combien de temps la migration prend-elle ?"** → 4-7 jours ouvrés en moyenne
6. **"Avez-vous une app mobile ?"** → Oui, iOS et Android pour vos copropriétaires
7. **"E-invoicing Factur-X est prêt ?"** → Oui, opérationnel pour la réforme septembre 2026
8. **"Qui est derrière CoProFlex ?"** → Étienne + mention de Propul'SEO

---

### 11. CTA FINAL — La section de la dernière chance

**H2 :** *Votre prochain client sait déjà ce qu'il veut. Et vous ?*

**Sub-text :**
> En 2026, les copropriétaires qui cherchent un syndic regardent deux choses : la réactivité humaine et la qualité de l'outil. L'une, vous l'avez déjà. L'autre, on peut la changer en 20 minutes de démo.

**CTA gigantesque :** [Demander une démo maintenant] (violet plein, hover darker)

**Micro-copy sous CTA :**
> *« 20 minutes. Sans engagement. Sans commercial insistant. »*

---

### 12. FOOTER

Standard. 4 colonnes : Produit / Entreprise / Conformité / Contact. Mention "Hébergé en France", logos RGPD et conformité légale.

---

## Composants React (dev-ready)

```
/app
├── page.tsx                        // landing
├── components/
│   ├── Hero.tsx
│   ├── SocialProof.tsx
│   ├── ProblemSection.tsx
│   ├── SolutionSection.tsx
│   ├── HowItWorks.tsx
│   ├── FeaturesGrid.tsx
│   ├── ManifestoSection.tsx       // v1 sans clients
│   ├── TestimonialsGrid.tsx       // v2 avec clients
│   ├── PricingTable.tsx
│   ├── FAQ.tsx
│   ├── FinalCTA.tsx
│   └── Footer.tsx
├── components/ui/
│   ├── Button.tsx (shadcn)
│   ├── Accordion.tsx (shadcn)
│   └── Card.tsx (shadcn)
└── lib/
    └── analytics.ts                // Plausible ou Mixpanel
```

### Props clés par composant

**Hero.tsx**
```tsx
interface HeroProps {
  headline: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  screenshotSrc: string;
}
```

**PricingTable.tsx**
```tsx
interface Plan {
  name: string;
  price: string;
  copros: string;
  users: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  ctaHref: string;
}
```

---

## Schema Supabase pour le formulaire démo

Table `demo_requests` :
```sql
create table demo_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  full_name text not null,
  email text not null,
  company text not null,
  role text,
  portfolio_size text,  -- '<10' | '10-30' | '31-80' | '81-150' | '150+'
  current_software text,
  pain_point text,
  availability text,
  source text,  -- utm_source
  status text default 'new'  -- 'new' | 'qualified' | 'booked' | 'won' | 'lost'
);
```

Variables d'environnement :
```
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
PLAUSIBLE_DOMAIN=
```

---

## La plus grande faiblesse de cette page

**L'absence de preuve sociale réelle.** En v1 sans clients, la section 8 (Manifeste) est vulnérable. Un visiteur sérieux va penser *"personne n'utilise ça, je ne vais pas être le premier"*.

**Contre-mesure :** placer juste sous le hero un badge *"Programme Fondateurs — 10 premiers clients à -50% à vie"* qui transforme le manque de clients en une opportunité exclusive, pas une faiblesse. Le scarcity joue en ta faveur.

---

## 3 tests A/B à lancer (ordre de priorité)

### Test 1 — Headline (le plus important)
- Variant A : *"Le logiciel des syndics qui tiennent bon."*
- Variant B : *"Reprenez l'avantage sur Matera."*
- Variant C : *"Le logiciel de syndic pensé en 2026."*

**Métrique :** scroll rate à la section Problème, taux de click CTA hero.

### Test 2 — CTA principal
- *Demander une démo* vs *Réserver 20 minutes avec le fondateur*
- **Hypothèse :** l'option 2 convertit mieux pour Sylvie (elle veut parler au patron, pas à un SDR)

### Test 3 — Section tarifs
- Avec vs sans le plan Starter visible
- **Hypothèse :** masquer le Starter force les vrais ICP à choisir Établi (meilleur ARPU)

---

## L'amélioration qui doublerait (peut-être) la conversion

**Ajouter un quiz interactif dans le hero :** *"En 60 secondes, découvrez votre risque de perdre un mandat à Matera en 2026."*

3 questions :
1. Combien de copros gérez-vous ?
2. Avez-vous un espace copropriétaire 24/7 ?
3. Votre logiciel gère-t-il nativement le PPT et le DPE collectif ?

Résultat personnalisé : *"Votre risque est élevé. Voici ce que CoProFlex peut faire."* + CTA démo.

**Pourquoi ça marche :**
- Engagement actif (vs lecture passive)
- Personnalisation du message
- Capture email en fin de quiz = enrichissement de pipeline même si pas de démo
- Viralité : les gens partagent les quiz entre eux

**Effort dev :** 1-2 jours. ROI potentiel : 2× à 3× sur le taux de conversion.

# Atlas Front — 09 · Site marketing (public)

Zone : `src/app/(marketing)/**` (route group sans préfixe d'URL).
Inventaire **léger** : l'objectif est de confirmer si la zone touche la base. **Verdict : non.**

## Synthèse

- **Aucun accès base de données dans toute la zone.** Grep `.rpc(` / `.from(` / `functions.invoke` / `/api/` / `fetch(` / `useQuery` / `useMutation` / `createClient` / `supabase` sur `src/app/(marketing)`, `src/components/features/marketing` et `src/components/features/accueil` = **0 résultat** (hors une string littérale `Partenaire N` dans `LogoCarousel`).
- **Aucun hook consommé** (`from '@/hooks'` = 0 résultat dans la zone).
- Données = **fichiers statiques locaux** : `@/data/blog-articles`, `tarifs/data.ts`, `faq/data.ts`, et constantes inline.
- C'est une vitrine 100 % présentationnelle (SSG/CSR sans I/O). Rien à migrer côté DB.

## Tableau des écrans

| Écran (route) | Rôle | Hooks | Données touchées | Statut |
|---|---|---|---|---|
| `/` (`page.tsx`) | Accueil / landing : sections AG, Finance, Maintenance, démos interactives, témoignages, CTA | aucun (useState local dans démos) | aucune — composants `features/accueil/*` + contenu inline | actif |
| `/contact` (`page.tsx` + `ContactForm.tsx`) | Page contact + formulaire démo | aucun | **aucune — submit factice** (`setIsSubmitted(true)`, pas de POST/RPC) | actif **à problème** (formulaire mort côté backend) |
| `/tarifs` (`page.tsx` + `PricingContent.tsx`) | Grille tarifaire + comparatif + FAQ | aucun (useState toggle) | `tarifs/data.ts` (statique) | actif |
| `/faq` (`page.tsx` + `FaqContent.tsx`) | FAQ par catégories | aucun (useState onglet) | `faq/data.ts` (statique) | actif |
| `/blog` (`page.tsx` + `BlogList.tsx`) | Liste articles + filtre catégorie | aucun (useState/useMemo) | `@/data/blog-articles` (statique) | actif |
| `/blog/[slug]` (`page.tsx`) | Article + articles liés ; `generateStaticParams` | aucun | `@/data/blog-articles` (statique, SSG) | actif |
| `/comment-ca-marche` | Page « comment ça marche » | aucun | inline | actif |
| `/comparaison` | Comparaison concurrents | aucun | inline | actif |
| `/a-propos` | Présentation société | aucun | inline | actif |
| `/securite` | Argumentaire sécurité | aucun | inline | actif |
| `/confidentialite` | Politique de confidentialité (légal) | aucun | inline | actif |
| `/cgu` | CGU (légal) | aucun | inline | actif |
| `/mentions-legales` | Mentions légales (légal) | aucun | inline | actif |
| `layout.tsx` | Shell : `LpNav` + `Footer` + fonts/metadata | aucun | aucune | actif |

### Composants `features/marketing` (partagés, statiques)
`LpNav` (nav + liens `/auth/login`, `/contact`), `Footer`, `PageHero`, `FaqAccordion`, `SectionHeader`, `CtaBanner` — tous présentationnels, **aucun accès base**.

### Composants `features/accueil` (démos vitrine)
`DiscoverSection`, `FeatureGrid`, `Testimonials`, `Sizes`, `Support`, `CtaSection`, `LogoCarousel`, `DemoThemeContext/Toggle/Wrapper` + démos (`DemoAgVotes`, `DemoAgPv`, `DemoFinance`, `DemoAppelsFonds`, `DemoMaintenance`, `DemoDocuments`, `DemoAg`, `DemoDashboard`, `DemoCommunication`). Ce sont des **maquettes animées** (useState/CSS only) qui imitent l'app sans jamais l'appeler.

## Anomalies de la zone

1. **Formulaire de contact mort côté backend.** `ContactForm.tsx` ne fait qu'un `setIsSubmitted(true)` puis affiche « Demande envoyée ! Réponse sous 2h ». **Aucun POST, aucune route `/api`, aucune RPC, aucun envoi d'email.** Les demandes de démo sont perdues. (À brancher sur une route API / table `leads` / edge mail lors de la mise en prod.)
2. **Fichiers morts (non importés nulle part) dans `features/accueil`** :
   - `InteractiveSlider.tsx` (+ `.module.css`) — jamais importé.
   - `Footer.tsx` — jamais importé (le layout marketing utilise `features/marketing/Footer`). Doublon trompeur : 2 `Footer` dans `accueil`/`marketing`, seul `marketing/Footer` est monté.
   → candidats suppression.
3. **Coordonnées placeholder en dur** dans `contact/page.tsx` : téléphone `01 86 XX XX XX`, adresse `12 rue de la Copropriété`, email `contact@coproflex.fr`. À remplacer avant prod (cosmétique, pas DB).
4. **Pas de doublon d'écran** au sens route. Les 13 routes sont distinctes et toutes routées.

## Croisement DB-cible
Sans objet : la zone ne référence **aucune** RPC ni table. Rien à confronter à `INVENTAIRE-FONCTIONS.md` / `OBJETS-ABANDONNES.md`.

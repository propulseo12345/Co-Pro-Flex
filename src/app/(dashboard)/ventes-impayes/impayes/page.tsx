import { redirect } from 'next/navigation';

/**
 * Route consolidée (V3 — chantier câblage).
 *
 * L'écran impayés était dupliqué à l'identique entre `/ventes-impayes/impayes` et
 * `/contentieux/impayes` (même hook `useImpayesPage`, mêmes composants). Le canonique est
 * `/contentieux/impayes` (point d'entrée nav + recherche, et redirection déjà posée dans
 * next.config.ts). On redirige donc cette route pour ne garder qu'une seule implémentation.
 *
 * NB : le fichier `impayes.module.css` co-localisé est CONSERVÉ — il est importé par les
 * composants de `@/components/features/ventes-impayes/impayes/components`.
 */
export default function ImpayesPage() {
  redirect('/contentieux/impayes');
}

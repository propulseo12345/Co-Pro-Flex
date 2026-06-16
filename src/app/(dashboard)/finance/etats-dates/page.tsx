import { redirect } from 'next/navigation';

/**
 * Route consolidée (V1 — chantier câblage).
 *
 * L'ancien moteur « État daté » de Finance était 100 % mocké (lots/copros en
 * dur, calculs factices, export HTML via window.print, zéro persistance). Le
 * parcours canonique vit désormais dans les mutations : lot → mutation →
 * RPC `create_etat_date_snapshot` → `EtatDateViewer` (payload V2 immuable, PDF
 * archivé en GED).
 *
 * On redirige donc cette URL vers la liste des mutations, seul point d'entrée
 * réel de l'état daté (où l'on crée/sélectionne une mutation). L'UI mock
 * historique (`src/features/finance/datedStates/*`, `useEtatsDate`,
 * `types/models/etat-date.ts`) devient morte → suppression en B4.
 */
export default function EtatsDatePage() {
  redirect('/ventes-impayes/ventes');
}

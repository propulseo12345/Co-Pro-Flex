'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResolutionsReorderList, type Resolution } from '@/components/features/ag';
import styles from './resolutions-preview.module.css';

const INITIAL_RESOLUTIONS: Resolution[] = [
  {
    id: 'r1',
    titre: 'Élection du président de séance',
    texte: "L'assemblée générale désigne Monsieur Dupont en qualité de président de séance pour la durée de la présente AG.",
    majorite: 'ART_24',
    custom: false,
    categorie: 'Assemblée Générale',
    variables: { president_nom: '' },
  },
  {
    id: 'r2',
    titre: 'Désignation du secrétaire',
    texte: "L'assemblée générale désigne Madame Martin en qualité de secrétaire de séance.",
    majorite: 'ART_24',
    custom: false,
    categorie: 'Assemblée Générale',
    variables: { secretaire_nom: 'Mme Martin' },
  },
  {
    id: 'r3',
    titre: 'Approbation des comptes',
    texte: "Après examen des comptes de l'exercice clos, l'assemblée générale approuve les comptes présentés.",
    majorite: 'ART_24',
    custom: false,
    categorie: 'Finances',
    variables: { exercice: '2025' },
  },
  {
    id: 'r4',
    titre: 'Renouvellement du contrat de maintenance',
    texte: "L'assemblée décide de renouveler le contrat de maintenance de l'ascenseur pour une durée de 3 ans.",
    majorite: 'ART_25',
    custom: false,
    categorie: 'Contrats',
    variables: { prestataire: '' },
  },
];

export default function ResolutionsPreviewPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get('v') === '2' ? 'cards' : 'table';
  const [resolutions, setResolutions] = useState<Resolution[]>(INITIAL_RESOLUTIONS);

  const title = useMemo(
    () => (view === 'cards' ? 'Preview V2 - Cartes éditoriales' : 'Preview V1 - Tableau compact'),
    [view]
  );

  return (
    <div className="container">
      <div className={styles.header}>
        <h1>{title}</h1>
        <div className={styles.links}>
          <Link className={view === 'table' ? styles.active : ''} href="/ag/resolutions-preview?v=1">
            Voir V1
          </Link>
          <Link className={view === 'cards' ? styles.active : ''} href="/ag/resolutions-preview?v=2">
            Voir V2
          </Link>
        </div>
      </div>

      <ResolutionsReorderList
        resolutions={resolutions}
        onReorder={setResolutions}
        onDelete={(id) => setResolutions((prev) => prev.filter((r) => r.id !== id))}
        onEdit={() => {}}
        variant={view}
      />
    </div>
  );
}

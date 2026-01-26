'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  FileText,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Share2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { rapportCSService } from '@/lib/services/rapport-cs.service';
import { RapportActiviteCS, StatutRapportCS } from '@/types/models/conseil-syndical';
import styles from './conseil-syndical.module.css';

// Données mockées pour la démo
const MOCK_MEMBRES = [
  { id: '1', nom: 'Martin', prenom: 'Pierre', role: 'president' as const, email: 'p.martin@email.com' },
  { id: '2', nom: 'Dupont', prenom: 'Marie', role: 'secretaire' as const, email: 'm.dupont@email.com' },
  { id: '3', nom: 'Bernard', prenom: 'Jean', role: 'tresorier' as const, email: 'j.bernard@email.com' },
  { id: '4', nom: 'Lambert', prenom: 'Sophie', role: 'membre' as const, email: 's.lambert@email.com' },
];

const MOCK_RAPPORTS: RapportActiviteCS[] = [
  {
    id: 'rapport-1',
    conseilSyndicalId: 'cs-1',
    coproprieteId: 'copro-1',
    periodeDebut: new Date('2023-06-01'),
    periodeFin: new Date('2024-05-31'),
    titre: 'Rapport d\'activité 2023-2024',
    introduction: 'Présentation des activités du Conseil Syndical pour l\'exercice 2023-2024.',
    contenu: '',
    contenuBrut: '',
    sections: [],
    annexes: [],
    statut: 'brouillon',
    auteurId: '1',
    createdAt: new Date('2024-04-15'),
    updatedAt: new Date('2024-04-20'),
  },
  {
    id: 'rapport-2',
    conseilSyndicalId: 'cs-1',
    coproprieteId: 'copro-1',
    periodeDebut: new Date('2022-06-01'),
    periodeFin: new Date('2023-05-31'),
    titre: 'Rapport d\'activité 2022-2023',
    introduction: 'Présentation des activités du Conseil Syndical pour l\'exercice 2022-2023.',
    contenu: 'Contenu détaillé du rapport...',
    contenuBrut: 'Contenu détaillé du rapport...',
    sections: [],
    annexes: [{ id: 'a1', rapportId: 'rapport-2', nom: 'Audit comptable', type: 'document', ordre: 1 }],
    statut: 'publie',
    agId: 'ag-2023',
    auteurId: '1',
    createdAt: new Date('2023-04-10'),
    updatedAt: new Date('2023-05-15'),
  },
];

function getRoleLabel(role: string): string {
  switch (role) {
    case 'president': return 'Président';
    case 'secretaire': return 'Secrétaire';
    case 'tresorier': return 'Trésorier';
    case 'membre': return 'Membre';
    default: return role;
  }
}

function getStatutLabel(statut: StatutRapportCS): string {
  switch (statut) {
    case 'brouillon': return 'Brouillon';
    case 'en_revision': return 'En révision';
    case 'valide': return 'Validé';
    case 'publie': return 'Publié';
    case 'archive': return 'Archivé';
    default: return statut;
  }
}

function getStatutIcon(statut: StatutRapportCS) {
  switch (statut) {
    case 'brouillon': return <Clock size={14} />;
    case 'en_revision': return <AlertCircle size={14} />;
    case 'valide': return <CheckCircle size={14} />;
    case 'publie': return <Share2 size={14} />;
    default: return null;
  }
}

export default function ConseilSyndicalPage() {
  const [activeTab, setActiveTab] = useState<'membres' | 'rapports'>('rapports');

  const handleCreateRapport = async () => {
    // TODO: Ouvrir un modal pour créer un nouveau rapport
    const now = new Date();
    const periodeDebut = new Date(now.getFullYear() - 1, 5, 1); // 1er juin année précédente
    const periodeFin = new Date(now.getFullYear(), 4, 31); // 31 mai année courante

    try {
      const rapport = await rapportCSService.creerRapport({
        conseilSyndicalId: 'cs-1',
        coproprieteId: 'copro-1',
        auteurId: '1',
        periodeDebut,
        periodeFin,
        titre: `Rapport d'activité ${periodeDebut.getFullYear()}-${periodeFin.getFullYear()}`,
      });

      // Rediriger vers la page d'édition
      window.location.href = `/conseil-syndical/rapport/${rapport.id}`;
    } catch (error) {
      console.error('Erreur création rapport:', error);
      alert('Erreur lors de la création du rapport');
    }
  };

  return (
    <div className={styles.container}>
      {/* En-tête */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>
            <Users size={24} aria-hidden="true" />
            Conseil Syndical
          </h1>
          <p>Gestion des membres et des rapports d&apos;activité</p>
        </div>
      </header>

      {/* Onglets */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'rapports' ? styles.active : ''}`}
          onClick={() => setActiveTab('rapports')}
        >
          <FileText size={18} aria-hidden="true" />
          Rapports d&apos;activité
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'membres' ? styles.active : ''}`}
          onClick={() => setActiveTab('membres')}
        >
          <Users size={18} aria-hidden="true" />
          Membres
        </button>
      </div>

      {/* Contenu */}
      <main className={styles.content}>
        {activeTab === 'rapports' && (
          <>
            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleCreateRapport}
              >
                <Plus size={18} aria-hidden="true" />
                Nouveau rapport
              </button>
            </div>

            {/* Liste des rapports */}
            <div className={styles.rapportsList}>
              {MOCK_RAPPORTS.map(rapport => (
                <Link
                  key={rapport.id}
                  href={`/conseil-syndical/rapport/${rapport.id}`}
                  className={styles.rapportCard}
                >
                  <div className={styles.rapportHeader}>
                    <h3>{rapport.titre}</h3>
                    <span className={`${styles.badge} ${styles[rapport.statut]}`}>
                      {getStatutIcon(rapport.statut)}
                      {getStatutLabel(rapport.statut)}
                    </span>
                  </div>
                  <div className={styles.rapportMeta}>
                    <span>
                      <Calendar size={14} aria-hidden="true" />
                      {rapport.periodeDebut.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      {' - '}
                      {rapport.periodeFin.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </span>
                    {rapport.annexes.length > 0 && (
                      <span>
                        {rapport.annexes.length} annexe{rapport.annexes.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className={styles.rapportIntro}>
                    {rapport.introduction || 'Aucune introduction'}
                  </p>
                  <div className={styles.rapportFooter}>
                    <span className={styles.lastUpdate}>
                      Modifié le {rapport.updatedAt?.toLocaleDateString('fr-FR')}
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {activeTab === 'membres' && (
          <div className={styles.membresGrid}>
            {MOCK_MEMBRES.map(membre => (
              <div key={membre.id} className={styles.membreCard}>
                <div className={styles.membreAvatar}>
                  {membre.prenom[0]}{membre.nom[0]}
                </div>
                <div className={styles.membreInfo}>
                  <h3>{membre.prenom} {membre.nom}</h3>
                  <span className={styles.membreRole}>{getRoleLabel(membre.role)}</span>
                  <a href={`mailto:${membre.email}`} className={styles.membreEmail}>
                    {membre.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

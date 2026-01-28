'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Plus, ArrowRight, FileText, AlertTriangle, Bell, Home, CheckCircle2, Euro, Loader2 } from 'lucide-react';
import { useVentesImpayesPage } from '@/hooks/modules/useVentesImpayesPage';
import { useVentesContext } from '@/providers/VentesProvider';
import {
  VentesRecentesSection,
  ImpayesCritiquesSection,
  RelanceModal,
  ActivitySection,
} from '@/components/features/ventes-impayes';
import styles from './ventes-impayes.module.css';

// Impayés data is still mock for MVP (separate module)
const IMPAYES_CRITIQUES = [
  {
    id: 1,
    coproprietaire: 'M. Simon',
    lot: 'Appartement D7',
    montant: 1850,
    retard: 95,
    statut: 'relance_2',
    type: 'Charges T3 2026'
  },
  {
    id: 2,
    coproprietaire: 'Mme Lopez',
    lot: 'Appartement F1',
    montant: 4200,
    retard: 125,
    statut: 'contentieux',
    type: 'Charges T2 2026'
  },
  {
    id: 3,
    coproprietaire: 'Mme Garcia',
    lot: 'Appartement B8',
    montant: 1120,
    retard: 65,
    statut: 'relance_1',
    type: 'Charges T4 2025'
  }
];

const IMPAYES_BREAKDOWN = [
  { statut: 'en_retard', label: 'En retard', count: 2, montant: 2450, color: '#fef3c7', textColor: '#92400e' },
  { statut: 'relance_1', label: 'Relance 1', count: 2, montant: 2970, color: '#fed7aa', textColor: '#9a3412' },
  { statut: 'relance_2', label: 'Relance 2', count: 2, montant: 3230, color: '#fecaca', textColor: '#991b1b' },
  { statut: 'contentieux', label: 'Contentieux', count: 2, montant: 3800, color: '#fee2e2', textColor: '#7f1d1d' }
];

export default function VentesImpayesPage() {
  const { ventes, isLoading, error } = useVentesContext();

  const {
    showRelanceModal,
    selectedImpayes,
    toggleImpayeSelection,
    handleRelanceGroupee,
    closeRelanceModal,
    setShowRelanceModal,
  } = useVentesImpayesPage();

  // Compute stats from real ventes data
  const stats = useMemo(() => {
    const enCours = ventes.filter(v => v.statut === 'EN_COURS').length;
    const finalisees = ventes.filter(v => v.statut === 'TERMINEE').length;
    const withMissingDocs = ventes.filter(v =>
      v.statut === 'EN_COURS' && v.documents.some(d => d.statut === 'EN_ATTENTE')
    ).length;

    return [
      {
        id: 'ventes-en-cours',
        label: 'Ventes en cours',
        value: enCours,
        icon: Home,
        color: '#4f46e5',
        link: '/ventes-impayes/ventes?statut=en_cours',
        subInfo: withMissingDocs > 0 ? `${withMissingDocs} avec documents manquants` : undefined
      },
      {
        id: 'ventes-finalisees',
        label: 'Ventes finalisées',
        value: finalisees,
        icon: CheckCircle2,
        color: '#10b981',
        link: '/ventes-impayes/ventes?statut=finalise',
        subInfo: undefined
      },
      {
        id: 'impayes-en-cours',
        label: 'Impayés en cours',
        value: IMPAYES_CRITIQUES.length,
        icon: AlertTriangle,
        color: '#ef4444',
        link: '/ventes-impayes/impayes',
        subInfo: '3 en contentieux'
      },
      {
        id: 'montant-impayes',
        label: 'Montant total impayés',
        value: '12 450 €',
        icon: Euro,
        color: '#f59e0b',
        link: '/ventes-impayes/impayes',
        subInfo: 'Retard moyen: 65 jours'
      }
    ];
  }, [ventes]);

  // Convert ventes to the format expected by VentesRecentesSection
  const ventesRecentes = useMemo(() => {
    return ventes.slice(0, 5).map(v => ({
      id: v.id,
      lot: v.lotTypes[0] ? `${v.lotTypes[0]} - Lot ${v.lotIds[0]?.slice(-4) || ''}` : 'Lot',
      vendeur: v.vendeur,
      acquereur: v.acquereur || 'Non défini',
      statut: v.statut === 'EN_COURS' ? 'en_cours' : v.statut === 'TERMINEE' ? 'finalise' : 'annule',
      etape: mapWorkflowStepToLabel(v.etapeWorkflow),
      dateCompromis: v.dateCompromis || '',
      documentsManquants: v.documents.filter(d => d.statut === 'EN_ATTENTE').length
    }));
  }, [ventes]);

  // Generate activity from recent ventes
  const recentActivity = useMemo(() => {
    return ventes.slice(0, 3).map(v => ({
      id: v.id,
      type: 'vente' as const,
      title: `Vente - ${v.lotTypes[0] || 'Lot'} ${v.lotIds[0]?.slice(-4) || ''}`,
      description: `Vendeur: ${v.vendeur} - Acquéreur: ${v.acquereur || 'Non défini'}`,
      date: v.dateModification,
      icon: v.statut === 'TERMINEE' ? CheckCircle2 : Home,
      color: v.statut === 'TERMINEE' ? '#10b981' : '#4f46e5',
      link: `/ventes-impayes/ventes/${v.id}`
    }));
  }, [ventes]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 className={styles.loadingSpinner} size={32} />
          <p>Chargement des ventes...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <div className={styles.errorState}>
          <AlertTriangle size={32} />
          <p>Erreur: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ventes & Impayés</h1>
          <p className={styles.subtitle}>
            Gestion centralisée des ventes de lots et du suivi des impayés
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ventes-impayes/ventes/nouvelle" className={styles.primaryButton}>
            <Plus size={18} aria-hidden="true" />
            Nouvelle vente
          </Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.id} href={stat.link} className={styles.statCard} aria-hidden="true">
              <div className={styles.statIcon} style={{ background: `${stat.color}20` }}>
                <Icon size={24} style={{ color: stat.color }} aria-hidden="true" />
              </div>
              <div className={styles.statContent}>
                <h3 className={styles.statValue}>{stat.value}</h3>
                <p className={styles.statLabel}>{stat.label}</p>
                {stat.subInfo && (
                  <span className={styles.statSubInfo}>{stat.subInfo}</span>
                )}
              </div>
              <ArrowRight size={18} className={styles.statArrow} aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      <div className={styles.twoColumnGrid}>
        {ventesRecentes.length > 0 ? (
          <VentesRecentesSection ventes={ventesRecentes} />
        ) : (
          <div className="card">
            <h2 className={styles.sectionTitle}>Ventes récentes</h2>
            <div className={styles.emptyState}>
              <Home size={48} />
              <p>Aucune vente en cours</p>
              <Link href="/ventes-impayes/ventes/nouvelle" className={styles.emptyStateButton}>
                <Plus size={16} />
                Créer une vente
              </Link>
            </div>
          </div>
        )}
        <ImpayesCritiquesSection
          impayes={IMPAYES_CRITIQUES}
          breakdown={IMPAYES_BREAKDOWN}
          selectedImpayes={selectedImpayes}
          onToggleSelection={toggleImpayeSelection}
          onRelanceGroupee={handleRelanceGroupee}
        />
      </div>

      {recentActivity.length > 0 && (
        <ActivitySection activities={recentActivity} />
      )}

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Actions rapides</h2>
        <div className={styles.quickLinksGrid}>
          <Link href="/ventes-impayes/ventes/nouvelle" className={styles.quickLink}>
            <Plus size={20} aria-hidden="true" />
            Nouvelle vente
          </Link>
          <Link href="/ventes-impayes/impayes" className={styles.quickLink}>
            <AlertTriangle size={20} aria-hidden="true" />
            Gérer les impayés
          </Link>
          <button
            className={styles.quickLink}
            onClick={() => setShowRelanceModal(true)}
          >
            <Bell size={20} aria-hidden="true" />
            Planifier relances
          </button>
          <Link href="/ventes-impayes/ventes" className={styles.quickLink}>
            <FileText size={20} aria-hidden="true" />
            Toutes les ventes
          </Link>
        </div>
      </div>

      <RelanceModal
        isOpen={showRelanceModal}
        onClose={closeRelanceModal}
        selectedCount={selectedImpayes.length}
      />
    </div>
  );
}

// Helper function to map workflow step to label
function mapWorkflowStepToLabel(step: string): string {
  switch (step) {
    case 'creation':
    case 'demande':
      return 'Demande créée';
    case 'generation':
    case 'pre_etat_date':
      return 'Pré-état daté';
    case 'etat_date':
      return 'État daté';
    case 'signature':
    case 'envoi_notaire':
      return 'Envoi notaire';
    case 'transmission':
    case 'signature_acte':
      return 'Signature acte';
    case 'notification':
    case 'cloture_compte':
      return 'Terminé';
    default:
      return 'En cours';
  }
}

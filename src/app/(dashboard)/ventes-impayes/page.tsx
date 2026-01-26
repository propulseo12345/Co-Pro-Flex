'use client';

import Link from 'next/link';
import { Plus, ArrowRight, FileText, AlertTriangle, Bell } from 'lucide-react';
import { useVentesImpayesPage } from '@/hooks/modules/useVentesImpayesPage';
import {
  VentesRecentesSection,
  ImpayesCritiquesSection,
  RelanceModal,
  ActivitySection,
} from '@/components/features/ventes-impayes';
import {
  VENTES_IMPAYES_STATS,
  VENTES_RECENTES,
  IMPAYES_CRITIQUES,
  IMPAYES_BREAKDOWN,
  RECENT_ACTIVITY,
} from '@/data/mock/ventes-impayes.mock';
import styles from './ventes-impayes.module.css';

export default function VentesImpayesPage() {
  const {
    showRelanceModal,
    selectedImpayes,
    toggleImpayeSelection,
    handleRelanceGroupee,
    closeRelanceModal,
    setShowRelanceModal,
  } = useVentesImpayesPage();

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
        {VENTES_IMPAYES_STATS.map((stat) => {
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
        <VentesRecentesSection ventes={VENTES_RECENTES} />
        <ImpayesCritiquesSection
          impayes={IMPAYES_CRITIQUES}
          breakdown={IMPAYES_BREAKDOWN}
          selectedImpayes={selectedImpayes}
          onToggleSelection={toggleImpayeSelection}
          onRelanceGroupee={handleRelanceGroupee}
        />
      </div>

      <ActivitySection activities={RECENT_ACTIVITY} />

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

'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  TrendingUp,
  Clock,
  Euro,
  FileText,
  Loader2,
  Percent
} from 'lucide-react';
import styles from './fonds-alur.module.css';
import { useBudget } from '@/hooks/modules/useBudget';
import { useLotsWithOwners } from '@/hooks/modules/useCoproData';

interface LotALURData {
  lotId: string;
  lot: string;
  coproprietaire: string;
  tantiemes: number;
  sharePercent: number;
  soldeActuel: number;
}

export default function FondsALURPage() {
  const { fondsALUR, selectedYear, isLoading: budgetLoading, error: budgetError } = useBudget();
  const { lots, isLoading: lotsLoading, error: lotsError } = useLotsWithOwners();

  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = budgetLoading || lotsLoading;
  const error = budgetError || lotsError;

  // Calculate total tantiemes for percentage calculation
  const totalTantiemes = useMemo(() => {
    return lots.reduce((sum, lot) => sum + (lot.tantiemes_generaux || 0), 0);
  }, [lots]);

  // Map lots to ALUR data with calculated share
  const lotsALURData = useMemo((): LotALURData[] => {
    if (!lots.length || totalTantiemes === 0) return [];

    return lots.map(lot => {
      const tantiemes = lot.tantiemes_generaux || 0;
      const sharePercent = (tantiemes / totalTantiemes) * 100;
      // Calculate lot's share of ALUR fund based on tantiemes
      const soldeActuel = (fondsALUR.soldeActuel * tantiemes) / totalTantiemes;

      return {
        lotId: lot.id,
        lot: lot.ref,
        coproprietaire: lot.owner_display_name || 'Non assigné',
        tantiemes,
        sharePercent,
        soldeActuel,
      };
    });
  }, [lots, totalTantiemes, fondsALUR.soldeActuel]);

  const filteredFonds = useMemo(() => {
    return lotsALURData.filter(f =>
      f.coproprietaire.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.lot.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lotsALURData, searchTerm]);

  const exportToExcel = () => {
    // Export Excel du fonds ALUR
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2rem' }}>
          <Loader2 size={24} className="animate-spin" />
          <span>Chargement des données ALUR...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className="card" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          Erreur: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fonds ALUR</h1>
          <p className={styles.subtitle}>Suivi des versements au fonds travaux obligatoire (Loi ALUR)</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.exportButton} onClick={exportToExcel}>
            <Download size={20} aria-hidden="true" />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Euro size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total du fonds</span>
            <span className={styles.statValue}>
              {fondsALUR.soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Cotisation annuelle</span>
            <span className={styles.statValue}>
              {fondsALUR.cotisationAnnuelle.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Percent size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Part du budget</span>
            <span className={styles.statValue}>{fondsALUR.pourcentageBudget}%</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Clock size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Exercice</span>
            <span className={styles.statValue}>{selectedYear}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <Search size={20} aria-hidden="true" />
        <input type="text" placeholder="Rechercher par copropriétaire ou lot..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Copropriétaire</th>
              <th className={styles.textRight}>Tantièmes</th>
              <th className={styles.textRight}>Quote-part</th>
              <th className={styles.textRight}>Solde ALUR</th>
              <th className={styles.textCenter}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFonds.map((fond) => (
              <tr key={fond.lotId} className={styles.mainRow}>
                <td className={styles.lotCell}>{fond.lot}</td>
                <td className={styles.coproCell}>{fond.coproprietaire}</td>
                <td className={styles.textRight}>{fond.tantiemes.toLocaleString('fr-FR')}</td>
                <td className={styles.textRight}>{fond.sharePercent.toFixed(2)}%</td>
                <td className={styles.textRight}>
                  <span className={styles.solde}>
                    {fond.soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </td>
                <td className={styles.textCenter}>
                  <button className={styles.actionButton} title="Voir le détail">
                    <FileText size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredFonds.length === 0 && (
          <div className={styles.emptyState}>
            <FileText size={48} aria-hidden="true" />
            <p>{lots.length === 0 ? 'Aucun lot configuré' : 'Aucun lot trouvé'}</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <h3 className={styles.infoTitle}>À propos du fonds ALUR</h3>
        <p className={styles.infoText}>
          La loi ALUR (2014) impose aux copropriétés de plus de 5 ans de constituer un fonds de travaux.
          Ce fonds est alimenté par une cotisation annuelle minimale de 5% du budget prévisionnel.
          Il est destiné à financer les travaux d'entretien et de conservation des parties communes.
        </p>
      </div>
    </div>
  );
}

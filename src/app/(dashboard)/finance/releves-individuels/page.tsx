'use client';

import { useState, useMemo, useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  RelevesStats,
  RelevesFilters,
  RelevesTable,
  ReleveDetailModal,
  MOCK_RELEVES,
  downloadReleveHTML,
  printReleve,
  downloadMultipleRelevesAsZip
} from '@/components/features/finance/RelevesIndividuels';
import type {
  ReleveIndividuel,
  RelevesFiltersType,
  RelevesStatsType
} from '@/components/features/finance/RelevesIndividuels';
import styles from './releves-individuels.module.css';

const EXERCICES = ['2025', '2024', '2023'];

export default function RelevesIndividuelsPage() {
  const [releves] = useState<ReleveIndividuel[]>(MOCK_RELEVES);
  const [filters, setFilters] = useState<RelevesFiltersType>({
    search: '',
    exercice: '2025',
    statutSolde: 'tous',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedReleve, setSelectedReleve] = useState<ReleveIndividuel | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filteredReleves = useMemo(() => {
    return releves.filter(releve => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchName = `${releve.coproprietaire.nom} ${releve.coproprietaire.prenom}`.toLowerCase().includes(searchLower);
        const matchLots = releve.coproprietaire.lots.some(l => l.numero.toLowerCase().includes(searchLower));
        const matchEmail = releve.coproprietaire.email?.toLowerCase().includes(searchLower);
        if (!matchName && !matchLots && !matchEmail) return false;
      }

      // Exercice filter
      if (releve.exercice !== filters.exercice) return false;

      // Solde filter
      if (filters.statutSolde === 'debiteur' && releve.solde >= 0) return false;
      if (filters.statutSolde === 'crediteur' && releve.solde <= 0) return false;
      if (filters.statutSolde === 'equilibre' && releve.solde !== 0) return false;

      return true;
    });
  }, [releves, filters]);

  const stats: RelevesStatsType = useMemo(() => {
    const exerciceReleves = releves.filter(r => r.exercice === filters.exercice);
    return {
      totalCoproprietaires: exerciceReleves.length,
      totalSoldeGlobal: exerciceReleves.reduce((sum, r) => sum + r.solde, 0),
      nombreDebiteurs: exerciceReleves.filter(r => r.solde < 0).length,
      nombreCrediteurs: exerciceReleves.filter(r => r.solde > 0).length,
      montantTotalDu: exerciceReleves.reduce((sum, r) => sum + r.totalAppeles, 0),
      montantTotalPaye: exerciceReleves.reduce((sum, r) => sum + r.totalPaye, 0),
    };
  }, [releves, filters.exercice]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredReleves.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReleves.map(r => r.id));
    }
  }, [filteredReleves, selectedIds.length]);

  const handleViewReleve = useCallback((releve: ReleveIndividuel) => {
    setSelectedReleve(releve);
  }, []);

  const handleExportReleve = useCallback((releve: ReleveIndividuel) => {
    downloadReleveHTML(releve);
  }, []);

  const handleExportSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;

    setIsExporting(true);
    try {
      const selectedReleves = filteredReleves.filter(r => selectedIds.includes(r.id));
      await downloadMultipleRelevesAsZip(selectedReleves);
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds, filteredReleves]);

  const handleCloseModal = useCallback(() => {
    setSelectedReleve(null);
  }, []);

  const handleExportFromModal = useCallback(() => {
    if (selectedReleve) {
      downloadReleveHTML(selectedReleve);
    }
  }, [selectedReleve]);

  const handlePrintFromModal = useCallback(() => {
    if (selectedReleve) {
      printReleve(selectedReleve);
    }
  }, [selectedReleve]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Relevés Individuels</h1>
          <p className={styles.subtitle}>
            Consultez et exportez les relevés de charges par copropriétaire
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.exportAllButton}
            onClick={handleExportSelected}
            disabled={selectedIds.length === 0 || isExporting}
          >
            {isExporting ? (
              <>Exportation...</>
            ) : (
              <>
                <Download size={18} />
                Exporter ({selectedIds.length})
              </>
            )}
          </button>
        </div>
      </div>

      <RelevesStats stats={stats} />

      <RelevesFilters
        filters={filters}
        onFiltersChange={setFilters}
        exercices={EXERCICES}
      />

      <RelevesTable
        releves={filteredReleves}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onViewReleve={handleViewReleve}
        onExportReleve={handleExportReleve}
      />

      {selectedReleve && (
        <ReleveDetailModal
          releve={selectedReleve}
          onClose={handleCloseModal}
          onExport={handleExportFromModal}
          onPrint={handlePrintFromModal}
        />
      )}
    </div>
  );
}

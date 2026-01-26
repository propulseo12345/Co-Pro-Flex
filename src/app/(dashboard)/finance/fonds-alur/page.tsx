'use client';

import { useState } from 'react';
import {
  Search,
  Download,
  TrendingUp,
  Clock,
  Euro,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import styles from './fonds-alur.module.css';

interface VersementFondsALUR {
  id: string;
  montantVerse: number;
  dateVersement: string;
  annee: number;
  origine: 'APPEL_FONDS' | 'REGULARISATION' | 'VENTE';
}

interface SoldeFondsALUR {
  lotId: string;
  lot: string;
  coproprietaire: string;
  soldeActuel: number;
  versements: VersementFondsALUR[];
}

const MOCK_FONDS_ALUR: SoldeFondsALUR[] = [
  {
    lotId: '1',
    lot: 'A1',
    coproprietaire: 'Marie LEBLANC',
    soldeActuel: 3250.00,
    versements: [
      { id: 'v1', montantVerse: 800.00, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v2', montantVerse: 800.00, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v3', montantVerse: 800.00, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v4', montantVerse: 850.00, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
  {
    lotId: '2',
    lot: 'A2',
    coproprietaire: 'Pierre MOREAU',
    soldeActuel: 2600.00,
    versements: [
      { id: 'v5', montantVerse: 650.00, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v6', montantVerse: 650.00, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v7', montantVerse: 650.00, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v8', montantVerse: 650.00, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
  {
    lotId: '3',
    lot: 'B3',
    coproprietaire: 'Sophie LAURENT',
    soldeActuel: 3900.00,
    versements: [
      { id: 'v9', montantVerse: 975.00, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v10', montantVerse: 975.00, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v11', montantVerse: 975.00, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v12', montantVerse: 975.00, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
  {
    lotId: '4',
    lot: 'B4',
    coproprietaire: 'Jean MARTIN',
    soldeActuel: 3250.00,
    versements: [
      { id: 'v13', montantVerse: 812.50, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v14', montantVerse: 812.50, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v15', montantVerse: 812.50, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v16', montantVerse: 812.50, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
  {
    lotId: '5',
    lot: 'C5',
    coproprietaire: 'Isabelle DUBOIS',
    soldeActuel: 2600.00,
    versements: [
      { id: 'v17', montantVerse: 650.00, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v18', montantVerse: 650.00, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v19', montantVerse: 650.00, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v20', montantVerse: 650.00, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
  {
    lotId: '6',
    lot: 'C6',
    coproprietaire: 'Claude BERNARD',
    soldeActuel: 3900.00,
    versements: [
      { id: 'v21', montantVerse: 975.00, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v22', montantVerse: 975.00, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v23', montantVerse: 975.00, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v24', montantVerse: 975.00, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
  {
    lotId: '7',
    lot: 'D7',
    coproprietaire: 'Anne ROUSSEAU',
    soldeActuel: 3250.00,
    versements: [
      { id: 'v25', montantVerse: 812.50, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v26', montantVerse: 812.50, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v27', montantVerse: 812.50, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v28', montantVerse: 812.50, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
  {
    lotId: '8',
    lot: 'D8',
    coproprietaire: 'Marc PETIT',
    soldeActuel: 3250.00,
    versements: [
      { id: 'v29', montantVerse: 812.50, dateVersement: '2024-01-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v30', montantVerse: 812.50, dateVersement: '2024-04-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v31', montantVerse: 812.50, dateVersement: '2024-07-15', annee: 2024, origine: 'APPEL_FONDS' },
      { id: 'v32', montantVerse: 812.50, dateVersement: '2024-10-15', annee: 2024, origine: 'APPEL_FONDS' },
    ]
  },
];

export default function FondsALURPage() {
  const [fonds, setFonds] = useState<SoldeFondsALUR[]>(MOCK_FONDS_ALUR);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);

  const filteredFonds = fonds.filter(f =>
    f.coproprietaire.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.lot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFonds = fonds.reduce((sum, f) => sum + f.soldeActuel, 0);

  const getOrigineBadge = (origine: string) => {
    switch (origine) {
      case 'APPEL_FONDS':
        return <span className={styles.origineAppelFonds}>Appel de fonds</span>;
      case 'REGULARISATION':
        return <span className={styles.origineRegularisation}>Régularisation</span>;
      case 'VENTE':
        return <span className={styles.origineVente}>Vente</span>;
      default:
        return null;
    }
  };

  const handleToggleExpand = (lotId: string) => {
    setExpandedLotId(expandedLotId === lotId ? null : lotId);
  };

  const exportToExcel = () => {
    // Export Excel du fonds ALUR
  };

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
              {totalFonds.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Nombre de lots</span>
            <span className={styles.statValue}>{fonds.length}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Clock size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Année en cours</span>
            <span className={styles.statValue}>{new Date().getFullYear()}</span>
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
              <th></th>
              <th>Lot</th>
              <th>Copropriétaire</th>
              <th>Nombre de versements</th>
              <th className={styles.textRight}>Solde actuel</th>
              <th className={styles.textCenter}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFonds.map((fond) => (
              <>
                <tr key={fond.lotId} className={styles.mainRow}>
                  <td>
                    <button
                      className={styles.expandButton}
                      onClick={() => handleToggleExpand(fond.lotId)}
                    >
                      {expandedLotId === fond.lotId ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    </button>
                  </td>
                  <td className={styles.lotCell}>{fond.lot}</td>
                  <td className={styles.coproCell}>{fond.coproprietaire}</td>
                  <td>{fond.versements.length}</td>
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
                {expandedLotId === fond.lotId && (
                  <tr className={styles.expandedRow}>
                    <td colSpan={6}>
                      <div className={styles.versementsContainer}>
                        <h4 className={styles.versementsTitle}>Historique des versements</h4>
                        <div className={styles.versementsList}>
                          {fond.versements.map((versement) => (
                            <div key={versement.id} className={styles.versementItem}>
                              <div className={styles.versementInfo}>
                                <span className={styles.versementDate}>
                                  {new Date(versement.dateVersement).toLocaleDateString('fr-FR')}
                                </span>
                                <span className={styles.versementAnnee}>Année {versement.annee}</span>
                                {getOrigineBadge(versement.origine)}
                              </div>
                              <div className={styles.versementMontant}>
                                {versement.montantVerse.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className={styles.versementsTotal}>
                          <span>Total des versements</span>
                          <span className={styles.versementsTotalValue}>
                            {fond.versements.reduce((sum, v) => sum + v.montantVerse, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {filteredFonds.length === 0 && (
          <div className={styles.emptyState}>
            <FileText size={48} aria-hidden="true" />
            <p>Aucun lot trouvé</p>
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

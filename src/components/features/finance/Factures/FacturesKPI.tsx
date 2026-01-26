'use client';

import { Euro, AlertTriangle, Calendar, CreditCard, CheckCircle, FileEdit, ClipboardCheck, FileText } from 'lucide-react';
import { FacturesKPIData, StatutFacture } from './types';
import { formatCurrency } from './utils';
import styles from './FacturesKPI.module.css';

type KPIFilterType = 'TOUS' | StatutFacture | 'ECHUES' | 'SEMAINE';

interface FacturesKPIProps {
  kpiData: FacturesKPIData;
  onKPIClick?: (filter: KPIFilterType) => void;
  activeFilter?: KPIFilterType;
}

export function FacturesKPI({ kpiData, onKPIClick, activeFilter }: FacturesKPIProps) {
  const handleClick = (filter: KPIFilterType) => {
    if (onKPIClick) {
      onKPIClick(filter);
    }
  };

  const nombreEnCours = kpiData.nombreBrouillon + kpiData.nombreAValider + kpiData.nombreValidee + kpiData.nombreAPayer;

  return (
    <div className={styles.kpiWrapper}>
      {/* Ligne principale - 4 KPIs importants */}
      <div className={styles.kpiMainRow}>
        {/* Total à payer */}
        <button
          className={`${styles.kpiCard} ${styles.kpiCardLarge} ${styles.kpiCardPrimary} ${activeFilter === 'TOUS' ? styles.kpiCardActive : ''}`}
          onClick={() => handleClick('TOUS')}
          title="Voir toutes les factures"
        >
          <div className={styles.kpiIcon}>
            <Euro size={24} aria-hidden="true" />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total à payer</span>
            <span className={styles.kpiValue}>{formatCurrency(kpiData.totalAPayer)}</span>
            <span className={styles.kpiSubtext}>
              {nombreEnCours} facture{nombreEnCours > 1 ? 's' : ''} en cours
            </span>
          </div>
        </button>

        {/* Factures échues */}
        <button
          className={`${styles.kpiCard} ${styles.kpiCardLarge} ${kpiData.facturesEchues > 0 ? styles.kpiCardDanger : ''} ${activeFilter === 'ECHUES' ? styles.kpiCardActive : ''}`}
          onClick={() => handleClick('ECHUES')}
          title="Voir les factures en retard"
        >
          <div className={styles.kpiIcon}>
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>En retard</span>
            <span className={`${styles.kpiValue} ${kpiData.facturesEchues > 0 ? styles.kpiValueDanger : ''}`}>
              {kpiData.facturesEchues}
            </span>
            {kpiData.facturesEchues > 0 ? (
              <span className={styles.kpiSubtextDanger}>{formatCurrency(kpiData.montantEchu)}</span>
            ) : (
              <span className={styles.kpiSubtextSuccess}>Aucun retard</span>
            )}
          </div>
        </button>

        {/* Échéances cette semaine */}
        <button
          className={`${styles.kpiCard} ${styles.kpiCardLarge} ${kpiData.echeancesSemaine > 0 ? styles.kpiCardWarning : ''} ${activeFilter === 'SEMAINE' ? styles.kpiCardActive : ''}`}
          onClick={() => handleClick('SEMAINE')}
          title="Voir les échéances de la semaine"
        >
          <div className={styles.kpiIcon}>
            <Calendar size={24} aria-hidden="true" />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Cette semaine</span>
            <span className={styles.kpiValue}>{kpiData.echeancesSemaine}</span>
            {kpiData.echeancesSemaine > 0 ? (
              <span className={styles.kpiSubtextWarning}>{formatCurrency(kpiData.montantSemaine)}</span>
            ) : (
              <span className={styles.kpiSubtext}>Aucune échéance</span>
            )}
          </div>
        </button>

        {/* À payer */}
        <button
          className={`${styles.kpiCard} ${styles.kpiCardLarge} ${activeFilter === 'A_PAYER' ? styles.kpiCardActive : ''}`}
          onClick={() => handleClick('A_PAYER')}
          title="Voir les factures prêtes au paiement"
        >
          <div className={styles.kpiIcon}>
            <CreditCard size={24} aria-hidden="true" />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Prêtes à payer</span>
            <span className={styles.kpiValue}>{kpiData.nombreAPayer}</span>
            <span className={styles.kpiSubtext}>En attente règlement</span>
          </div>
        </button>
      </div>

      {/* Ligne secondaire - Workflow statuts */}
      <div className={styles.kpiSecondaryRow}>
        <button
          className={`${styles.kpiCardSmall} ${activeFilter === 'BROUILLON' ? styles.kpiCardSmallActive : ''}`}
          onClick={() => handleClick('BROUILLON')}
          title="Voir les brouillons"
        >
          <FileEdit size={16} aria-hidden="true" />
          <span className={styles.kpiSmallLabel}>Brouillons</span>
          <span className={styles.kpiSmallValue}>{kpiData.nombreBrouillon}</span>
        </button>

        <span className={styles.kpiArrow}>→</span>

        <button
          className={`${styles.kpiCardSmall} ${kpiData.nombreAValider > 0 ? styles.kpiCardSmallInfo : ''} ${activeFilter === 'A_VALIDER' ? styles.kpiCardSmallActive : ''}`}
          onClick={() => handleClick('A_VALIDER')}
          title="Voir les factures à valider"
        >
          <ClipboardCheck size={16} aria-hidden="true" />
          <span className={styles.kpiSmallLabel}>À valider</span>
          <span className={styles.kpiSmallValue}>{kpiData.nombreAValider}</span>
        </button>

        <span className={styles.kpiArrow}>→</span>

        <button
          className={`${styles.kpiCardSmall} ${activeFilter === 'VALIDEE' ? styles.kpiCardSmallActive : ''}`}
          onClick={() => handleClick('VALIDEE')}
          title="Voir les factures validées"
        >
          <FileText size={16} aria-hidden="true" />
          <span className={styles.kpiSmallLabel}>Validées</span>
          <span className={styles.kpiSmallValue}>{kpiData.nombreValidee}</span>
        </button>

        <span className={styles.kpiArrow}>→</span>

        <button
          className={`${styles.kpiCardSmall} ${styles.kpiCardSmallSuccess} ${activeFilter === 'PAYEE' ? styles.kpiCardSmallActive : ''}`}
          onClick={() => handleClick('PAYEE')}
          title="Voir les factures payées"
        >
          <CheckCircle size={16} aria-hidden="true" />
          <span className={styles.kpiSmallLabel}>Payées</span>
          <span className={styles.kpiSmallValue}>{kpiData.nombrePayees}</span>
        </button>

        <div className={styles.kpiTotal}>
          <span>Total: {kpiData.nombreFactures}</span>
        </div>
      </div>
    </div>
  );
}

export type { KPIFilterType };

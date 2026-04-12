'use client';

import { CheckCircle, Clock, Minus, Download, Loader2, FileCode } from 'lucide-react';
import clsx from 'clsx';
import type { IFactureFacturX, StatutFacturX } from '@/types';
import type { FacturXFilter } from '@/hooks/useFacturX';
import styles from './FacturXTable.module.css';

type FacturXConfig = { label: string; badgeClass: string };

const FACTURX_CONFIG: Record<StatutFacturX, FacturXConfig> = {
  GENERE:          { label: 'Factur-X ✓',    badgeClass: styles.badgeSuccess },
  EN_ATTENTE:      { label: 'En attente',     badgeClass: styles.badgeWarning },
  NON_APPLICABLE:  { label: 'Non applicable', badgeClass: styles.badgeNeutral },
};

type PaiementConfig = { label: string; badgeClass: string };

const PAIEMENT_CONFIG: Record<IFactureFacturX['statutPaiement'], PaiementConfig> = {
  PAYEE:      { label: 'Payée',      badgeClass: styles.badgeSuccess },
  EN_ATTENTE: { label: 'En attente', badgeClass: styles.badgeWarning },
  EN_RETARD:  { label: 'En retard',  badgeClass: styles.badgeDanger  },
};

const FILTERS: { value: FacturXFilter; label: string }[] = [
  { value: 'TOUS',           label: 'Toutes' },
  { value: 'EN_ATTENTE',     label: 'En attente' },
  { value: 'GENERE',         label: 'Générées' },
  { value: 'NON_APPLICABLE', label: 'Non applicable' },
];

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function FacturXBadge({ statut }: { statut: StatutFacturX }) {
  const cfg = FACTURX_CONFIG[statut];
  return (
    <span className={clsx(styles.badge, cfg.badgeClass)}>
      {statut === 'GENERE' && <CheckCircle size={11} />}
      {statut === 'EN_ATTENTE' && <Clock size={11} />}
      {statut === 'NON_APPLICABLE' && <Minus size={11} />}
      {cfg.label}
    </span>
  );
}

interface FacturXTableProps {
  factures: IFactureFacturX[];
  loadingId: string | null;
  filter: FacturXFilter;
  onSetFilter: (f: FacturXFilter) => void;
  onGenerer: (id: string) => void;
  onTelecharger: (id: string) => void;
}

export function FacturXTable({
  factures,
  loadingId,
  filter,
  onSetFilter,
  onGenerer,
  onTelecharger,
}: FacturXTableProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              className={clsx(styles.filterBtn, filter === f.value && styles.filterBtnActive)}
              onClick={() => onSetFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Facture N°</th>
              <th>Copropriété</th>
              <th>Fournisseur</th>
              <th>Montant TTC</th>
              <th>Date</th>
              <th>Paiement</th>
              <th>Factur-X</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {factures.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.empty}>Aucune facture pour ce filtre.</td>
              </tr>
            )}
            {factures.map(fac => {
              const paiCfg = PAIEMENT_CONFIG[fac.statutPaiement];
              const isGenerating = loadingId === fac.id;
              return (
                <tr key={fac.id} className={styles.row}>
                  <td className={styles.numeroCell}>
                    <FileCode size={13} className={styles.fileIcon} />
                    {fac.numero}
                  </td>
                  <td>{fac.copropriete}</td>
                  <td className={styles.fournisseurCell}>{fac.fournisseur}</td>
                  <td className={styles.montantCell}>{formatEur(fac.montantTTC)}</td>
                  <td className={styles.dateCell}>
                    {new Date(fac.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <span className={clsx(styles.badge, paiCfg.badgeClass)}>
                      {paiCfg.label}
                    </span>
                  </td>
                  <td>
                    <FacturXBadge statut={fac.statutFacturX} />
                    {fac.dateGeneration && (
                      <span className={styles.dateGen}>
                        {new Date(fac.dateGeneration).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </td>
                  <td className={styles.actionsCell}>
                    {fac.statutFacturX === 'EN_ATTENTE' && (
                      <button
                        type="button"
                        className={styles.btnGenerate}
                        onClick={() => onGenerer(fac.id)}
                        disabled={isGenerating}
                        aria-label={`Générer Factur-X pour ${fac.numero}`}
                      >
                        {isGenerating ? (
                          <><Loader2 size={12} className={styles.spin} /> Génération…</>
                        ) : (
                          <>Générer Factur-X</>
                        )}
                      </button>
                    )}
                    {fac.statutFacturX === 'GENERE' && (
                      <button
                        type="button"
                        className={styles.btnDownload}
                        onClick={() => onTelecharger(fac.id)}
                        aria-label={`Télécharger PDF/A-3 pour ${fac.numero}`}
                      >
                        <Download size={12} /> PDF/A-3
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

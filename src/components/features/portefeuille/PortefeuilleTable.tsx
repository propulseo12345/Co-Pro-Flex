'use client';

import Link from 'next/link';
import { Building2, TrendingUp, TrendingDown, CheckCircle, Clock, AlertCircle, AlertTriangle, Eye, FileText, ExternalLink } from 'lucide-react';
import type { ICoproprietePortefeuille as CoproprietePortefeuille, AlerteType } from '@/types/models/portefeuille';
import styles from '../../../app/(dashboard)/portefeuille/portefeuille.module.css';

const alerteTypeLabels: Record<AlerteType, string> = { IMPAYE: 'Impayés', FACTURE: 'Factures', BUDGET: 'Budgets', RAPPROCHEMENT: 'Rapprochement', CONTRAT: 'Contrats', AG: 'AG' };

interface PortefeuilleTableProps {
  coproprietes: CoproprietePortefeuille[];
  formatMontant: (m: number) => string;
  formatDate: (d?: string) => string;
}

export function PortefeuilleTable({ coproprietes, formatMontant, formatDate }: PortefeuilleTableProps) {
  const getTauxClass = (taux: number) => { if (taux >= 95) return styles.tauxSuccess; if (taux >= 80) return styles.tauxWarning; return styles.tauxDanger; };
  const getProgressClass = (pct: number) => { if (pct <= 60) return styles.progressFillSuccess; if (pct <= 80) return styles.progressFillWarning; return styles.progressFillDanger; };

  if (coproprietes.length === 0) {
    return <div className={styles.emptyState}><Building2 size={48} /><p>Aucune copropriété ne correspond à vos critères</p></div>;
  }

  return (
    <table className={styles.table}>
      <thead><tr><th>Copropriété</th><th className={styles.textRight}>Solde</th><th className={styles.textRight}>Impayés</th><th className={styles.textCenter}>Recouvrement</th><th className={styles.textCenter}>Budget</th><th className={styles.textCenter}>Rapprochement</th><th>Alertes</th><th className={styles.textCenter}>Actions</th></tr></thead>
      <tbody>
        {coproprietes.map((copro) => {
          const budgetPct = (copro.budgetConsomme / copro.budgetTotal) * 100;
          return (
            <tr key={copro.id}>
              <td><div className={styles.coproCell}><Link href={`/dashboard?copro=${copro.id}`} className={styles.coproName}>{copro.nom}</Link><span className={styles.coproAddress}>{copro.adresse}</span><span className={styles.coproLots}>{copro.nombreLots} lots</span></div></td>
              <td className={styles.textRight}><span className={`${styles.montant} ${copro.soldeDisponible < 0 ? styles.montantDanger : ''}`}>{formatMontant(copro.soldeDisponible)}</span></td>
              <td className={styles.textRight}>
                {copro.totalImpayes > 0 ? (<Link href={`/finance/unpaid?copro=${copro.id}`} className={`${styles.montant} ${styles.montantDanger}`}>{formatMontant(copro.totalImpayes)}<br /><small style={{ fontWeight: 400 }}>{copro.nombreImpayes} copro.</small></Link>) : (<span className={`${styles.montant} ${styles.montantSuccess}`}><CheckCircle size={14} style={{ verticalAlign: 'middle' }} /></span>)}
              </td>
              <td className={styles.textCenter}><span className={`${styles.tauxBadge} ${getTauxClass(copro.tauxRecouvrement)}`}>{copro.tauxRecouvrement >= 95 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{copro.tauxRecouvrement.toFixed(0)}%</span></td>
              <td><div className={styles.progressCell}><div className={styles.progressBar}><div className={`${styles.progressFill} ${getProgressClass(budgetPct)}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} /></div><span className={styles.progressLabel}>{budgetPct.toFixed(0)}% · {formatMontant(copro.budgetRestant)} restant</span></div></td>
              <td className={styles.textCenter}>
                <div className={styles.rapprochementCell}>
                  {copro.mouvementsNonRapproches > 0 ? (<Link href={`/finance/mouvements-bancaires?copro=${copro.id}`} className={`${styles.rapprochementStatus} ${styles.rapprochementPending}`}><Clock size={14} />{copro.mouvementsNonRapproches} mvt</Link>) : (<span className={`${styles.rapprochementStatus} ${styles.rapprochementOk}`}><CheckCircle size={14} />OK</span>)}
                  <span className={styles.rapprochementDate}>{formatDate(copro.dernierRapprochement)}</span>
                </div>
              </td>
              <td>
                <div className={styles.alertesCell}>
                  {copro.alertes.length === 0 ? (<span className={styles.noAlerte}><CheckCircle size={14} />RAS</span>) : (
                    copro.alertes.slice(0, 3).map((alerte) => (
                      <Link key={alerte.id} href={alerte.lien.includes('?') ? `${alerte.lien}&copro=${copro.id}` : `${alerte.lien}?copro=${copro.id}`} className={`${styles.alerteBadge} ${alerte.severite === 'critique' ? styles.alerteCritique : alerte.severite === 'warning' ? styles.alerteWarning : styles.alerteInfo}`} title={alerte.description}>
                        {alerte.severite === 'critique' ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}{alerteTypeLabels[alerte.type]}
                      </Link>
                    ))
                  )}
                  {copro.alertes.length > 3 && <span className={styles.alerteBadge}>+{copro.alertes.length - 3}</span>}
                </div>
              </td>
              <td className={styles.textCenter}>
                <div className={styles.actionsCell}>
                  <Link href={`/dashboard?copro=${copro.id}`} className={styles.actionButton} title="Voir le tableau de bord"><Eye size={16} /></Link>
                  <Link href={`/finance?copro=${copro.id}`} className={styles.actionButton} title="Voir les finances"><FileText size={16} /></Link>
                  <Link href={`/coproprietaires?copro=${copro.id}`} className={styles.actionButton} title="Voir les copropriétaires"><ExternalLink size={16} /></Link>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

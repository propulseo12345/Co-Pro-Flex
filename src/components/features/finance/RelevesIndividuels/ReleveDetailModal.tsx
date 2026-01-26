'use client';

import { X, Download, Printer, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { ReleveIndividuel, DetailParCle } from './types';
import styles from './releves-individuels.module.css';

interface ReleveDetailModalProps {
  releve: ReleveIndividuel;
  onClose: () => void;
  onExport: () => void;
  onPrint: () => void;
}

export function ReleveDetailModal({ releve, onClose, onExport, onPrint }: ReleveDetailModalProps) {
  const [expandedCles, setExpandedCles] = useState<string[]>([]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
  };

  const formatVariation = (variation: number | undefined) => {
    if (variation === undefined) return '-';
    const sign = variation > 0 ? '+' : '';
    return `${sign}${variation.toFixed(1)}%`;
  };

  const toggleCle = (cleId: string) => {
    setExpandedCles(prev =>
      prev.includes(cleId)
        ? prev.filter(id => id !== cleId)
        : [...prev, cleId]
    );
  };

  const getSoldeClass = (solde: number) => {
    if (solde < 0) return styles.soldeDebiteur;
    if (solde > 0) return styles.soldeCrediteur;
    return styles.soldeEquilibre;
  };

  const getSoldeIcon = (solde: number) => {
    if (solde < 0) return <TrendingDown size={20} />;
    if (solde > 0) return <TrendingUp size={20} />;
    return <Minus size={20} />;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContentLarge} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              Relevé Individuel - {releve.coproprietaire.nom} {releve.coproprietaire.prenom}
            </h2>
            <p className={styles.modalSubtitle}>
              Exercice {releve.exercice} - Généré le {new Date(releve.dateGeneration).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.exportButton} onClick={onPrint} title="Imprimer">
              <Printer size={16} />
              Imprimer
            </button>
            <button className={styles.exportButton} onClick={onExport} title="Exporter HTML">
              <Download size={16} />
              Exporter
            </button>
            <button className={styles.modalClose} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {/* Informations copropriétaire */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Informations</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Adresse</span>
                <span className={styles.infoValue}>{releve.coproprietaire.adresse}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{releve.coproprietaire.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Lots</span>
                <span className={styles.infoValue}>
                  {releve.coproprietaire.lots.map(l => `${l.numero} (${l.type})`).join(', ')}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tantièmes généraux</span>
                <span className={styles.infoValue}>{releve.coproprietaire.totalTantiemes} / 10 000</span>
              </div>
            </div>
          </section>

          {/* Synthèse financière */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Synthèse Financière</h3>
            <div className={styles.syntheseGrid}>
              <div className={styles.syntheseCard}>
                <span className={styles.syntheseLabel}>Total Charges {releve.exercice}</span>
                <span className={styles.syntheseValue}>{formatMontant(releve.totalCharges)}</span>
                {releve.variationCharges !== undefined && (
                  <span className={`${styles.syntheseVariation} ${releve.variationCharges > 0 ? styles.variationUp : styles.variationDown}`}>
                    {formatVariation(releve.variationCharges)} vs N-1
                  </span>
                )}
              </div>
              <div className={styles.syntheseCard}>
                <span className={styles.syntheseLabel}>Total Appelé</span>
                <span className={styles.syntheseValue}>{formatMontant(releve.totalAppeles)}</span>
              </div>
              <div className={styles.syntheseCard}>
                <span className={styles.syntheseLabel}>Total Payé</span>
                <span className={styles.syntheseValue}>{formatMontant(releve.totalPaye)}</span>
              </div>
              <div className={`${styles.syntheseCard} ${styles.syntheseCardHighlight}`}>
                <span className={styles.syntheseLabel}>Solde</span>
                <span className={`${styles.syntheseValue} ${getSoldeClass(releve.solde)}`}>
                  {getSoldeIcon(releve.solde)}
                  {formatMontant(Math.abs(releve.solde))}
                  <span className={styles.soldeStatut}>
                    {releve.solde < 0 ? 'À régler' : releve.solde > 0 ? 'Crédit' : 'Soldé'}
                  </span>
                </span>
              </div>
            </div>
          </section>

          {/* Détail par clé de répartition */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Détail par Clé de Répartition</h3>
            <div className={styles.clesList}>
              {releve.detailParCle.map((cle: DetailParCle) => (
                <div key={cle.cleId} className={styles.cleCard}>
                  <button
                    className={styles.cleHeader}
                    onClick={() => toggleCle(cle.cleId)}
                  >
                    <div className={styles.cleHeaderLeft}>
                      {expandedCles.includes(cle.cleId) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className={styles.cleNom}>{cle.cleNom}</span>
                      <span className={styles.cleTantiemes}>
                        {cle.tantiemes} / {cle.totalTantiemesCle} ({cle.quotePart.toFixed(2)}%)
                      </span>
                    </div>
                    <div className={styles.cleHeaderRight}>
                      <span className={styles.cleMontant}>{formatMontant(cle.montantN)}</span>
                      {cle.variation !== undefined && (
                        <span className={`${styles.cleVariation} ${cle.variation > 0 ? styles.variationUp : styles.variationDown}`}>
                          {formatVariation(cle.variation)}
                        </span>
                      )}
                    </div>
                  </button>

                  {expandedCles.includes(cle.cleId) && (
                    <div className={styles.clePostes}>
                      <table className={styles.postesTable}>
                        <thead>
                          <tr>
                            <th>Poste</th>
                            <th className={styles.textRight}>Montant Total</th>
                            <th className={styles.textRight}>Votre Part</th>
                            <th className={styles.textRight}>N-1</th>
                            <th className={styles.textRight}>Variation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cle.postes.map(poste => (
                            <tr key={poste.id}>
                              <td>{poste.libelle}</td>
                              <td className={styles.textRight}>{formatMontant(poste.montantTotal)}</td>
                              <td className={styles.textRight}>{formatMontant(poste.montantIndividuel)}</td>
                              <td className={styles.textRight}>{poste.montantN1 ? formatMontant(poste.montantN1) : '-'}</td>
                              <td className={styles.textRight}>
                                {poste.montantN1 ? (
                                  <span className={`${styles.variation} ${poste.montantIndividuel > poste.montantN1 ? styles.variationUp : styles.variationDown}`}>
                                    {formatVariation(((poste.montantIndividuel - poste.montantN1) / poste.montantN1) * 100)}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td><strong>Total {cle.cleNom}</strong></td>
                            <td></td>
                            <td className={styles.textRight}><strong>{formatMontant(cle.montantN)}</strong></td>
                            <td className={styles.textRight}><strong>{cle.montantN1 ? formatMontant(cle.montantN1) : '-'}</strong></td>
                            <td className={styles.textRight}>
                              <strong className={`${styles.variation} ${(cle.variation || 0) > 0 ? styles.variationUp : styles.variationDown}`}>
                                {formatVariation(cle.variation)}
                              </strong>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Historique des appels */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Historique des Appels de Fonds</h3>
            <table className={styles.appelTable}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Période</th>
                  <th>Échéance</th>
                  <th className={styles.textRight}>Montant Dû</th>
                  <th className={styles.textRight}>Montant Payé</th>
                  <th className={styles.textCenter}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {releve.appelsFonds.map(appel => (
                  <tr key={appel.id}>
                    <td>{appel.description}</td>
                    <td>{appel.periode}</td>
                    <td>{new Date(appel.dateEcheance).toLocaleDateString('fr-FR')}</td>
                    <td className={styles.textRight}>{formatMontant(appel.montantDu)}</td>
                    <td className={styles.textRight}>{formatMontant(appel.montantPaye)}</td>
                    <td className={styles.textCenter}>
                      <span className={`${styles.appelStatut} ${styles[`appelStatut${appel.statut.replace('_', '')}`]}`}>
                        {appel.statut === 'PAYE' && 'Payé'}
                        {appel.statut === 'PARTIELLEMENT_PAYE' && 'Partiel'}
                        {appel.statut === 'NON_PAYE' && 'Non payé'}
                        {appel.statut === 'EN_ATTENTE' && 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Comparatif N/N-1 */}
          {releve.totalChargesN1 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Comparatif N / N-1</h3>
              <div className={styles.comparatifGrid}>
                <div className={styles.comparatifItem}>
                  <span className={styles.comparatifLabel}>Charges {parseInt(releve.exercice) - 1}</span>
                  <span className={styles.comparatifValue}>{formatMontant(releve.totalChargesN1)}</span>
                </div>
                <div className={styles.comparatifItem}>
                  <span className={styles.comparatifLabel}>Charges {releve.exercice}</span>
                  <span className={styles.comparatifValue}>{formatMontant(releve.totalCharges)}</span>
                </div>
                <div className={styles.comparatifItem}>
                  <span className={styles.comparatifLabel}>Variation</span>
                  <span className={`${styles.comparatifValue} ${(releve.variationCharges || 0) > 0 ? styles.variationUp : styles.variationDown}`}>
                    {releve.variationCharges && releve.variationCharges > 0 ? '+' : ''}
                    {formatMontant(releve.totalCharges - releve.totalChargesN1)}
                    <span className={styles.comparatifPercent}>
                      ({formatVariation(releve.variationCharges)})
                    </span>
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

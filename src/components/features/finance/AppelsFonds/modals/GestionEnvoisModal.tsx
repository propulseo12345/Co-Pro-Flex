'use client';

import { useMemo } from 'react';
import { X, Search, Send, CheckCircle, Info, Wallet, TrendingUp, TrendingDown, Users } from 'lucide-react';
import type {
  AppelFonds,
  CoproprietaireAppel,
  ModeEnvoi,
  StatutPaiement,
  StatutRecommande
} from '../types';
import {
  getModeEnvoiIcon,
  getModeEnvoiLabel,
  getStatutPaiementBadge,
  getStatutRecommandeBadge,
  formatDateRecommande,
  formatCurrency
} from '../utils';
import styles from '../appels-fonds.module.css';

interface GestionEnvoisModalProps {
  appel: AppelFonds;
  coproprietaires: CoproprietaireAppel[];
  filteredCoproprietaires: CoproprietaireAppel[];
  sendingInProgress: boolean;
  searchCopro: string;
  paiementFilter: 'TOUS' | StatutPaiement;
  recommandeFilter: 'TOUS' | StatutRecommande;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onPaiementFilterChange: (value: 'TOUS' | StatutPaiement) => void;
  onRecommandeFilterChange: (value: 'TOUS' | StatutRecommande) => void;
  onModeEnvoiChange: (coproId: string, mode: ModeEnvoi) => void;
  onEnvoyerAppel: (coproId: string) => void;
  onEnvoyerTous: () => void;
  onEnregistrerPaiement?: (coproId: string) => void;
  onVoirHistoriquePaiements?: (coproId: string) => void;
}

export function GestionEnvoisModal({
  appel,
  coproprietaires,
  filteredCoproprietaires,
  sendingInProgress,
  searchCopro,
  paiementFilter,
  recommandeFilter,
  onClose,
  onSearchChange,
  onPaiementFilterChange,
  onRecommandeFilterChange,
  onModeEnvoiChange,
  onEnvoyerAppel,
  onEnvoyerTous,
  onEnregistrerPaiement,
  onVoirHistoriquePaiements,
}: GestionEnvoisModalProps) {
  // Calcul de la synthèse globale
  const synthese = useMemo(() => {
    const totalAppele = coproprietaires.reduce((sum, c) => sum + c.montantIndividuel, 0);
    const totalEncaisse = coproprietaires.reduce((sum, c) => sum + (c.paiement?.montantPaye || 0), 0);
    const totalRestant = totalAppele - totalEncaisse;
    const tauxRecouvrement = totalAppele > 0 ? (totalEncaisse / totalAppele) * 100 : 0;

    const nbSoldes = coproprietaires.filter(c => c.paiement?.statutPaiement === 'PAYE').length;
    const nbPartiels = coproprietaires.filter(c => c.paiement?.statutPaiement === 'PARTIELLEMENT_PAYE').length;
    const nbNonPayes = coproprietaires.filter(c => !c.paiement || c.paiement?.statutPaiement === 'NON_PAYE').length;

    return {
      totalAppele,
      totalEncaisse,
      totalRestant,
      tauxRecouvrement,
      nbSoldes,
      nbPartiels,
      nbNonPayes,
      nbTotal: coproprietaires.length
    };
  }, [coproprietaires]);

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={() => !sendingInProgress && onClose()}>
      <div className={styles.modalContentLarge} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Suivi des envois</h2>
            <p className={styles.modalSubtitle}>{appel.description}</p>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            disabled={sendingInProgress}
           aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className={styles.modalBody}>
          {/* Synthèse globale des paiements */}
          <div className={styles.syntheseGlobale}>
            <div className={styles.syntheseCard}>
              <div className={styles.syntheseIcon} style={{ background: 'var(--primary-light)' }}>
                <Wallet size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              </div>
              <div className={styles.syntheseContent}>
                <span className={styles.syntheseLabel}>Montant appelé</span>
                <span className={styles.syntheseValue}>{formatCurrency(synthese.totalAppele)}</span>
              </div>
            </div>
            <div className={styles.syntheseCard}>
              <div className={styles.syntheseIcon} style={{ background: 'var(--success-light)' }}>
                <TrendingUp size={20} style={{ color: 'var(--success)' }} aria-hidden="true" />
              </div>
              <div className={styles.syntheseContent}>
                <span className={styles.syntheseLabel}>Encaissé</span>
                <span className={styles.syntheseValue} style={{ color: 'var(--success)' }}>
                  {formatCurrency(synthese.totalEncaisse)}
                  <span className={styles.synthesePercent}>({synthese.tauxRecouvrement.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
            <div className={styles.syntheseCard}>
              <div className={styles.syntheseIcon} style={{ background: synthese.totalRestant > 0 ? 'var(--warning-light)' : 'var(--success-light)' }}>
                <TrendingDown size={20} style={{ color: synthese.totalRestant > 0 ? 'var(--warning)' : 'var(--success)' }} aria-hidden="true" />
              </div>
              <div className={styles.syntheseContent}>
                <span className={styles.syntheseLabel}>Reste à percevoir</span>
                <span className={styles.syntheseValue} style={{ color: synthese.totalRestant > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {formatCurrency(synthese.totalRestant)}
                </span>
              </div>
            </div>
            <div className={styles.syntheseCard}>
              <div className={styles.syntheseIcon} style={{ background: 'var(--bg-secondary)' }}>
                <Users size={20} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
              </div>
              <div className={styles.syntheseContent}>
                <span className={styles.syntheseLabel}>Copropriétaires</span>
                <div className={styles.syntheseStats}>
                  <span className={styles.statBadge} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                    {synthese.nbSoldes} soldés
                  </span>
                  <span className={styles.statBadge} style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                    {synthese.nbPartiels} partiels
                  </span>
                  <span className={styles.statBadge} style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                    {synthese.nbNonPayes} impayés
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.gestionHeader}>
            <p className={styles.gestionInfo}>
              Suivez les envois et les paiements pour chaque copropriétaire.
            </p>
            <button
              className={styles.envoyerTousButton}
              onClick={onEnvoyerTous}
              disabled={sendingInProgress}
            >
              {sendingInProgress ? (
                <>
                  <div className={styles.spinner} />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send size={18} aria-hidden="true" />
                  Envoyer à tous
                </>
              )}
            </button>
          </div>

          <div className={styles.modalFilters}>
            <div className={styles.modalSearchBox}>
              <Search size={16} aria-hidden="true" />
              <input type="text" placeholder="Rechercher par nom ou lot..." value={searchCopro} onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className={styles.modalFilterGroup}>
              <label>Paiement</label>
              <select
                value={paiementFilter}
                onChange={(e) => onPaiementFilterChange(e.target.value as 'TOUS' | StatutPaiement)}
              >
                <option value="TOUS">Tous</option>
                <option value="PAYE">Payé</option>
                <option value="PARTIELLEMENT_PAYE">Partiel</option>
                <option value="NON_PAYE">Non payé</option>
              </select>
            </div>
            <div className={styles.modalFilterGroup}>
              <label>Recommandé</label>
              <select
                value={recommandeFilter}
                onChange={(e) => onRecommandeFilterChange(e.target.value as 'TOUS' | StatutRecommande)}
              >
                <option value="TOUS">Tous</option>
                <option value="LU">Lu</option>
                <option value="LIVRE">Livré</option>
                <option value="ENVOYE">Envoyé</option>
                <option value="PREPARE">Préparé</option>
                <option value="NON_ENVOYE">Non envoyé</option>
              </select>
            </div>
            <span className={styles.filterCount}>
              {filteredCoproprietaires.length} / {coproprietaires.length} copropriétaires
            </span>
          </div>

          <div className={styles.coproTableContainer}>
            <table className={styles.coproTable}>
              <thead>
                <tr>
                  <th>Copropriétaire</th>
                  <th>Lot</th>
                  <th className={styles.textRight}>Tantièmes</th>
                  <th className={styles.textRight}>Montant dû</th>
                  <th className={styles.textRight}>Payé</th>
                  <th className={styles.textRight}>Reste à devoir</th>
                  <th>Statut</th>
                  <th>Recommandé</th>
                  <th>Mode d'envoi</th>
                  <th className={styles.textCenter}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoproprietaires.map((copro) => (
                  <tr key={copro.id} className={copro.envoye ? styles.envoyeRow : ''}>
                    <td className={styles.coproNom}>{copro.nom}</td>
                    <td>{copro.lot}</td>
                    <td className={styles.textRight}>{copro.tantiemes}</td>
                    <td className={styles.textRight}>
                      <span className={styles.montant}>
                        {copro.montantIndividuel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </td>
                    <td className={styles.textRight}>
                      <span className={copro.paiement?.montantPaye ? styles.montantPaye : styles.montantZero}>
                        {(copro.paiement?.montantPaye || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </td>
                    <td className={styles.textRight}>
                      <span className={
                        (copro.montantIndividuel - (copro.paiement?.montantPaye || 0)) > 0
                          ? styles.montantRestant
                          : styles.montantSolde
                      }>
                        {(copro.montantIndividuel - (copro.paiement?.montantPaye || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </td>
                    <td>
                      {copro.paiement && getStatutPaiementBadge(copro.paiement.statutPaiement)}
                    </td>
                    <td>
                      {copro.recommande && (
                        <div className={styles.recommandeContainer} title={formatDateRecommande(copro.recommande)}>
                          {getStatutRecommandeBadge(copro.recommande.statut)}
                          {copro.recommande.statut !== 'NON_ENVOYE' && copro.recommande.statut !== 'PREPARE' && (
                            <Info size={14} className={styles.infoIcon} aria-hidden="true" />
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {!copro.envoye ? (
                        <div className={styles.modeEnvoiGroup}>
                          <select
                            value={copro.modeEnvoiValide || copro.modeEnvoiRecommande}
                            onChange={(e) => onModeEnvoiChange(copro.id, e.target.value as ModeEnvoi)}
                            className={styles.modeEnvoiSelect}
                            disabled={sendingInProgress}
                          >
                            <option value="electronique">Électronique</option>
                            <option value="email">Email</option>
                            <option value="courrier">Courrier</option>
                          </select>
                        </div>
                      ) : (
                        <span className={styles.modeEnvoiEnvoye}>
                          {getModeEnvoiIcon(copro.modeEnvoiValide || copro.modeEnvoiRecommande)}
                          {getModeEnvoiLabel(copro.modeEnvoiValide || copro.modeEnvoiRecommande)}
                          {copro.recommande?.numeroSuivi && (
                            <span className={styles.numeroSuivi} title={copro.recommande.numeroSuivi}>
                              • {copro.recommande.numeroSuivi}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className={styles.textCenter}>
                      <div className={styles.actionsGroup}>
                        {!copro.envoye ? (
                          <button
                            className={styles.envoyerButton}
                            onClick={() => onEnvoyerAppel(copro.id)}
                            disabled={!copro.modeEnvoiValide && !copro.modeEnvoiRecommande || sendingInProgress}
                            title="Envoyer l'appel"
                          >
                            <Send size={14} aria-hidden="true" />
                          </button>
                        ) : (
                          <span className={styles.envoyeLabel} title="Appel envoyé">
                            <CheckCircle size={16} aria-hidden="true" />
                          </span>
                        )}
                        {/* Bouton Enregistrer paiement - seulement si reste à payer */}
                        {(copro.montantIndividuel - (copro.paiement?.montantPaye || 0)) > 0 && onEnregistrerPaiement && (
                          <button
                            className={styles.paiementButton}
                            onClick={() => onEnregistrerPaiement(copro.id)}
                            title="Enregistrer un paiement"
                          >
                            <Wallet size={14} aria-hidden="true" />
                          </button>
                        )}
                        {/* Bouton Historique paiements - seulement si paiements existants */}
                        {copro.paiement?.montantPaye && copro.paiement.montantPaye > 0 && onVoirHistoriquePaiements && (
                          <button
                            className={styles.historiqueButton}
                            onClick={() => onVoirHistoriquePaiements(copro.id)}
                            title="Voir l'historique des paiements"
                          >
                            <Info size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

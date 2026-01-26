'use client';

import { Home, History, CheckCircle, Clock, AlertTriangle, ChevronRight, Users } from 'lucide-react';
import { CoproprietaireALUR } from './types';
import styles from './Budget.module.css';

interface ALURCoproTableProps {
  coproprietairesALUR: CoproprietaireALUR[];
  onSelectCoproprietaire: (copro: CoproprietaireALUR) => void;
}

export function ALURCoproTable({
  coproprietairesALUR,
  onSelectCoproprietaire,
}: ALURCoproTableProps) {
  return (
    <div className="card">
      <div className={styles.alurTransferHeader}>
        <h3 className={styles.sectionTitle}>
          <Users size={20} style={{ marginRight: 'var(--space-sm)', verticalAlign: 'middle' }} aria-hidden="true" />
          Suivi par lot et copropriétaire
        </h3>
      </div>
      <p className={styles.alurInfo} style={{ marginBottom: 'var(--space-lg)' }}>
        Vue détaillée des contributions au fonds ALUR par copropriétaire. L&apos;historique cumulé
        est conservé même en cas de vente du lot.
      </p>

      <div className={styles.alurCoproTable}>
        <div className={styles.alurCoproTableHeader}>
          <div>Lot</div>
          <div>Copropriétaire</div>
          <div>Tantièmes</div>
          <div>Cotisation annuelle</div>
          <div>Total cumulé</div>
          <div>Statut</div>
          <div></div>
        </div>
        {coproprietairesALUR.map((copro) => {
          const dernierPaiement =
            copro.historiqueContributions[copro.historiqueContributions.length - 1];
          const aChangementProprio = copro.historiqueProprietaires.length > 1;
          return (
            <div
              key={copro.id}
              className={styles.alurCoproTableRow}
              onClick={() => onSelectCoproprietaire(copro)}
            >
              <div className={styles.alurCoproLot}>
                <Home size={16} aria-hidden="true" />
                <span>{copro.lot}</span>
              </div>
              <div className={styles.alurCoproNom}>
                {copro.nom}
                {aChangementProprio && (
                  <span
                    className={styles.alurHistoriqueBadge}
                    title="Historique avec changement de propriétaire"
                  >
                    <History size={12} aria-hidden="true" />
                  </span>
                )}
              </div>
              <div>{copro.tantiemes}</div>
              <div>{copro.cotisationAnnuelle.toLocaleString()} €</div>
              <div className={styles.alurCoproTotal}>
                {copro.totalContributions.toLocaleString()} €
              </div>
              <div>
                <span
                  className={`${styles.alurStatutBadge} ${
                    styles[`alurStatut${dernierPaiement.statut}`]
                  }`}
                >
                  {dernierPaiement.statut === 'PAYEE' && <CheckCircle size={12} aria-hidden="true" />}
                  {dernierPaiement.statut === 'EN_ATTENTE' && <Clock size={12} aria-hidden="true" />}
                  {dernierPaiement.statut === 'EN_RETARD' && <AlertTriangle size={12} aria-hidden="true" />}
                  {dernierPaiement.statut === 'PAYEE'
                    ? 'À jour'
                    : dernierPaiement.statut === 'EN_ATTENTE'
                    ? 'En attente'
                    : 'En retard'}
                </span>
              </div>
              <div>
                <button className={styles.alurDetailBtn} aria-label="Suivant"><ChevronRight size={16} aria-hidden="true" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

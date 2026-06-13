'use client';

import { X, History, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { CoproprietaireALUR } from '../types';
import styles from '../Budget.module.css';

interface CoproprietaireALURModalProps {
  selectedCoproprietaire: CoproprietaireALUR;
  selectedYear: number;
  onClose: () => void;
}

export function CoproprietaireALURModal({
  selectedCoproprietaire,
  selectedYear,
  onClose,
}: CoproprietaireALURModalProps) {
  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <h2 className={styles.modalTitle}>Fonds ALUR - {selectedCoproprietaire.lot}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-sm)',
            }}
           aria-label="Fermer"><X size={24} aria-hidden="true" /></button>
        </div>

        {/* Info copropriétaire */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--space-lg)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Copropriétaire actuel
              </div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                }}
              >
                {selectedCoproprietaire.nom}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Tantièmes
              </div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                }}
              >
                {selectedCoproprietaire.tantiemes} / 1000
              </div>
            </div>
          </div>
        </div>

        {/* Total cumulé du lot */}
        <div
          style={{
            padding: 'var(--space-xl)',
            background: 'var(--primary-light)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-xl)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-xs)',
            }}
          >
            Total cumulé du lot (historique complet)
          </div>
          <div
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: '700',
              color: 'var(--primary)',
            }}
          >
            {selectedCoproprietaire.totalContributions.toLocaleString()} €
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-xs)',
            }}
          >
            Ce montant inclut toutes les contributions depuis la création du fonds, y compris celles
            des anciens propriétaires
          </div>
        </div>

        {/* Historique des propriétaires */}
        {selectedCoproprietaire.historiqueProprietaires.length > 1 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3
              style={{
                fontSize: 'var(--text-md)',
                fontWeight: '600',
                marginBottom: 'var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}
            >
              <History size={18} aria-hidden="true" />
              Historique des propriétaires du lot
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {selectedCoproprietaire.historiqueProprietaires.map((hist) => (
                <div
                  key={`${hist.proprietaire}-${hist.dateDebut}`}
                  style={{
                    padding: 'var(--space-md)',
                    background: hist.dateFin ? 'var(--bg-secondary)' : 'var(--success-light)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: hist.dateFin ? 'none' : '2px solid var(--success)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                      {hist.proprietaire}
                      {!hist.dateFin && (
                        <span
                          style={{
                            marginLeft: 'var(--space-sm)',
                            fontSize: 'var(--text-xs)',
                            padding: '2px 8px',
                            background: 'var(--success)',
                            color: 'white',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          Actuel
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      {new Date(hist.dateDebut).toLocaleDateString('fr-FR')}
                      {hist.dateFin && ` → ${new Date(hist.dateFin).toLocaleDateString('fr-FR')}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: '700',
                        color: 'var(--primary)',
                      }}
                    >
                      {hist.contributionsCumulees.toLocaleString()} €
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      Contributions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique des contributions */}
        <div>
          <h3
            style={{
              fontSize: 'var(--text-md)',
              fontWeight: '600',
              marginBottom: 'var(--space-md)',
            }}
          >
            Contributions {selectedYear}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {selectedCoproprietaire.historiqueContributions.map((contrib) => (
              <div
                key={contrib.id}
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                    {contrib.periode}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {new Date(contrib.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                  <span style={{ fontWeight: '600', fontSize: 'var(--text-md)' }}>
                    {contrib.montant.toLocaleString()} €
                  </span>
                  <span
                    className={`${styles.alurStatutBadge} ${
                      styles[`alurStatut${contrib.statut}`]
                    }`}
                  >
                    {contrib.statut === 'PAYEE' && <CheckCircle size={12} aria-hidden="true" />}
                    {contrib.statut === 'EN_ATTENTE' && <Clock size={12} aria-hidden="true" />}
                    {contrib.statut === 'EN_RETARD' && <AlertTriangle size={12} aria-hidden="true" />}
                    {contrib.statut === 'PAYEE'
                      ? 'Payée'
                      : contrib.statut === 'EN_ATTENTE'
                      ? 'En attente'
                      : 'En retard'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { X, Mail, FileText, Smartphone, Plus, CheckCircle, Clock, AlertCircle, Send } from 'lucide-react';
import type { AppelFonds, RelanceAppel } from '../types';
import { formatDate } from '../utils';
import styles from '../appels-fonds.module.css';

interface HistoriqueRelancesModalProps {
  appel: AppelFonds;
  onClose: () => void;
  onNouvelleRelance: (relance: Omit<RelanceAppel, 'id'>) => void;
}

type TypeRelance = 'EMAIL' | 'COURRIER' | 'SMS';

const TYPE_RELANCE_CONFIG: Record<TypeRelance, { label: string; icon: typeof Mail; styleClass: string }> = {
  EMAIL: { label: 'Email', icon: Mail, styleClass: styles.relanceIconEmail },
  COURRIER: { label: 'Courrier', icon: FileText, styleClass: styles.relanceIconCourrier },
  SMS: { label: 'SMS', icon: Smartphone, styleClass: styles.relanceIconSms },
};

const STATUT_CONFIG = {
  ENVOYEE: { label: 'Envoyée', icon: CheckCircle, styleClass: styles.relanceStatutEnvoyee },
  EN_ATTENTE: { label: 'En attente', icon: Clock, styleClass: styles.relanceStatutEnAttente },
  ECHEC: { label: 'Échec', icon: AlertCircle, styleClass: styles.relanceStatutEchec },
};

// Mock des destinataires non payés
const MOCK_DESTINATAIRES_RELANCE = [
  { id: '3', nom: 'Sophie LAURENT', email: 'sophie.laurent@example.fr' },
  { id: '5', nom: 'Isabelle DUBOIS', email: 'isabelle.dubois@example.fr' },
  { id: '7', nom: 'Anne ROUSSEAU', email: 'anne.rousseau@example.fr' },
  { id: '8', nom: 'Marc PETIT', adresse: '12 Rue de la Paix, 75001 Paris' },
];

export function HistoriqueRelancesModal({
  appel,
  onClose,
  onNouvelleRelance,
}: HistoriqueRelancesModalProps) {
  const [showNouvelleRelance, setShowNouvelleRelance] = useState(false);
  const [typeRelance, setTypeRelance] = useState<TypeRelance>('EMAIL');
  const [selectedDestinataires, setSelectedDestinataires] = useState<string[]>([]);
  const [messageRelance, setMessageRelance] = useState('');
  const [isSending, setIsSending] = useState(false);

  const relances = appel.historiqueRelances || [];

  const handleToggleDestinataire = (id: string) => {
    setSelectedDestinataires(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDestinataires.length === MOCK_DESTINATAIRES_RELANCE.length) {
      setSelectedDestinataires([]);
    } else {
      setSelectedDestinataires(MOCK_DESTINATAIRES_RELANCE.map(d => d.id));
    }
  };

  const handleEnvoyerRelance = useCallback(async () => {
    if (selectedDestinataires.length === 0) return;

    setIsSending(true);

    // Simuler l'envoi
    await new Promise(resolve => setTimeout(resolve, 1500));

    const nouvelleRelance: Omit<RelanceAppel, 'id'> = {
      date: new Date().toISOString().split('T')[0],
      type: typeRelance,
      destinataires: selectedDestinataires.map(id => {
        const dest = MOCK_DESTINATAIRES_RELANCE.find(d => d.id === id);
        return dest?.nom || id;
      }),
      message: messageRelance || undefined,
      statut: 'ENVOYEE',
    };

    onNouvelleRelance(nouvelleRelance);
    setIsSending(false);
    setShowNouvelleRelance(false);
    setSelectedDestinataires([]);
    setMessageRelance('');
  }, [selectedDestinataires, typeRelance, messageRelance, onNouvelleRelance]);

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={styles.modalContentLarge}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Historique des relances</h2>
            <p className={styles.modalSubtitle}>{appel.description}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Header avec action */}
          <div className={styles.relancesHeader}>
            <h3 className={styles.relancesTitle}>
              <Mail size={20} aria-hidden="true" />
              {relances.length} relance{relances.length > 1 ? 's' : ''} effectuée{relances.length > 1 ? 's' : ''}
            </h3>
            <button
              className={styles.nouvelleRelanceButton}
              onClick={() => setShowNouvelleRelance(!showNouvelleRelance)}
            >
              <Plus size={16} aria-hidden="true" />
              Nouvelle relance
            </button>
          </div>

          {/* Formulaire nouvelle relance */}
          {showNouvelleRelance && (
            <div className={styles.form} style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)', fontWeight: 600 }}>Envoyer une relance</h4>

              {/* Type de relance */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Type de relance</label>
                <div className={styles.radioGroup}>
                  {(Object.keys(TYPE_RELANCE_CONFIG) as TypeRelance[]).map(type => {
                    const config = TYPE_RELANCE_CONFIG[type];
                    const Icon = config.icon;
                    return (
                      <label key={type} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="typeRelance"
                          value={type}
                          checked={typeRelance === type}
                          onChange={(e) => setTypeRelance(e.target.value as TypeRelance)}
                        />
                        <Icon size={16} aria-hidden="true" />
                        <span>{config.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Destinataires */}
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <label className={styles.formLabel}>
                    Destinataires (copropriétaires n&apos;ayant pas réglé)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
                  >
                    {selectedDestinataires.length === MOCK_DESTINATAIRES_RELANCE.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {MOCK_DESTINATAIRES_RELANCE.map(dest => (
                    <label
                      key={dest.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-sm) var(--space-md)',
                        background: selectedDestinataires.includes(dest.id) ? 'var(--primary-light)' : 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDestinataires.includes(dest.id)}
                        onChange={() => handleToggleDestinataire(dest.id)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 500 }}>{dest.nom}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                        {dest.email || dest.adresse}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message personnalisé */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="messageRelance">
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  id="messageRelance"
                  className={styles.formInput}
                  rows={3}
                  placeholder="Ajoutez un message personnalisé à la relance..."
                  value={messageRelance}
                  onChange={(e) => setMessageRelance(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowNouvelleRelance(false);
                    setSelectedDestinataires([]);
                    setMessageRelance('');
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleEnvoyerRelance}
                  disabled={selectedDestinataires.length === 0 || isSending}
                >
                  {isSending ? (
                    <span className={styles.spinner} />
                  ) : (
                    <Send size={16} aria-hidden="true" />
                  )}
                  {isSending ? 'Envoi en cours...' : `Envoyer à ${selectedDestinataires.length} destinataire${selectedDestinataires.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* Liste des relances */}
          {relances.length > 0 ? (
            <div className={styles.relancesList}>
              {relances.map((relance, index) => {
                const typeConfig = TYPE_RELANCE_CONFIG[relance.type];
                const statutConfig = STATUT_CONFIG[relance.statut];
                const TypeIcon = typeConfig.icon;
                const StatutIcon = statutConfig.icon;

                return (
                  <div key={relance.id} className={styles.relanceItem}>
                    <div className={`${styles.relanceIcon} ${typeConfig.styleClass}`}>
                      <TypeIcon size={20} aria-hidden="true" />
                    </div>
                    <div className={styles.relanceContent}>
                      <div className={styles.relanceHeader}>
                        <span className={styles.relanceType}>
                          Relance #{relances.length - index} - {typeConfig.label}
                        </span>
                        <span className={styles.relanceDate}>
                          {formatDate(relance.date)}
                        </span>
                      </div>
                      <p className={styles.relanceDestinataires}>
                        <strong>{relance.destinataires.length}</strong> destinataire{relance.destinataires.length > 1 ? 's' : ''}: {relance.destinataires.join(', ')}
                      </p>
                      {relance.message && (
                        <p className={styles.relanceMessage}>
                          &quot;{relance.message}&quot;
                        </p>
                      )}
                    </div>
                    <span className={`${styles.relanceStatut} ${statutConfig.styleClass}`}>
                      <StatutIcon size={14} aria-hidden="true" />
                      {statutConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.relancesEmpty}>
              <Mail size={48} aria-hidden="true" style={{ opacity: 0.5 }} />
              <p>Aucune relance effectuée pour cet appel de fonds</p>
              <button
                className={styles.nouvelleRelanceButton}
                onClick={() => setShowNouvelleRelance(true)}
                style={{ marginTop: 'var(--space-md)' }}
              >
                <Plus size={16} aria-hidden="true" />
                Envoyer la première relance
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

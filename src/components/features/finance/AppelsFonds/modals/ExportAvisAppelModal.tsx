'use client';

import { useState, useMemo } from 'react';
import { X, Download, FileText, Printer, Users, CheckCircle } from 'lucide-react';
import type { AppelFonds, CoproprietaireAppel } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { downloadAvisAppelHTML, openAvisAppelPrint, downloadAllAvisAppels } from '../services/avis-appel-export.service';
import styles from '../appels-fonds.module.css';

interface ExportAvisAppelModalProps {
  appel: AppelFonds;
  coproprietaires: CoproprietaireAppel[];
  onClose: () => void;
}

// Mock des infos copropriété et syndic
const MOCK_COPROPRIETE = {
  nom: 'Résidence Les Jardins du Parc',
  adresse: '12-14 Avenue des Champs, 75008 Paris',
};

const MOCK_SYNDIC = {
  nom: 'Cabinet Gestion Immo',
  adresse: '45 Boulevard Haussmann, 75009 Paris',
};

export function ExportAvisAppelModal({
  appel,
  coproprietaires,
  onClose,
}: ExportAvisAppelModalProps) {
  const [selectedCoproprietaires, setSelectedCoproprietaires] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string[]>([]);

  const totalTantiemes = useMemo(() =>
    coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0),
    [coproprietaires]
  );

  const handleToggleSelection = (id: string) => {
    setSelectedCoproprietaires(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCoproprietaires.length === coproprietaires.length) {
      setSelectedCoproprietaires([]);
    } else {
      setSelectedCoproprietaires(coproprietaires.map(c => c.id));
    }
  };

  const handleExportHTML = async (coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (!copro) return;

    setIsExporting(true);
    try {
      downloadAvisAppelHTML({
        appel,
        coproprietaire: copro,
        coproprieteNom: MOCK_COPROPRIETE.nom,
        coproprieteAdresse: MOCK_COPROPRIETE.adresse,
        syndicNom: MOCK_SYNDIC.nom,
        syndicAdresse: MOCK_SYNDIC.adresse,
      });
      setExportSuccess(prev => [...prev, coproId]);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPreview = (coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (!copro) return;

    openAvisAppelPrint({
      appel,
      coproprietaire: copro,
      coproprieteNom: MOCK_COPROPRIETE.nom,
      coproprieteAdresse: MOCK_COPROPRIETE.adresse,
      syndicNom: MOCK_SYNDIC.nom,
      syndicAdresse: MOCK_SYNDIC.adresse,
    });
  };

  const handleExportSelected = async () => {
    if (selectedCoproprietaires.length === 0) return;

    setIsExporting(true);
    try {
      const selected = coproprietaires.filter(c => selectedCoproprietaires.includes(c.id));
      downloadAllAvisAppels(
        appel,
        selected,
        MOCK_COPROPRIETE.nom,
        MOCK_COPROPRIETE.adresse,
        MOCK_SYNDIC.nom,
        MOCK_SYNDIC.adresse
      );
      setExportSuccess(selectedCoproprietaires);
    } finally {
      setIsExporting(false);
    }
  };

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
            <h2 className={styles.modalTitle}>Export des avis d&apos;appel</h2>
            <p className={styles.modalSubtitle}>{appel.description} - Date limite: {formatDate(appel.dateLimiteReglement)}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Résumé */}
          <div className={styles.previewSummary}>
            <div className={styles.previewSummaryItem}>
              <span className={styles.previewSummaryLabel}>Montant total</span>
              <span className={styles.previewSummaryValueHighlight}>
                {formatCurrency(appel.montantTotal)}
              </span>
            </div>
            <div className={styles.previewSummaryItem}>
              <span className={styles.previewSummaryLabel}>Date limite règlement</span>
              <span className={styles.previewSummaryValue}>
                {formatDate(appel.dateLimiteReglement)}
              </span>
            </div>
            <div className={styles.previewSummaryItem}>
              <span className={styles.previewSummaryLabel}>Copropriétaires</span>
              <span className={styles.previewSummaryValue}>
                {coproprietaires.length}
              </span>
            </div>
            <div className={styles.previewSummaryItem}>
              <span className={styles.previewSummaryLabel}>Sélectionnés</span>
              <span className={styles.previewSummaryValue}>
                {selectedCoproprietaires.length}
              </span>
            </div>
          </div>

          {/* Actions groupées */}
          <div className={styles.exportAvisActions}>
            <button
              className={styles.exportAvisButton}
              onClick={handleSelectAll}
            >
              <Users size={16} aria-hidden="true" />
              {selectedCoproprietaires.length === coproprietaires.length
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </button>
            <button
              className={`${styles.exportAvisButton} ${styles.exportAvisButtonPrimary}`}
              onClick={handleExportSelected}
              disabled={selectedCoproprietaires.length === 0 || isExporting}
            >
              <Download size={16} aria-hidden="true" />
              {isExporting
                ? 'Export en cours...'
                : `Exporter ${selectedCoproprietaires.length} avis (HTML)`}
            </button>
          </div>

          {/* Liste des copropriétaires */}
          <div className={styles.coproTableContainer}>
            <table className={styles.coproTable}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedCoproprietaires.length === coproprietaires.length}
                      onChange={handleSelectAll}
                      style={{ width: 18, height: 18 }}
                    />
                  </th>
                  <th>Copropriétaire</th>
                  <th>Lot</th>
                  <th className={styles.textRight}>Tantièmes</th>
                  <th className={styles.textRight}>Montant</th>
                  <th className={styles.textCenter}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coproprietaires.map((copro) => {
                  const montant = (copro.tantiemes / totalTantiemes) * appel.montantTotal;
                  const isExported = exportSuccess.includes(copro.id);

                  return (
                    <tr key={copro.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedCoproprietaires.includes(copro.id)}
                          onChange={() => handleToggleSelection(copro.id)}
                          style={{ width: 18, height: 18 }}
                        />
                      </td>
                      <td className={styles.coproNom}>
                        {copro.nom}
                        {isExported && (
                          <CheckCircle
                            size={14}
                            style={{ color: 'var(--success)', marginLeft: 8 }}
                            aria-hidden="true"
                          />
                        )}
                      </td>
                      <td>{copro.lot}</td>
                      <td className={styles.textRight}>{copro.tantiemes}</td>
                      <td className={styles.textRight}>
                        <span className={styles.montant}>
                          {formatCurrency(montant)}
                        </span>
                      </td>
                      <td className={styles.textCenter}>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            title="Télécharger HTML"
                            onClick={() => handleExportHTML(copro.id)}
                          >
                            <Download size={16} aria-hidden="true" />
                          </button>
                          <button
                            className={styles.actionButton}
                            title="Aperçu impression"
                            onClick={() => handlePrintPreview(copro.id)}
                          >
                            <Printer size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Note PDF */}
          <div style={{
            marginTop: 'var(--space-lg)',
            padding: 'var(--space-md)',
            background: 'var(--info-light)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            color: 'var(--info)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}>
            <FileText size={18} aria-hidden="true" />
            <span>
              <strong>Export PDF:</strong> Utilisez l&apos;aperçu impression pour générer un PDF via votre navigateur (Ctrl+P &gt; Enregistrer en PDF).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

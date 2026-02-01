'use client';

/**
 * Feuille de présence AG - 100% DB-First
 *
 * Sources Supabase :
 * - rpc_get_ag_coproprietaires : copropriétaires avec tantièmes
 * - v_ag_attendance_summary : présences enregistrées
 * - compute_ag_quorum : stats quorum temps réel
 *
 * Zéro mock, zéro localStorage, zéro state comme vérité métier.
 */

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  UserCheck,
  Users,
  FileDown,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';
import SignatureCanvas from '@/ui/SignatureCanvas';
import { useFeuillePresence } from '@/hooks/modules/useFeuillePresence';
import type { AttendanceType } from '@/lib/ag/types';
import styles from './feuille-presence.module.css';

export default function FeuillePresencePage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  // DB-first hook
  const {
    coproprietaires,
    attendanceByCoprId,
    quorumStats,
    quorumThresholds,
    agInfo,
    isLoading,
    isSaving,
    error,
    togglePresence,
    setRepresentedBy,
    bulkSetPresence,
    saveSignature,
    refresh,
  } = useFeuillePresence({ agId });

  // Local UI state
  const [showSignatures, setShowSignatures] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureCoproId, setCurrentSignatureCoproId] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePresenceChange = async (coproId: string, newValue: string) => {
    const presenceType = newValue as AttendanceType | 'absent';
    await togglePresence(coproId, presenceType);
  };

  const handleRepresentantChange = async (coproId: string, representantName: string) => {
    if (representantName.trim()) {
      await setRepresentedBy(coproId, representantName.trim());
    }
  };

  const handleBulkPresent = async () => {
    await bulkSetPresence('present');
  };

  const handleBulkAbsent = async () => {
    await bulkSetPresence('absent');
  };

  const handleOpenSignature = (coproId: string) => {
    setCurrentSignatureCoproId(coproId);
    setShowSignatureModal(true);
  };

  const handleSaveSignature = async (signatureData: string) => {
    if (currentSignatureCoproId) {
      await saveSignature(currentSignatureCoproId, signatureData);
    }
    setShowSignatureModal(false);
    setCurrentSignatureCoproId(null);
  };

  const handleExportPDF = () => {
    alert('Export PDF en cours de développement.');
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 size={48} className={styles.spinner} />
          <h2>Chargement de la feuille de présence...</h2>
          <p>Récupération des données depuis Supabase</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <div className="container">
        <div className={styles.errorState}>
          <XCircle size={48} className={styles.errorIcon} />
          <h2>Erreur de chargement</h2>
          <p className={styles.errorDetails}>{error}</p>
          <button onClick={refresh} className="btn btn-primary">
            <RefreshCw size={16} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  const currentCopro = currentSignatureCoproId
    ? coproprietaires.find(c => c.id === currentSignatureCoproId)
    : null;

  return (
    <div className="container">
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" />
          Retour
        </button>
        <div>
          <h1 className={styles.title}>Feuille de présence</h1>
          <p className={styles.subtitle}>
            {agInfo?.title || 'Assemblée Générale'}
            {isSaving && <span className={styles.savingIndicator}><Loader2 size={14} className={styles.spinnerSmall} /> Enregistrement...</span>}
          </p>
        </div>
      </div>

      {/* Statistiques Quorum */}
      {quorumStats && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <UserCheck size={24} aria-hidden="true" />
            <div>
              <div className={styles.statValue}>{quorumStats.attendeesCount}</div>
              <div className={styles.statLabel}>
                Présents ({quorumStats.presentCount}) / Représentés ({quorumStats.proxyCount})
              </div>
            </div>
          </div>
          <div className={styles.statCard}>
            <Users size={24} aria-hidden="true" />
            <div>
              <div className={styles.statValue}>
                {quorumStats.presentTantiemes} / {quorumStats.totalTantiemes}
              </div>
              <div className={styles.statLabel}>Tantièmes</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{quorumStats.quorumRatio.toFixed(2)}%</div>
            <div className={styles.statLabel}>Taux de participation</div>
          </div>
        </div>
      )}

      {/* Seuils Art. 24/25/26 */}
      {quorumThresholds && (
        <div className={styles.thresholdsGrid}>
          <div className={`${styles.thresholdCard} ${quorumThresholds.art24.reached ? styles.thresholdReached : styles.thresholdNotReached}`}>
            {quorumThresholds.art24.reached ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <div>
              <div className={styles.thresholdLabel}>{quorumThresholds.art24.label}</div>
              <div className={styles.thresholdValue}>
                Seuil: {quorumThresholds.art24.threshold} tantièmes
              </div>
            </div>
          </div>
          <div className={`${styles.thresholdCard} ${quorumThresholds.art25.reached ? styles.thresholdReached : styles.thresholdNotReached}`}>
            {quorumThresholds.art25.reached ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <div>
              <div className={styles.thresholdLabel}>{quorumThresholds.art25.label}</div>
              <div className={styles.thresholdValue}>
                Seuil: {quorumThresholds.art25.threshold} tantièmes
              </div>
            </div>
          </div>
          <div className={`${styles.thresholdCard} ${quorumThresholds.art26.reached ? styles.thresholdReached : styles.thresholdNotReached}`}>
            {quorumThresholds.art26.reached ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <div>
              <div className={styles.thresholdLabel}>{quorumThresholds.art26.label}</div>
              <div className={styles.thresholdValue}>
                Seuil: {quorumThresholds.art26.threshold} tantièmes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button onClick={handleBulkPresent} className="btn btn-primary" disabled={isSaving}>
          <CheckSquare size={16} />
          Tout cocher présent
        </button>
        <button onClick={handleBulkAbsent} className="btn btn-secondary" disabled={isSaving}>
          <Square size={16} />
          Tout décocher
        </button>
        <button onClick={handleExportPDF} className="btn btn-secondary">
          <FileDown size={16} />
          Exporter PDF
        </button>
        <button onClick={() => setShowSignatures(!showSignatures)} className="btn btn-secondary">
          {showSignatures ? <EyeOff size={16} /> : <Eye size={16} />}
          {showSignatures ? 'Masquer' : 'Afficher'} signatures
        </button>
        <button onClick={refresh} className="btn btn-secondary" disabled={isLoading}>
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>

      {/* Empty state */}
      {coproprietaires.length === 0 && (
        <div className={styles.emptyState}>
          <Users size={48} />
          <p>Aucun copropriétaire trouvé pour cette AG</p>
          <p className={styles.emptyHint}>Vérifiez que des copropriétaires sont associés à la copropriété.</p>
        </div>
      )}

      {/* Liste des copropriétaires */}
      {coproprietaires.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Copropriétaire</th>
                <th>Tantièmes</th>
                <th>Statut</th>
                <th>Représentant</th>
                <th>Signature</th>
              </tr>
            </thead>
            <tbody>
              {coproprietaires.map((copro) => {
                const attendance = attendanceByCoprId.get(copro.id);
                const presenceType = attendance?.presenceType || 'absent';
                const isPresent = presenceType !== 'absent';

                return (
                  <tr key={copro.id} className={isPresent ? styles.rowPresent : ''}>
                    <td>
                      <div className={styles.coproName}>{copro.displayName}</div>
                      {copro.email && <div className={styles.coproEmail}>{copro.email}</div>}
                    </td>
                    <td className={styles.tantiemes}>{copro.tantiemes}</td>
                    <td>
                      <select
                        value={presenceType}
                        onChange={(e) => handlePresenceChange(copro.id, e.target.value)}
                        className={styles.statutSelect}
                        disabled={isSaving}
                      >
                        <option value="absent">Absent</option>
                        <option value="present">Présent</option>
                        <option value="proxy">Représenté</option>
                        <option value="correspondence">Vote correspondance</option>
                      </select>
                    </td>
                    <td>
                      {presenceType === 'proxy' && (
                        <input
                          type="text"
                          placeholder="Nom du représentant"
                          defaultValue={attendance?.representedByName || ''}
                          onBlur={(e) => handleRepresentantChange(copro.id, e.target.value)}
                          className={styles.representantInput}
                          disabled={isSaving}
                        />
                      )}
                    </td>
                    <td>
                      {isPresent && presenceType !== 'correspondence' && (
                        <div className={styles.signatureCell}>
                          {attendance?.signed && showSignatures && attendance.signatureData && (
                            <img
                              src={attendance.signatureData}
                              alt="Signature"
                              className={styles.signaturePreview}
                            />
                          )}
                          <button
                            onClick={() => handleOpenSignature(copro.id)}
                            className="btn btn-sm btn-secondary"
                            disabled={isSaving}
                          >
                            {attendance?.signed ? 'Modifier' : 'Signer'}
                          </button>
                          {attendance?.signedAt && (
                            <div className={styles.signatureDate}>
                              {new Date(attendance.signedAt).toLocaleString('fr-FR')}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de signature */}
      {showSignatureModal && currentCopro && (
        <div className={styles.modalOverlay} onClick={() => setShowSignatureModal(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className={styles.modalTitle}>
              Signature de {currentCopro.displayName}
            </h2>
            <SignatureCanvas
              onSave={handleSaveSignature}
              onCancel={() => {
                setShowSignatureModal(false);
                setCurrentSignatureCoproId(null);
              }}
              initialSignature={attendanceByCoprId.get(currentCopro.id)?.signatureData}
            />
          </div>
        </div>
      )}
    </div>
  );
}

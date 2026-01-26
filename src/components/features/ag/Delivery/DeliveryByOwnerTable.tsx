'use client';

import { Mail, Home, AlertCircle, CheckCircle, ExternalLink, Save, RotateCcw } from 'lucide-react';
import { DeliveryMode } from '@/types/enums';
import { DELIVERY_MODES } from '@/lib/constants/delivery';
import type { OwnerDeliveryStatus } from '@/hooks/modules/useDeliveryConfig';
import styles from './DeliveryByOwnerTable.module.css';

interface DeliveryByOwnerTableProps {
  owners: OwnerDeliveryStatus[];
  globalMode: DeliveryMode | 'PAR_COPROPRIETAIRE';
  onOwnerModeChange: (ownerId: string, mode: DeliveryMode) => void;
  onSavePreferences: () => void;
  onResetPreferences: () => void;
  onEditOwner?: (ownerId: string) => void;
}

export function DeliveryByOwnerTable({
  owners,
  globalMode,
  onOwnerModeChange,
  onSavePreferences,
  onResetPreferences,
  onEditOwner,
}: DeliveryByOwnerTableProps) {
  const isEditable = globalMode === 'PAR_COPROPRIETAIRE';

  if (owners.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertCircle size={48} aria-hidden="true" />
        <h3>Aucun copropriétaire</h3>
        <p>Ajoutez des copropriétaires pour configurer les envois.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Configuration par copropriétaire</h2>
          <p className={styles.subtitle}>
            {isEditable
              ? 'Modifiez le mode d\'envoi pour chaque copropriétaire'
              : 'Mode global appliqué à tous les copropriétaires'}
          </p>
        </div>
        {isEditable && (
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={onResetPreferences}
              className={styles.actionBtn}
              title="Restaurer les préférences sauvegardées"
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span>Restaurer</span>
            </button>
            <button
              type="button"
              onClick={onSavePreferences}
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              title="Enregistrer comme préférences par défaut"
            >
              <Save size={16} aria-hidden="true" />
              <span>Enregistrer préférences</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Copropriétaire</th>
              <th>Lot</th>
              <th>Email</th>
              <th>Adresse postale</th>
              <th>Mode d&apos;envoi</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner) => (
              <tr
                key={owner.id}
                className={owner.eligibility === 'BLOQUANT' ? styles.rowBlocked : ''}
              >
                <td>
                  <div className={styles.ownerInfo}>
                    <span className={styles.ownerName}>{owner.nom}</span>
                    <span className={styles.ownerTantiemes}>{owner.tantiemes} tantièmes</span>
                  </div>
                </td>
                <td>
                  <span className={styles.lotBadge}>{owner.lot}</span>
                </td>
                <td>
                  <div className={`${styles.coordCell} ${!owner.hasEmail ? styles.coordMissing : ''}`}>
                    <Mail size={14} aria-hidden="true" />
                    {owner.hasEmail ? (
                      <span className={styles.coordValue}>{owner.email}</span>
                    ) : (
                      <span className={styles.missingText}>Non renseigné</span>
                    )}
                    {!owner.hasEmail && onEditOwner && (
                      <button
                        type="button"
                        onClick={() => onEditOwner(owner.id)}
                        className={styles.editLink}
                      >
                        <ExternalLink size={12} aria-hidden="true" />
                        Compléter
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <div className={`${styles.coordCell} ${!owner.hasAddress ? styles.coordMissing : ''}`}>
                    <Home size={14} aria-hidden="true" />
                    {owner.hasAddress && owner.adressePostale ? (
                      <span className={styles.coordValue}>
                        {owner.adressePostale.rue}, {owner.adressePostale.codePostal} {owner.adressePostale.ville}
                      </span>
                    ) : (
                      <span className={styles.missingText}>Non renseignée</span>
                    )}
                    {!owner.hasAddress && onEditOwner && (
                      <button
                        type="button"
                        onClick={() => onEditOwner(owner.id)}
                        className={styles.editLink}
                      >
                        <ExternalLink size={12} aria-hidden="true" />
                        Compléter
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  {isEditable ? (
                    <select
                      value={owner.effectiveMode}
                      onChange={(e) => onOwnerModeChange(owner.id, e.target.value as DeliveryMode)}
                      className={styles.modeSelect}
                    >
                      {DELIVERY_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={styles.modeReadonly}>
                      {DELIVERY_MODES.find((m) => m.value === owner.effectiveMode)?.label || owner.effectiveMode}
                    </span>
                  )}
                </td>
                <td>
                  {owner.eligibility === 'OK' ? (
                    <span className={styles.statusOk}>
                      <CheckCircle size={16} aria-hidden="true" />
                      OK
                    </span>
                  ) : (
                    <span className={styles.statusBlocked}>
                      <AlertCircle size={16} aria-hidden="true" />
                      {owner.eligibilityReason}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isEditable && (
        <p className={styles.readonlyNotice}>
          Sélectionnez &quot;Par copropriétaire&quot; dans le mode d&apos;envoi pour modifier individuellement.
        </p>
      )}
    </div>
  );
}

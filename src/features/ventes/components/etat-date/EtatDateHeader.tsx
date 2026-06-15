'use client';

import { Building2, User, FileText, Home, Scale } from 'lucide-react';
import type { EtatDatePayloadV2 } from '../../domain/types';
import styles from './etat-date.module.css';

const EMPTY = '—';
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : EMPTY;
const orDash = (v: string | null | undefined) => (v && v.trim() !== '' ? v : EMPTY);
const fmtPct = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n) + ' %';

interface EtatDateHeaderProps {
  payload: EtatDatePayloadV2;
}

export function EtatDateHeader({ payload }: EtatDateHeaderProps) {
  const { copro, syndic, lot, seller, notaire, cedants } = payload;
  const lotLabel =
    lot.type && lot.type.trim() !== '' ? `${orDash(lot.ref)} (${lot.type})` : orDash(lot.ref);

  return (
    <div className={styles.headerSection}>
      {/* Copropriété */}
      <h3 className={styles.headerSectionTitle}>
        <Building2 size={14} /> Copropriété
      </h3>
      <div className={styles.headerGrid}>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Nom</span>
          <span className={styles.headerValue}>{orDash(copro.name)}</span>
        </div>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Adresse</span>
          <span className={styles.headerValue}>{orDash(copro.address)}</span>
        </div>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>SIRET</span>
          <span className={styles.headerValue}>{orDash(copro.siret)}</span>
        </div>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>N° immatriculation</span>
          <span className={styles.headerValue}>{orDash(copro.num_immatriculation)}</span>
        </div>
      </div>

      {/* Syndic */}
      {syndic && (
        <>
          <h3 className={styles.headerSectionTitle}>
            <Scale size={14} /> Syndic
          </h3>
          <div className={styles.headerGrid}>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>Nom</span>
              <span className={styles.headerValue}>{orDash(syndic.name)}</span>
            </div>
            {syndic.address && (
              <div className={styles.headerField}>
                <span className={styles.headerLabel}>Adresse</span>
                <span className={styles.headerValue}>{syndic.address}</span>
              </div>
            )}
            {syndic.siret && (
              <div className={styles.headerField}>
                <span className={styles.headerLabel}>SIRET</span>
                <span className={styles.headerValue}>{syndic.siret}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lot */}
      <h3 className={styles.headerSectionTitle}>
        <Home size={14} /> Lot concerné
      </h3>
      <div className={styles.headerGrid}>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Référence</span>
          <span className={styles.headerValue}>{lotLabel}</span>
        </div>
        {lot.floor != null && (
          <div className={styles.headerField}>
            <span className={styles.headerLabel}>Étage</span>
            <span className={styles.headerValue}>{lot.floor}</span>
          </div>
        )}
        {lot.surface != null && (
          <div className={styles.headerField}>
            <span className={styles.headerLabel}>Surface</span>
            <span className={styles.headerValue}>{lot.surface} m²</span>
          </div>
        )}
      </div>

      {/* Vendeur(s) */}
      <h3 className={styles.headerSectionTitle}>
        <User size={14} /> Vendeur{cedants.length > 1 ? 's' : ''}
      </h3>
      <div className={styles.headerGrid}>
        {cedants.length > 0 ? (
          cedants.map((c) => (
            <div className={styles.headerField} key={c.coproprietaire_id}>
              <span className={styles.headerLabel}>Cédant</span>
              <span className={styles.headerValue}>
                {orDash(c.nom)} — {fmtPct(c.share_percent)}
              </span>
            </div>
          ))
        ) : (
          <div className={styles.headerField}>
            <span className={styles.headerLabel}>Nom</span>
            <span className={styles.headerValue}>{orDash(seller.name)}</span>
          </div>
        )}
        {seller.address && (
          <div className={styles.headerField}>
            <span className={styles.headerLabel}>Adresse</span>
            <span className={styles.headerValue}>{seller.address}</span>
          </div>
        )}
        {seller.email && (
          <div className={styles.headerField}>
            <span className={styles.headerLabel}>Email</span>
            <span className={styles.headerValue}>{seller.email}</span>
          </div>
        )}
      </div>

      {/* Notaire */}
      {notaire && (
        <>
          <h3 className={styles.headerSectionTitle}>
            <FileText size={14} /> Notaire
          </h3>
          <div className={styles.headerGrid}>
            <div className={styles.headerField}>
              <span className={styles.headerLabel}>Nom</span>
              <span className={styles.headerValue}>{orDash(notaire.name)}</span>
            </div>
            {notaire.office_name && (
              <div className={styles.headerField}>
                <span className={styles.headerLabel}>Office</span>
                <span className={styles.headerValue}>{notaire.office_name}</span>
              </div>
            )}
            {notaire.notary_reference && (
              <div className={styles.headerField}>
                <span className={styles.headerLabel}>Référence dossier</span>
                <span className={styles.headerValue}>{notaire.notary_reference}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Date d'effet */}
      <h3 className={styles.headerSectionTitle}>
        <FileText size={14} /> Date d&apos;effet
      </h3>
      <div className={styles.headerGrid}>
        <div className={styles.headerField}>
          <span className={styles.headerLabel}>Date d&apos;effet de la mutation</span>
          <span className={styles.headerValue}>{fmtDate(payload.effective_date)}</span>
        </div>
      </div>
    </div>
  );
}

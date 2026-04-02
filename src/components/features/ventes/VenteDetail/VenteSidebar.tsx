'use client';

import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Plus,
  ExternalLink
} from 'lucide-react';
import type { Vente, OrdreService } from './types';
import { getOsStatutColor, getOsStatutLabel, formatDate } from './utils';
import styles from './VenteDetail.module.css';

interface VenteSidebarProps {
  vente: Vente;
  linkedOrdresService: OrdreService[];
  onLinkOS: () => void;
}

export function VenteSidebar({ vente, linkedOrdresService, onLinkOS }: VenteSidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className="card">
        <div className={styles.sidebarHeader}>
          <h3>Informations</h3>
        </div>

        {/* Vendeur */}
        <div className={styles.infoSection}>
          <h4>Vendeur</h4>
          <div className={styles.infoItem}>
            <User size={14} aria-hidden="true" />
            <span>{vente.vendeur.nom}</span>
          </div>
          <div className={styles.infoItem}>
            <Mail size={14} aria-hidden="true" />
            <span>{vente.vendeur.email}</span>
          </div>
          <div className={styles.infoItem}>
            <Phone size={14} aria-hidden="true" />
            <span>{vente.vendeur.telephone}</span>
          </div>
        </div>

        <div className={styles.divider}></div>

        {/* Acquéreur */}
        <div className={styles.infoSection}>
          <h4>Acquéreur</h4>
          <div className={styles.infoItem}>
            <User size={14} aria-hidden="true" />
            <span>{vente.acquereur.nom}</span>
          </div>
          <div className={styles.infoItem}>
            <Mail size={14} aria-hidden="true" />
            <span>{vente.acquereur.email}</span>
          </div>
          <div className={styles.infoItem}>
            <Phone size={14} aria-hidden="true" />
            <span>{vente.acquereur.telephone}</span>
          </div>
        </div>

        <div className={styles.divider}></div>

        {/* Notaire */}
        <div className={styles.infoSection}>
          <h4>Notaire</h4>
          <div className={styles.infoItem}>
            <User size={14} aria-hidden="true" />
            <span>{vente.notaire.nom}</span>
          </div>
          <div className={styles.infoItem}>
            <Mail size={14} aria-hidden="true" />
            <span>{vente.notaire.email}</span>
          </div>
          <div className={styles.infoItem}>
            <Phone size={14} aria-hidden="true" />
            <span>{vente.notaire.telephone}</span>
          </div>
        </div>

        <div className={styles.divider}></div>

        {/* Dates */}
        <div className={styles.infoSection}>
          <h4>Dates importantes</h4>
          <div className={styles.infoItem}>
            <Calendar size={14} aria-hidden="true" />
            <span>Compromis : {formatDate(vente.dateCompromis)}</span>
          </div>
          {vente.dateActeAuthentique && (
            <div className={styles.infoItem}>
              <Calendar size={14} aria-hidden="true" />
              <span>Acte : {formatDate(vente.dateActeAuthentique)}</span>
            </div>
          )}
          {vente.dateNotificationArt6 && (
            <div className={styles.infoItem}>
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} aria-hidden="true" />
              <span>Notif. Art.6 : {formatDate(vente.dateNotificationArt6)}</span>
            </div>
          )}
        </div>

        <div className={styles.divider}></div>

        {/* Ordres de service */}
        <div className={styles.infoSection}>
          <div className={styles.sectionHeader}>
            <h4>Ordres de service</h4>
            <button
              className={styles.linkBtn}
              onClick={onLinkOS}
              title="Lier un ordre de service"
             aria-label="Ajouter"><Plus size={14} aria-hidden="true" /></button>
          </div>

          {linkedOrdresService.length === 0 ? (
            <p className={styles.emptyText}>Aucun ordre de service lié</p>
          ) : (
            <div className={styles.osLinkedList}>
              {linkedOrdresService.map(os => {
                const statutStyle = getOsStatutColor(os.statut);
                return (
                  <Link
                    key={os.id}
                    href={`/maintenance/service-orders/${os.id}`}
                    className={styles.osLinkedItem}
                  >
                    <div className={styles.osLinkedInfo}>
                      <span className={styles.osLinkedTitle}>{os.titre}</span>
                      <span
                        className={styles.osLinkedStatut}
                        style={{ background: statutStyle.bg, color: statutStyle.color }}
                      >
                        {getOsStatutLabel(os.statut)}
                      </span>
                    </div>
                    <ExternalLink size={12} className={styles.osLinkedIcon} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Observations */}
        {vente.observations && (
          <>
            <div className={styles.divider}></div>
            <div className={styles.infoSection}>
              <h4>Observations</h4>
              <p className={styles.observations}>{vente.observations}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

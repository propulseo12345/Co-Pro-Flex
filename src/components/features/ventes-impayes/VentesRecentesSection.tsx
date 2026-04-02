'use client';

import Link from 'next/link';
import { Home, FileText, Calendar, ArrowRight } from 'lucide-react';
import { getStatutVenteLabel, getStatutVenteColor } from '@/hooks/modules/useVentesImpayesPage';
import type { VenteRecente } from '@/hooks/modules/useVentesImpayesPage';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

interface VentesRecentesSectionProps {
  ventes: VenteRecente[];
}

export function VentesRecentesSection({ ventes }: VentesRecentesSectionProps) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleGroup}>
          <div className={styles.sectionIconWrapper} style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
            <Home size={20} style={{ color: 'var(--purple-500)' }} aria-hidden="true" />
          </div>
          <h2 className={styles.sectionTitle}>Ventes récentes</h2>
        </div>
        <Link href="/ventes-impayes/ventes" className={styles.viewAllLink}>
          Voir tout <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.ventesListe}>
        {ventes.map((vente) => {
          const statutColor = getStatutVenteColor(vente.statut);
          return (
            <Link
              key={vente.id}
              href={`/ventes-impayes/ventes/${vente.id}`}
              className={styles.venteItem}
            >
              <div className={styles.venteMain}>
                <div className={styles.venteInfo}>
                  <h4 className={styles.venteLot}>{vente.lot}</h4>
                  <p className={styles.venteParties}>
                    {vente.vendeur} → {vente.acquereur}
                  </p>
                </div>
                <div className={styles.venteActions}>
                  <span
                    className={styles.statutBadge}
                    style={{ background: statutColor.bg, color: statutColor.text }}
                  >
                    {getStatutVenteLabel(vente.statut)}
                  </span>
                  {vente.documentsManquants > 0 && (
                    <span className={styles.alertBadge}>
                      <FileText size={12} aria-hidden="true" />
                      {vente.documentsManquants} doc.
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.venteFooter}>
                <span className={styles.venteEtape}>{vente.etape}</span>
                <span className={styles.venteDate}>
                  <Calendar size={12} aria-hidden="true" />
                  {new Date(vente.dateCompromis).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

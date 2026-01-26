'use client';

import { Package, FileText, Mail, Send } from 'lucide-react';
import type { SendingMethod } from '../../types';
import styles from '../../../../app/(dashboard)/ag/[id]/envoi/envoi.module.css';

interface EnvoiSidebarProps {
  stats: Record<SendingMethod, number>;
  totalCost: number;
  sendingCosts: Record<SendingMethod, number>;
  isSent: boolean;
  onSend: () => void;
}

export function EnvoiSidebar({ stats, totalCost, sendingCosts, isSent, onSend }: EnvoiSidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className="card">
        <h3 className={styles.sidebarTitle}>Récapitulatif</h3>
        <div className={styles.statsGrid}>
          {stats.RECOMMANDE > 0 && (
            <StatItem icon={<Package size={20} color="var(--primary)" />} value={stats.RECOMMANDE} label="Recommandé" />
          )}
          {stats.LETTRE_SIMPLE > 0 && (
            <StatItem icon={<FileText size={20} color="var(--text-secondary)" />} value={stats.LETTRE_SIMPLE} label="Lettre simple" />
          )}
          {stats.AVIS_ELECTRONIQUE > 0 && (
            <StatItem icon={<Mail size={20} color="var(--info)" />} value={stats.AVIS_ELECTRONIQUE} label="Avis électronique" />
          )}
          {stats.EMAIL > 0 && (
            <StatItem icon={<Mail size={20} color="var(--success)" />} value={stats.EMAIL} label="Email" />
          )}
          {stats.REMISE_MAIN_PROPRE > 0 && (
            <StatItem icon={<FileText size={20} color="var(--text-secondary)" />} value={stats.REMISE_MAIN_PROPRE} label="Remise main propre" />
          )}
        </div>
      </div>

      {totalCost > 0 && (
        <div className={`${styles.costCard} card`}>
          <h3 className={styles.sidebarTitle}>Coût total</h3>
          <div className={styles.totalCost}>{totalCost.toFixed(2)} €</div>
          <div className={styles.costBreakdown}>
            {stats.RECOMMANDE > 0 && <CostLine count={stats.RECOMMANDE} label="Recommandé" unitCost={sendingCosts.RECOMMANDE} />}
            {stats.LETTRE_SIMPLE > 0 && <CostLine count={stats.LETTRE_SIMPLE} label="Lettre simple" unitCost={sendingCosts.LETTRE_SIMPLE} />}
            {stats.AVIS_ELECTRONIQUE > 0 && <CostLine count={stats.AVIS_ELECTRONIQUE} label="Avis électronique" unitCost={sendingCosts.AVIS_ELECTRONIQUE} />}
            {stats.EMAIL > 0 && <CostLine count={stats.EMAIL} label="Email" unitCost={sendingCosts.EMAIL} />}
            {stats.REMISE_MAIN_PROPRE > 0 && <CostLine count={stats.REMISE_MAIN_PROPRE} label="Remise main propre" unitCost={sendingCosts.REMISE_MAIN_PROPRE} />}
          </div>
        </div>
      )}

      <div className={`${styles.infoBox} card`}>
        <h3>Rappel légal</h3>
        <p>Les convocations doivent être envoyées au moins 21 jours avant la date de l'AG.</p>
        <p>Les méthodes recommandées offrent une preuve de réception.</p>
      </div>

      {!isSent && (
        <button onClick={onSend} className="btn btn-primary w-full">
          <Send size={16} aria-hidden="true" />
          Envoyer les convocations
        </button>
      )}
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className={styles.statItem}>
      {icon}
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function CostLine({ count, label, unitCost }: { count: number; label: string; unitCost: number }) {
  return (
    <div className={styles.costLine}>
      <span>{count} × {label}</span>
      <span>{(count * unitCost).toFixed(2)} €</span>
    </div>
  );
}

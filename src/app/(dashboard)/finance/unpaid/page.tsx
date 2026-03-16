'use client';

import { AlertTriangle, Send, Phone, FileText } from 'lucide-react';
import styles from './unpaid.module.css';
import Link from 'next/link';
import { useCopro } from '@/providers/CoproContext';
import { useUnpaid } from '@/hooks/modules/useFinanceData';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';

export default function UnpaidPage() {
  const { currentCoproId, isManager } = useCopro();
  const { data: unpaidLots, isLoading, error, refresh } = useUnpaid();

  const handleCall = (ownerName: string, lotRef: string) => {
    // TODO: Intégration téléphonie
    // TODO: Intégration téléphonie
    alert(`Appel en cours vers ${ownerName} (Lot ${lotRef})...\n\nNote: Cette fonctionnalité pourrait être intégrée avec un système de téléphonie.`);
  };

  const handleSendReminder = (ownerName: string, lotRef: string, montant: number) => {
    // TODO: Intégration communication - pour l'instant juste un log
    // TODO: Intégration communication
    const confirm = window.confirm(`Envoyer une relance à ${ownerName} (Lot ${lotRef}) pour ${montant.toLocaleString('fr-FR')} € ?`);
    if (confirm) {
      // TODO: Appeler l'API de communication quand elle sera prête
      alert(`Relance programmée pour ${ownerName} !\n\n(Note: L'envoi réel sera disponible dans une prochaine version)`);
    }
  };

  const getStatusBadge = (daysOverdue: number) => {
    if (daysOverdue > 90) {
      return <span className="badge badge-error">Contentieux</span>;
    } else if (daysOverdue > 60) {
      return <span className="badge badge-error">2ème relance</span>;
    } else if (daysOverdue > 30) {
      return <span className="badge badge-warning">1ère relance</span>;
    } else {
      return <span className="badge badge-warning">En retard</span>;
    }
  };

  // Mode Single Copro: si pas encore chargé ou en cours de chargement
  if (!currentCoproId || isLoading) {
    return <LoadingState message="Chargement des impayés..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const unpaid = unpaidLots || [];
  const totalUnpaid = unpaid.reduce((sum, i) => sum + Number(i.total_unpaid), 0);
  const contentieuxCount = unpaid.filter(i => i.days_overdue > 90).length;

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Impayés</h1>
          <p className={styles.subtitle}>
            Suivi des charges impayées et relances
          </p>
        </div>
        {isManager && (
          <Link href="/finance/unpaid/reminders" className="btn btn-primary">
            <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Gérer les relances
          </Link>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <div>
            <div className={styles.statLabel}>Total impayés</div>
            <div className={styles.statValue}>{totalUnpaid.toLocaleString('fr-FR')} €</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FileText size={24} aria-hidden="true" />
          </div>
          <div>
            <div className={styles.statLabel}>Dossiers</div>
            <div className={styles.statValue}>{unpaid.length}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <div>
            <div className={styles.statLabel}>Contentieux (&gt;90j)</div>
            <div className={styles.statValue}>{contentieuxCount}</div>
          </div>
        </div>
      </div>

      {unpaid.length === 0 ? (
        <EmptyState
          title="Aucun impayé"
          message="Tous les copropriétaires sont à jour de leurs charges."
        />
      ) : (
        <div className="card">
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Propriétaire</th>
                  <th>Montant dû</th>
                  <th>Échéance la plus ancienne</th>
                  <th>Retard</th>
                  <th>Statut</th>
                  <th>Lignes impayées</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {unpaid.map((item) => (
                  <tr key={item.lot_id} className={item.days_overdue > 90 ? styles.rowContentieux : ''}>
                    <td className={styles.lot}>{item.lot_ref}</td>
                    <td className={styles.proprietaire}>{item.owner_name || 'Non renseigné'}</td>
                    <td className={styles.montant}>{Number(item.total_unpaid).toLocaleString('fr-FR')} €</td>
                    <td>{new Date(item.oldest_due_date).toLocaleDateString('fr-FR')}</td>
                    <td className={styles.retard}>
                      <span className={styles.retardBadge}>
                        {item.days_overdue} jours
                      </span>
                    </td>
                    <td>{getStatusBadge(item.days_overdue)}</td>
                    <td>{item.unpaid_lines_count}</td>
                    {isManager && (
                      <td>
                        <div className={styles.actions}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Appeler"
                            onClick={() => handleCall(item.owner_name || 'Propriétaire', item.lot_ref)}
                          >
                            <Phone size={14} aria-hidden="true" />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Envoyer relance"
                            onClick={() => handleSendReminder(item.owner_name || 'Propriétaire', item.lot_ref, Number(item.total_unpaid))}
                          >
                            <Send size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

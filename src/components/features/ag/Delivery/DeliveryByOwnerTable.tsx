'use client';

import { useState } from 'react';
import { Mail, Home, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Save, RotateCcw, User, Search, Filter } from 'lucide-react';
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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'blocked'>('all');

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedCards(new Set(owners.map(o => o.id)));
  };

  const collapseAll = () => {
    setExpandedCards(new Set());
  };

  // Filtrage des copropriétaires
  const filteredOwners = owners.filter(owner => {
    const matchesSearch = searchQuery === '' ||
      owner.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.lot.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'ok' && owner.eligibility === 'OK') ||
      (filterStatus === 'blocked' && owner.eligibility === 'BLOQUANT');

    return matchesSearch && matchesFilter;
  });

  const blockedCount = owners.filter(o => o.eligibility === 'BLOQUANT').length;

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
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>
            <User size={20} aria-hidden="true" />
            Configuration par copropriétaire
          </h2>
          <p className={styles.subtitle}>
            {isEditable
              ? `${owners.length} copropriétaire${owners.length > 1 ? 's' : ''} • Mode personnalisé activé`
              : `Mode global appliqué à ${owners.length} copropriétaire${owners.length > 1 ? 's' : ''}`}
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
              <span className={styles.btnLabel}>Restaurer</span>
            </button>
            <button
              type="button"
              onClick={onSavePreferences}
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              title="Enregistrer comme préférences par défaut"
            >
              <Save size={16} aria-hidden="true" />
              <span className={styles.btnLabel}>Enregistrer</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats rapides */}
      <div className={styles.quickStats}>
        <div className={styles.statItem}>
          <CheckCircle size={16} className={styles.statIconOk} aria-hidden="true" />
          <span>{owners.length - blockedCount} prêt{owners.length - blockedCount > 1 ? 's' : ''}</span>
        </div>
        {blockedCount > 0 && (
          <div className={styles.statItem}>
            <AlertCircle size={16} className={styles.statIconWarning} aria-hidden="true" />
            <span>{blockedCount} à compléter</span>
          </div>
        )}
      </div>

      {/* Barre de recherche et filtres */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher un copropriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <Filter size={14} aria-hidden="true" />
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`${styles.filterBtn} ${filterStatus === 'all' ? styles.filterBtnActive : ''}`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ok')}
            className={`${styles.filterBtn} ${filterStatus === 'ok' ? styles.filterBtnActive : ''}`}
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('blocked')}
            className={`${styles.filterBtn} ${filterStatus === 'blocked' ? styles.filterBtnActive : ''}`}
          >
            À compléter
          </button>
        </div>
        <div className={styles.expandActions}>
          <button type="button" onClick={expandAll} className={styles.expandBtn}>
            Tout ouvrir
          </button>
          <button type="button" onClick={collapseAll} className={styles.expandBtn}>
            Tout fermer
          </button>
        </div>
      </div>

      {/* Liste des cartes */}
      <div className={styles.cardList}>
        {filteredOwners.map((owner) => {
          const isExpanded = expandedCards.has(owner.id);
          const isBlocked = owner.eligibility === 'BLOQUANT';

          return (
            <div
              key={owner.id}
              className={`${styles.card} ${isBlocked ? styles.cardBlocked : ''} ${isExpanded ? styles.cardExpanded : ''}`}
            >
              {/* En-tête de carte (toujours visible) */}
              <div className={styles.cardHeader} onClick={() => toggleCard(owner.id)}>
                <div className={styles.cardMain}>
                  <div className={styles.ownerIdentity}>
                    <span className={styles.ownerName}>{owner.nom}</span>
                    <span className={styles.lotBadge}>{owner.lot}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.tantiemes}>{owner.tantiemes} tantièmes</span>
                    {isBlocked ? (
                      <span className={styles.statusBlocked}>
                        <AlertCircle size={14} aria-hidden="true" />
                        À compléter
                      </span>
                    ) : (
                      <span className={styles.statusOk}>
                        <CheckCircle size={14} aria-hidden="true" />
                        OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Mode d'envoi (visible même fermé) */}
                <div className={styles.cardMode} onClick={(e) => e.stopPropagation()}>
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
                </div>

                <button type="button" className={styles.expandToggle} aria-label={isExpanded ? 'Réduire' : 'Développer'}>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {/* Détails (visible si ouvert) */}
              {isExpanded && (
                <div className={styles.cardDetails}>
                  <div className={styles.detailRow}>
                    <Mail size={16} aria-hidden="true" />
                    <span className={styles.detailLabel}>Email</span>
                    {owner.hasEmail ? (
                      <span className={styles.detailValue}>{owner.email}</span>
                    ) : (
                      <span className={styles.detailMissing}>
                        Non renseigné
                        {onEditOwner && (
                          <button
                            type="button"
                            onClick={() => onEditOwner(owner.id)}
                            className={styles.completeBtn}
                          >
                            Compléter
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  <div className={styles.detailRow}>
                    <Home size={16} aria-hidden="true" />
                    <span className={styles.detailLabel}>Adresse</span>
                    {owner.hasAddress && owner.adressePostale ? (
                      <span className={styles.detailValue}>
                        {owner.adressePostale.rue}, {owner.adressePostale.codePostal} {owner.adressePostale.ville}
                      </span>
                    ) : (
                      <span className={styles.detailMissing}>
                        Non renseignée
                        {onEditOwner && (
                          <button
                            type="button"
                            onClick={() => onEditOwner(owner.id)}
                            className={styles.completeBtn}
                          >
                            Compléter
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  {isBlocked && owner.eligibilityReason && (
                    <div className={styles.warningBox}>
                      <AlertCircle size={16} aria-hidden="true" />
                      <span>{owner.eligibilityReason}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredOwners.length === 0 && (
        <div className={styles.noResults}>
          <Search size={24} aria-hidden="true" />
          <p>Aucun résultat pour &quot;{searchQuery}&quot;</p>
          <button type="button" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }} className={styles.clearFilterBtn}>
            Effacer les filtres
          </button>
        </div>
      )}

      {!isEditable && (
        <p className={styles.readonlyNotice}>
          💡 Sélectionnez &quot;Par copropriétaire&quot; dans le mode d&apos;envoi pour modifier individuellement.
        </p>
      )}
    </div>
  );
}

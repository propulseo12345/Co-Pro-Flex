'use client';

import { useState } from 'react';
import { Plus, Search, Clock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useMutations } from '@/features/ventes';
import {
  MutationCard,
  CreateMutationModal,
} from '@/features/ventes/components';
import { MUTATION_STATUS_LABELS, MUTATION_TYPE_LABELS } from '@/features/ventes/domain/types';
import type { MutationStatus, MutationType } from '@/features/ventes/domain/types';
import { DataState } from '@/components/ui/DataState';
import styles from './ventes.module.css';

export default function VentesPage() {
  const {
    filteredMutations,
    stats,
    filters,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    isLoading,
    error,
    createMutation,
  } = useMutations();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateMutation = async (input: Parameters<typeof createMutation>[0]) => {
    await createMutation(input);
    setShowCreateModal(false);
  };

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des Mutations</h1>
          <p className={styles.subtitle}>
            Suivez les ventes de lots avec états datés conformes Art. 20
          </p>
        </div>
        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Nouvelle mutation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--badge-warning-bg)' }}>
            <Clock size={24} style={{ color: 'var(--warning)' }} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statValue}>{stats.enCours}</h3>
            <p className={styles.statLabel}>Mutations en cours</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
            <CheckCircle2 size={24} style={{ color: 'var(--success)' }} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statValue}>{stats.validated}</h3>
            <p className={styles.statLabel}>Mutations finalisées</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--badge-info-bg)' }}>
            <FileText size={24} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statValue}>{stats.documentsManquants}</h3>
            <p className={styles.statLabel}>États datés manquants</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher par lot, vendeur, acquéreur, notaire..."
              className={styles.searchInput}
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filters}>
            <select
              className={styles.select}
              value={filters.status}
              onChange={(e) => setStatusFilter(e.target.value as MutationStatus | 'ALL')}
            >
              <option value="ALL">Tous les statuts</option>
              {Object.entries(MUTATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={filters.mutation_type}
              onChange={(e) => setTypeFilter(e.target.value as MutationType | 'ALL')}
            >
              <option value="ALL">Tous les types</option>
              {Object.entries(MUTATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des mutations */}
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={filteredMutations.length === 0}
        emptyMessage="Aucune mutation trouvée"
        emptyIcon={<AlertTriangle size={48} />}
      >
        <div className={styles.ventesList}>
          {filteredMutations.map((mutation) => (
            <MutationCard key={mutation.id} mutation={mutation} />
          ))}
        </div>
      </DataState>

      {/* Modal création */}
      <CreateMutationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateMutation}
      />
    </div>
  );
}

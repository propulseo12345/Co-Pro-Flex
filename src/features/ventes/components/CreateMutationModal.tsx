'use client';

import { useState, useEffect } from 'react';
import { X, Building2, User, Briefcase } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { fetchAvailableLots } from '../api/mutationsApi';
import type { MutationType, CreateMutationInput } from '../domain/types';
import { MUTATION_TYPE_LABELS } from '../domain/types';
import styles from './CreateMutationModal.module.css';

interface AvailableLot {
  id: string;
  ref: string;
  type: string;
  tantiemes_generaux: number;
  lot_owners: Array<{
    coproprietaire_id: string;
    coproprietaires: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
      is_company: boolean;
      email: string | null;
    };
  }>;
}

interface CreateMutationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: Omit<CreateMutationInput, 'copro_id'>) => Promise<void>;
}

export function CreateMutationModal({ isOpen, onClose, onSubmit }: CreateMutationModalProps) {
  const { currentCoproId } = useCopro();
  const [lots, setLots] = useState<AvailableLot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    lot_id: '',
    seller_owner_id: '',
    mutation_type: 'sale' as MutationType,
    buyer_name: '',
    buyer_email: '',
    buyer_is_company: false,
    notary_name: '',
    notary_email: '',
    notary_reference: '',
    notes: '',
  });

  // Charger les lots disponibles
  useEffect(() => {
    if (isOpen && currentCoproId) {
      setIsLoading(true);
      fetchAvailableLots(currentCoproId)
        .then((data) => {
          setLots(data as AvailableLot[]);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, currentCoproId]);

  // Mettre à jour seller_owner_id quand lot_id change
  useEffect(() => {
    if (formData.lot_id) {
      const selectedLot = lots.find((l) => l.id === formData.lot_id);
      if (selectedLot && selectedLot.lot_owners[0]) {
        setFormData((prev) => ({
          ...prev,
          seller_owner_id: selectedLot.lot_owners[0].coproprietaire_id,
        }));
      }
    }
  }, [formData.lot_id, lots]);

  const getOwnerName = (lot: AvailableLot) => {
    const owner = lot.lot_owners[0]?.coproprietaires;
    if (!owner) return 'Propriétaire inconnu';
    if (owner.is_company) return owner.company_name || 'Société';
    return `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Propriétaire';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lot_id || !formData.seller_owner_id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
      setFormData({
        lot_id: '',
        seller_owner_id: '',
        mutation_type: 'sale',
        buyer_name: '',
        buyer_email: '',
        buyer_is_company: false,
        notary_name: '',
        notary_email: '',
        notary_reference: '',
        notes: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Nouvelle mutation</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          {/* Lot & Vendeur */}
          <div className={styles.section}>
            <h3>
              <Building2 size={16} />
              Lot concerné
            </h3>

            <div className={styles.field}>
              <label htmlFor="lot_id">Lot *</label>
              <select
                id="lot_id"
                value={formData.lot_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, lot_id: e.target.value }))}
                required
                disabled={isLoading}
              >
                <option value="">Sélectionner un lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.ref} - {lot.type} ({lot.tantiemes_generaux} tantièmes) - {getOwnerName(lot)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="mutation_type">Type de mutation *</label>
              <select
                id="mutation_type"
                value={formData.mutation_type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mutation_type: e.target.value as MutationType }))
                }
                required
              >
                {Object.entries(MUTATION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Acquéreur */}
          <div className={styles.section}>
            <h3>
              <User size={16} />
              Acquéreur
            </h3>

            <div className={styles.field}>
              <label htmlFor="buyer_name">Nom de l&apos;acquéreur</label>
              <input
                id="buyer_name"
                type="text"
                value={formData.buyer_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, buyer_name: e.target.value }))}
                placeholder="Jean DUPONT"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="buyer_email">Email</label>
              <input
                id="buyer_email"
                type="email"
                value={formData.buyer_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, buyer_email: e.target.value }))}
                placeholder="jean.dupont@email.fr"
              />
            </div>

            <div className={styles.checkbox}>
              <input
                id="buyer_is_company"
                type="checkbox"
                checked={formData.buyer_is_company}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, buyer_is_company: e.target.checked }))
                }
              />
              <label htmlFor="buyer_is_company">Personne morale (société)</label>
            </div>
          </div>

          {/* Notaire */}
          <div className={styles.section}>
            <h3>
              <Briefcase size={16} />
              Notaire
            </h3>

            <div className={styles.field}>
              <label htmlFor="notary_name">Nom du notaire</label>
              <input
                id="notary_name"
                type="text"
                value={formData.notary_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, notary_name: e.target.value }))}
                placeholder="Maître NOTAIRE"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="notary_email">Email</label>
              <input
                id="notary_email"
                type="email"
                value={formData.notary_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, notary_email: e.target.value }))}
                placeholder="notaire@office.fr"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="notary_reference">Référence dossier</label>
              <input
                id="notary_reference"
                type="text"
                value={formData.notary_reference}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notary_reference: e.target.value }))
                }
                placeholder="REF-2026-001"
              />
            </div>
          </div>

          {/* Notes */}
          <div className={styles.field}>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Informations complémentaires..."
              rows={3}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !formData.lot_id}
            >
              {isSubmitting ? 'Création...' : 'Créer la mutation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

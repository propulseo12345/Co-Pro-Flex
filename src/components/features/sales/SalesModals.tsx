'use client';

import { X } from 'lucide-react';
import type { Sale } from '@/types';
import type { NewSaleForm } from '@/hooks/modules/useSalesPage';
import { MOCK_LOTS } from '@/hooks/modules/useSalesPage';
import styles from '../../../app/(dashboard)/sales/sales.module.css';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  newSale: NewSaleForm;
  onUpdate: (updates: Partial<NewSaleForm>) => void;
  onCreate: () => void;
}

export function CreateSaleModal({ isOpen, onClose, newSale, onUpdate, onCreate }: CreateSaleModalProps) {
  if (!isOpen) return null;

  const handleLotToggle = (lotId: string, lotType: string, checked: boolean) => {
    if (checked) {
      onUpdate({ lotIds: [...newSale.lotIds, lotId], lotTypes: [...newSale.lotTypes, lotType] });
    } else {
      const idx = newSale.lotIds.indexOf(lotId);
      onUpdate({
        lotIds: newSale.lotIds.filter(id => id !== lotId),
        lotTypes: newSale.lotTypes.filter((_, i) => i !== idx)
      });
    }
  };

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>Nouvelle vente</h2>
          <button onClick={onClose} className={styles.modalClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Lot(s) concerné(s) *</label>
            <div className={styles.lotsSelector}>
              {MOCK_LOTS.map(lot => (
                <label key={lot.id} className={styles.lotCheckbox}>
                  <input type="checkbox" checked={newSale.lotIds.includes(lot.id)} onChange={(e) => handleLotToggle(lot.id, lot.type, e.target.checked)} />
                  <span>{lot.id} - {lot.type} ({lot.coproprietaire})</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Vendeur *</label>
            <select value={newSale.vendeurId} onChange={(e) => onUpdate({ vendeurId: e.target.value })} className={styles.select}>
              <option value="">Sélectionner un copropriétaire</option>
            </select>
          </div>
          <div className={styles.formGroup}><label>Acquéreur</label><input type="text" value={newSale.acquereur} onChange={(e) => onUpdate({ acquereur: e.target.value })} className={styles.input} placeholder="Nom de l'acquéreur" /></div>
          <div className={styles.formGroup}><label>Notaire</label><input type="text" value={newSale.notaire} onChange={(e) => onUpdate({ notaire: e.target.value })} className={styles.input} placeholder="Nom du notaire" /></div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}><label>Date compromis</label><input type="date" value={newSale.dateCompromis} onChange={(e) => onUpdate({ dateCompromis: e.target.value })} className={styles.input} /></div>
            <div className={styles.formGroup}><label>Date acte authentique prévu</label><input type="date" value={newSale.dateActeAuthentique} onChange={(e) => onUpdate({ dateActeAuthentique: e.target.value })} className={styles.input} /></div>
          </div>
          <div className={styles.formGroup}><label>Observations internes</label><textarea value={newSale.observations} onChange={(e) => onUpdate({ observations: e.target.value })} className={styles.textarea} rows={4} placeholder="Notes pour suivi interne..." /></div>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button onClick={onCreate} className="btn btn-primary">Créer la vente</button>
        </div>
      </div>
    </div>
  );
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export function HistoryModal({ isOpen, onClose, sale }: HistoryModalProps) {
  if (!isOpen || !sale) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>Historique de la vente</h2>
          <button onClick={onClose} className={styles.modalClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.historyList}>
            {sale.historique.map((hist) => (
              <div key={hist.id} className={styles.historyItem}>
                <div className={styles.historyDate}>{new Date(hist.date).toLocaleDateString('fr-FR')} {new Date(hist.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className={styles.historyContent}>
                  <div className={styles.historyAction}>{hist.action}</div>
                  <div className={styles.historyUser}>Par {hist.utilisateur}</div>
                  {hist.details && <div className={styles.historyDetails}>{hist.details}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.modalFooter}><button onClick={onClose} className="btn btn-primary">Fermer</button></div>
      </div>
    </div>
  );
}

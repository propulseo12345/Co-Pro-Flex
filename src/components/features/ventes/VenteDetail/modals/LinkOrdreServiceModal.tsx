'use client';

import { useState } from 'react';
import { X, Link2, Search, CheckCircle2, Check } from 'lucide-react';
import clsx from 'clsx';
import type { OrdreService } from '../types';
import { getOsStatutColor, getOsStatutLabel } from '../utils';
import styles from '../VenteDetail.module.css';

interface LinkOrdreServiceModalProps {
  currentIds: string[];
  ordresService: OrdreService[];
  onClose: () => void;
  onLink: (ids: string[]) => void;
}

export function LinkOrdreServiceModal({
  currentIds,
  ordresService,
  onClose,
  onLink
}: LinkOrdreServiceModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentIds);
  const [search, setSearch] = useState('');

  const filteredOS = ordresService.filter(os =>
    os.titre.toLowerCase().includes(search.toLowerCase()) ||
    os.fournisseur.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalMedium} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3><Link2 size={20} aria-hidden="true" /> Lier des ordres de service</h3>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.searchBox}>
            <Search size={18} aria-hidden="true" />
            <input type="text" placeholder="Rechercher un ordre de service..." value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.osLinkList}>
            {filteredOS.length === 0 ? (
              <div className={styles.osLinkEmpty}>Aucun ordre de service trouvé</div>
            ) : (
              filteredOS.map(os => {
                const statutStyle = getOsStatutColor(os.statut);
                return (
                  <div
                    key={os.id}
                    className={clsx(
                      styles.osLinkItem,
                      selectedIds.includes(os.id) && styles.osLinkItemActive
                    )}
                    onClick={() => toggleSelect(os.id)}
                  >
                    <div className={styles.osLinkCheck}>
                      {selectedIds.includes(os.id) ? (
                        <CheckCircle2 size={20} aria-hidden="true" />
                      ) : (
                        <div className={styles.osLinkEmpty} />
                      )}
                    </div>
                    <div className={styles.osLinkContent}>
                      <div className={styles.osLinkTitle}>{os.titre}</div>
                      <div className={styles.osLinkMeta}>
                        <span>{os.fournisseur}</span>
                        <span>•</span>
                        <span>{new Date(os.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <span
                      className={styles.osLinkStatut}
                      style={{ background: statutStyle.bg, color: statutStyle.color }}
                    >
                      {getOsStatutLabel(os.statut)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onLink(selectedIds);
              onClose();
            }}
          >
            <Check size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Valider ({selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
}

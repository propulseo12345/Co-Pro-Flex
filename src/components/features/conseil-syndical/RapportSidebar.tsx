'use client';

import { useState } from 'react';
import {
  Paperclip,
  Plus,
  Trash2,
  FileText,
  Image,
  Table,
  Eye,
  Download,
  Share2,
  CheckCircle,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';
import { RapportActiviteCS, TypeAnnexeRapport } from '@/types/models/conseil-syndical';
import styles from './RapportCS.module.css';

interface RapportSidebarProps {
  rapport: RapportActiviteCS;
  onAddAnnexe: (annexe: { nom: string; type: TypeAnnexeRapport; fichier?: File }) => Promise<void>;
  onDeleteAnnexe: (annexeId: string) => Promise<void>;
  onPublier: (agId: string) => Promise<void>;
  texteResolution: string;
}

export function RapportSidebar({
  rapport,
  onAddAnnexe,
  onDeleteAnnexe,
  onPublier,
  texteResolution,
}: RapportSidebarProps) {
  const [showAnnexeModal, setShowAnnexeModal] = useState(false);
  const [showResolutionPreview, setShowResolutionPreview] = useState(false);
  const [newAnnexe, setNewAnnexe] = useState({ nom: '', type: 'document' as TypeAnnexeRapport });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText size={16} />;
      case 'image': return <Image size={16} />;
      case 'tableau': return <Table size={16} />;
      default: return <Paperclip size={16} />;
    }
  };

  const getStatutBadge = () => {
    switch (rapport.statut) {
      case 'brouillon':
        return (
          <span className={`${styles.badge} ${styles.brouillon}`}>
            <Clock size={14} /> Brouillon
          </span>
        );
      case 'en_revision':
        return (
          <span className={`${styles.badge} ${styles.revision}`}>
            <AlertCircle size={14} /> En révision
          </span>
        );
      case 'valide':
        return (
          <span className={`${styles.badge} ${styles.valide}`}>
            <CheckCircle size={14} /> Validé
          </span>
        );
      case 'publie':
        return (
          <span className={`${styles.badge} ${styles.publie}`}>
            <Share2 size={14} /> Publié
          </span>
        );
      default:
        return null;
    }
  };

  const getStatutInfo = () => {
    switch (rapport.statut) {
      case 'brouillon':
        return 'Le rapport est en cours de rédaction.';
      case 'en_revision':
        return 'Le rapport est soumis pour relecture par les autres membres.';
      case 'valide':
        return 'Le rapport a été validé et peut être publié.';
      case 'publie':
        return `Lié à l'AG${rapport.agId ? '' : ' (non défini)'}`;
      default:
        return '';
    }
  };

  const handleAddAnnexe = async () => {
    if (!newAnnexe.nom.trim()) return;

    await onAddAnnexe({
      nom: newAnnexe.nom,
      type: newAnnexe.type,
    });

    setNewAnnexe({ nom: '', type: 'document' });
    setShowAnnexeModal(false);
  };

  const canEdit = rapport.statut === 'brouillon' || rapport.statut === 'en_revision';

  return (
    <div className={styles.sidebarContainer}>
      {/* Statut */}
      <section className={styles.sidebarSection}>
        <h3 className={styles.sidebarSectionTitle}>Statut</h3>
        {getStatutBadge()}
        <p className={styles.statutInfo}>{getStatutInfo()}</p>
      </section>

      {/* Annexes */}
      <section className={styles.sidebarSection}>
        <div className={styles.sidebarSectionHeader}>
          <h3 className={styles.sidebarSectionTitle}>
            <Paperclip size={16} aria-hidden="true" />
            Annexes ({rapport.annexes.length})
          </h3>
          {canEdit && (
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setShowAnnexeModal(true)}
              aria-label="Ajouter une annexe"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {rapport.annexes.length > 0 ? (
          <ul className={styles.annexesList}>
            {rapport.annexes.map(annexe => (
              <li key={annexe.id} className={styles.annexeItem}>
                <div className={styles.annexeInfo}>
                  {getTypeIcon(annexe.type)}
                  <span className={styles.annexeName}>{annexe.nom}</span>
                </div>
                <div className={styles.annexeActions}>
                  {annexe.fichierUrl && (
                    <a
                      href={annexe.fichierUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.annexeBtn}
                      aria-label="Télécharger"
                    >
                      <Download size={14} />
                    </a>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className={styles.annexeBtn}
                      onClick={() => onDeleteAnnexe(annexe.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noAnnexes}>Aucune annexe</p>
        )}
      </section>

      {/* Aperçu résolution */}
      <section className={styles.sidebarSection}>
        <div className={styles.sidebarSectionHeader}>
          <h3 className={styles.sidebarSectionTitle}>
            <FileText size={16} aria-hidden="true" />
            Résolution AG
          </h3>
          <button
            type="button"
            className={styles.previewBtn}
            onClick={() => setShowResolutionPreview(!showResolutionPreview)}
          >
            <Eye size={14} aria-hidden="true" />
            Aperçu
          </button>
        </div>

        <p className={styles.resolutionHelp}>
          Ce texte sera automatiquement utilisé pour la résolution &quot;Compte rendu du Conseil Syndical&quot; de l&apos;AG.
        </p>

        {showResolutionPreview && (
          <div className={styles.resolutionPreview}>
            <pre>{texteResolution || 'Aucun texte généré (complétez le rapport)'}</pre>
          </div>
        )}
      </section>

      {/* Actions */}
      <section className={styles.sidebarSection}>
        <h3 className={styles.sidebarSectionTitle}>Actions</h3>
        <div className={styles.actions}>
          {rapport.statut === 'valide' && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                // TODO: Ouvrir un sélecteur d'AG
                const agId = prompt('Entrez l\'ID de l\'AG à lier :');
                if (agId) {
                  onPublier(agId);
                }
              }}
            >
              <Share2 size={16} aria-hidden="true" />
              Lier à une AG
            </button>
          )}

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              // TODO: Implémenter l'export PDF
              alert('Export PDF en cours de développement');
            }}
          >
            <Download size={16} aria-hidden="true" />
            Exporter en PDF
          </button>
        </div>
      </section>

      {/* Modal ajout annexe */}
      {showAnnexeModal && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className={styles.modalOverlay} onClick={() => setShowAnnexeModal(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 id="modal-title">Ajouter une annexe</h2>
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => setShowAnnexeModal(false)}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="annexe-nom">Nom de l&apos;annexe</label>
                <input
                  id="annexe-nom"
                  type="text"
                  value={newAnnexe.nom}
                  onChange={(e) => setNewAnnexe({ ...newAnnexe, nom: e.target.value })}
                  placeholder="Ex: Rapport d'audit comptable"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="annexe-type">Type</label>
                <select
                  id="annexe-type"
                  value={newAnnexe.type}
                  onChange={(e) => setNewAnnexe({ ...newAnnexe, type: e.target.value as TypeAnnexeRapport })}
                >
                  <option value="document">Document</option>
                  <option value="image">Image</option>
                  <option value="tableau">Tableau</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Fichier (optionnel)</label>
                <div className={styles.fileInput}>
                  <input
                    type="file"
                    id="annexe-fichier"
                    onChange={(e) => {
                      // TODO: Gérer l'upload de fichier
                    }}
                  />
                  <label htmlFor="annexe-fichier">
                    <Paperclip size={20} />
                    <span>Cliquez pour sélectionner un fichier</span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowAnnexeModal(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleAddAnnexe}
                disabled={!newAnnexe.nom.trim()}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

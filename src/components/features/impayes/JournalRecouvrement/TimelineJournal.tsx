'use client';

import { useState, useCallback } from 'react';
import {
  FileText,
  Paperclip,
  Download,
  Star,
  Lock,
  Edit2,
  Trash2,
  Mail,
  AlertTriangle,
  Scale,
  Send,
  Phone,
  FileWarning,
  Gavel,
  FileCheck,
  UserCheck,
  Calendar,
  Banknote,
  Users,
} from 'lucide-react';
import type { NoteJournal, CategorieNote } from '@/types/models/impaye';
import { getCategorieConfig } from '@/lib/constants/categories-notes-recouvrement';
import styles from './JournalRecouvrement.module.css';

interface TimelineJournalProps {
  notes: NoteJournal[];
  filtreCategorie: CategorieNote | null;
  afficherConfidentiels: boolean;
  onFiltreChange: (categorie: CategorieNote | null) => void;
  onConfidentielToggle: (afficher: boolean) => void;
  onEditNote?: (note: NoteJournal) => void;
  onDeleteNote?: (noteId: string) => void;
  isLoading?: boolean;
}

// Map des icônes par catégorie
const ICONES_CATEGORIE: Record<CategorieNote, React.ComponentType<{ size?: number }>> = {
  relance_amiable: Mail,
  mise_en_demeure: AlertTriangle,
  echange_avocat: Scale,
  courrier_recommande: Send,
  appel_telephonique: Phone,
  commandement_payer: FileWarning,
  audience: Gavel,
  jugement: FileCheck,
  huissier: UserCheck,
  echeancier: Calendar,
  paiement_partiel: Banknote,
  decision_cs: Users,
  autre: FileText,
};

/**
 * Formate une taille de fichier en format lisible
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Formate une date en format français
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date avec l'heure
 */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Extrait les initiales d'un nom
 */
function getInitials(nom: string): string {
  return nom
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Timeline du journal de recouvrement
 * Affiche les notes en ordre chronologique inverse
 */
export function TimelineJournal({
  notes,
  filtreCategorie,
  afficherConfidentiels,
  onFiltreChange,
  onConfidentielToggle,
  onEditNote,
  onDeleteNote,
  isLoading,
}: TimelineJournalProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = useCallback((noteId: string) => {
    if (confirmDelete === noteId) {
      onDeleteNote?.(noteId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(noteId);
      // Reset après 3 secondes
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }, [confirmDelete, onDeleteNote]);

  // Options de filtre par catégorie
  const categoriesOptions: { value: CategorieNote | ''; label: string }[] = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'relance_amiable', label: 'Relance amiable' },
    { value: 'mise_en_demeure', label: 'Mise en demeure' },
    { value: 'echange_avocat', label: 'Échange avocat' },
    { value: 'courrier_recommande', label: 'Courrier recommandé' },
    { value: 'appel_telephonique', label: 'Appel téléphonique' },
    { value: 'commandement_payer', label: 'Commandement de payer' },
    { value: 'audience', label: 'Audience' },
    { value: 'jugement', label: 'Jugement' },
    { value: 'huissier', label: 'Huissier' },
    { value: 'echeancier', label: 'Échéancier' },
    { value: 'paiement_partiel', label: 'Paiement partiel' },
    { value: 'decision_cs', label: 'Décision CS' },
    { value: 'autre', label: 'Autre' },
  ];

  return (
    <div className={styles.container}>
      {/* En-tête avec filtres */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          Journal de recouvrement
          <span className={styles.badge}>{notes.length}</span>
        </h3>

        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={filtreCategorie || ''}
            onChange={(e) =>
              onFiltreChange((e.target.value as CategorieNote) || null)
            }
            aria-label="Filtrer par catégorie"
          >
            {categoriesOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={afficherConfidentiels}
              onChange={(e) => onConfidentielToggle(e.target.checked)}
            />
            Afficher confidentiels
          </label>
        </div>
      </div>

      {/* Timeline */}
      {notes.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyTitle}>Aucune note dans le journal</p>
          <p className={styles.emptyText}>
            {filtreCategorie
              ? 'Aucune note pour cette catégorie'
              : 'Commencez à documenter les actions de recouvrement'}
          </p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {notes.map((note) => {
            const config = getCategorieConfig(note.categorie);
            const IconeCategorie = ICONES_CATEGORIE[note.categorie] || FileText;

            return (
              <div
                key={note.id}
                className={`${styles.timelineItem} ${
                  note.important ? styles.important : ''
                } ${note.confidentiel ? styles.confidentiel : ''}`}
              >
                <div
                  className={`${styles.noteCard} ${
                    note.important ? styles.important : ''
                  } ${note.confidentiel ? styles.confidentiel : ''}`}
                >
                  {/* En-tête de la note */}
                  <div className={styles.noteHeader}>
                    <div className={styles.noteHeaderLeft}>
                      <span
                        className={styles.categorieBadge}
                        style={{ backgroundColor: config?.couleur || '#6b7280' }}
                      >
                        <IconeCategorie size={12} aria-hidden="true" />
                        {config?.label || note.categorie}
                      </span>

                      <div className={styles.noteFlags}>
                        {note.important && (
                          <span className={`${styles.flag} ${styles.flagImportant}`}>
                            <Star size={12} aria-hidden="true" />
                            Important
                          </span>
                        )}
                        {note.confidentiel && (
                          <span className={`${styles.flag} ${styles.flagConfidentiel}`}>
                            <Lock size={12} aria-hidden="true" />
                            Confidentiel
                          </span>
                        )}
                      </div>
                    </div>

                    {(onEditNote || onDeleteNote) && (
                      <div className={styles.noteActions}>
                        {onEditNote && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => onEditNote(note)}
                            aria-label="Modifier la note"
                          >
                            <Edit2 size={14} aria-hidden="true" />
                          </button>
                        )}
                        {onDeleteNote && (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => handleDelete(note.id)}
                            aria-label={
                              confirmDelete === note.id
                                ? 'Confirmer la suppression'
                                : 'Supprimer la note'
                            }
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contenu */}
                  <div className={styles.noteContent}>
                    <p className={styles.noteText}>{note.contenu}</p>
                  </div>

                  {/* Pièces jointes */}
                  {note.piecesJointes.length > 0 && (
                    <div className={styles.attachments}>
                      <span className={styles.attachmentsTitle}>
                        <Paperclip size={12} aria-hidden="true" /> Pièces jointes
                      </span>
                      <div className={styles.attachmentsList}>
                        {note.piecesJointes.map((pj) => (
                          <a
                            key={pj.id}
                            href={pj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.attachmentItem}
                          >
                            <Download size={12} aria-hidden="true" />
                            {pj.nom}
                            <span className={styles.attachmentSize}>
                              ({formatFileSize(pj.taille)})
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pied de note */}
                  <div className={styles.noteFooter}>
                    <div className={styles.noteAuthor}>
                      <span className={styles.authorAvatar}>
                        {getInitials(note.auteurNom)}
                      </span>
                      <span>{note.auteurNom}</span>
                      <span>({note.auteurRole})</span>
                    </div>
                    <span className={styles.noteDate}>
                      {formatDateTime(note.dateCreation)}
                      {note.dateModification && (
                        <> (modifié le {formatDate(note.dateModification)})</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className={styles.emptyState}>
          <p>Chargement...</p>
        </div>
      )}
    </div>
  );
}

export default TimelineJournal;

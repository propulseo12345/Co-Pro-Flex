'use client';

import { useState } from 'react';
import {
  X,
  Edit2,
  User,
  Calendar,
  FileText,
  Wrench,
  CheckCircle2,
  Save,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';
import type { Vente, OrdreService } from '../types';
import { getOsStatutLabel } from '../utils';
import styles from '../VenteDetail.module.css';

interface EditVenteModalProps {
  vente: Vente;
  ordresService: OrdreService[];
  onClose: () => void;
  onSave: (data: Partial<Vente>) => void;
}

export function EditVenteModal({ vente, ordresService, onClose, onSave }: EditVenteModalProps) {
  const [formData, setFormData] = useState({
    acquereurNom: vente.acquereur.nom,
    acquereurPrenom: vente.acquereur.prenom || '',
    acquereurEmail: vente.acquereur.email,
    acquereurTelephone: vente.acquereur.telephone,
    notaireNom: vente.notaire.nom,
    notairePrenom: vente.notaire.prenom || '',
    notaireEmail: vente.notaire.email,
    notaireTelephone: vente.notaire.telephone,
    dateCompromis: vente.dateCompromis,
    dateActeAuthentique: vente.dateActeAuthentique || '',
    observations: vente.observations,
    notesInternes: vente.notesInternes,
    ordresServiceIds: [...vente.ordresServiceIds]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.acquereurNom.trim()) {
      newErrors.acquereurNom = "Le nom de l'acquéreur est requis";
    }
    if (!formData.dateCompromis) {
      newErrors.dateCompromis = 'La date de compromis est requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    onSave({
      acquereur: {
        nom: formData.acquereurNom,
        prenom: formData.acquereurPrenom,
        email: formData.acquereurEmail,
        telephone: formData.acquereurTelephone
      },
      notaire: {
        nom: formData.notaireNom,
        prenom: formData.notairePrenom,
        email: formData.notaireEmail,
        telephone: formData.notaireTelephone
      },
      dateCompromis: formData.dateCompromis,
      dateActeAuthentique: formData.dateActeAuthentique || null,
      observations: formData.observations,
      notesInternes: formData.notesInternes,
      ordresServiceIds: formData.ordresServiceIds
    });
    onClose();
  };

  const toggleOrdreService = (osId: string) => {
    setFormData(prev => ({
      ...prev,
      ordresServiceIds: prev.ordresServiceIds.includes(osId)
        ? prev.ordresServiceIds.filter(id => id !== osId)
        : [...prev.ordresServiceIds, osId]
    }));
  };

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3><Edit2 size={20} aria-hidden="true" /> Modifier la vente</h3>
          <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* Acquéreur */}
            <div className={styles.editSection}>
              <h4><User size={16} aria-hidden="true" /> Acquéreur</h4>
              <div className={styles.editGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="acquereur-nom">Nom *</label>
                  <input
                    id="acquereur-nom"
                    type="text"
                    value={formData.acquereurNom}
                    onChange={e => setFormData({ ...formData, acquereurNom: e.target.value })}
                    className={errors.acquereurNom ? styles.inputError : ''}
                    placeholder="Nom de famille"
                  />
                  {errors.acquereurNom && (
                    <span className={styles.errorText}>{errors.acquereurNom}</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="acquereur-prenom">Prénom</label>
                  <input
                    id="acquereur-prenom"
                    type="text"
                    value={formData.acquereurPrenom}
                    onChange={e => setFormData({ ...formData, acquereurPrenom: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="acquereur-email">Email</label>
                  <input
                    id="acquereur-email"
                    type="email"
                    value={formData.acquereurEmail}
                    onChange={e => setFormData({ ...formData, acquereurEmail: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="acquereur-tel">Téléphone</label>
                  <input
                    id="acquereur-tel"
                    type="tel"
                    value={formData.acquereurTelephone}
                    onChange={e => setFormData({ ...formData, acquereurTelephone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Notaire */}
            <div className={styles.editSection}>
              <h4><User size={16} aria-hidden="true" /> Notaire</h4>
              <div className={styles.editGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="notaire-nom">Nom</label>
                  <input
                    id="notaire-nom"
                    type="text"
                    value={formData.notaireNom}
                    onChange={e => setFormData({ ...formData, notaireNom: e.target.value })}
                    placeholder="Nom de famille"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="notaire-prenom">Prénom</label>
                  <input
                    id="notaire-prenom"
                    type="text"
                    value={formData.notairePrenom}
                    onChange={e => setFormData({ ...formData, notairePrenom: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="notaire-email">Email</label>
                  <input
                    id="notaire-email"
                    type="email"
                    value={formData.notaireEmail}
                    onChange={e => setFormData({ ...formData, notaireEmail: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="notaire-tel">Téléphone</label>
                  <input
                    id="notaire-tel"
                    type="tel"
                    value={formData.notaireTelephone}
                    onChange={e => setFormData({ ...formData, notaireTelephone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className={styles.editSection}>
              <h4><Calendar size={16} aria-hidden="true" /> Dates</h4>
              <div className={styles.editGrid}>
                <div className={styles.formGroup}>
                  <label>Date de compromis *</label>
                  <input type="date" value={formData.dateCompromis} onChange={e => setFormData({ ...formData, dateCompromis: e.target.value})}
                    className={errors.dateCompromis ? styles.inputError : ''}
                  />
                  {errors.dateCompromis && (
                    <span className={styles.errorText}>{errors.dateCompromis}</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Date acte authentique prévue</label>
                  <input type="date" value={formData.dateActeAuthentique} onChange={e => setFormData({ ...formData, dateActeAuthentique: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Ordres de service */}
            <div className={styles.editSection}>
              <h4><Wrench size={16} aria-hidden="true" /> Ordres de service liés</h4>
              <div className={styles.osSelectGrid}>
                {ordresService.map(os => (
                  <div
                    key={os.id}
                    className={clsx(
                      styles.osSelectItem,
                      formData.ordresServiceIds.includes(os.id) && styles.osSelectItemActive
                    )}
                    onClick={() => toggleOrdreService(os.id)}
                  >
                    <div className={styles.osSelectCheck}>
                      {formData.ordresServiceIds.includes(os.id) ? (
                        <CheckCircle2 size={18} aria-hidden="true" />
                      ) : (
                        <div className={styles.osSelectEmpty} />
                      )}
                    </div>
                    <div className={styles.osSelectInfo}>
                      <span className={styles.osSelectTitle}>{os.titre}</span>
                      <span className={styles.osSelectMeta}>
                        {new Date(os.date).toLocaleDateString('fr-FR')} • {getOsStatutLabel(os.statut)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className={styles.editSection}>
              <h4><FileText size={16} aria-hidden="true" /> Notes</h4>
              <div className={styles.formGroup}>
                <label>Observations</label>
                <textarea
                  value={formData.observations}
                  onChange={e => setFormData({ ...formData, observations: e.target.value})}
                  rows={3}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Notes internes</label>
                <textarea
                  value={formData.notesInternes}
                  onChange={e => setFormData({ ...formData, notesInternes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

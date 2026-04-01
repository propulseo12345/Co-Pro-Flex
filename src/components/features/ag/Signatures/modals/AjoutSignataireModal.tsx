'use client';

import { useState, useId, useRef, useEffect } from 'react';
import { X, User, Mail, AlertCircle } from 'lucide-react';
import {
  SignatairePV,
  TypeSignataire,
  ModeSignature,
  LABELS_MODE_SIGNATURE,
  LABELS_TYPE_SIGNATAIRE
} from '@/types/models/pv-signature';
import styles from './AjoutSignataireModal.module.css';

interface Participant {
  id: string;
  coproprietaireId: string;
  coproprietaire: {
    id: string;
    nom: string;
    prenom?: string;
    email?: string;
    telephone?: string;
  };
}

interface Gestionnaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  societe: string;
  fonction: string;
}

interface AjoutSignataireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (signataire: Omit<SignatairePV, 'id' | 'sourceRoleAG'>) => Promise<void>;
  modeSignature: ModeSignature;
  participants?: Participant[];
  gestionnaire?: Gestionnaire | null;
  signatairesExistants: SignatairePV[];
  typePreselectionne?: TypeSignataire;
}

export function AjoutSignataireModal({
  isOpen,
  onClose,
  onAdd,
  modeSignature,
  participants = [],
  gestionnaire,
  signatairesExistants,
  typePreselectionne,
}: AjoutSignataireModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  const modeConfig = LABELS_MODE_SIGNATURE[modeSignature];
  const isEmailObligatoire = modeConfig.emailObligatoire;

  const [type, setType] = useState<TypeSignataire>(typePreselectionne || 'scrutateur');
  const [personneId, setPersonneId] = useState('');
  const [typePersonne, setTypePersonne] = useState<'coproprietaire' | 'gestionnaire' | 'tiers'>('coproprietaire');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [societe, setSociete] = useState('');
  const [fonction, setFonction] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setType(typePreselectionne || 'scrutateur');
      setPersonneId('');
      setTypePersonne('coproprietaire');
      setNom('');
      setPrenom('');
      setEmail('');
      setTelephone('');
      setSociete('');
      setFonction('');
      setErrors([]);
    }
  }, [isOpen, typePreselectionne]);

  // Pré-remplir quand on sélectionne un participant
  useEffect(() => {
    if (!personneId) return;

    if (typePersonne === 'coproprietaire') {
      // Chercher dans les participants ou les copropriétaires
      const participant = participants.find(p => p.coproprietaireId === personneId);
      if (participant) {
        const copro = participant.coproprietaire;
        // Parser le nom complet si pas de prénom séparé
        if (copro.prenom) {
          setPrenom(copro.prenom);
          setNom(copro.nom);
        } else {
          const parts = copro.nom.split(' ');
          setPrenom(parts.slice(0, -1).join(' '));
          setNom(parts[parts.length - 1] || '');
        }
        setEmail(copro.email || '');
        setTelephone(copro.telephone || '');
      } else {
        // Fallback: no additional lookup without mock data
      }
    } else if (typePersonne === 'gestionnaire' && gestionnaire) {
      setNom(gestionnaire.nom);
      setPrenom(gestionnaire.prenom);
      setEmail(gestionnaire.email);
      setSociete(gestionnaire.societe);
      setFonction(gestionnaire.fonction);
    }
  }, [personneId, typePersonne, participants, gestionnaire]);

  // Validation
  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!nom.trim()) {
      newErrors.push('Le nom est obligatoire');
    }
    if (!prenom.trim()) {
      newErrors.push('Le prénom est obligatoire');
    }

    // Email obligatoire uniquement en mode électronique
    if (isEmailObligatoire && !email.trim()) {
      newErrors.push('L\'email est obligatoire pour la signature électronique');
    }

    // Validation format email si fourni
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.push('Le format de l\'email est invalide');
    }

    // Vérifier si déjà signataire
    const dejaPresent = signatairesExistants.some(
      s => s.personneId === personneId ||
           (s.nom.toLowerCase() === nom.toLowerCase() && s.prenom.toLowerCase() === prenom.toLowerCase())
    );
    if (dejaPresent && personneId) {
      newErrors.push('Cette personne est déjà dans la liste des signataires');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        type,
        ordre: signatairesExistants.length + 1,
        personneId: personneId || `tiers-${Date.now()}`,
        typePersonne,
        nom,
        prenom,
        email: email || undefined,
        telephone: telephone || undefined,
        societe: societe || undefined,
        fonction: fonction || undefined,
        statut: 'en_attente',
        signaturePhysique: false,
      });
      onClose();
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copropriétaires disponibles (non déjà signataires) — from participants prop
  const coproprietairesDisponibles = participants
    .filter(p => !signatairesExistants.some(s => s.personneId === p.coproprietaireId))
    .map(p => ({ id: p.coproprietaireId, nom: p.coproprietaire.nom }));

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <User size={24} aria-hidden="true" />
          <h2 id={titleId}>Ajouter un signataire</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Erreurs */}
          {errors.length > 0 && (
            <div className={styles.errors}>
              <AlertCircle size={16} aria-hidden="true" />
              <ul>
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Type de signataire */}
          <div className={styles.field}>
            <label htmlFor="type">Rôle</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as TypeSignataire)}
            >
              {Object.entries(LABELS_TYPE_SIGNATAIRE).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Type de personne */}
          <div className={styles.field}>
            <label>Type de personne</label>
            <div className={styles.radioGroup}>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="typePersonne"
                  value="coproprietaire"
                  checked={typePersonne === 'coproprietaire'}
                  onChange={() => {
                    setTypePersonne('coproprietaire');
                    setPersonneId('');
                    setNom('');
                    setPrenom('');
                    setEmail('');
                    setTelephone('');
                  }}
                />
                Copropriétaire
              </label>
              {gestionnaire && (
                <label className={styles.radio}>
                  <input
                    type="radio"
                    name="typePersonne"
                    value="gestionnaire"
                    checked={typePersonne === 'gestionnaire'}
                    onChange={() => {
                      setTypePersonne('gestionnaire');
                      setPersonneId(gestionnaire.id);
                    }}
                  />
                  Gestionnaire
                </label>
              )}
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="typePersonne"
                  value="tiers"
                  checked={typePersonne === 'tiers'}
                  onChange={() => {
                    setTypePersonne('tiers');
                    setPersonneId('');
                    setNom('');
                    setPrenom('');
                    setEmail('');
                    setTelephone('');
                  }}
                />
                Autre personne
              </label>
            </div>
          </div>

          {/* Sélection copropriétaire */}
          {typePersonne === 'coproprietaire' && (
            <div className={styles.field}>
              <label htmlFor="participant">Sélectionner un copropriétaire</label>
              <select
                id="participant"
                value={personneId}
                onChange={(e) => setPersonneId(e.target.value)}
              >
                <option value="">-- Choisir --</option>
                {coproprietairesDisponibles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nom / Prénom */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="prenom">Prénom *</label>
              <input
                id="prenom"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                disabled={typePersonne !== 'tiers' && !!personneId}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="nom">Nom *</label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={typePersonne !== 'tiers' && !!personneId}
                required
              />
            </div>
          </div>

          {/* Email - avec indication du caractère obligatoire selon le mode */}
          <div className={styles.field}>
            <label htmlFor="email">
              <Mail size={14} aria-hidden="true" />
              Email {isEmailObligatoire ? '*' : '(facultatif)'}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isEmailObligatoire ? "Email obligatoire pour signature électronique" : "Email (facultatif en mode sur place)"}
              required={isEmailObligatoire}
            />
            {!isEmailObligatoire && (
              <span className={styles.fieldHint}>
                En mode &quot;Sur place&quot;, l&apos;email n&apos;est pas requis car la signature est physique.
              </span>
            )}
          </div>

          {/* Téléphone */}
          <div className={styles.field}>
            <label htmlFor="telephone">Téléphone (facultatif)</label>
            <input
              id="telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="06 00 00 00 00"
            />
          </div>

          {/* Société / Fonction (si gestionnaire) */}
          {typePersonne === 'gestionnaire' && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="societe">Société</label>
                <input
                  id="societe"
                  type="text"
                  value={societe}
                  onChange={(e) => setSociete(e.target.value)}
                  disabled
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="fonction">Fonction</label>
                <input
                  id="fonction"
                  type="text"
                  value={fonction}
                  onChange={(e) => setFonction(e.target.value)}
                  disabled
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter le signataire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

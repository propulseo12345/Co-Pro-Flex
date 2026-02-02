'use client';

import { Zap, X, Settings, FileText } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/calls/calls.module.css';

interface AutomationModalProps {
  onClose: () => void;
  onActivate: () => void;
}

export function AutomationModal({ onClose, onActivate }: AutomationModalProps) {
  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2><Zap size={20} aria-hidden="true" /> Automatisation des appels de fonds</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <h3>Comment ça marche ?</h3>
          <p>L'automatisation des appels de fonds vous permet de :</p>
          <ul>
            <li>Générer automatiquement les appels de fonds selon le calendrier défini</li>
            <li>Envoyer les appels de fonds par email aux copropriétaires</li>
            <li>Suivre les paiements en temps réel</li>
            <li>Relancer automatiquement les impayés</li>
          </ul>
          <h3>Avantages</h3>
          <p>Gain de temps considérable<br/>
          Réduction des erreurs<br/>
          Meilleure traçabilité<br/>
          Copropriétaires informés en temps réel</p>
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
          <button className="btn btn-primary" onClick={onActivate}>
            Activer maintenant
          </button>
        </div>
      </div>
    </div>
  );
}

interface RulesModalProps {
  onClose: () => void;
  onSave: () => void;
}

export function RulesModal({ onClose, onSave }: RulesModalProps) {
  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2><Settings size={20} aria-hidden="true" /> Règles d'automatisation</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Fréquence de génération</label>
            <select defaultValue="trimestriel" aria-label="Trier par">
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="semestriel">Semestriel</option>
              <option value="annuel">Annuel</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Jour d'envoi</label>
            <select defaultValue="1" aria-label="Sélectionner une option">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Date d'exigibilité (jours après envoi)</label>
            <input type="number" defaultValue="30" min="1" max="90" aria-label="Entrer un nombre"/>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

interface PaymentInfoModalProps {
  onClose: () => void;
  onSave: () => void;
}

export function PaymentInfoModal({ onClose, onSave }: PaymentInfoModalProps) {
  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2><FileText size={20} aria-hidden="true" /> Informations de paiement</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>IBAN de la copropriété</label>
            <input type="text" placeholder="FR76 1234 5678 9012 3456 7890 123" aria-label="FR76 1234 5678 9012 3456 7890 123"/>
          </div>
          <div className={styles.formGroup}>
            <label>BIC</label>
            <input type="text" placeholder="BNPAFRPPXXX" aria-label="BNPAFRPPXXX"/>
          </div>
          <div className={styles.formGroup}>
            <label>Titulaire du compte</label>
            <input type="text" placeholder="Syndicat des copropriétaires" aria-label="Syndicat des copropriétaires"/>
          </div>
          <div className={styles.formGroup}>
            <label>Banque</label>
            <input type="text" placeholder="BNP Paribas" aria-label="BNP Paribas"/>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

interface CancelModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelModal({ onClose, onConfirm }: CancelModalProps) {
  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2>Confirmer l'annulation</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Êtes-vous sûr de vouloir annuler le dernier appel de fonds généré ?</p>
          <p><strong>Cette action est irréversible.</strong></p>
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Non, garder
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Oui, annuler
          </button>
        </div>
      </div>
    </div>
  );
}

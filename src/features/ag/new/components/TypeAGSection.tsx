'use client';

import { Zap, AlertTriangle } from 'lucide-react';
import type { AGFormData } from '../domain/types';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface TypeAGSectionProps {
  type: AGFormData['type'];
  onChange: (type: AGFormData['type']) => void;
}

export function TypeAGSection({ type, onChange }: TypeAGSectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Type d'assemblée</h2>
      <div className={styles.radioGroup}>
        <label className={styles.radioCard}>
          <input
            type="radio"
            name="type"
            value="ORDINAIRE"
            checked={type === 'ORDINAIRE'}
            onChange={(e) => onChange(e.target.value as AGFormData['type'])}
          />
          <div className={styles.radioContent}>
            <div className={styles.radioTitle}>Assemblée Générale Ordinaire</div>
            <div className={styles.radioDescription}>Vote du budget, approbation des comptes, travaux courants</div>
          </div>
        </label>
        <label className={styles.radioCard}>
          <input
            type="radio"
            name="type"
            value="EXTRAORDINAIRE"
            checked={type === 'EXTRAORDINAIRE'}
            onChange={(e) => onChange(e.target.value as AGFormData['type'])}
          />
          <div className={styles.radioContent}>
            <div className={styles.radioTitle}>Assemblée Générale Extraordinaire</div>
            <div className={styles.radioDescription}>Modification du règlement, gros travaux, litiges</div>
          </div>
        </label>
        <label className={`${styles.radioCard} ${styles.radioCardUrgente}`}>
          <input
            type="radio"
            name="type"
            value="URGENTE"
            checked={type === 'URGENTE'}
            onChange={(e) => onChange(e.target.value as AGFormData['type'])}
          />
          <div className={styles.radioContent}>
            <div className={styles.radioTitle}>
              <Zap size={18} className={styles.urgentIcon} aria-hidden="true" />
              Assemblée Générale Urgente
            </div>
            <div className={styles.radioDescription}>
              Situation d'urgence nécessitant une décision rapide (dégât des eaux, sinistre, sécurité)
            </div>
          </div>
        </label>
      </div>

      {type === 'URGENTE' && (
        <div className={styles.urgentInfoBox}>
          <div className={styles.urgentInfoHeader}>
            <Zap size={20} aria-hidden="true" />
            <strong>AG Urgente - Délais réduits</strong>
          </div>
          <div className={styles.urgentInfoContent}>
            <p>
              En cas d'urgence avérée (article 37 du décret du 17 mars 1967), les délais de convocation peuvent être
              réduits. Cependant, vous devez :
            </p>
            <ul>
              <li>Justifier le caractère urgent de la situation</li>
              <li>Envoyer les convocations le plus tôt possible</li>
              <li>Limiter l'ordre du jour aux seules questions urgentes</li>
              <li>Documenter les raisons de l'urgence dans le PV</li>
            </ul>
            <div className={styles.urgentWarning}>
              <AlertTriangle size={16} aria-hidden="true" />
              <span>Attention : Une AG urgente injustifiée peut être contestée par les copropriétaires.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

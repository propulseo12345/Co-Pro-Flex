'use client';

import { ArrowRight } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface FooterProps {
  onCancel: () => void;
}

export function Footer({ onCancel }: FooterProps) {
  return (
    <div className={styles.footer}>
      <button type="button" onClick={onCancel} className="btn btn-secondary">
        Annuler
      </button>
      <button type="submit" className="btn btn-primary">
        Continuer vers l'ordre du jour
        <ArrowRight size={16} style={{ marginLeft: 8 }} aria-hidden="true" />
      </button>
    </div>
  );
}

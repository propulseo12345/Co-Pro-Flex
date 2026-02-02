'use client';

import { UserPlus, Link as LinkIcon, Save } from 'lucide-react';
import styles from '@/app/(dashboard)/settings/info/info.module.css';

export function GlobalActions() {
  return (
    <section className={styles.section}>
      <div className={styles.actionsGlobales}>
        <button className="btn btn-secondary">
          <UserPlus size={16} aria-hidden="true" />
          Dedoublonner un coproprietaire
        </button>
        <button className="btn btn-secondary">
          <LinkIcon size={16} />
          Rattacher deux coproprietaires
        </button>
        <button className="btn btn-primary">
          <Save size={16} aria-hidden="true" />
          Valider
        </button>
      </div>
    </section>
  );
}

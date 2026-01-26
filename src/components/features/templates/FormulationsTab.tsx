'use client';

import type { IPVTemplateSpec } from '@/types/models/pv-template';
import styles from '@/app/(dashboard)/settings/templates/[id]/editor.module.css';

interface FormulationsTabProps {
  formulations: IPVTemplateSpec['formulations'];
  onUpdate: (updates: Partial<IPVTemplateSpec['formulations']>) => void;
}

export function FormulationsTab({ formulations, onUpdate }: FormulationsTabProps) {
  return (
    <div className={styles.formulationsTab}>
      <p className={styles.tabDescription}>Personnalisez les formulations utilisées dans le PV généré.</p>

      <div className={styles.formulationGroup}>
        <h3>Résultats de vote</h3>
        <div className={styles.formulationItem}>
          <label>Résolution adoptée</label>
          <input type="text" value={formulations.resolutionAdopted} onChange={e => onUpdate({ resolutionAdopted: e.target.value })} />
        </div>
        <div className={styles.formulationItem}>
          <label>Résolution rejetée</label>
          <input type="text" value={formulations.resolutionRejected} onChange={e => onUpdate({ resolutionRejected: e.target.value })} />
        </div>
        <div className={styles.formulationItem}>
          <label>Résolution ajournée</label>
          <input type="text" value={formulations.resolutionPostponed} onChange={e => onUpdate({ resolutionPostponed: e.target.value })} />
        </div>
      </div>

      <div className={styles.formulationGroup}>
        <h3>Quorum</h3>
        <div className={styles.formulationItem}>
          <label>Quorum atteint</label>
          <input type="text" value={formulations.quorumReached} onChange={e => onUpdate({ quorumReached: e.target.value })} />
        </div>
        <div className={styles.formulationItem}>
          <label>Quorum non atteint</label>
          <input type="text" value={formulations.quorumNotReached} onChange={e => onUpdate({ quorumNotReached: e.target.value })} />
        </div>
      </div>

      <div className={styles.formulationGroup}>
        <h3>Labels de vote</h3>
        <div className={styles.formulationRow}>
          <div className={styles.formulationItem}>
            <label>POUR</label>
            <input type="text" value={formulations.voteForLabel} onChange={e => onUpdate({ voteForLabel: e.target.value })} />
          </div>
          <div className={styles.formulationItem}>
            <label>CONTRE</label>
            <input type="text" value={formulations.voteAgainstLabel} onChange={e => onUpdate({ voteAgainstLabel: e.target.value })} />
          </div>
          <div className={styles.formulationItem}>
            <label>ABSTENTION</label>
            <input type="text" value={formulations.voteAbstainLabel} onChange={e => onUpdate({ voteAbstainLabel: e.target.value })} />
          </div>
        </div>
      </div>

      <div className={styles.formulationGroup}>
        <h3>Clôture</h3>
        <div className={styles.formulationItem}>
          <label>Formule de clôture</label>
          <textarea value={formulations.closingStatement} onChange={e => onUpdate({ closingStatement: e.target.value })} rows={3} />
        </div>
      </div>
    </div>
  );
}

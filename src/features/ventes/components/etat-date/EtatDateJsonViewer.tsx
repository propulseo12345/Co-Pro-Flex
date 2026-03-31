'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { EtatDatePayloadV2 } from '../../domain/types';
import styles from './etat-date.module.css';

interface EtatDateJsonViewerProps {
  payload: EtatDatePayloadV2;
}

export function EtatDateJsonViewer({ payload }: EtatDateJsonViewerProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={styles.jsonSection}>
      <button className={styles.jsonToggle} onClick={() => setShow(!show)}>
        {show ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {show ? 'Masquer' : 'Afficher'} le JSON brut
      </button>
      {show && (
        <pre className={styles.jsonContent}>{JSON.stringify(payload, null, 2)}</pre>
      )}
    </div>
  );
}

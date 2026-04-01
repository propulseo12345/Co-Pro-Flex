// src/components/features/onboarding/steps/Step4Comptes.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Landmark } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createCompteBancaire, listComptesBancaires } from '@/lib/onboarding/api';
import styles from './Step4Comptes.module.css';

interface Step4Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Step4Comptes({ coproId, onComplete, onBack }: Step4Props) {
  // Compte courant
  const [ccBanque, setCcBanque] = useState('');
  const [ccIban, setCcIban] = useState('');
  const [ccBic, setCcBic] = useState('');
  const [ccSolde, setCcSolde] = useState('');

  // Fonds travaux ALUR
  const [ftBanque, setFtBanque] = useState('');
  const [ftIban, setFtIban] = useState('');
  const [ftBic, setFtBic] = useState('');
  const [ftSolde, setFtSolde] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [existingComptes, setExistingComptes] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await listComptesBancaires(coproId);
      if (data) setExistingComptes(data.map(c => c.account_number));
    }
    load();
  }, [coproId]);

  const formatIban = useCallback((val: string) => {
    const clean = val.replace(/\s/g, '').toUpperCase().slice(0, 34);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }, []);

  const handleFinish = useCallback(async () => {
    setIsSaving(true);

    // Créer compte courant s'il n'existe pas
    if (!existingComptes.includes('512000')) {
      await createCompteBancaire({
        copro_id: coproId,
        label: 'Compte courant',
        type: 'courant',
        banque: ccBanque || undefined,
        iban: ccIban || undefined,
        bic: ccBic || undefined,
        solde_initial: ccSolde ? parseFloat(ccSolde) : undefined,
      });
    }

    // Créer fonds travaux s'il n'existe pas
    if (!existingComptes.includes('512100')) {
      await createCompteBancaire({
        copro_id: coproId,
        label: 'Fonds travaux ALUR',
        type: 'fonds_travaux',
        banque: ftBanque || undefined,
        iban: ftIban || undefined,
        bic: ftBic || undefined,
        solde_initial: ftSolde ? parseFloat(ftSolde) : undefined,
      });
    }

    setIsSaving(false);
    onComplete();
  }, [coproId, ccBanque, ccIban, ccBic, ccSolde, ftBanque, ftIban, ftBic, ftSolde, existingComptes, onComplete]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Comptes bancaires"
        description="Renseignez les coordonnées bancaires de la copropriété. Le fonds travaux ALUR est obligatoire depuis la loi ALUR 2014."
      />

      <div className={styles.cards}>
        {/* Compte courant */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Compte courant</div>
          <div className={styles.cardDesc}>Compte principal de la copropriété pour les opérations courantes</div>
          <span className={styles.cardRequired}>Obligatoire</span>
          <div className={styles.fields} style={{ marginTop: '12px' }}>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>Banque</label>
              <input className={styles.input} value={ccBanque} onChange={e => setCcBanque(e.target.value)} placeholder="Crédit Mutuel" />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>IBAN</label>
              <input className={styles.input} value={ccIban} onChange={e => setCcIban(formatIban(e.target.value))} placeholder="FR76 1234 5678 9012 3456 7890 123" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>BIC</label>
              <input className={styles.input} value={ccBic} onChange={e => setCcBic(e.target.value.toUpperCase().slice(0, 11))} placeholder="CMCIFR2A" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Solde initial</label>
              <input className={`${styles.input} ${styles.inputMoney}`} type="number" step="0.01" value={ccSolde} onChange={e => setCcSolde(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Fonds travaux ALUR */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Fonds travaux ALUR</div>
          <div className={styles.cardDesc}>Compte séparé obligatoire pour le fonds de travaux (loi ALUR). Suit les tantièmes généraux.</div>
          <span className={styles.cardRequired}>Obligatoire (loi ALUR)</span>
          <div className={styles.fields} style={{ marginTop: '12px' }}>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>Banque</label>
              <input className={styles.input} value={ftBanque} onChange={e => setFtBanque(e.target.value)} placeholder="Crédit Mutuel" />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>IBAN</label>
              <input className={styles.input} value={ftIban} onChange={e => setFtIban(formatIban(e.target.value))} placeholder="FR76 1234 5678 9012 3456 7890 456" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>BIC</label>
              <input className={styles.input} value={ftBic} onChange={e => setFtBic(e.target.value.toUpperCase().slice(0, 11))} placeholder="CMCIFR2A" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Solde initial</label>
              <input className={`${styles.input} ${styles.inputMoney}`} type="number" step="0.01" value={ftSolde} onChange={e => setFtSolde(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnFinish}
          onClick={handleFinish}
          disabled={isSaving}
        >
          {isSaving ? 'Enregistrement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

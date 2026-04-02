// src/components/features/onboarding/steps/Step4Comptes.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Landmark, Link2, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createCompteBancaire, listComptesBancaires } from '@/lib/onboarding/api';
import { useBankConnect } from '@/hooks/modules/useBankConnect';
import type { ConnectedAccount } from '@/hooks/modules/useBankConnect';
import styles from './Step4Comptes.module.css';

interface Step4Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

type InputMode = 'choose' | 'connect' | 'manual';

export function Step4Comptes({ coproId, onComplete, onBack }: Step4Props) {
  const [mode, setMode] = useState<InputMode>('choose');

  // Manual mode state
  const [ccBanque, setCcBanque] = useState('');
  const [ccIban, setCcIban] = useState('');
  const [ccBic, setCcBic] = useState('');
  const [ccSolde, setCcSolde] = useState('');
  const [ftBanque, setFtBanque] = useState('');
  const [ftIban, setFtIban] = useState('');
  const [ftBic, setFtBic] = useState('');
  const [ftSolde, setFtSolde] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [existingComptes, setExistingComptes] = useState<string[]>([]);

  // Bank connect
  const {
    step: connectStep,
    institutions,
    searchQuery,
    setSearchQuery,
    accounts: connectedAccounts,
    error: connectError,
    startConnect,
    connectBank,
    reset: resetConnect,
  } = useBankConnect();

  // Selected accounts from connection
  const [selectedCourant, setSelectedCourant] = useState<string>('');
  const [selectedFondsTravaux, setSelectedFondsTravaux] = useState<string>('');

  useEffect(() => {
    async function load() {
      const { data } = await listComptesBancaires(coproId);
      if (data) setExistingComptes(data.map(c => c.code));
    }
    load();
  }, [coproId]);

  // Auto-fill from connected accounts
  useEffect(() => {
    if (connectedAccounts.length > 0) {
      setMode('connect');
    }
  }, [connectedAccounts]);

  const formatIban = useCallback((val: string) => {
    const clean = val.replace(/\s/g, '').toUpperCase().slice(0, 34);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }, []);

  const handleSaveManual = useCallback(async () => {
    setIsSaving(true);

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

  const handleSaveConnected = useCallback(async () => {
    setIsSaving(true);

    const courant = connectedAccounts.find(a => a.id === selectedCourant);
    const fonds = connectedAccounts.find(a => a.id === selectedFondsTravaux);

    if (courant && !existingComptes.includes('512000')) {
      await createCompteBancaire({
        copro_id: coproId,
        label: 'Compte courant',
        type: 'courant',
        iban: courant.iban,
        solde_initial: courant.balance,
      });
    }

    if (fonds && !existingComptes.includes('512100')) {
      await createCompteBancaire({
        copro_id: coproId,
        label: 'Fonds travaux ALUR',
        type: 'fonds_travaux',
        iban: fonds.iban,
        solde_initial: fonds.balance,
      });
    }

    setIsSaving(false);
    onComplete();
  }, [coproId, connectedAccounts, selectedCourant, selectedFondsTravaux, existingComptes, onComplete]);

  const handleFinish = useCallback(() => {
    if (mode === 'connect' && connectedAccounts.length > 0) {
      handleSaveConnected();
    } else {
      handleSaveManual();
    }
  }, [mode, connectedAccounts.length, handleSaveConnected, handleSaveManual]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Comptes bancaires"
        description="Renseignez les coordonnées bancaires. Le fonds travaux ALUR est obligatoire depuis 2014."
      />

      {/* Mode selector */}
      {mode === 'choose' && (
        <div className={styles.modeSelector}>
          <button
            className={styles.modeCard}
            onClick={() => {
              startConnect();
              setMode('connect');
            }}
          >
            <Link2 size={24} className={styles.modeIcon} />
            <span className={styles.modeTitle}>Connecter ma banque</span>
            <span className={styles.modeDesc}>
              Connexion sécurisée via Open Banking. Vos comptes et soldes sont récupérés automatiquement.
            </span>
            <span className={styles.modeBadge}>Recommandé</span>
          </button>

          <button
            className={styles.modeCard}
            onClick={() => setMode('manual')}
          >
            <Landmark size={24} className={styles.modeIconSecondary} />
            <span className={styles.modeTitle}>Saisie manuelle</span>
            <span className={styles.modeDesc}>
              Entrez l&apos;IBAN, la banque et le solde initial manuellement.
            </span>
          </button>
        </div>
      )}

      {/* Bank connect flow - institution picker */}
      {mode === 'connect' && connectStep === 'choosing' && (
        <div className={styles.connectPanel}>
          <div className={styles.connectHeader}>
            <h3 className={styles.connectTitle}>Choisissez votre banque</h3>
            <button className={styles.linkBtn} onClick={() => { resetConnect(); setMode('choose'); }}>
              Retour
            </button>
          </div>

          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une banque..."
            />
          </div>

          <div className={styles.bankGrid}>
            {institutions.slice(0, 20).map(bank => (
              <button
                key={bank.id}
                className={styles.bankCard}
                onClick={() => connectBank(bank.id)}
              >
                {bank.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bank.logo} alt={bank.name} className={styles.bankLogo} />
                )}
                <span className={styles.bankName}>{bank.name}</span>
              </button>
            ))}
          </div>

          {institutions.length === 0 && (
            <div className={styles.connectLoading}>
              <Loader2 size={20} className={styles.spinner} />
              <span>Chargement des banques...</span>
            </div>
          )}
        </div>
      )}

      {/* Connecting to bank */}
      {mode === 'connect' && connectStep === 'connecting' && (
        <div className={styles.connectStatus}>
          <Loader2 size={24} className={styles.spinner} />
          <p>Redirection vers votre banque...</p>
        </div>
      )}

      {/* Fetching accounts */}
      {mode === 'connect' && connectStep === 'fetching' && (
        <div className={styles.connectStatus}>
          <Loader2 size={24} className={styles.spinner} />
          <p>Récupération de vos comptes...</p>
        </div>
      )}

      {/* Error */}
      {mode === 'connect' && connectStep === 'error' && (
        <div className={styles.connectError}>
          <AlertCircle size={20} />
          <p>{connectError || 'Erreur de connexion'}</p>
          <button className={styles.linkBtn} onClick={() => { resetConnect(); setMode('choose'); }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Connected accounts - assign to courant/fonds travaux */}
      {mode === 'connect' && connectStep === 'done' && connectedAccounts.length > 0 && (
        <div className={styles.connectedPanel}>
          <div className={styles.connectedHeader}>
            <CheckCircle2 size={20} className={styles.successIcon} />
            <span>{connectedAccounts.length} compte{connectedAccounts.length > 1 ? 's' : ''} trouvé{connectedAccounts.length > 1 ? 's' : ''}</span>
          </div>

          <div className={styles.assignSection}>
            <label className={styles.assignLabel}>Compte courant</label>
            <select
              className={styles.assignSelect}
              value={selectedCourant}
              onChange={e => setSelectedCourant(e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {connectedAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {formatIban(a.iban)} — {a.balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.assignSection}>
            <label className={styles.assignLabel}>Fonds travaux ALUR</label>
            <select
              className={styles.assignSelect}
              value={selectedFondsTravaux}
              onChange={e => setSelectedFondsTravaux(e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {connectedAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {formatIban(a.iban)} — {a.balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </option>
              ))}
            </select>
          </div>

          <AccountPreview accounts={connectedAccounts} selectedCourant={selectedCourant} selectedFonds={selectedFondsTravaux} />
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className={styles.cards}>
          <div className={styles.manualHeader}>
            <button className={styles.linkBtn} onClick={() => setMode('choose')}>
              ← Retour au choix
            </button>
          </div>

          {/* Compte courant */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Compte courant</div>
            <div className={styles.cardDesc}>Compte principal pour les opérations courantes</div>
            <span className={styles.cardRequired}>Obligatoire</span>
            <div className={styles.fields}>
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
            <div className={styles.cardDesc}>Compte séparé obligatoire pour le fonds de travaux (loi ALUR)</div>
            <span className={styles.cardRequired}>Obligatoire (loi ALUR)</span>
            <div className={styles.fields}>
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
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnFinish}
          onClick={handleFinish}
          disabled={isSaving || (mode === 'choose')}
        >
          {isSaving ? 'Enregistrement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

// Sous-composant preview des comptes connectés
function AccountPreview({ accounts, selectedCourant, selectedFonds }: {
  accounts: ConnectedAccount[];
  selectedCourant: string;
  selectedFonds: string;
}) {
  const courant = accounts.find(a => a.id === selectedCourant);
  const fonds = accounts.find(a => a.id === selectedFonds);

  if (!courant && !fonds) return null;

  return (
    <div className={styles.previewCards}>
      {courant && (
        <div className={styles.previewCard}>
          <span className={styles.previewLabel}>Compte courant</span>
          <span className={styles.previewIban}>{courant.iban}</span>
          <span className={styles.previewBalance}>
            {courant.balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      )}
      {fonds && (
        <div className={styles.previewCard}>
          <span className={styles.previewLabel}>Fonds travaux ALUR</span>
          <span className={styles.previewIban}>{fonds.iban}</span>
          <span className={styles.previewBalance}>
            {fonds.balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';

export interface BankInstitution {
  id: string;
  name: string;
  logo: string;
  bic: string;
}

export interface ConnectedAccount {
  id: string;
  iban: string;
  name: string;
  ownerName: string;
  balance: number;
  currency: string;
  balanceDate: string;
}

type BankConnectStep = 'idle' | 'choosing' | 'connecting' | 'fetching' | 'done' | 'error';

export function useBankConnect() {
  const [step, setStep] = useState<BankConnectStep>('idle');
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requisitionId, setRequisitionId] = useState<string | null>(null);

  // Charger les banques françaises
  const loadInstitutions = useCallback(async () => {
    try {
      const res = await fetch('/api/banking/institutions');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || 'Erreur chargement banques';
        // Si clés API manquantes, signaler proprement
        if (msg.includes('GOCARDLESS_SECRET')) {
          setError('Connexion bancaire non configurée. Ajoutez les clés API GoCardless dans les variables d\'environnement.');
          setStep('error');
          return;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setInstitutions(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setStep('error');
    }
  }, []);

  // Lancer la connexion avec une banque
  const connectBank = useCallback(async (institutionId: string) => {
    setStep('connecting');
    setError(null);

    try {
      const redirectUrl = `${window.location.origin}/api/banking/callback`;
      const res = await fetch('/api/banking/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId, redirectUrl }),
      });

      if (!res.ok) throw new Error('Erreur création connexion');
      const data = await res.json();

      // Stocker le requisitionId pour le récupérer au retour
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bank_requisition_id', data.requisitionId);
      }
      setRequisitionId(data.requisitionId);

      // Rediriger vers la banque
      window.location.href = data.link;
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, []);

  // Récupérer les comptes après retour de la banque
  const fetchAccounts = useCallback(async (reqId: string) => {
    setStep('fetching');
    setError(null);

    try {
      const res = await fetch('/api/banking/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisitionId: reqId }),
      });

      if (!res.ok) throw new Error('Erreur récupération comptes');
      const data = await res.json();

      setAccounts(data.accounts || []);
      setStep('done');
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, []);

  // Ouvrir le sélecteur de banque
  const startConnect = useCallback(() => {
    setStep('choosing');
    if (institutions.length === 0) {
      loadInstitutions();
    }
  }, [institutions.length, loadInstitutions]);

  // Reset
  const reset = useCallback(() => {
    setStep('idle');
    setAccounts([]);
    setError(null);
    setRequisitionId(null);
  }, []);

  // Au montage, vérifier si on revient d'un redirect bancaire
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const bankRef = params.get('bank_ref');
    const storedReqId = sessionStorage.getItem('bank_requisition_id');

    if (bankRef && storedReqId) {
      setRequisitionId(storedReqId);
      sessionStorage.removeItem('bank_requisition_id');
      fetchAccounts(storedReqId);
    }
  }, [fetchAccounts]);

  // Filtrer les banques par recherche
  const filteredInstitutions = searchQuery.trim()
    ? institutions.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : institutions;

  return {
    step,
    institutions: filteredInstitutions,
    searchQuery,
    setSearchQuery,
    accounts,
    error,
    requisitionId,
    startConnect,
    connectBank,
    fetchAccounts,
    reset,
    isConfigured: true, // sera false si pas de clés API
  };
}

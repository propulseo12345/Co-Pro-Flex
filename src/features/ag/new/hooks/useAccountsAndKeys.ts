'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { listAccounts, listRepartitionKeys } from '@/lib/finance/api';

export interface AccountOption {
  id: string;
  code: string;
  name: string;
}

export interface RepartitionKeyOption {
  id: string;
  name: string;
}

export function useAccountsAndKeys() {
  const { currentCoproId: contextCoproId } = useCopro();
  const coproId = contextCoproId || '11111111-aaaa-bbbb-cccc-111111111111';

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [repartitionKeys, setRepartitionKeys] = useState<RepartitionKeyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [accResult, keyResult] = await Promise.all([
          listAccounts(coproId, 'expense'),
          listRepartitionKeys(coproId),
        ]);
        if (cancelled) return;
        if (accResult.data) setAccounts(accResult.data.map(a => ({ id: a.id, code: a.code, name: a.name })));
        if (keyResult.data) setRepartitionKeys(keyResult.data.map(k => ({ id: k.id, name: k.name })));
      } catch (err) {
        console.error('[useAccountsAndKeys] Error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [coproId]);

  const findAccountByCode = useCallback((code: string) => {
    return accounts.find(a => a.code === code) || null;
  }, [accounts]);

  const findKeyByName = useCallback((name: string) => {
    return repartitionKeys.find(k => k.name === name) || null;
  }, [repartitionKeys]);

  return { accounts, repartitionKeys, isLoading, findAccountByCode, findKeyByName };
}

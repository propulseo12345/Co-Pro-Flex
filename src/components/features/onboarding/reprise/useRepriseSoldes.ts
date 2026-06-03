'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getOnboardingOpeningBalance,
  setOnboardingOpeningBalance,
  listComptesBancaires,
  listComptesPlan,
  listLots,
  type OpeningBalanceLine,
} from '@/lib/onboarding/api';
import type { BalanceFormState, BankAccount, PlanAccount } from './BalanceEntreeForm';
import type { LotRow, LotCol } from './SoldesParLotTable';

const EMPTY_FORM: BalanceFormState = {
  bankBalances: {}, fondsAlur: '', fournisseurs: '', report110: '', report120: '',
  autres: {}, midYear: false, asOfDate: '', produits: {}, charges: {},
};

/** Entrées brutes -> lignes du moteur. Pur, testable sans DOM. */
export interface RepriseInputs {
  form: BalanceFormState;
  lotValues: Record<string, string>;     // `${lotId}:${col}` -> texte
  bankCodeById: Record<string, string>;  // accountId -> code (ex. 512000)
  autresCodeById: Record<string, string>;
  chargeCodeById: Record<string, string>;
  produitCodeById: Record<string, string>;
}

const NATURE_BY_COL: Record<Exclude<LotCol, 'avance'>, { code: string; nature: 'current' | 'works' | 'alur' }> = {
  current: { code: '450-1', nature: 'current' },
  works: { code: '450-2', nature: 'works' },
  alur: { code: '450-5', nature: 'alur' },
};

function num(raw: string | undefined): number {
  const v = parseFloat(raw ?? '');
  return Number.isFinite(v) ? v : 0;
}

export function buildOpeningLines(inputs: RepriseInputs, lots: LotRow[]): OpeningBalanceLine[] {
  const lines: OpeningBalanceLine[] = [];
  const { form, lotValues } = inputs;

  // 1) Par lot : 450-x (current/works/alur) + 103 (avance)
  for (const lot of lots) {
    (['current', 'works', 'alur'] as const).forEach(col => {
      const amount = num(lotValues[`${lot.id}:${col}`]);
      if (amount !== 0) {
        const { code, nature } = NATURE_BY_COL[col];
        lines.push({ accountCode: code, lotId: lot.id, amount, nature });
      }
    });
    const avance = num(lotValues[`${lot.id}:avance`]);
    if (avance !== 0) lines.push({ accountCode: '103', lotId: lot.id, amount: avance });
  }

  // 2) Banques (résolues par account_id -> code) ; débit positif
  for (const [accId, code] of Object.entries(inputs.bankCodeById)) {
    const amount = num(form.bankBalances[accId]);
    if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount });
  }

  // 3) Globaux essentiels. Convention de signe : passifs (105 réserve, 401 dette) = crédit
  //    -> montant négatif ; reports débiteurs (110/120) -> positif. Le moteur équilibre le résidu.
  const alur = num(form.fondsAlur);     if (alur !== 0) lines.push({ accountCode: '105', lotId: null, amount: -alur });
  const four = num(form.fournisseurs);  if (four !== 0) lines.push({ accountCode: '401', lotId: null, amount: -four });
  const r110 = num(form.report110);     if (r110 !== 0) lines.push({ accountCode: '110', lotId: null, amount: r110 });
  const r120 = num(form.report120);     if (r120 !== 0) lines.push({ accountCode: '120', lotId: null, amount: r120 });

  // 4) Autres comptes (classes 1-5), saisis tels quels (débit positif)
  for (const [accId, code] of Object.entries(inputs.autresCodeById)) {
    const amount = num(form.autres[accId]);
    if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount });
  }

  // 5) Charges/produits SEULEMENT si reprise en cours d'année
  if (form.midYear) {
    for (const [accId, code] of Object.entries(inputs.chargeCodeById)) {
      const amount = num(form.charges[accId]);
      if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount }); // charge = débit positif
    }
    for (const [accId, code] of Object.entries(inputs.produitCodeById)) {
      const amount = num(form.produits[accId]);
      if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount: -amount }); // produit = crédit
    }
  }

  return lines;
}

interface UseRepriseSoldesResult {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  residual: number;
  lots: LotRow[];
  bankAccounts: BankAccount[];
  planAccounts: PlanAccount[];
  form: BalanceFormState;
  setForm: (next: BalanceFormState) => void;
  lotValues: Record<string, string>;
  setLotValue: (lotId: string, col: LotCol, value: string) => void;
  save: () => Promise<{ ok: boolean; residual: number }>;
}

export function useRepriseSoldes(coproId: string, periodId: string): UseRepriseSoldesResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [residual, setResidual] = useState(0);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [planAccounts, setPlanAccounts] = useState<PlanAccount[]>([]);
  const [form, setForm] = useState<BalanceFormState>(EMPTY_FORM);
  const [lotValues, setLotValues] = useState<Record<string, string>>({});

  // Index code par account_id pour le mapping inverse
  const bankCodeById = Object.fromEntries(bankAccounts.map(a => [a.id, a.code]));
  const essentialCodes = new Set(['105', '110', '120', '401']);
  const bankIds = new Set(bankAccounts.map(b => b.id));
  const autresCodeById = Object.fromEntries(
    planAccounts.filter(a => /^[1-5]/.test(a.code) && !essentialCodes.has(a.code) && !bankIds.has(a.id))
      .map(a => [a.id, a.code]));
  const chargeCodeById = Object.fromEntries(planAccounts.filter(a => /^6/.test(a.code)).map(a => [a.id, a.code]));
  const produitCodeById = Object.fromEntries(planAccounts.filter(a => /^7/.test(a.code)).map(a => [a.id, a.code]));

  // Pré-remplit le formulaire depuis une reprise existante (ré-édition).
  const hydrateFromLines = useCallback((lines: OpeningBalanceLine[], asOfDate: string | null) => {
    const nextForm: BalanceFormState = { ...EMPTY_FORM, midYear: !!asOfDate, asOfDate: asOfDate || '' };
    const nextLotValues: Record<string, string> = {};
    for (const ln of lines) {
      if (ln.lotId && ln.accountCode.startsWith('450-')) {
        const col = ln.accountCode === '450-1' ? 'current' : ln.accountCode === '450-2' ? 'works' : 'alur';
        nextLotValues[`${ln.lotId}:${col}`] = String(ln.amount);
      } else if (ln.lotId && ln.accountCode === '103') {
        nextLotValues[`${ln.lotId}:avance`] = String(ln.amount);
      } else if (ln.accountCode === '105') nextForm.fondsAlur = String(Math.abs(ln.amount));
      else if (ln.accountCode === '401') nextForm.fournisseurs = String(Math.abs(ln.amount));
      else if (ln.accountCode === '110') nextForm.report110 = String(ln.amount);
      else if (ln.accountCode === '120') nextForm.report120 = String(ln.amount);
    }
    setForm(nextForm);
    setLotValues(nextLotValues);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [lotsRes, banksRes, planRes, openRes] = await Promise.all([
        listLots(coproId),
        listComptesBancaires(coproId),
        listComptesPlan(coproId),
        getOnboardingOpeningBalance(coproId, periodId),
      ]);
      if (cancelled) return;
      if (lotsRes.data) setLots(lotsRes.data.map(
        (l: { id: string; ref: string; ownerName: string | null }) => ({ id: l.id, ref: l.ref, ownerName: l.ownerName })
      ));
      if (banksRes.data) setBankAccounts(banksRes.data.map(b => ({ id: b.id, name: b.name, code: b.code })));
      if (planRes.data) setPlanAccounts(planRes.data.map(a => ({ id: a.id, code: a.code, name: a.name })));
      if (openRes.data) {
        setResidual(openRes.data.residual);
        hydrateFromLines(openRes.data.lines, openRes.data.asOfDate);
      }
      setIsLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [coproId, periodId, hydrateFromLines]);

  const setLotValue = useCallback((lotId: string, col: LotCol, value: string) => {
    setLotValues(prev => ({ ...prev, [`${lotId}:${col}`]: value }));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    const lines = buildOpeningLines(
      { form, lotValues, bankCodeById, autresCodeById, chargeCodeById, produitCodeById },
      lots
    );
    const asOf = form.midYear && form.asOfDate ? form.asOfDate : new Date().toISOString().split('T')[0];
    const res = await setOnboardingOpeningBalance(coproId, periodId, asOf, lines);
    setIsSaving(false);
    if (res.error) { setError(res.error.message); return { ok: false, residual }; }
    const newResidual = res.data?.residual ?? 0;
    setResidual(newResidual);
    return { ok: true, residual: newResidual };
  }, [form, lotValues, lots, coproId, periodId, residual,
      bankCodeById, autresCodeById, chargeCodeById, produitCodeById]);

  return {
    isLoading, isSaving, error, residual, lots, bankAccounts, planAccounts,
    form, setForm, lotValues, setLotValue, save,
  };
}

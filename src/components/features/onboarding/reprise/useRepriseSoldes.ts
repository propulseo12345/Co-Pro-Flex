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

/** Comptes globaux gérés en littéral par l'« Essentiel » (jamais dans la section « Autres »). */
const ESSENTIAL_CODES = new Set(['105', '110', '120', '401']);
/** Un compte est-il un compte de trésorerie (banque/livret) ? Codes 512x / 502x. */
function isBankCode(code: string): boolean {
  return code.startsWith('512') || code.startsWith('502');
}

interface AccountRef { id: string; code: string }

/**
 * Index code → account_id, factorisé pour rester cohérent avec buildOpeningLines
 * et la classification de BalanceEntreeForm.
 *  - bank      : 512x/502x (résolus par account_id, jamais le code nu)
 *  - autres    : classes 1-5 hors essentiels (105/110/120/401), hors banque, hors 450/103
 *  - charges   : 6xx
 *  - produits  : 7xx
 * Les comptes globaux essentiels (105/110/120/401) et 450/103 ne sont PAS indexés ici :
 * ils sont reconstruits par code littéral / par lot.
 */
export interface CodeIndex {
  bankIdByCode: Record<string, string>;
  autresIdByCode: Record<string, string>;
  chargeIdByCode: Record<string, string>;
  produitIdByCode: Record<string, string>;
}

export function buildCodeIndex(bankAccounts: AccountRef[], planAccounts: AccountRef[]): CodeIndex {
  const bankIds = new Set(bankAccounts.map(b => b.id));
  const bankIdByCode: Record<string, string> = {};
  for (const b of bankAccounts) bankIdByCode[b.code] = b.id;

  const autresIdByCode: Record<string, string> = {};
  const chargeIdByCode: Record<string, string> = {};
  const produitIdByCode: Record<string, string> = {};
  for (const a of planAccounts) {
    if (/^6/.test(a.code)) { chargeIdByCode[a.code] = a.id; continue; }
    if (/^7/.test(a.code)) { produitIdByCode[a.code] = a.id; continue; }
    // classes 1-5 hors essentiels, hors banque, hors 450/103
    if (
      /^[1-5]/.test(a.code) &&
      !ESSENTIAL_CODES.has(a.code) &&
      !bankIds.has(a.id) &&
      !a.code.startsWith('450') &&
      a.code !== '103'
    ) {
      autresIdByCode[a.code] = a.id;
    }
  }
  return { bankIdByCode, autresIdByCode, chargeIdByCode, produitIdByCode };
}

/**
 * Reconstruit l'état du formulaire ({form, lotValues}) depuis les lignes renvoyées par
 * get_opening_balance (qui exposent account_code, PAS account_id). MIROIR EXACT de
 * buildOpeningLines : restaure TOUTES les natures (banque/autres/6-7), sinon une
 * ré-édition + Enregistrer effacerait ces lignes (DELETE+repost total côté moteur). [P0-A]
 *
 * Pur, testable sans DOM.
 */
export function rebuildFormFromLines(
  lines: OpeningBalanceLine[],
  asOfDate: string | null,
  bankAccounts: AccountRef[],
  planAccounts: AccountRef[],
): { form: BalanceFormState; lotValues: Record<string, string> } {
  const { bankIdByCode, autresIdByCode, chargeIdByCode, produitIdByCode } =
    buildCodeIndex(bankAccounts, planAccounts);

  const form: BalanceFormState = { ...EMPTY_FORM, midYear: !!asOfDate, asOfDate: asOfDate || '' };
  const lotValues: Record<string, string> = {};

  for (const ln of lines) {
    const code = ln.accountCode;
    if (ln.lotId && code.startsWith('450-')) {
      const col = code === '450-1' ? 'current' : code === '450-2' ? 'works' : 'alur';
      lotValues[`${ln.lotId}:${col}`] = String(ln.amount);
    } else if (ln.lotId && code === '103') {
      lotValues[`${ln.lotId}:avance`] = String(ln.amount);
    } else if (code === '105') {
      form.fondsAlur = String(Math.abs(ln.amount));
    } else if (code === '401') {
      form.fournisseurs = String(Math.abs(ln.amount));
    } else if (code === '110') {
      form.report110 = String(ln.amount);
    } else if (code === '120') {
      form.report120 = String(ln.amount);
    } else if (isBankCode(code)) {
      const id = bankIdByCode[code];
      if (id) form.bankBalances[id] = String(ln.amount);
    } else if (code.startsWith('6')) {
      const id = chargeIdByCode[code];
      if (id) { form.charges[id] = String(ln.amount); form.midYear = true; }
    } else if (code.startsWith('7')) {
      const id = produitIdByCode[code];
      // get renvoie le produit signé négatif (crédit) : on ré-inverse pour la saisie (positive).
      if (id) { form.produits[id] = String(-ln.amount); form.midYear = true; }
    } else {
      const id = autresIdByCode[code];
      if (id) form.autres[id] = String(ln.amount);
    }
  }

  return { form, lotValues };
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

  // Maps account_id -> code consommées par buildOpeningLines. On les dérive du MÊME
  // index (code -> account_id) que la ré-hydratation, en l'inversant : ainsi save() et
  // rebuildFormFromLines couvrent exactement le même périmètre de comptes (miroir). [P0-A]
  const invert = (m: Record<string, string>) =>
    Object.fromEntries(Object.entries(m).map(([code, id]) => [id, code]));
  const codeIndex = buildCodeIndex(bankAccounts, planAccounts);
  const bankCodeById = invert(codeIndex.bankIdByCode);
  const autresCodeById = invert(codeIndex.autresIdByCode);
  const chargeCodeById = invert(codeIndex.chargeIdByCode);
  const produitCodeById = invert(codeIndex.produitIdByCode);

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
      const banks = banksRes.data ?? [];
      const plan = planRes.data ?? [];
      if (banksRes.data) setBankAccounts(banks.map(b => ({ id: b.id, name: b.name, code: b.code })));
      if (planRes.data) setPlanAccounts(plan.map(a => ({ id: a.id, code: a.code, name: a.name })));
      if (openRes.data) {
        setResidual(openRes.data.residual);
        // ORDRE : on hydrate à partir de banksRes.data/planRes.data (arguments locaux),
        // PAS du state bankAccounts/planAccounts qui n'est pas encore appliqué (même cycle). [P0-A]
        const { form: nextForm, lotValues: nextLotValues } = rebuildFormFromLines(
          openRes.data.lines, openRes.data.asOfDate, banks, plan
        );
        setForm(nextForm);
        setLotValues(nextLotValues);
      }
      setIsLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [coproId, periodId]);

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

import type { SupplierInvoiceLine, CreditNoteLinePayload } from '@/lib/finance/api';

// Avoir partiel : ventile le montant demandé au prorata des lignes de la facture d'origine.
// Arrondi au centime, résidu imputé à la plus grosse ligne pour garantir Σ lignes = montant
// (la RPC post_supplier_credit_note exige des lignes explicites pour un partiel).
export function prorateLines(lines: SupplierInvoiceLine[], target: number): CreditNoteLinePayload[] {
  const total = lines.reduce((sum, line) => sum + Number(line.amount), 0);
  if (total <= 0) return [];

  const scaled: CreditNoteLinePayload[] = lines.map(line => ({
    account_id: line.account_id,
    label: line.label,
    amount: Math.round((Number(line.amount) * target / total) * 100) / 100,
    repartition_key_id: line.repartition_key_id,
    budget_line_id: line.budget_line_id,
    amount_ht: null,
    amount_tva: null,
    taux_pct: null,
  }));

  const sum = scaled.reduce((acc, line) => acc + line.amount, 0);
  const residual = Math.round((target - sum) * 100) / 100;
  if (residual !== 0) {
    const idx = scaled.reduce((iMax, line, i, arr) => (line.amount > arr[iMax].amount ? i : iMax), 0);
    scaled[idx] = { ...scaled[idx], amount: Math.round((scaled[idx].amount + residual) * 100) / 100 };
  }

  return scaled.filter(line => line.amount > 0);
}

'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './BalanceEntreeForm.module.css';

export interface PlanAccount {
  id: string;
  code: string;
  name: string;
}
export interface BankAccount {
  id: string;
  name: string;
  code: string;
}

/** État complet de la partie « comptes globaux » de la reprise (détenu par le conteneur). */
export interface BalanceFormState {
  bankBalances: Record<string, string>; // accountId (512x/502x) -> texte signé
  fondsAlur: string;                     // 105 global
  fournisseurs: string;                  // 401 global (créditeur)
  report110: string;                     // report travaux/exceptionnel
  report120: string;                     // report courant
  autres: Record<string, string>;        // accountId (classes 1-5) -> texte
  midYear: boolean;                       // reprise en cours d'année
  asOfDate: string;                       // YYYY-MM-DD
  produits: Record<string, string>;       // accountId 7xx -> texte
  charges: Record<string, string>;        // accountId 6xx -> texte
}

type ScalarField = 'fondsAlur' | 'fournisseurs' | 'report110' | 'report120' | 'asOfDate';
type MapField = 'bankBalances' | 'autres' | 'produits' | 'charges';

interface BalanceEntreeFormProps {
  state: BalanceFormState;
  bankAccounts: BankAccount[];
  planAccounts: PlanAccount[];
  onChange: (next: BalanceFormState) => void;
}

export function BalanceEntreeForm({ state, bankAccounts, planAccounts, onChange }: BalanceEntreeFormProps) {
  const [showAutres, setShowAutres] = useState(false);

  const setScalar = useCallback((field: ScalarField, value: string) => {
    onChange({ ...state, [field]: value });
  }, [state, onChange]);

  const setBool = useCallback((field: 'midYear', value: boolean) => {
    onChange({ ...state, [field]: value });
  }, [state, onChange]);

  const setMap = useCallback((field: MapField, accountId: string, value: string) => {
    onChange({ ...state, [field]: { ...state[field], [accountId]: value } });
  }, [state, onChange]);

  // Classes 1-5 hors comptes déjà couverts ailleurs :
  //  - « Essentiel » : 105, 110, 120, 401, banques
  //  - GÉRÉ PAR LOT : 103 (avance), saisi dans la colonne « Avance » de SoldesParLotTable
  //    -> ne JAMAIS l'exposer en champ global (sinon buildCodeIndex l'exclut côté save et la
  //    saisie globale est silencieusement perdue). Cohérent avec buildCodeIndex (useRepriseSoldes).
  const excludedCodes = new Set(['105', '110', '120', '401', '103']);
  const bankIds = new Set(bankAccounts.map(b => b.id));
  const autresAccounts = planAccounts.filter(a =>
    /^[1-5]/.test(a.code) && !excludedCodes.has(a.code) && !bankIds.has(a.id)
  );
  const charges6 = planAccounts.filter(a => /^6/.test(a.code));
  const produits7 = planAccounts.filter(a => /^7/.test(a.code));

  return (
    <div className={styles.form}>
      <p className={styles.intro}>
        Préparez le dernier relevé bancaire et la dernière balance du syndic sortant.
        Saisissez les soldes globaux à la date de reprise (positif = solde débiteur).
      </p>

      {/* ── Essentiel ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Comptes essentiels</h3>

        {bankAccounts.map(acc => (
          <Field
            key={acc.id}
            label={`${acc.name}`}
            sub={`Banque ${acc.code}`}
            value={state.bankBalances[acc.id] || ''}
            onChange={v => setMap('bankBalances', acc.id, v)}
          />
        ))}

        <Field label="Fonds travaux ALUR (réserve)" sub="105"
          value={state.fondsAlur} onChange={v => setScalar('fondsAlur', v)} />
        <Field label="Dettes fournisseurs" sub="401"
          value={state.fournisseurs} onChange={v => setScalar('fournisseurs', v)} />
        <Field label="Report à nouveau — courant" sub="120"
          value={state.report120} onChange={v => setScalar('report120', v)} />
        <Field label="Report à nouveau — travaux / exceptionnel" sub="110"
          value={state.report110} onChange={v => setScalar('report110', v)} />
      </section>

      {/* ── Autres comptes (repliable) ── */}
      <section className={styles.section}>
        <button type="button" className={styles.collapseHeader} onClick={() => setShowAutres(s => !s)}>
          {showAutres ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Autres comptes (classes 1 à 5)
        </button>
        {showAutres && (
          <div className={styles.collapseBody}>
            {autresAccounts.length === 0 && (
              <p className={styles.muted}>Aucun autre compte de bilan à reprendre.</p>
            )}
            {autresAccounts.map(acc => (
              <Field key={acc.id} label={acc.name} sub={acc.code}
                value={state.autres[acc.id] || ''}
                onChange={v => setMap('autres', acc.id, v)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Reprise en cours d'année ── */}
      <section className={styles.section}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={state.midYear}
            onChange={e => setBool('midYear', e.target.checked)}
            aria-label="Reprise en cours d'année"
          />
          <span>Reprise en cours d&apos;année (des charges/produits ont déjà couru)</span>
        </label>

        {state.midYear && (
          <div className={styles.midYearBody}>
            <div className={styles.dateRow}>
              <label className={styles.dateLabel} htmlFor="asOfDate">Date de reprise</label>
              <input
                id="asOfDate"
                className={styles.dateInput}
                type="date"
                value={state.asOfDate}
                onChange={e => setScalar('asOfDate', e.target.value)}
              />
            </div>

            <h4 className={styles.subTitle}>Charges et produits de l&apos;exercice (déjà courus)</h4>
            <div className={styles.twoCols}>
              <div>
                <span className={styles.colLabel}>Charges (6xx)</span>
                {charges6.map(acc => (
                  <Field key={acc.id} label={acc.name} sub={acc.code}
                    value={state.charges[acc.id] || ''}
                    onChange={v => setMap('charges', acc.id, v)} />
                ))}
              </div>
              <div>
                <span className={styles.colLabel}>Produits (7xx)</span>
                {produits7.map(acc => (
                  <Field key={acc.id} label={acc.name} sub={acc.code}
                    value={state.produits[acc.id] || ''}
                    onChange={v => setMap('produits', acc.id, v)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface FieldProps {
  label: string; sub: string; value: string; onChange: (v: string) => void;
}
function Field({ label, sub, value, onChange }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabels}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldSub}>{sub}</span>
      </div>
      <input
        className={styles.fieldInput}
        type="number"
        step="0.01"
        placeholder="0.00"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

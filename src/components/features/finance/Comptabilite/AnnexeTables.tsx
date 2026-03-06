'use client';

import { Printer, Download } from 'lucide-react';
import type {
  AnnexeData1,
  AnnexeData1DetailCopros,
  AnnexeData2,
  AnnexeData3,
  AnnexeData4,
  AnnexeData5,
  LigneCompte,
  TotalSection,
  Ligne5Colonnes,
  LigneAnnexe4,
  LigneAnnexe5,
} from './types';
import styles from './Comptabilite.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// ============================================
// Shared header component
// ============================================

interface AnnexeHeaderProps {
  title: string;
  subtitle: string;
  onPrint: () => void;
  onExport: () => void;
}

function AnnexeHeader({ title, subtitle, onPrint, onExport }: AnnexeHeaderProps) {
  return (
    <div className={styles.annexeHeader}>
      <div className={styles.annexeHeaderInfo}>
        <h2 className={styles.annexeTitle}>{title}</h2>
        <p className={styles.annexeSubtitle}>{subtitle}</p>
      </div>
      <div className={styles.annexeHeaderActions}>
        <button className={styles.printButton} onClick={onPrint}>
          <Printer size={16} aria-hidden="true" />
          Imprimer
        </button>
        <button className={styles.downloadButton} onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          Exporter
        </button>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 1 - État financier après répartition
// ============================================

interface Annexe1TableProps {
  data: AnnexeData1;
  exercice: string;
  coproName: string;
}

function renderCompteRows(lignes: LigneCompte[]) {
  return lignes.map((row, i) => (
    <tr key={`${row.compte}-${i}`}>
      <td>{row.compte} - {row.libelle}</td>
      <td className={styles.textRight}>{formatCurrency(row.exercice_precedent)}</td>
      <td className={styles.textRight}>{formatCurrency(row.exercice_clos)}</td>
    </tr>
  ));
}

function renderTotalRow(label: string, total: TotalSection) {
  return (
    <tr className={styles.rowTotal}>
      <td>{label}</td>
      <td className={styles.textRight}>{formatCurrency(total.exercice_precedent)}</td>
      <td className={styles.textRight}>{formatCurrency(total.exercice_clos)}</td>
    </tr>
  );
}

export function Annexe1Table({ data, exercice, coproName }: Annexe1TableProps) {
  const handlePrint = () => window.print();
  const handleExport = () => {/* TODO: HTML export */};

  return (
    <div>
      <AnnexeHeader
        title={`Annexe 1 : État financier après répartition au ${exercice}`}
        subtitle={coproName}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      {/* Section I */}
      <div className={styles.annexeSection}>
        <h3 className={styles.annexeSectionTitle}>
          I - SITUATION FINANCIÈRE ET TRÉSORERIE
        </h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Trésorerie</th>
                <th className={styles.textRight}>Exercice précédent approuvé</th>
                <th className={styles.textRight}>Exercice clos</th>
              </tr>
            </thead>
            <tbody>
              {renderCompteRows(data.section_i.tresorerie)}
              {renderTotalRow('Total I', data.section_i.total_tresorerie)}
            </tbody>
          </table>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Provisions et avances</th>
                <th className={styles.textRight}>Exercice précédent approuvé</th>
                <th className={styles.textRight}>Exercice clos</th>
              </tr>
            </thead>
            <tbody>
              {renderCompteRows(data.section_i.provisions)}
              {renderTotalRow('Total', data.section_i.total_provisions)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section II - Side by side: Créances | Dettes */}
      <div className={styles.annexeSection}>
        <h3 className={styles.annexeSectionTitle}>
          II - CRÉANCES ET DETTES
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th colSpan={3}>CRÉANCES</th>
                </tr>
                <tr>
                  <th>Compte</th>
                  <th className={styles.textRight}>Ex. précédent</th>
                  <th className={styles.textRight}>Ex. clos</th>
                </tr>
              </thead>
              <tbody>
                {renderCompteRows(data.section_ii.creances)}
                {renderTotalRow('Total II', data.section_ii.total_creances)}
              </tbody>
            </table>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th colSpan={3}>DETTES</th>
                </tr>
                <tr>
                  <th>Compte</th>
                  <th className={styles.textRight}>Ex. précédent</th>
                  <th className={styles.textRight}>Ex. clos</th>
                </tr>
              </thead>
              <tbody>
                {renderCompteRows(data.section_ii.dettes)}
                {renderTotalRow('Total II', data.section_ii.total_dettes)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Total Général */}
      <div className={styles.annexeTotals}>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>TOTAL GÉNÉRAL (I) + (II) Créances</span>
          <span className={styles.annexeTotalValue}>
            {formatCurrency(data.total_general_creances.exercice_clos)}
          </span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>TOTAL GÉNÉRAL (I) + (II) Dettes</span>
          <span className={styles.annexeTotalValue}>
            {formatCurrency(data.total_general_dettes.exercice_clos)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 1 - Détail comptes copropriétaires
// ============================================

interface Annexe1DetailCoprosTableProps {
  data: AnnexeData1DetailCopros;
  coproName: string;
}

export function Annexe1DetailCoprosTable({ data, coproName }: Annexe1DetailCoprosTableProps) {
  return (
    <div>
      <AnnexeHeader
        title="Détails des comptes copropriétaires en complément de l'annexe 1"
        subtitle={coproName}
        onPrint={() => window.print()}
        onExport={() => {/* TODO */}}
      />
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Copropriétaire</th>
              <th className={styles.textRight}>Soldes avant régularisation</th>
              <th className={styles.textRight}>Régularisation</th>
              <th className={styles.textRight}>Soldes après régularisation</th>
            </tr>
          </thead>
          <tbody>
            {data.copros.map((c, i) => (
              <tr key={i}>
                <td>{c.nom}</td>
                <td className={styles.textRight}>{formatCurrency(c.solde_avant_regularisation)}</td>
                <td className={styles.textRight}>{formatCurrency(c.regularisation)}</td>
                <td className={styles.textRight}>{formatCurrency(c.solde_apres_regularisation)}</td>
              </tr>
            ))}
            <tr className={styles.rowTotal}>
              <td>Total</td>
              <td className={styles.textRight}>{formatCurrency(data.total.solde_avant)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.regularisation)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.solde_apres)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 2 - Compte de gestion général
// ============================================

interface Annexe2TableProps {
  data: AnnexeData2;
  exercice: string;
  coproName: string;
  periodLabels: {
    exPrecedent: string;
    exClosBudget: string;
    exClosRealise: string;
    bpEnCours: string;
    bpAVoter: string;
  };
}

function render5ColRow(row: Ligne5Colonnes, key: string) {
  return (
    <tr key={key}>
      <td>
        {row.compte && <span className={styles.compteBadge}>{row.compte}</span>}
        {row.libelle && ` ${row.libelle}`}
      </td>
      <td className={styles.textRight}>{formatCurrency(row.ex_precedent_approuve)}</td>
      <td className={styles.textRight}>{formatCurrency(row.ex_clos_budget_vote)}</td>
      <td className={styles.textRight}>{formatCurrency(row.ex_clos_realise)}</td>
      <td className={styles.textRight}>{formatCurrency(row.bp_en_cours_vote)}</td>
      <td className={styles.textRight}>{formatCurrency(row.bp_a_voter)}</td>
    </tr>
  );
}

function render5ColTotalRow(label: string, row: Ligne5Colonnes) {
  return (
    <tr className={styles.rowTotal}>
      <td>{label}</td>
      <td className={styles.textRight}>{formatCurrency(row.ex_precedent_approuve)}</td>
      <td className={styles.textRight}>{formatCurrency(row.ex_clos_budget_vote)}</td>
      <td className={styles.textRight}>{formatCurrency(row.ex_clos_realise)}</td>
      <td className={styles.textRight}>{formatCurrency(row.bp_en_cours_vote)}</td>
      <td className={styles.textRight}>{formatCurrency(row.bp_a_voter)}</td>
    </tr>
  );
}

export function Annexe2Table({ data, exercice, coproName, periodLabels }: Annexe2TableProps) {
  const handlePrint = () => window.print();
  const handleExport = () => {/* TODO */};

  return (
    <div>
      <AnnexeHeader
        title={`Annexe 2 : Compte de gestion général de l'exercice réalisé ${exercice}`}
        subtitle={coproName}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th rowSpan={2}>CHARGES POUR OPÉRATIONS COURANTES</th>
              <th colSpan={3} className={styles.textRight}>Pour approbation des comptes</th>
              <th colSpan={2} className={styles.textRight}>Pour le vote du budget prévisionnel</th>
            </tr>
            <tr>
              <th className={styles.textRight}>{periodLabels.exPrecedent}</th>
              <th className={styles.textRight}>{periodLabels.exClosBudget}</th>
              <th className={styles.textRight}>{periodLabels.exClosRealise}</th>
              <th className={styles.textRight}>{periodLabels.bpEnCours}</th>
              <th className={styles.textRight}>{periodLabels.bpAVoter}</th>
            </tr>
          </thead>
          <tbody>
            {data.charges_courantes.map((row, i) => render5ColRow(row, `charge-${i}`))}
            {render5ColTotalRow('Sous-total', data.sous_total_charges)}
            {render5ColTotalRow('Solde (excédents/insuffisances)', data.solde_charges)}
            {render5ColTotalRow('Total I', data.total_i_charges)}
          </tbody>
        </table>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th rowSpan={2}>PRODUITS POUR OPÉRATIONS COURANTES</th>
              <th colSpan={3} className={styles.textRight}>Pour approbation des comptes</th>
              <th colSpan={2} className={styles.textRight}>Pour le vote du budget prévisionnel</th>
            </tr>
            <tr>
              <th className={styles.textRight}>{periodLabels.exPrecedent}</th>
              <th className={styles.textRight}>{periodLabels.exClosBudget}</th>
              <th className={styles.textRight}>{periodLabels.exClosRealise}</th>
              <th className={styles.textRight}>{periodLabels.bpEnCours}</th>
              <th className={styles.textRight}>{periodLabels.bpAVoter}</th>
            </tr>
          </thead>
          <tbody>
            {data.produits_courants.map((row, i) => render5ColRow(row, `produit-${i}`))}
            {render5ColTotalRow('Sous-total', data.sous_total_produits)}
          </tbody>
        </table>
      </div>

      {data.charges_travaux.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th rowSpan={2}>CHARGES POUR TRAVAUX ET OPÉRATIONS EXCEPTIONNELLES</th>
                <th colSpan={3} className={styles.textRight}>Pour approbation des comptes</th>
              </tr>
              <tr>
                <th className={styles.textRight}>{periodLabels.exPrecedent}</th>
                <th className={styles.textRight}>{periodLabels.exClosBudget}</th>
                <th className={styles.textRight}>{periodLabels.exClosRealise}</th>
              </tr>
            </thead>
            <tbody>
              {data.charges_travaux.map((row, i) => (
                <tr key={`travaux-${i}`}>
                  <td>
                    {row.compte && <span className={styles.compteBadge}>{row.compte}</span>}
                    {row.libelle && ` ${row.libelle}`}
                  </td>
                  <td className={styles.textRight}>{formatCurrency(row.ex_precedent_approuve)}</td>
                  <td className={styles.textRight}>{formatCurrency(row.ex_clos_budget_vote)}</td>
                  <td className={styles.textRight}>{formatCurrency(row.ex_clos_realise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// ANNEXE 3 - Opérations courantes par clé
// ============================================

interface Annexe3TableProps {
  data: AnnexeData3;
  exercice: string;
  coproName: string;
  periodLabels: {
    exPrecedent: string;
    exClosBudget: string;
    exClosRealise: string;
    bpEnCours: string;
    bpAVoter: string;
  };
}

export function Annexe3Table({ data, exercice, coproName, periodLabels }: Annexe3TableProps) {
  const handlePrint = () => window.print();
  const handleExport = () => {/* TODO */};

  return (
    <div>
      <AnnexeHeader
        title={`Annexe 3 : Compte de gestion pour opérations courantes ${exercice}`}
        subtitle={coproName}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      {data.cles.map((cle, idx) => (
        <div key={idx} className={styles.annexeSection}>
          <h3 className={styles.annexeSectionTitle}>{cle.nom}</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan={2}>Compte</th>
                  <th colSpan={3} className={styles.textRight}>Pour approbation des comptes</th>
                  <th colSpan={2} className={styles.textRight}>Pour le vote du budget prévisionnel</th>
                </tr>
                <tr>
                  <th className={styles.textRight}>{periodLabels.exPrecedent}</th>
                  <th className={styles.textRight}>{periodLabels.exClosBudget}</th>
                  <th className={styles.textRight}>{periodLabels.exClosRealise}</th>
                  <th className={styles.textRight}>{periodLabels.bpEnCours}</th>
                  <th className={styles.textRight}>{periodLabels.bpAVoter}</th>
                </tr>
              </thead>
              <tbody>
                {cle.lignes.map((row, i) => render5ColRow(row, `cle${idx}-ligne${i}`))}
                {render5ColTotalRow('Total charges', cle.total_charges)}
                {render5ColTotalRow('Total produits', cle.total_produits)}
                {render5ColTotalRow('Total net', cle.total_net)}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className={styles.annexeTotals}>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>TOTAL GÉNÉRAL</span>
          <span className={styles.annexeTotalValue}>
            {formatCurrency(data.total_general.ex_clos_realise)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 4 - Travaux et opérations exceptionnelles
// ============================================

interface Annexe4TableProps {
  data: AnnexeData4;
  exercice: string;
  coproName: string;
}

export function Annexe4Table({ data, exercice, coproName }: Annexe4TableProps) {
  const handlePrint = () => window.print();
  const handleExport = () => {/* TODO */};

  const renderRow = (row: LigneAnnexe4, key: string) => (
    <tr key={key}>
      <td className={styles.libelleCell}>{row.libelle}</td>
      <td className={styles.textRight}>{formatCurrency(row.depenses_votees)}</td>
      <td className={styles.textRight}>{formatCurrency(row.depenses_realisees)}</td>
      <td className={styles.textRight}>{formatCurrency(row.provisions_appelees)}</td>
      <td className={styles.textRight}>{formatCurrency(row.solde)}</td>
    </tr>
  );

  return (
    <div>
      <AnnexeHeader
        title={`Annexe 4 : Compte de gestion pour travaux de l'article 14-2 et opérations exceptionnelles ${exercice}`}
        subtitle={coproName}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Opération</th>
              <th className={styles.textRight}>Dépenses votées</th>
              <th className={styles.textRight}>Dépenses réalisées</th>
              <th className={styles.textRight}>Provisions appelées</th>
              <th className={styles.textRight}>Solde</th>
            </tr>
          </thead>
          <tbody>
            {data.operations.map((op, i) => renderRow(op, `op-${i}`))}
            <tr className={styles.rowTotal}>
              <td>Total</td>
              <td className={styles.textRight}>{formatCurrency(data.total.depenses_votees)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.depenses_realisees)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.provisions_appelees)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.solde)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 5 - Travaux votés non clôturés
// ============================================

interface Annexe5TableProps {
  data: AnnexeData5;
  exercice: string;
  coproName: string;
}

export function Annexe5Table({ data, exercice, coproName }: Annexe5TableProps) {
  const handlePrint = () => window.print();
  const handleExport = () => {/* TODO */};

  const renderRow = (row: LigneAnnexe5, key: string) => (
    <tr key={key}>
      <td className={styles.libelleCell}>
        {row.libelle}
        <br />
        <span className={styles.annexeSubtitle}>
          (AG du {formatDate(row.date_ag)})
        </span>
        <br />
        <span className={styles.compteBadge}>{row.cle_repartition}</span>
      </td>
      <td className={styles.textRight}>{formatCurrency(row.travaux_votes_a)}</td>
      <td className={styles.textRight}>{formatCurrency(row.travaux_payes_b)}</td>
      <td className={styles.textRight}>{formatCurrency(row.travaux_realises_c)}</td>
      <td className={styles.textRight}>{formatCurrency(row.appels_recus_d)}</td>
      <td className={styles.textRight}>{formatCurrency(row.solde_attente_e)}</td>
      <td className={styles.textRight}>{formatCurrency(row.subventions_f)}</td>
    </tr>
  );

  return (
    <div>
      <AnnexeHeader
        title={`Annexe 5 : État des travaux de l'article 14-2 et opérations exceptionnelles votés non encore clôturés ${exercice}`}
        subtitle={coproName}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th rowSpan={2}>Opération</th>
              <th className={styles.textRight}>A</th>
              <th className={styles.textRight}>B</th>
              <th className={styles.textRight}>C</th>
              <th className={styles.textRight}>D</th>
              <th className={styles.textRight}>E = D - C</th>
              <th className={styles.textRight}>F</th>
            </tr>
            <tr>
              <th className={styles.textRight}>Travaux votés</th>
              <th className={styles.textRight}>Travaux payés</th>
              <th className={styles.textRight}>Travaux réalisés</th>
              <th className={styles.textRight}>Appels reçus</th>
              <th className={styles.textRight}>Solde en attente</th>
              <th className={styles.textRight}>Subventions à recevoir</th>
            </tr>
          </thead>
          <tbody>
            {data.operations.map((op, i) => renderRow(op, `work-${i}`))}
            <tr className={styles.rowTotal}>
              <td>Total</td>
              <td className={styles.textRight}>{formatCurrency(data.total.travaux_votes_a)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.travaux_payes_b)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.travaux_realises_c)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.appels_recus_d)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.solde_attente_e)}</td>
              <td className={styles.textRight}>{formatCurrency(data.total.subventions_f)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

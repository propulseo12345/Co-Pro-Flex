'use client';

import { FileText, Download, Printer, RefreshCcw, AlertCircle, FileSearch, Building2, Calendar, User } from 'lucide-react';
import { useEtatsDatePage } from '@/features/finance';
import type { TypeEtatDate } from '@/types/models/etat-date';
import styles from './etats-dates.module.css';

export default function EtatsDatePage() {
  const page = useEtatsDatePage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}><h1>États datés</h1><p>Génération de pré-états datés et états datés pour les ventes de lots</p></div>
      </div>

      <div className={styles.content}>
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}><FileSearch size={20} />Nouveau document</h2>
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Type de document <span className={styles.required}>*</span></label>
              <div className={styles.typeSelector}>
                <button type="button" className={`${styles.typeButton} ${page.typeDocument === 'PRE_ETAT_DATE' ? styles.typeButtonActive : ''}`} onClick={() => page.handleTypeChange('PRE_ETAT_DATE' as TypeEtatDate)}>
                  <span className={styles.typeLabel}>Pré-état daté</span><span className={styles.typeDesc}>Avant compromis</span>
                </button>
                <button type="button" className={`${styles.typeButton} ${page.typeDocument === 'ETAT_DATE' ? styles.typeButtonActive : ''}`} onClick={() => page.handleTypeChange('ETAT_DATE' as TypeEtatDate)}>
                  <span className={styles.typeLabel}>État daté</span><span className={styles.typeDesc}>Pour acte authentique</span>
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="lot" className={styles.formLabel}><Building2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Lot concerné <span className={styles.required}>*</span></label>
              <select id="lot" className={styles.formSelect} value={page.selectedLotId || ''} onChange={(e) => page.handleLotChange(e.target.value || null)}>
                <option value="">Sélectionner un lot...</option>
                {page.lots.map((lot) => {
                  const copro = page.coproprietaires.find(c => c.id === lot.coproprietaireId);
                  return <option key={lot.id} value={lot.id}>Lot {lot.numero} - {lot.type} ({copro?.nom} {copro?.prenom})</option>;
                })}
              </select>
            </div>
            {page.selectedCopro && page.selectedLot && (
              <div className={styles.infoSelected}>
                <div className={styles.infoSelectedTitle}><User size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Copropriétaire vendeur</div>
                <div className={styles.infoSelectedText}>{page.selectedCopro.prenom} {page.selectedCopro.nom}<br /><small>Lot {page.selectedLot.numero} - {page.selectedLot.tantiemesGeneraux} tantièmes</small></div>
              </div>
            )}
            <div className={styles.formGroup}>
              <label htmlFor="dateRef" className={styles.formLabel}><Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Date de référence <span className={styles.required}>*</span></label>
              <input type="date" id="dateRef" className={styles.formInput} value={page.dateReference} onChange={(e) => page.handleDateChange(e.target.value)} />
            </div>
            {page.error && (<div className={styles.error}><AlertCircle size={16} />{page.error}</div>)}
            <div className={styles.formActions}>
              <button type="button" className={styles.resetButton} onClick={page.resetForm}><RefreshCcw size={14} />Réinitialiser</button>
              <button type="button" className={styles.generateButton} onClick={page.genererEtatDate} disabled={!page.selectedLotId || page.isGenerating}>
                {page.isGenerating ? (<><span className={styles.spinner} />Génération...</>) : (<><FileText size={16} />Générer</>)}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <h3 className={styles.previewTitle}><FileText size={18} />Aperçu du document</h3>
            {page.etatGenere && (
              <div className={styles.previewActions}>
                <button type="button" className={styles.printButton} onClick={page.handlePrint}><Printer size={14} />Imprimer</button>
                <button type="button" className={styles.exportButton} onClick={page.handleExportHTML}><Download size={14} />Exporter HTML</button>
              </div>
            )}
          </div>
          <div className={styles.previewContent}>
            {!page.etatGenere ? (
              <div className={styles.previewEmpty}><FileSearch size={64} className={styles.previewEmptyIcon} /><p className={styles.previewEmptyText}>Aucun document généré</p><p className={styles.previewEmptyHint}>Sélectionnez un lot et cliquez sur &quot;Générer&quot;</p></div>
            ) : (
              <EtatDatePreview etat={page.etatGenere} formatDate={page.formatDate} formatMontant={page.formatMontant} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EtatDatePreview({ etat, formatDate, formatMontant }: { etat: NonNullable<ReturnType<typeof useEtatsDatePage>['etatGenere']>; formatDate: (d: string) => string; formatMontant: (m: number) => string }) {
  return (
    <div className={styles.documentPreview}>
      <div className={styles.docHeader}>
        <h1 className={styles.docTitle}>{etat.type === 'PRE_ETAT_DATE' ? 'Pré-État Daté' : 'État Daté'}</h1>
        <p className={styles.docSubtitle}>Article 10-1 du décret n° 67-223 du 17 mars 1967</p>
        <span className={styles.docDateRef}>Date de référence : {formatDate(etat.dateReference)}</span>
      </div>
      <div className={styles.docSection}><h2 className={styles.docSectionTitle}>1. Identification du lot</h2><div className={styles.docGrid}><div className={styles.docCard}><div className={styles.docCardTitle}>Lot n°</div><div className={styles.docCardValue}>{etat.lot.numero} - {etat.lot.type}</div></div><div className={styles.docCard}><div className={styles.docCardTitle}>Tantièmes généraux</div><div className={styles.docCardValue}>{etat.lot.tantiemesGeneraux} / 1000</div></div>{etat.lot.surface && <div className={styles.docCard}><div className={styles.docCardTitle}>Surface</div><div className={styles.docCardValue}>{etat.lot.surface} m²</div></div>}{etat.lot.etage !== undefined && <div className={styles.docCard}><div className={styles.docCardTitle}>Étage</div><div className={styles.docCardValue}>{etat.lot.etage === 0 ? 'RDC' : etat.lot.etage}</div></div>}</div></div>
      <div className={styles.docSection}><h2 className={styles.docSectionTitle}>2. Identification du copropriétaire vendeur</h2><div className={styles.docGrid}><div className={styles.docCard}><div className={styles.docCardTitle}>Nom</div><div className={styles.docCardValue}>{etat.coproprietaire.prenom} {etat.coproprietaire.nom}</div></div><div className={styles.docCard}><div className={styles.docCardTitle}>Adresse</div><div className={styles.docCardValue}>{etat.coproprietaire.adresse || 'Non renseignée'}</div></div></div></div>
      <div className={styles.docSection}><h2 className={styles.docSectionTitle}>3. Identification de la copropriété</h2><div className={styles.docGrid}><div className={styles.docCard}><div className={styles.docCardTitle}>Nom</div><div className={styles.docCardValue}>{etat.copropriete.nom}</div></div><div className={styles.docCard}><div className={styles.docCardTitle}>Adresse</div><div className={styles.docCardValue}>{etat.copropriete.adresse}</div></div><div className={styles.docCard}><div className={styles.docCardTitle}>Syndic</div><div className={styles.docCardValue}>{etat.copropriete.syndic}</div></div><div className={styles.docCard}><div className={styles.docCardTitle}>Nombre de lots</div><div className={styles.docCardValue}>{etat.copropriete.nombreLots}</div></div></div></div>
      <div className={styles.docSection}>
        <h2 className={styles.docSectionTitle}>4. Situation financière du copropriétaire vendeur</h2>
        <table className={styles.docTable}><thead><tr><th>Désignation</th><th className={styles.textRight}>Montant</th></tr></thead><tbody>
          <tr><td>Charges appelées (exercice en cours)</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(etat.situationFinanciere.chargesAppelees)}</td></tr>
          <tr><td>Charges payées</td><td className={`${styles.textRight} ${styles.montant} ${styles.montantPositif}`}>{formatMontant(etat.situationFinanciere.chargesPayees)}</td></tr>
          <tr><td>Charges restant dues</td><td className={`${styles.textRight} ${styles.montant} ${etat.situationFinanciere.chargesRestantes > 0 ? styles.montantNegatif : ''}`}>{formatMontant(etat.situationFinanciere.chargesRestantes)}</td></tr>
          <tr><td>Avance de trésorerie</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(etat.situationFinanciere.avanceTresorerie)}</td></tr>
          <tr className={styles.totalRow}><td>Solde du compte copropriétaire</td><td className={`${styles.textRight} ${styles.montant} ${etat.situationFinanciere.soldeCompteProprietaire >= 0 ? styles.montantPositif : styles.montantNegatif}`}>{formatMontant(etat.situationFinanciere.soldeCompteProprietaire)}</td></tr>
        </tbody></table>
        <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>Fonds travaux (article 14-2 loi du 10 juillet 1965)</h3>
        <table className={styles.docTable}><thead><tr><th>Désignation</th><th className={styles.textRight}>Montant</th></tr></thead><tbody>
          <tr><td>Montant appelé</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(etat.situationFinanciere.fondsTravauxAppele)}</td></tr>
          <tr><td>Montant versé</td><td className={`${styles.textRight} ${styles.montant} ${styles.montantPositif}`}>{formatMontant(etat.situationFinanciere.fondsTravauxVerse)}</td></tr>
          <tr className={styles.totalRow}><td>Reste à verser</td><td className={`${styles.textRight} ${styles.montant} ${etat.situationFinanciere.fondsTravauxRestant > 0 ? styles.montantNegatif : ''}`}>{formatMontant(etat.situationFinanciere.fondsTravauxRestant)}</td></tr>
        </tbody></table>
      </div>
      <div className={styles.docSection}><h2 className={styles.docSectionTitle}>5. Budget prévisionnel</h2><table className={styles.docTable}><thead><tr><th>Exercice</th><th className={styles.textRight}>Budget total</th><th className={styles.textRight}>Quote-part du lot</th></tr></thead><tbody><tr><td>{etat.budgetCourant.annee}</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(etat.budgetCourant.montantTotal)}</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(etat.budgetCourant.quotePartLot)}</td></tr></tbody></table></div>
      {etat.travauxEnCours.length > 0 && (<div className={styles.docSection}><h2 className={styles.docSectionTitle}>6. Travaux votés</h2><table className={styles.docTable}><thead><tr><th>Désignation</th><th className={styles.textRight}>Date AG</th><th className={styles.textRight}>Montant voté</th><th className={styles.textRight}>Quote-part lot</th><th className={styles.textRight}>Reste à appeler</th></tr></thead><tbody>{etat.travauxEnCours.map((t) => (<tr key={t.id}><td>{t.designation}</td><td className={styles.textRight}>{formatDate(t.dateAG)}</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(t.montantVote)}</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(t.quotePartLot)}</td><td className={`${styles.textRight} ${styles.montant}`}>{formatMontant(t.montantRestant)}</td></tr>))}</tbody></table></div>)}
      {etat.proceduresEnCours.length > 0 && (<div className={styles.docSection}><h2 className={styles.docSectionTitle}>7. Procédures en cours</h2><table className={styles.docTable}><thead><tr><th>Type</th><th>Description</th><th className={styles.textRight}>Date début</th><th className={styles.textRight}>Montant</th></tr></thead><tbody>{etat.proceduresEnCours.map((p) => (<tr key={p.id}><td>{p.type}</td><td>{p.description}</td><td className={styles.textRight}>{formatDate(p.dateDebut)}</td><td className={`${styles.textRight} ${styles.montant}`}>{p.montant ? formatMontant(p.montant) : '-'}</td></tr>))}</tbody></table></div>)}
      {etat.observations && (<div className={styles.docObservations}><strong>Observations :</strong><br />{etat.observations}</div>)}
      <div className={styles.docFooter}><div className={styles.signatureBlock}><p>Fait à Paris, le {formatDate(etat.dateGeneration)}</p><div className={styles.signatureLine} /><p className={styles.signatureLabel}>Le Syndic</p></div><div className={styles.signatureBlock} style={{ textAlign: 'right' }}><p>Document généré par CoProFlex</p><p className={styles.signatureLabel}>Réf: {etat.id}</p></div></div>
    </div>
  );
}

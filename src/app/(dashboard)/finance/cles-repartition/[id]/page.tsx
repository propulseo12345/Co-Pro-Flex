'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Key, AlertTriangle, CheckCircle, Calculator, Building2, Thermometer, ArrowUpDown, MoreVertical, RefreshCw } from 'lucide-react';
import { useCleDetailPage } from '@/features/finance';
import type { MockCleRepartition } from '@/shared/mock/finance';
import styles from './cle-detail.module.css';

const TYPE_OPTIONS: Array<{ value: MockCleRepartition['type']; label: string; icon: React.ReactNode }> = [
  { value: 'GENERALE', label: 'Générale', icon: <Key size={16} /> },
  { value: 'ASCENSEUR', label: 'Ascenseur', icon: <ArrowUpDown size={16} /> },
  { value: 'CHAUFFAGE', label: 'Chauffage', icon: <Thermometer size={16} /> },
  { value: 'BATIMENT', label: 'Bâtiment', icon: <Building2 size={16} /> },
  { value: 'PERSONNALISEE', label: 'Personnalisée', icon: <MoreVertical size={16} /> },
];

export default function CleDetailPage() {
  const params = useParams();
  const page = useCleDetailPage(params.id as string);

  if (page.isLoading) {
    return <div className={styles.container}><div className={styles.loading}><div className={styles.spinner} /><p>Chargement...</p></div></div>;
  }

  if (page.error || !page.cle) {
    return <div className={styles.container}><div className={styles.error}><AlertTriangle size={48} /><p>{page.error || 'Clé non trouvée'}</p><button className="btn btn-secondary" onClick={page.goBack}>Retour à la liste</button></div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={page.goBack}><ArrowLeft size={20} />Retour</button>
        <div className={styles.headerContent}><h1 className={styles.title}>Modifier la clé de répartition</h1><p className={styles.subtitle}>{page.cle.nom}</p></div>
        <div className={styles.headerActions}>
          <button className="btn btn-secondary" onClick={page.toggleSimulation}><Calculator size={18} />{page.showSimulation ? 'Masquer simulation' : 'Simuler'}</button>
          <button className="btn btn-primary" onClick={page.handleSave} disabled={page.isSaving || !page.hasChanges}>{page.isSaving ? <RefreshCw size={18} className={styles.spinning} /> : <Save size={18} />}Enregistrer</button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainPanel}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Informations générales</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}><label>Nom de la clé</label><input type="text" value={page.nom} onChange={e => page.handleNomChange(e.target.value)} placeholder="Ex: Charges générales" /></div>
              <div className={styles.formGroup}><label>Code</label><input type="text" value={page.code} onChange={e => page.handleCodeChange(e.target.value)} placeholder="Ex: CLE-GEN" className={styles.codeInput} /></div>
              <div className={styles.formGroup}><label>Type</label><select value={page.type} onChange={e => page.handleTypeChange(e.target.value as MockCleRepartition['type'])}>{TYPE_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}><label>Description</label><textarea value={page.description} onChange={e => page.handleDescriptionChange(e.target.value)} placeholder="Description optionnelle..." rows={2} /></div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Tantièmes par lot</h2><div className={styles.totalBadge}>Total: <strong>{page.calculatedTotal.toLocaleString('fr-FR')}</strong> tantièmes</div></div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr><th>Lot</th><th>Type</th><th>Copropriétaire</th><th className={styles.textRight}>Tantièmes</th><th className={styles.textRight}>%</th></tr></thead>
                <tbody>
                  {page.lotsData.map(item => {
                    const tantiemes = page.tantiemesEdits[item.lot.id] || 0;
                    const pourcentage = page.calculatedTotal > 0 ? (tantiemes / page.calculatedTotal) * 100 : 0;
                    return (
                      <tr key={item.lot.id}>
                        <td><span className={styles.lotNumero}>{item.lot.numero}</span></td>
                        <td><span className={styles.lotType}>{item.lot.type}</span></td>
                        <td>{item.coproprietaire.nom} {item.coproprietaire.prenom}</td>
                        <td className={styles.textRight}><input type="number" className={styles.tantiemesInput} value={tantiemes || ''} onChange={e => page.handleTantiemesChange(item.lot.id, e.target.value)} min={0} placeholder="0" /></td>
                        <td className={styles.textRight}><span className={styles.percentage}>{pourcentage.toFixed(2)}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td colSpan={3}><strong>Total</strong></td><td className={styles.textRight}><strong>{page.calculatedTotal.toLocaleString('fr-FR')}</strong></td><td className={styles.textRight}><strong>100%</strong></td></tr></tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Validation</h2>
            {page.validation && (
              <div className={styles.validationContent}>
                <div className={`${styles.validationStatus} ${page.validation.isValid ? styles.valid : styles.invalid}`}>
                  {page.validation.isValid ? (<><CheckCircle size={24} /><span>Clé valide</span></>) : (<><AlertTriangle size={24} /><span>{page.validation.warnings.length} alerte(s)</span></>)}
                </div>
                {page.validation.warnings.length > 0 && (<div className={styles.warningsList}>{page.validation.warnings.map((warning, idx) => (<div key={idx} className={styles.warningItem}><AlertTriangle size={14} />{warning}</div>))}</div>)}
                <div className={styles.validationStats}>
                  <div className={styles.validationStat}><span className={styles.validationLabel}>Calculé</span><span className={styles.validationValue}>{page.validation.totalCalcule.toLocaleString('fr-FR')}</span></div>
                  <div className={styles.validationStat}><span className={styles.validationLabel}>Attendu</span><span className={styles.validationValue}>{page.validation.totalAttendu.toLocaleString('fr-FR')}</span></div>
                  {page.validation.ecart !== 0 && (<div className={`${styles.validationStat} ${styles.ecart}`}><span className={styles.validationLabel}>Écart</span><span className={styles.validationValue}>{page.validation.ecart > 0 ? '+' : ''}{page.validation.ecart}</span></div>)}
                </div>
              </div>
            )}
          </div>

          {page.showSimulation && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Simulation de répartition</h2>
              <div className={styles.simulationInput}><label>Montant à répartir</label><div className={styles.inputGroup}><input type="number" value={page.simulationMontant} onChange={e => page.setSimulationMontant(e.target.value)} min={0} step={100} /><span className={styles.inputSuffix}>EUR</span></div></div>
              {page.simulationResult && page.simulationResult.length > 0 && (
                <div className={styles.simulationResult}>
                  <div className={styles.simulationTable}>
                    {page.simulationResult.slice(0, 10).map(item => (<div key={item.lot.id} className={styles.simulationRow}><div className={styles.simulationLot}><span className={styles.lotNumero}>{item.lot.numero}</span><span className={styles.simulationCopro}>{item.coproprietaire.nom}</span></div><div className={styles.simulationMontant}>{item.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div></div>))}
                    {page.simulationResult.length > 10 && (<div className={styles.simulationMore}>+{page.simulationResult.length - 10} autres lots...</div>)}
                  </div>
                  <div className={styles.simulationTotal}><span>Total</span><strong>{parseFloat(page.simulationMontant).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

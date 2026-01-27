'use client';

import { ArrowLeft, Save, Key, AlertTriangle, MoreVertical, RefreshCw } from 'lucide-react';
import { useNewClePage } from '@/features/finance';
import { LoadingState } from '@/components/ui/DataState/DataState';
import styles from '../[id]/cle-detail.module.css';

type CleType = 'GENERALE' | 'PERSONNALISEE';

const TYPE_OPTIONS: Array<{ value: CleType; label: string; icon: React.ReactNode }> = [
  { value: 'GENERALE', label: 'Tantièmes généraux', icon: <Key size={16} /> },
  { value: 'PERSONNALISEE', label: 'Personnalisée', icon: <MoreVertical size={16} /> },
];

export default function NewClePage() {
  const page = useNewClePage();

  // Mode Single Copro: si pas encore chargé ou en cours de chargement
  if (!page.currentCoproId || page.isLoading) {
    return <div className={styles.container}><div className={styles.loading}><div className={styles.spinner} /><p>Chargement des lots...</p></div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={page.goBack}><ArrowLeft size={20} />Retour</button>
        <div className={styles.headerContent}><h1 className={styles.title}>Nouvelle clé de répartition</h1><p className={styles.subtitle}>Créez une nouvelle clé et affectez les tantièmes par lot</p></div>
        <div className={styles.headerActions}>
          <button className="btn btn-primary" onClick={page.handleSave} disabled={page.isSaving || !page.isFormValid}>{page.isSaving ? <RefreshCw size={18} className={styles.spinning} /> : <Save size={18} />}Créer la clé</button>
        </div>
      </div>

      {page.error && (<div className={styles.error} style={{ padding: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}><AlertTriangle size={20} /><span>{page.error}</span></div>)}

      <div className={styles.content}>
        <div className={styles.mainPanel}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Informations générales</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}><label>Nom de la clé *</label><input type="text" value={page.nom} onChange={e => page.setNom(e.target.value)} placeholder="Ex: Charges générales" /></div>
              <div className={styles.formGroup}><label>Code *</label><input type="text" value={page.code} onChange={e => page.setCode(e.target.value.toUpperCase())} placeholder="Ex: CLE-GEN" className={styles.codeInput} /></div>
              <div className={styles.formGroup}><label>Type</label><select value={page.type} onChange={e => page.setType(e.target.value as CleType)}>{TYPE_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}><label>Description</label><textarea value={page.description} onChange={e => page.setDescription(e.target.value)} placeholder="Description optionnelle..." rows={2} /></div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Tantièmes par lot</h2><div className={styles.totalBadge}>Total: <strong>{page.calculatedTotal.toLocaleString('fr-FR')}</strong> tantièmes</div></div>
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => page.fillFromExisting('equal')}>Répartition égale (10000)</button>
              <button className="btn btn-secondary btn-sm" onClick={() => page.fillFromExisting('surface')}>Selon type de lot</button>
              <button className="btn btn-secondary btn-sm" onClick={page.clearAll}>Tout effacer</button>
            </div>
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
                        <td>{item.coproprietaire ? `${item.coproprietaire.nom} ${item.coproprietaire.prenom}` : '-'}</td>
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
            <h2 className={styles.cardTitle}>Aide</h2>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 'var(--spacing-3)' }}><strong>Clé de répartition :</strong> Définit comment les charges sont réparties entre les copropriétaires.</p>
              <p style={{ marginBottom: 'var(--spacing-3)' }}><strong>Tantièmes :</strong> Quote-part de chaque lot dans la copropriété. Le total est généralement de 10 000 ou 1 000.</p>
              <p style={{ marginBottom: 'var(--spacing-3)' }}><strong>Types de clés :</strong></p>
              <ul style={{ paddingLeft: 'var(--spacing-4)', margin: 0 }}><li><strong>Générale</strong> : charges communes à tous</li><li><strong>Ascenseur</strong> : selon usage</li><li><strong>Chauffage</strong> : selon surface/consommation</li><li><strong>Bâtiment</strong> : par bâtiment</li><li><strong>Personnalisée</strong> : cas spécifiques</li></ul>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Résumé</h2>
            <div className={styles.validationStats}>
              <div className={styles.validationStat}><span className={styles.validationLabel}>Lots configurés</span><span className={styles.validationValue}>{page.lotsConfigured} / {page.lotsData.length}</span></div>
              <div className={styles.validationStat}><span className={styles.validationLabel}>Total tantièmes</span><span className={styles.validationValue}>{page.calculatedTotal.toLocaleString('fr-FR')}</span></div>
              <div className={styles.validationStat}><span className={styles.validationLabel}>Statut</span><span className={styles.validationValue} style={{ color: page.isFormValid ? 'var(--color-success)' : 'var(--color-warning)' }}>{page.isFormValid ? 'Prêt' : 'Incomplet'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Building2, Clock, CheckCircle, AlertTriangle, Download, Printer, Send, CreditCard, Paperclip, History, PieChart, Key, ExternalLink, FileEdit, ClipboardCheck, CheckCircle2, ArrowRight, Plus, Edit, Eye } from 'lucide-react';
import { useFactureDetailPage } from '@/features/finance';
import type { StatutFacture, EvenementFacture } from '@/components/features/finance/Factures/types';
import styles from './facture-detail.module.css';

const STATUT_ICONS: Record<StatutFacture, React.ElementType> = { BROUILLON: FileEdit, A_VALIDER: ClipboardCheck, VALIDEE: CheckCircle2, A_PAYER: Clock, PAYEE: CheckCircle };
const EVENT_ICONS: Record<EvenementFacture['type'], React.ElementType> = { CREATION: Plus, MODIFICATION: Edit, CHANGEMENT_STATUT: ArrowRight, PAIEMENT: CreditCard, COMMENTAIRE: FileText };

export default function FactureDetailPage() {
  const params = useParams();
  const page = useFactureDetailPage(params.id as string);

  if (!page.facture) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <FileText size={64} /><h2>Facture introuvable</h2><p>La facture demandée n&apos;existe pas ou a été supprimée.</p>
          <button className={`${styles.actionButton} ${styles.actionButtonPrimary}`} onClick={page.handleBack}><ArrowLeft size={16} />Retour à la liste</button>
        </div>
      </div>
    );
  }

  const StatutIcon = STATUT_ICONS[page.facture.statut];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={page.handleBack}><ArrowLeft size={16} />Retour</button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{page.isAvoir ? 'Avoir' : 'Facture'} <span className={styles.reference}>{page.facture.reference}</span></h1>
          <p className={styles.subtitle}><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />{page.facture.fournisseur}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`}><Printer size={16} />Imprimer</button>
          <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`}><Download size={16} />Exporter</button>
          {page.nextStatut && (
            <button className={`${styles.actionButton} ${styles.actionButtonPrimary}`} onClick={() => page.handleChangeStatut(page.nextStatut!)}><Send size={16} />{page.getActionLabel(page.facture.statut)}</button>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.mainContent}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}><FileText size={18} />Informations générales</h2>
              <span className={`${styles.statutBadgeLarge} ${styles[page.getStatutBadgeClass(page.facture.statut)]}`}><StatutIcon size={16} />{page.getStatutLabel(page.facture.statut)}</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}><span className={styles.infoLabel}>Date facture</span><span className={styles.infoValue}>{page.formatDate(page.facture.date)}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>Date échéance</span><span className={`${styles.infoValue} ${page.joursRetard > 0 ? styles.infoValueDanger : ''}`}>{page.formatDate(page.facture.dateEcheance)}{page.joursRetard > 0 && page.facture.statut !== 'PAYEE' && (<span className={styles.retardBadge}><AlertTriangle size={12} />{page.joursRetard}j de retard</span>)}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>Fournisseur</span><span className={styles.infoValue}>{page.facture.fournisseur}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>Référence</span><span className={styles.infoValue} style={{ fontFamily: 'monospace' }}>{page.facture.reference}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>Montant TTC</span><span className={`${styles.infoValue} ${styles.infoValueHighlight}`}>{page.isAvoir ? '-' : ''}{page.formatCurrency(page.facture.montant)}</span></div>
                {page.facture.datePaiement && (<div className={styles.infoItem}><span className={styles.infoLabel}>Date paiement</span><span className={`${styles.infoValue} ${styles.infoValueSuccess}`}>{page.formatDate(page.facture.datePaiement)}</span></div>)}
                {page.cleRepartition && (<div className={styles.infoItem}><span className={styles.infoLabel}>Clé de répartition</span><span className={styles.cleBadge}><Key size={12} />{page.cleRepartition.nom}</span></div>)}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><PieChart size={18} />Ventilation comptable</h2></div>
            {page.facture.ventilation && page.facture.ventilation.length > 0 ? (
              <>
                <table className={styles.ventilationTable}><thead><tr><th>Compte</th><th>Libellé</th><th className={styles.textRight}>HT</th><th className={styles.textRight}>TVA</th><th className={styles.textRight}>TTC</th><th>Clé</th></tr></thead><tbody>
                  {page.facture.ventilation.map((ligne) => {
                    const cle = page.MOCK_CLES_REPARTITION.find(c => c.id === ligne.cleRepartitionId);
                    return (<tr key={ligne.id}><td style={{ fontFamily: 'monospace' }}>{ligne.compteComptable}</td><td>{ligne.libelle}</td><td className={`${styles.textRight} ${styles.montant}`}>{page.formatCurrency(ligne.montantHT)}</td><td className={styles.textRight}>{ligne.tauxTVA}%</td><td className={`${styles.textRight} ${styles.montant}`}>{page.formatCurrency(ligne.montantTTC)}</td><td>{cle && (<span className={styles.cleBadge}><Key size={10} />{cle.nom}</span>)}</td></tr>);
                  })}
                </tbody></table>
                <div className={styles.ventilationTotal}><span className={styles.ventilationTotalLabel}>Total TTC</span><span className={styles.ventilationTotalValue}>{page.formatCurrency(page.facture.montant)}</span></div>
              </>
            ) : (<div className={styles.sectionBody}><div className={styles.emptyState}><PieChart size={32} /><p>Aucune ventilation définie</p></div></div>)}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><Paperclip size={18} />Pièces jointes</h2></div>
            <div className={styles.sectionBody}>
              {page.facture.fichier || (page.facture.piecesJointes && page.facture.piecesJointes.length > 0) ? (
                <div className={styles.pjList}>
                  {page.facture.fichier && (<div className={styles.pjItem}><div className={styles.pjIcon}><FileText size={20} /></div><div className={styles.pjInfo}><div className={styles.pjName}>Document principal</div><div className={styles.pjMeta}>{page.facture.fichier}</div></div><div className={styles.pjActions}><button className={styles.pjButton} title="Voir"><Eye size={16} /></button><button className={styles.pjButton} title="Télécharger"><Download size={16} /></button><button className={styles.pjButton} title="Ouvrir"><ExternalLink size={16} /></button></div></div>)}
                  {page.facture.piecesJointes?.map((pj) => (<div key={pj.id} className={styles.pjItem}><div className={styles.pjIcon}><FileText size={20} /></div><div className={styles.pjInfo}><div className={styles.pjName}>{pj.nom}</div><div className={styles.pjMeta}>Ajouté le {page.formatDate(pj.dateAjout)}</div></div><div className={styles.pjActions}><button className={styles.pjButton} title="Voir"><Eye size={16} /></button><button className={styles.pjButton} title="Télécharger"><Download size={16} /></button></div></div>))}
                </div>
              ) : (<div className={styles.emptyState}><Paperclip size={32} /><p>Aucune pièce jointe</p></div>)}
            </div>
          </section>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><CheckCircle size={18} />Workflow</h2></div>
            <div className={styles.sectionBody}>
              <div className={styles.workflowSteps}>
                {(['BROUILLON', 'A_VALIDER', 'VALIDEE', 'A_PAYER', 'PAYEE'] as StatutFacture[]).map((statut) => {
                  const config = page.STATUTS_FACTURE[statut];
                  const Icon = STATUT_ICONS[statut];
                  const isActive = page.facture!.statut === statut;
                  const isDone = config.ordre < page.STATUTS_FACTURE[page.facture!.statut].ordre;
                  return (
                    <div key={statut} className={`${styles.workflowStep} ${isActive ? styles.workflowStepActive : ''} ${isDone ? styles.workflowStepDone : ''}`}>
                      <div className={styles.workflowStepIcon}>{isDone ? <CheckCircle size={16} /> : <Icon size={16} />}</div>
                      <div className={styles.workflowStepContent}>
                        <div className={styles.workflowStepLabel}>{config.libelle}</div>
                        {isDone && page.facture!.historique && (<div className={styles.workflowStepDate}>{(() => { const evt = page.facture!.historique.find(h => h.nouveauStatut === statut); return evt ? page.formatDate(evt.date) : ''; })()}</div>)}
                        {isActive && <div className={styles.workflowStepDate}>En cours</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><History size={18} />Historique</h2></div>
            <div className={styles.sectionBody}>
              {page.facture.historique && page.facture.historique.length > 0 ? (
                <div className={styles.timeline}>
                  {[...page.facture.historique].reverse().map((evt) => {
                    const Icon = EVENT_ICONS[evt.type];
                    const iconClass = evt.type === 'CREATION' ? styles.timelineIconCreation : evt.type === 'PAIEMENT' ? styles.timelineIconPaiement : evt.type === 'MODIFICATION' ? styles.timelineIconModification : styles.timelineIconStatut;
                    return (
                      <div key={evt.id} className={styles.timelineItem}>
                        <div className={`${styles.timelineIconWrapper} ${iconClass}`}><Icon size={14} /></div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineHeader}><span className={styles.timelineDate}>{page.formatDate(evt.date)}</span></div>
                          <div className={styles.timelineTitle}>{evt.type === 'CREATION' && 'Facture créée'}{evt.type === 'MODIFICATION' && 'Facture modifiée'}{evt.type === 'PAIEMENT' && 'Paiement enregistré'}{evt.type === 'CHANGEMENT_STATUT' && 'Changement de statut'}{evt.type === 'COMMENTAIRE' && 'Commentaire ajouté'}</div>
                          {evt.statutPrecedent && evt.nouveauStatut && (<div className={styles.timelineTransition}><span className={`${styles.timelineStatutBadge} ${styles[page.getStatutBadgeClass(evt.statutPrecedent)]}`}>{page.getStatutLabel(evt.statutPrecedent)}</span><ArrowRight size={12} /><span className={`${styles.timelineStatutBadge} ${styles[page.getStatutBadgeClass(evt.nouveauStatut)]}`}>{page.getStatutLabel(evt.nouveauStatut)}</span></div>)}
                          <div className={styles.timelineUser}>par {evt.utilisateur}</div>
                          {evt.commentaire && (<div className={styles.timelineComment}>&quot;{evt.commentaire}&quot;</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (<div className={styles.emptyState}><History size={32} /><p>Aucun historique</p></div>)}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

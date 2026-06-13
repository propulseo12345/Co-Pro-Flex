'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Link2, ArrowRight, Trash2, Edit, FileText, Euro, Calendar, AlertTriangle, Mail, CheckCircle, X, Calculator } from 'lucide-react';
import { BudgetStatut } from '@/types/enums/statuts';
import { BudgetStatusBadge, PostesListEditor, LinkToAGModal, TransformBudgetModal, SimulationRepartitionModal } from '@/components/features/finance/Budget';
import { useBudgetDetailPage } from '@/features/finance';
import styles from './budget-detail.module.css';

export default function BudgetDetailPage() {
  const params = useParams();
  const page = useBudgetDetailPage({ budgetId: params.id as string });

  if (page.isLoading) {
    return <div className="container"><div className={styles.loading}>Chargement...</div></div>;
  }

  if (!page.budget) {
    return (
      <div className="container">
        <div className={styles.notFound}>
          <h2>Budget non trouvé</h2>
          <p>Le budget demandé n'existe pas ou a été supprimé.</p>
          <button type="button" className="btn btn-primary" onClick={page.goBack}>
            <ArrowLeft size={16} aria-hidden="true" />Retour aux budgets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={page.goBack}><ArrowLeft size={20} aria-hidden="true" /></button>
          <div>
            <div className={styles.headerTitle}>
              <h1>{page.budget.nom || `Budget ${page.budget.type} ${page.budget.annee}`}</h1>
              <BudgetStatusBadge statut={page.budget.statut} size="lg" />
            </div>
            <div className={styles.headerMeta}>
              <span><FileText size={14} aria-hidden="true" />{page.budget.type === 'fonctionnement' ? 'Budget de fonctionnement' : 'Budget travaux'}</span>
              <span><Calendar size={14} aria-hidden="true" />Exercice {page.budget.annee}</span>
              <span><Euro size={14} aria-hidden="true" />{page.montantTotal.toLocaleString('fr-FR')} EUR</span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {page.postes.length > 0 && !page.isEditing && (
            <button type="button" className="btn btn-secondary" onClick={page.openSimulationModal}><Calculator size={16} aria-hidden="true" />Simuler la répartition</button>
          )}
          {page.canEdit && !page.isEditing && (
            <button type="button" className="btn btn-secondary" onClick={page.startEditing}><Edit size={16} aria-hidden="true" />Modifier</button>
          )}
          {page.canEdit && page.isEditing && (
            <>
              <button type="button" className="btn btn-secondary" onClick={page.cancelEditing}>Annuler</button>
              <button type="button" className="btn btn-primary" onClick={page.handleSave} disabled={!page.hasChanges || page.isSaving}>
                <Save size={16} aria-hidden="true" />{page.isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </>
          )}
          {page.canLinkToAG && !page.isEditing && (
            <button type="button" className="btn btn-primary" onClick={page.openLinkModal}><Link2 size={16} aria-hidden="true" />Lier a une AG</button>
          )}
          {page.canTransform && !page.isEditing && (
            <button type="button" className="btn btn-primary" onClick={page.openTransformModal}><ArrowRight size={16} aria-hidden="true" />Generer appels de fonds</button>
          )}
          {page.canDelete && (
            <button type="button" className={styles.deleteButton} onClick={page.handleDelete}><Trash2 size={16} aria-hidden="true" /></button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={`card ${styles.summaryCard}`}>
          <h2 className={styles.sectionTitle}>Resume du budget</h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Nombre de postes</span><span className={styles.summaryValue}>{page.postes.length}</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Montant total</span><span className={styles.summaryValuePrimary}>{page.montantTotal.toLocaleString('fr-FR')} EUR</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Statut</span><BudgetStatusBadge statut={page.budget.statut} /></div>
            {page.budget.resolutionId && (<div className={styles.summaryItem}><span className={styles.summaryLabel}>Résolution AG</span><span className={styles.summaryValue}>Liée</span></div>)}
          </div>
        </div>

        <div className={`card ${styles.postesCard}`}>
          <div className={styles.postesTitleRow}>
            <h2 className={styles.sectionTitle}>Postes budgétaires</h2>
            {!page.isEditing && page.postes.length > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={page.startEditing}><Edit size={14} aria-hidden="true" />Modifier</button>
            )}
          </div>
          {page.isEditing && page.isApprouve && (
            <div className={styles.warningBanner}><AlertTriangle size={16} aria-hidden="true" /><span>Attention : ce budget a été approuvé en AG. Les modifications seront enregistrées mais peuvent nécessiter une nouvelle approbation selon le règlement.</span></div>
          )}
          {page.isEditing ? (
            <PostesListEditor postes={page.postes} onPostesChange={page.handlePostesChange} year={page.budget.annee} onSimulateRepartition={page.openSimulationModal} />
          ) : page.postes.length > 0 ? (
            <div className={styles.postesList}>
              {page.postes.map((poste, index) => (
                <div key={poste.id} className={styles.posteItem}><span className={styles.posteIndex}>{index + 1}</span><span className={styles.posteLibelle}>{poste.libelle}</span><span className={styles.posteMontant}>{poste.montant.toLocaleString('fr-FR')} EUR</span></div>
              ))}
              <div className={styles.postesTotal}><span>Total</span><span>{page.montantTotal.toLocaleString('fr-FR')} EUR</span></div>
            </div>
          ) : (
            <div className={styles.emptyPostes}><p>Aucun poste budgétaire défini.</p><button type="button" className="btn btn-primary" onClick={page.startEditing}><Edit size={16} aria-hidden="true" />Ajouter des postes</button></div>
          )}
        </div>

        {page.isBrouillon && page.postes.length > 0 && !page.isEditing && (
          <div className={styles.helpCard}><h3>Prochaine etape</h3><p>Votre budget est en brouillon. Pour le soumettre a l'approbation des coproprietaires, liez-le a une resolution d'Assemblee Generale.</p></div>
        )}
        {page.budget.statut === BudgetStatut.EN_ATTENTE_APPROBATION && (
          <div className={styles.helpCard}><h3>En attente d'approbation</h3><p>Ce budget est lié à une résolution AG. Il passera automatiquement en statut "Approuvé" après le vote favorable des copropriétaires.</p></div>
        )}
        {page.isApprouve && (
          <div className={styles.helpCard}><h3>Budget approuvé</h3><p>Ce budget a été approuvé par l'AG. Vous pouvez maintenant générer les appels de fonds pour collecter les charges auprès des copropriétaires.</p></div>
        )}
      </div>

      {page.showLinkToAGModal && page.budget && (
        <LinkToAGModal budget={page.budget} availableResolutions={page.resolutionsAG} onLink={(_, resolutionId) => page.handleLinkToAG(resolutionId)} onClose={page.closeLinkModal} />
      )}
      {page.showTransformModal && (
        <TransformBudgetModal budget={page.budget} onTransform={() => { alert('La génération des appels de fonds depuis le budget sera disponible prochainement.'); page.closeTransformModal(); }} onClose={page.closeTransformModal} />
      )}
      {page.showSimulationModal && (
        <SimulationRepartitionModal postes={page.postes} onClose={page.closeSimulationModal} />
      )}
      {page.showMailToast && (
        <div className={styles.toast}>
          <div className={styles.toastIcon}><CheckCircle size={20} aria-hidden="true" /></div>
          <div className={styles.toastContent}><div className={styles.toastTitle}>Budget enregistre</div><div className={styles.toastMessage}><Mail size={14} aria-hidden="true" />Notification envoyee par mail au syndic et au conseil syndical</div></div>
          <button type="button" className={styles.toastClose} onClick={page.closeMailToast} aria-label="Fermer"><X size={16} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}

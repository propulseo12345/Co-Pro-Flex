'use client';

import { use, useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowLeft, FileText, Pencil, Mail, FileDown, Ban, CheckCircle, Loader, AlertCircle, Paperclip } from 'lucide-react';
import DocumentViewerModal from '@/components/ui/DocumentViewerModal/DocumentViewerModal';
import type { DocumentForViewer } from '@/components/ui/DocumentViewerModal/DocumentViewerModal';
import Link from 'next/link';
import clsx from 'clsx';
import { useServiceOrderDetailPage } from '../../../../../features/maintenance/serviceOrders/hooks';
import { getStatutLabel } from '@/lib/utils/service-order';
import { simulateGedArchive } from '@/lib/utils/service-order';
import type { OrdreService, StatutOrdreService } from '@/types';
import styles from './os-detail.module.css';

interface PageProps {
    params: Promise<{ id: string }>;
}

// Pipeline canonical steps
const PIPELINE_STEPS = [
    'BROUILLON', 'A_ENVOYER', 'ENVOYE', 'EN_ATTENTE_PRESTATAIRE',
    'INTERVENTION_PROGRAMMEE', 'EN_COURS', 'INTERVENTION_REALISEE', 'CLOTURE'
] as const;

const PIPELINE_LABELS: Record<string, string> = {
    BROUILLON: 'Brouillon', A_ENVOYER: 'À envoyer', ENVOYE: 'Envoyé',
    EN_ATTENTE_PRESTATAIRE: 'Accepté', ACCEPTE: 'Accepté',
    INTERVENTION_PROGRAMMEE: 'Programmé', PLANIFIE: 'Programmé',
    EN_COURS: 'En cours', INTERVENTION_REALISEE: 'Réalisé', REALISE: 'Réalisé',
    FACTURE: 'Facturé', PAYE: 'Payé', CLOTURE: 'Clôturé', ANNULE: 'Annulé', REFUSE: 'Refusé',
};

const STATUS_TO_PIPELINE: Record<string, string> = {
    ACCEPTE: 'EN_ATTENTE_PRESTATAIRE', PLANIFIE: 'INTERVENTION_PROGRAMMEE',
    REALISE: 'INTERVENTION_REALISEE', FACTURE: 'INTERVENTION_REALISEE',
    PAYE: 'CLOTURE', ANNULE: 'CLOTURE', REFUSE: 'ENVOYE',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
    BROUILLON: ['A_ENVOYER'], A_ENVOYER: ['ENVOYE', 'BROUILLON'],
    ENVOYE: ['EN_ATTENTE_PRESTATAIRE', 'ACCEPTE', 'REFUSE'],
    EN_ATTENTE_PRESTATAIRE: ['INTERVENTION_PROGRAMMEE', 'PLANIFIE'],
    ACCEPTE: ['PLANIFIE', 'INTERVENTION_PROGRAMMEE'],
    REFUSE: ['A_ENVOYER'], PLANIFIE: ['EN_COURS'],
    INTERVENTION_PROGRAMMEE: ['INTERVENTION_REALISEE', 'EN_COURS'],
    EN_COURS: ['REALISE', 'INTERVENTION_REALISEE'],
    // FACTURE/PAYE retirés (retour revue 0047) : statuts legacy absents du
    // workflow cible — la facturation vit sur supplier_invoices, le badge
    // « Facturé » est dérivé de la facture liée.
    REALISE: ['CLOTURE'], INTERVENTION_REALISEE: ['CLOTURE'],
    CLOTURE: [], ANNULE: [],
};

const CHECKLIST: Record<string, string[]> = {
    EN_ATTENTE_PRESTATAIRE: ['Confirmation du prestataire reçue', 'Devis conforme au budget'],
    ACCEPTE: ['Confirmation du prestataire reçue', 'Devis conforme au budget'],
    INTERVENTION_PROGRAMMEE: ['Date d\'intervention confirmée', 'Accès au site organisé'],
    PLANIFIE: ['Date d\'intervention confirmée', 'Accès au site organisé'],
    EN_COURS: ['Prestataire présent sur site'],
    INTERVENTION_REALISEE: ['Travaux vérifiés', 'PV de réception signé'],
    REALISE: ['Travaux vérifiés', 'PV de réception signé'],
    CLOTURE: ['Tous les documents archivés'],
};

function needsDate(s: string) { return ['INTERVENTION_PROGRAMMEE', 'PLANIFIE'].includes(s); }
function needsRealisee(s: string) { return ['INTERVENTION_REALISEE', 'REALISE'].includes(s); }
function needsRefus(s: string) { return s === 'REFUSE'; }

export default function ServiceOrderDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const {
        ordreService, currentData, editMode,
        factureLiee, setEditMode, handleStatusUpdate,
        handleCancelEdit, handleSaveEdit,
        handleDescriptionChange, handleUploadPJ, editedData,
    } = useServiceOrderDetailPage(id);

    // Pipeline state
    const currentStatus = currentData?.statut || '';
    const pipelineStatus = STATUS_TO_PIPELINE[currentStatus] || currentStatus;
    const currentIndex = PIPELINE_STEPS.indexOf(pipelineStatus as typeof PIPELINE_STEPS[number]);
    const availableNext = useMemo(() => {
        const raw = (VALID_TRANSITIONS[currentStatus] || []).filter(s => s !== 'ANNULE');
        // Dédupliquer par label (EN_ATTENTE_PRESTATAIRE et ACCEPTE → garder un seul "Accepté")
        const seen = new Map<string, string>();
        for (const s of raw) {
            const label = PIPELINE_LABELS[s] || s;
            if (!seen.has(label)) seen.set(label, s);
        }
        return Array.from(seen.values());
    }, [currentStatus]);

    const pipelineToTransition = useMemo(() => {
        const map: Record<string, string> = {};
        for (const step of PIPELINE_STEPS) {
            if ((availableNext as string[]).includes(step)) map[step] = step;
            for (const next of availableNext) {
                const mapped = STATUS_TO_PIPELINE[next] || next;
                if (mapped === step) map[step] = next;
            }
        }
        return map;
    }, [availableNext]);

    const [selectedStatus, setSelectedStatus] = useState<string | null>(availableNext[0] || null);
    const [panelOpen, setPanelOpen] = useState(true);

    // Sync selectedStatus quand le statut change (après validation → prochaine transition)
    useEffect(() => {
        setSelectedStatus(availableNext[0] || null);
    }, [availableNext]);
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
    const [dateProgrammee, setDateProgrammee] = useState('');
    const [dateRealisee, setDateRealisee] = useState('');
    const [montantFinal, setMontantFinal] = useState('');
    const [raisonRefus, setRaisonRefus] = useState('');
    const [commentaire, setCommentaire] = useState('');
    const [noteCloture, setNoteCloture] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'pj' | 'email'>('pj');
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const [viewingDoc, setViewingDoc] = useState<DocumentForViewer | null>(null);

    const checklistItems = selectedStatus ? (CHECKLIST[selectedStatus] || []) : [];
    const selectedLabel = selectedStatus ? (PIPELINE_LABELS[selectedStatus] || selectedStatus) : '';

    const handleStageClick = useCallback((step: string) => {
        const transition = pipelineToTransition[step];
        if (transition) {
            setSelectedStatus(transition);
            setCheckedItems(new Set());
            setError('');
            setPanelOpen(true);
        }
    }, [pipelineToTransition]);

    const toggleCheck = (i: number) => {
        setCheckedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
    };

    const handleConfirm = useCallback(async () => {
        if (!selectedStatus || !ordreService) return;
        setError('');
        if (needsDate(selectedStatus) && !dateProgrammee) { setError('Date d\'intervention obligatoire'); return; }
        if (needsRealisee(selectedStatus) && (!dateRealisee || !montantFinal)) { setError('Date et montant obligatoires'); return; }
        if (needsRefus(selectedStatus) && !raisonRefus) { setError('Raison du refus obligatoire'); return; }

        setIsProcessing(true);
        try {
            const now = new Date().toISOString();
            const updated: OrdreService = { ...ordreService, statut: selectedStatus as StatutOrdreService, dateModification: now };
            if (selectedStatus === 'ENVOYE') updated.dateEnvoi = now;
            if (needsDate(selectedStatus)) updated.dateInterventionProgrammee = new Date(dateProgrammee).toISOString();
            if (needsRealisee(selectedStatus)) { updated.dateInterventionRealisee = new Date(dateRealisee).toISOString(); updated.montantFinal = parseFloat(montantFinal); }
            if (selectedStatus === 'CLOTURE') { updated.dateCloture = now; const gid = await simulateGedArchive(updated); updated.archiveGedId = gid; updated.archiveGedUrl = `#ged/${gid}`; }

            const entries = [];
            if (needsRefus(selectedStatus)) entries.push({ id: `h-${Date.now()}`, date: now, auteur: 'Prestataire', action: `Refusé: ${raisonRefus}` });
            if (commentaire.trim()) entries.push({ id: `h-c-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: commentaire });
            if (noteCloture.trim()) entries.push({ id: `h-n-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: `Note: ${noteCloture}` });
            entries.push({ id: `h-s-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: 'Changement de statut', champModifie: 'statut', ancienneValeur: getStatutLabel(currentStatus), nouvelleValeur: getStatutLabel(selectedStatus) });
            updated.historique = [...ordreService.historique, ...entries];

            await handleStatusUpdate(updated);
            // Garder le panneau ouvert et pré-sélectionner la prochaine transition
            setCommentaire('');
            setDateProgrammee('');
            setDateRealisee('');
            setMontantFinal('');
            setRaisonRefus('');
            setNoteCloture('');
            setCheckedItems(new Set());
            setError('');
            setPanelOpen(true);
        } catch { setError('Erreur lors de la mise à jour'); }
        setIsProcessing(false);
    }, [selectedStatus, ordreService, dateProgrammee, dateRealisee, montantFinal, raisonRefus, commentaire, noteCloture, currentStatus, handleStatusUpdate]);

    const handleCancelOS = useCallback(async () => {
        if (!ordreService || !confirm('Annuler cet ordre de service ?')) return;
        setIsProcessing(true);
        const now = new Date().toISOString();
        const updated: OrdreService = { ...ordreService, statut: 'ANNULE' as StatutOrdreService, dateModification: now, historique: [...ordreService.historique, { id: `h-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: 'OS annulé', champModifie: 'statut', ancienneValeur: getStatutLabel(currentStatus), nouvelleValeur: 'Annulé' }] };
        await handleStatusUpdate(updated);
        setIsProcessing(false);
    }, [ordreService, currentStatus, handleStatusUpdate]);

    if (!ordreService || !currentData) {
        return (
            <div className={styles.container}>
                <div className={styles.notFound}>
                    <FileText size={48} />
                    <h2>Ordre de service introuvable</h2>
                    <Link href="/maintenance/service-orders">← Retour à la liste</Link>
                </div>
            </div>
        );
    }

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    const formatDateTime = (d?: string) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const formatMoney = (n?: number) => n != null ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—';

    return (
        <div className={styles.container}>
            {/* ============ TOPBAR ============ */}
            <div className={styles.topbar}>
                <Link href="/maintenance/service-orders" className={styles.topbarBack}>
                    <ArrowLeft size={16} /> Retour
                </Link>
                <div className={styles.topbarDivider} />
                <div className={styles.topbarInfo}>
                    <div className={styles.topbarNumber}>{currentData.id?.startsWith('os-') ? `OS-${currentData.id.replace('os-', '')}` : currentData.id?.slice(0, 8)}</div>
                    <div className={styles.topbarTitle}>{currentData.titre}</div>
                    <div className={styles.topbarMeta}>
                        {currentData.fournisseurNom} · Créé le {formatDate(currentData.dateCreation)}
                        <span className={clsx(styles.badge, styles.badgeBlue)}>{getStatutLabel(currentData.statut)}</span>
                        {/* Badge dérivé de la facture liée (retour revue 0047) */}
                        {factureLiee && (
                            <span className={clsx(styles.badge, styles.badgeGreen)}>
                                Facturé{factureLiee.count > 1 ? ` ×${factureLiee.count}` : ''} · {formatMoney(factureLiee.montant)}
                            </span>
                        )}
                    </div>
                </div>
                <div className={styles.topbarActions}>
                    <button className={styles.btnGhost} onClick={() => setEditMode(!editMode)}>
                        <Pencil size={14} /> {editMode ? 'Annuler' : 'Modifier'}
                    </button>
                    <button className={styles.btnGhost}><Mail size={14} /> Email</button>
                    <button className={styles.btnGhost}><FileDown size={14} /> PDF</button>
                </div>
            </div>

            {/* ============ PIPELINE ZONE ============ */}
            <div className={styles.pipelineZone}>
                <div className={styles.pipelineBar}>
                    {PIPELINE_STEPS.map((step, index) => {
                        const isDone = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isClickable = !!pipelineToTransition[step];
                        const isSelected = selectedStatus === pipelineToTransition[step];

                        return (
                            <div key={step} style={{ display: 'contents' }}>
                                {index > 0 && <div className={clsx(styles.pipelineConnector, isDone && styles.connectorDone)} />}
                                <div
                                    className={clsx(
                                        styles.pipelineStage,
                                        isDone && styles.stageDone,
                                        isCurrent && styles.stageCurrent,
                                        isClickable && styles.stageClickable,
                                        isSelected && styles.stageSelected,
                                    )}
                                    onClick={() => isClickable && handleStageClick(step)}
                                >
                                    {PIPELINE_LABELS[step] || step}
                                    {isDone && <span className={clsx(styles.stageIcon, styles.stageIconDone)}>✓</span>}
                                    {isCurrent && <span className={styles.stageIcon}>●</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action Panel */}
                {panelOpen && selectedStatus && availableNext.length > 0 && (
                    <div className={styles.actionPanel}>
                        {/* Transition selector when multiple options */}
                        {availableNext.length > 1 ? (
                            <>
                                <div className={styles.sectionLabel}>Prochaine étape</div>
                                <div className={styles.transitionOptions}>
                                    {availableNext.map(status => {
                                        const label = PIPELINE_LABELS[status] || getStatutLabel(status);
                                        const isActive = selectedStatus === status;
                                        return (
                                            <button
                                                key={status}
                                                type="button"
                                                className={clsx(styles.transitionOption, isActive && styles.transitionOptionActive)}
                                                onClick={() => { setSelectedStatus(status); setCheckedItems(new Set()); setError(''); }}
                                            >
                                                <span className={clsx(styles.badge, styles.badgeBlue)}>{PIPELINE_LABELS[currentStatus] || getStatutLabel(currentStatus)}</span>
                                                <span className={styles.actionArrow}>→</span>
                                                <span className={clsx(styles.badge, isActive ? styles.badgeGreen : styles.badgeGray)}>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className={styles.actionHeader}>
                                <span className={clsx(styles.badge, styles.badgeBlue)}>{PIPELINE_LABELS[currentStatus] || getStatutLabel(currentStatus)}</span>
                                <span className={styles.actionArrow}>→</span>
                                <span className={clsx(styles.badge, styles.badgeGreen)}>{selectedLabel}</span>
                            </div>
                        )}
                        <div className={styles.divider} />

                        {checklistItems.length > 0 && (
                            <>
                                <div className={styles.sectionLabel}>Checklist avant validation</div>
                                <ul className={styles.checklist}>
                                    {checklistItems.map((item, i) => (
                                        <li key={i} className={styles.checklistItem}>
                                            <button type="button" className={clsx(styles.checkBox, checkedItems.has(i) && styles.checkBoxChecked)} onClick={() => toggleCheck(i)}>
                                                {checkedItems.has(i) ? '✓' : ''}
                                            </button>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className={styles.divider} />
                            </>
                        )}

                        {needsDate(selectedStatus) && (
                            <div className={styles.fieldsRow}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Date d&apos;intervention *</label>
                                    <input type="date" className={styles.fieldInput} value={dateProgrammee} onChange={e => setDateProgrammee(e.target.value)} onClick={e => (e.target as HTMLInputElement).showPicker?.()} />
                                </div>
                            </div>
                        )}
                        {needsRealisee(selectedStatus) && (
                            <div className={styles.fieldsRow}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Date de réalisation *</label>
                                    <input type="date" className={styles.fieldInput} value={dateRealisee} onChange={e => setDateRealisee(e.target.value)} onClick={e => (e.target as HTMLInputElement).showPicker?.()} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Montant final (€) *</label>
                                    <input type="number" step="0.01" className={styles.fieldInput} placeholder="0.00" value={montantFinal} onChange={e => setMontantFinal(e.target.value)} />
                                </div>
                            </div>
                        )}
                        {needsRefus(selectedStatus) && (
                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Raison du refus *</label>
                                <textarea className={styles.fieldInput} rows={2} placeholder="Indiquez la raison..." value={raisonRefus} onChange={e => setRaisonRefus(e.target.value)} style={{ resize: 'vertical', minHeight: 48 }} />
                            </div>
                        )}
                        {selectedStatus === 'CLOTURE' && (
                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Note de clôture</label>
                                <textarea className={styles.fieldInput} rows={2} placeholder="Observations finales..." value={noteCloture} onChange={e => setNoteCloture(e.target.value)} style={{ resize: 'vertical', minHeight: 48 }} />
                            </div>
                        )}

                        <div className={styles.commentBox}>
                            <label className={styles.fieldLabel}>Note interne</label>
                            <textarea placeholder="Commentaire visible dans l'historique..." value={commentaire} onChange={e => setCommentaire(e.target.value)} />
                        </div>

                        {error && <div className={styles.error}><AlertCircle size={14} /> {error}</div>}

                        <div className={styles.actionFooter}>
                            {currentStatus !== 'CLOTURE' && currentStatus !== 'ANNULE' && (
                                <button type="button" className={styles.btnDanger} onClick={handleCancelOS} disabled={isProcessing}><Ban size={12} /> Annuler cet OS</button>
                            )}
                            <div className={styles.actionFooterRight}>
                                <button type="button" className={styles.btnCancel} onClick={() => setPanelOpen(false)}>Réduire</button>
                                <button type="button" className={styles.btnPrimary} onClick={handleConfirm} disabled={isProcessing}>
                                    {isProcessing ? <><Loader size={14} className={styles.spinner} /> Traitement...</> : <><CheckCircle size={14} /> Valider → {selectedLabel}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ============ CONTENT GRID ============ */}
            <div className={styles.contentGrid}>
                {/* LEFT COLUMN */}
                <div className={styles.column}>
                    {/* Infos */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>Informations</div>
                        <div className={styles.infoGrid}>
                            <div>
                                <div className={styles.infoLabel}>Prestataire</div>
                                <div className={styles.infoValue}>{currentData.fournisseurNom || '—'}</div>
                            </div>
                            <div>
                                <div className={styles.infoLabel}>Type</div>
                                <div className={styles.infoValue}>{currentData.typeOrdre === 'CONTRACTUEL' ? 'Contractuel' : 'Classique'}</div>
                            </div>
                            <div>
                                <div className={styles.infoLabel}>Montant estimé</div>
                                <div className={clsx(styles.infoValue, styles.infoMoney)}>{formatMoney(currentData.montantEstime)}</div>
                            </div>
                            <div>
                                <div className={styles.infoLabel}>Montant final</div>
                                <div className={clsx(styles.infoValue, styles.infoMoney)}>{formatMoney(currentData.montantFinal)}</div>
                            </div>
                        </div>
                        <div className={styles.infoLabel}>Description</div>
                        {editMode ? (
                            <textarea className={styles.fieldInput} rows={3} value={editedData.description ?? currentData.description} onChange={e => handleDescriptionChange(e.target.value)} style={{ resize: 'vertical', marginTop: 4 }} />
                        ) : (
                            <p className={styles.description}>{currentData.description || 'Aucune description'}</p>
                        )}
                        {editMode && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                                <button className={styles.btnCancel} onClick={handleCancelEdit}>Annuler</button>
                                <button className={styles.btnPrimary} onClick={handleSaveEdit}><CheckCircle size={14} /> Enregistrer</button>
                            </div>
                        )}
                    </div>

                    {/* Documents (tabs) */}
                    <div className={styles.card}>
                        <div className={styles.cardTabs}>
                            <button className={clsx(styles.cardTab, activeTab === 'pj' && styles.cardTabActive)} onClick={() => setActiveTab('pj')}>
                                Pièces jointes <span className={styles.tabCount}>{currentData.piecesJointes?.length || 0}</span>
                            </button>
                            <button className={clsx(styles.cardTab, activeTab === 'email' && styles.cardTabActive)} onClick={() => setActiveTab('email')}>
                                Email envoyé
                            </button>
                        </div>
                        {activeTab === 'pj' && (
                            <div>
                                <div className={styles.docList}>
                                    {(currentData.piecesJointes || []).length === 0 ? (
                                        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Aucune pièce jointe</p>
                                    ) : (
                                        currentData.piecesJointes.map(pj => (
                                            <div
                                                key={pj.id}
                                                className={styles.docItem}
                                                onClick={() => setViewingDoc({
                                                    id: pj.id,
                                                    nom: pj.nom,
                                                    type: pj.type,
                                                    categorie: 'ordre_service',
                                                    dateAjout: pj.dateAjout,
                                                    taille: pj.taille,
                                                    filePath: pj.url,
                                                })}
                                            >
                                                {pj.type === 'IMAGE' ? '📷' : pj.type === 'PDF' ? '📄' : <Paperclip size={14} />}
                                                <span className={styles.docName}>{pj.nom}</span>
                                                <span className={styles.docSize}>{pj.taille || ''}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <label className={styles.uploadBtn}>
                                    <input
                                        type="file"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const files = e.target.files;
                                            if (files && files.length > 0) {
                                                await handleUploadPJ(Array.from(files));
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    + Ajouter un document
                                </label>
                            </div>
                        )}
                        {activeTab === 'email' && (
                            <div className={styles.emailPreview}>
                                <div className={styles.emailSubject}>Objet : {currentData.emailObjet || '—'}</div>
                                <div className={styles.emailBody}>{currentData.emailCorps || 'Aucun email'}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className={styles.column}>
                    {/* Timeline */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>Historique</div>
                        <div className={styles.timeline}>
                            {[...currentData.historique].reverse().map((entry, i) => {
                                const isExpanded = expandedEntry === (entry.id || `e-${i}`);
                                const entryKey = entry.id || `e-${i}`;
                                const hasDetails = true; // Toutes les entrées sont dépliables

                                return (
                                    <div key={entryKey}>
                                        <div
                                            className={clsx(styles.timelineItem, hasDetails && styles.timelineItemClickable, isExpanded && styles.timelineItemExpanded)}
                                            onClick={() => hasDetails && setExpandedEntry(isExpanded ? null : entryKey)}
                                        >
                                            <div className={styles.timelineDotCol}>
                                                <div className={clsx(styles.timelineDot, i === 0 ? styles.timelineDotBlue : styles.timelineDotGreen)} />
                                                {i < currentData.historique.length - 1 && <div className={styles.timelineLine} />}
                                            </div>
                                            <div className={styles.timelineContent}>
                                                <div className={styles.timelineAction}>
                                                    {entry.action}
                                                    {entry.nouvelleValeur && (
                                                        <span className={clsx(styles.badge, styles.badgeGreen, styles.timelineBadge)}>{entry.nouvelleValeur}</span>
                                                    )}
                                                    {hasDetails && (
                                                        <span className={styles.timelineChevron}>{isExpanded ? '▾' : '▸'}</span>
                                                    )}
                                                </div>
                                                <div className={styles.timelineMeta}>
                                                    {formatDateTime(entry.date)} · {entry.auteur}
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className={styles.timelineDetails}>
                                                <div className={styles.timelineDetailsGrid}>
                                                    {entry.ancienneValeur && (
                                                        <div className={styles.timelineDetailItem}>
                                                            <span className={styles.timelineDetailLabel}>Ancien statut</span>
                                                            <span className={clsx(styles.badge, styles.badgeGray)}>{entry.ancienneValeur}</span>
                                                        </div>
                                                    )}
                                                    {entry.nouvelleValeur && (
                                                        <div className={styles.timelineDetailItem}>
                                                            <span className={styles.timelineDetailLabel}>Nouveau statut</span>
                                                            <span className={clsx(styles.badge, styles.badgeGreen)}>{entry.nouvelleValeur}</span>
                                                        </div>
                                                    )}
                                                    <div className={styles.timelineDetailItem}>
                                                        <span className={styles.timelineDetailLabel}>Date</span>
                                                        <span className={styles.timelineDetailValue}>{formatDateTime(entry.date)}</span>
                                                    </div>
                                                    <div className={styles.timelineDetailItem}>
                                                        <span className={styles.timelineDetailLabel}>Par</span>
                                                        <span className={styles.timelineDetailValue}>{entry.auteur}</span>
                                                    </div>
                                                </div>
                                                {entry.action && !entry.action.startsWith('Statut changé') && !entry.action.startsWith('Changement de statut') && (
                                                    <div className={styles.timelineDetailComment}>
                                                        <span className={styles.timelineDetailLabel}>Note</span>
                                                        <p>{entry.action}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {currentData.historique.length === 0 && (
                                <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Aucun historique</p>
                            )}
                        </div>
                    </div>

                    {/* Facture (contextual) */}
                    {factureLiee && (
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>Facture liée</div>
                            <div className={styles.factureInline}>
                                <span style={{ fontSize: 20 }}>🧾</span>
                                <div className={styles.factureInfo}>
                                    <div className={styles.factureNumber}>{factureLiee.reference || factureLiee.id}</div>
                                    <div className={styles.factureMeta}>{currentData.fournisseurNom}</div>
                                </div>
                                <div className={styles.factureAmount}>{formatMoney(factureLiee.montant)}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {viewingDoc && (
                <DocumentViewerModal
                    document={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                />
            )}
        </div>
    );
}

/**
 * Service de génération de Procès-Verbal (PV) avec jobs asynchrones
 *
 * Ce service gère :
 * - La génération idempotente du PV (pas de doublons)
 * - Le suivi de progression en temps réel
 * - L'archivage automatique dans la GED
 * - Les notifications aux copropriétaires
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type PVJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type PVDocumentStatus = 'draft' | 'generated' | 'ready_to_sign' | 'signing' | 'signed' | 'archived' | 'sent';

export interface PVJobProgress {
    step: string;
    stepNumber: number;
    totalSteps: number;
    percentage: number;
    message: string;
}

export interface PVJob {
    id: string;
    agId: string;
    status: PVJobStatus;
    progress: PVJobProgress;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    pvDocumentId?: string;
    retryCount: number;
    maxRetries: number;
}

export interface PVDocument {
    id: string;
    agId: string;
    status: PVDocumentStatus;
    version: number;
    pdfBlob?: Blob;
    pdfUrl?: string;
    generatedAt?: Date;
    signedAt?: Date;
    archivedAt?: Date;
    sentAt?: Date;
    gedDocumentId?: string;
    checksum?: string;
    metadata: {
        resolutionsCount: number;
        participantsCount: number;
        adoptedCount: number;
        rejectedCount: number;
    };
}

export interface AGDataForPV {
    id: string;
    type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
    date: string;
    heure: string;
    lieu: string;
    adresse: string;
    copropriete?: {
        nom: string;
        adresse: string;
        siret?: string;
    };
}

export interface ResolutionForPV {
    id: string;
    numero: number;
    titre: string;
    texte: string;
    majorite: string;
    resultat?: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
    votes: {
        pour: number;
        contre: number;
        abstention: number;
        total: number;
    };
    passerelle?: {
        type: string;
        voteInitial: { pour: number; contre: number; abstention: number };
        secondVote?: { pour: number; contre: number; abstention: number };
        mentionPV?: string;
    };
}

export interface ParticipantForPV {
    id: string;
    nom: string;
    lot?: string;
    tantiemes: number;
    mode: 'present' | 'represente' | 'correspondance' | 'absent';
    mandataire?: string;
}

export interface SignataireForPV {
    id: string;
    role: 'president' | 'secretaire' | 'scrutateur';
    roleLabel: string;
    nom: string;
    prenom: string;
    signature?: string;
    signedAt?: Date;
}

export interface GeneratePVOptions {
    agId: string;
    agData: AGDataForPV;
    resolutions: ResolutionForPV[];
    participants: ParticipantForPV[];
    signataires: SignataireForPV[];
    variables?: Record<string, string>;
    forceRegenerate?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// STORAGE (localStorage pour le moment, Supabase plus tard)
// ═══════════════════════════════════════════════════════════════

const JOBS_STORAGE_KEY = 'pv-generation-jobs';
const DOCUMENTS_STORAGE_KEY = 'pv-documents';

function getJobs(): Record<string, PVJob> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveJobs(jobs: Record<string, PVJob>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

function getDocuments(): Record<string, PVDocument> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveDocuments(docs: Record<string, PVDocument>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
}

// ═══════════════════════════════════════════════════════════════
// JOB MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Génère un ID unique pour un job
 */
function generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Génère un ID unique pour un document PV
 */
function generateDocumentId(agId: string): string {
    return `pv-${agId}-${Date.now()}`;
}

/**
 * Crée un nouveau job de génération PV
 */
export function createPVJob(agId: string): PVJob {
    const jobs = getJobs();

    // Vérifier s'il y a déjà un job en cours pour cette AG (idempotence)
    const existingJob = Object.values(jobs).find(
        j => j.agId === agId && (j.status === 'queued' || j.status === 'running')
    );

    if (existingJob) {
        console.log('[PVGeneration] Job existant trouvé:', existingJob.id);
        return existingJob;
    }

    const job: PVJob = {
        id: generateJobId(),
        agId,
        status: 'queued',
        progress: {
            step: 'Initialisation',
            stepNumber: 0,
            totalSteps: 5,
            percentage: 0,
            message: 'En attente de démarrage...',
        },
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
    };

    jobs[job.id] = job;
    saveJobs(jobs);

    console.log('[PVGeneration] Nouveau job créé:', job.id);
    return job;
}

/**
 * Met à jour le statut d'un job
 */
export function updateJobProgress(
    jobId: string,
    updates: Partial<PVJob>
): PVJob | null {
    const jobs = getJobs();
    const job = jobs[jobId];

    if (!job) return null;

    const updatedJob = { ...job, ...updates };
    jobs[jobId] = updatedJob;
    saveJobs(jobs);

    return updatedJob;
}

/**
 * Récupère un job par son ID
 */
export function getJob(jobId: string): PVJob | null {
    const jobs = getJobs();
    return jobs[jobId] || null;
}

/**
 * Récupère le dernier job pour une AG
 */
export function getLatestJobForAG(agId: string): PVJob | null {
    const jobs = getJobs();
    const agJobs = Object.values(jobs)
        .filter(j => j.agId === agId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return agJobs[0] || null;
}

/**
 * Récupère un document PV par son ID
 */
export function getPVDocument(documentId: string): PVDocument | null {
    const docs = getDocuments();
    return docs[documentId] || null;
}

/**
 * Récupère le document PV pour une AG
 */
export function getPVDocumentForAG(agId: string): PVDocument | null {
    const docs = getDocuments();
    return Object.values(docs).find(d => d.agId === agId) || null;
}

// ═══════════════════════════════════════════════════════════════
// PDF GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Étapes de génération avec leur poids
 */
const GENERATION_STEPS = [
    { name: 'Préparation des données', weight: 10 },
    { name: 'Génération de l\'en-tête', weight: 15 },
    { name: 'Génération de la feuille de présence', weight: 20 },
    { name: 'Génération des résolutions et votes', weight: 35 },
    { name: 'Génération des signatures', weight: 10 },
    { name: 'Finalisation et archivage', weight: 10 },
];

/**
 * Génère le PDF du procès-verbal
 */
async function generatePDF(
    options: GeneratePVOptions,
    onProgress: (progress: PVJobProgress) => void
): Promise<Blob> {
    const { agData, resolutions, participants, signataires, variables = {} } = options;

    // Simuler un délai pour chaque étape (plus réaliste)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Étape 1: Préparation des données
    onProgress({
        step: GENERATION_STEPS[0].name,
        stepNumber: 1,
        totalSteps: GENERATION_STEPS.length,
        percentage: 10,
        message: 'Collecte des données de l\'AG...',
    });
    await delay(200);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Fonction helper pour remplacer les variables
    const replaceVars = (text: string): string => {
        if (!text) return '';
        return text.replace(/\{([^}]+)\}/g, (_, varName) => {
            return variables[varName] || `[${varName}]`;
        });
    };

    // Étape 2: En-tête
    onProgress({
        step: GENERATION_STEPS[1].name,
        stepNumber: 2,
        totalSteps: GENERATION_STEPS.length,
        percentage: 25,
        message: 'Génération de l\'en-tête du document...',
    });
    await delay(150);

    // En-tête
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PROCÈS-VERBAL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(14);
    doc.text(`ASSEMBLÉE GÉNÉRALE ${agData.type}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Informations de l'AG
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const dateFormatted = new Date(agData.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    doc.text(`Date : ${dateFormatted}`, margin, yPos);
    yPos += 6;
    doc.text(`Heure : ${agData.heure || 'Non précisée'}`, margin, yPos);
    yPos += 6;
    doc.text(`Lieu : ${agData.lieu || 'Non précisé'}`, margin, yPos);
    yPos += 6;
    if (agData.adresse) {
        doc.text(`Adresse : ${agData.adresse}`, margin, yPos);
        yPos += 10;
    }

    // Étape 3: Feuille de présence
    onProgress({
        step: GENERATION_STEPS[2].name,
        stepNumber: 3,
        totalSteps: GENERATION_STEPS.length,
        percentage: 45,
        message: 'Génération de la feuille de présence...',
    });
    await delay(300);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRÉSENCES ET REPRÉSENTATIONS', margin, yPos);
    yPos += 8;

    const presentsData = participants
        .filter(p => p.mode === 'present' || p.mode === 'represente' || p.mode === 'correspondance')
        .map(p => {
            let statut = 'Présent';
            if (p.mode === 'represente') statut = `Représenté par ${p.mandataire || 'N/A'}`;
            if (p.mode === 'correspondance') statut = 'Vote par correspondance';
            return [p.nom, p.lot || '-', `${p.tantiemes}`, statut];
        });

    if (presentsData.length > 0) {
        (doc as any).autoTable({
            startY: yPos,
            head: [['Copropriétaire', 'Lot', 'Tantièmes', 'Statut']],
            body: presentsData,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [16, 185, 129] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Calcul des totaux
    const totalTantiemes = participants.reduce((sum, p) => sum + p.tantiemes, 0);
    const tantiemesPresents = participants
        .filter(p => p.mode !== 'absent')
        .reduce((sum, p) => sum + p.tantiemes, 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total des tantièmes représentés : ${tantiemesPresents} / ${totalTantiemes} (${((tantiemesPresents / totalTantiemes) * 100).toFixed(1)}%)`, margin, yPos);
    yPos += 15;

    // Étape 4: Résolutions
    onProgress({
        step: GENERATION_STEPS[3].name,
        stepNumber: 4,
        totalSteps: GENERATION_STEPS.length,
        percentage: 80,
        message: 'Génération des résolutions et résultats de votes...',
    });
    await delay(400);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉSOLUTIONS VOTÉES', margin, yPos);
    yPos += 10;

    for (const resolution of resolutions) {
        // Vérifier si on a besoin d'une nouvelle page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        // Numéro et titre
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Résolution ${resolution.numero} : ${resolution.titre}`, margin, yPos);
        yPos += 6;

        // Majorité requise
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(`Majorité requise : ${resolution.majorite}`, margin, yPos);
        yPos += 6;

        // Texte de la résolution
        doc.setFont('helvetica', 'normal');
        const resolutionText = replaceVars(resolution.texte);
        const splitText = doc.splitTextToSize(resolutionText, pageWidth - 2 * margin);
        doc.text(splitText, margin, yPos);
        yPos += splitText.length * 5 + 5;

        // Résultats du vote
        if (resolution.passerelle) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Vote initial (Article 25) :', margin, yPos);
            yPos += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Pour: ${resolution.passerelle.voteInitial.pour} t. | Contre: ${resolution.passerelle.voteInitial.contre} t. | Abstention: ${resolution.passerelle.voteInitial.abstention} t.`,
                margin + 5,
                yPos
            );
            yPos += 5;

            if (resolution.passerelle.secondVote) {
                doc.setFont('helvetica', 'bold');
                doc.text('Second vote (Article 24) :', margin, yPos);
                yPos += 5;
                doc.setFont('helvetica', 'normal');
                doc.text(
                    `Pour: ${resolution.passerelle.secondVote.pour} t. | Contre: ${resolution.passerelle.secondVote.contre} t. | Abstention: ${resolution.passerelle.secondVote.abstention} t.`,
                    margin + 5,
                    yPos
                );
                yPos += 5;
            }

            if (resolution.passerelle.mentionPV) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                const mentionText = doc.splitTextToSize(resolution.passerelle.mentionPV, pageWidth - 2 * margin);
                doc.text(mentionText, margin, yPos);
                yPos += mentionText.length * 4 + 3;
            }
        } else {
            doc.setFontSize(9);
            doc.text(
                `Pour: ${resolution.votes.pour} t. | Contre: ${resolution.votes.contre} t. | Abstention: ${resolution.votes.abstention} t.`,
                margin,
                yPos
            );
            yPos += 5;
        }

        // Statut
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const isAdopted = resolution.resultat === 'ADOPTEE';
        const status = resolution.resultat || (isAdopted ? 'ADOPTÉE' : 'REJETÉE');
        doc.setTextColor(isAdopted ? 16 : 220, isAdopted ? 185 : 38, isAdopted ? 129 : 38);
        doc.text(`Résolution ${status}`, margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 12;
    }

    // Étape 5: Signatures
    onProgress({
        step: GENERATION_STEPS[4].name,
        stepNumber: 5,
        totalSteps: GENERATION_STEPS.length,
        percentage: 90,
        message: 'Génération de la section signatures...',
    });
    await delay(200);

    if (yPos > 220) {
        doc.addPage();
        yPos = 20;
    }

    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURES', margin, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    for (const sig of signataires) {
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(sig.roleLabel, margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        const nomComplet = sig.prenom && sig.nom ? `${sig.prenom} ${sig.nom}` : '[À compléter]';
        doc.text(nomComplet, margin, yPos);
        yPos += 5;

        // Si signature disponible, l'ajouter
        if (sig.signature) {
            try {
                doc.addImage(sig.signature, 'PNG', margin, yPos, 60, 20);
                yPos += 25;
            } catch (e) {
                console.warn('Erreur ajout signature:', e);
                doc.line(margin, yPos + 10, margin + 80, yPos + 10);
                yPos += 20;
            }
        } else {
            doc.line(margin, yPos + 10, margin + 80, yPos + 10);
            yPos += 20;
        }
    }

    // Étape 6: Finalisation
    onProgress({
        step: GENERATION_STEPS[5].name,
        stepNumber: 6,
        totalSteps: GENERATION_STEPS.length,
        percentage: 100,
        message: 'Finalisation du document...',
    });
    await delay(100);

    // Retourner le blob
    return doc.output('blob');
}

// ═══════════════════════════════════════════════════════════════
// MAIN SERVICE
// ═══════════════════════════════════════════════════════════════

/**
 * Lance la génération du PV (démarre un job)
 */
export async function startPVGeneration(options: GeneratePVOptions): Promise<PVJob> {
    const { agId, forceRegenerate = false } = options;

    // Vérifier si un document existe déjà
    const existingDoc = getPVDocumentForAG(agId);
    if (existingDoc && !forceRegenerate) {
        console.log('[PVGeneration] Document existant trouvé, pas de regénération');
        // Retourner un job "succeeded" fictif
        return {
            id: `existing-${existingDoc.id}`,
            agId,
            status: 'succeeded',
            progress: {
                step: 'Document existant',
                stepNumber: 6,
                totalSteps: 6,
                percentage: 100,
                message: 'Document déjà généré',
            },
            createdAt: new Date(),
            completedAt: new Date(),
            pvDocumentId: existingDoc.id,
            retryCount: 0,
            maxRetries: 3,
        };
    }

    // Créer le job
    const job = createPVJob(agId);

    // Lancer la génération en arrière-plan
    runPVGeneration(job.id, options).catch(error => {
        console.error('[PVGeneration] Erreur lors de la génération:', error);
    });

    return job;
}

/**
 * Exécute la génération du PV
 */
async function runPVGeneration(jobId: string, options: GeneratePVOptions): Promise<void> {
    const { agId } = options;

    try {
        // Marquer le job comme en cours
        updateJobProgress(jobId, {
            status: 'running',
            startedAt: new Date(),
        });

        // Générer le PDF
        const pdfBlob = await generatePDF(options, (progress) => {
            updateJobProgress(jobId, { progress });
        });

        // Créer le document
        const documentId = generateDocumentId(agId);
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const document: PVDocument = {
            id: documentId,
            agId,
            status: 'generated',
            version: 1,
            pdfBlob,
            pdfUrl,
            generatedAt: new Date(),
            metadata: {
                resolutionsCount: options.resolutions.length,
                participantsCount: options.participants.filter(p => p.mode !== 'absent').length,
                adoptedCount: options.resolutions.filter(r => r.resultat === 'ADOPTEE').length,
                rejectedCount: options.resolutions.filter(r => r.resultat !== 'ADOPTEE').length,
            },
        };

        // Sauvegarder le document
        const docs = getDocuments();
        docs[documentId] = document;
        saveDocuments(docs);

        // Marquer le job comme terminé
        updateJobProgress(jobId, {
            status: 'succeeded',
            completedAt: new Date(),
            pvDocumentId: documentId,
            progress: {
                step: 'Terminé',
                stepNumber: 6,
                totalSteps: 6,
                percentage: 100,
                message: 'Procès-verbal généré avec succès',
            },
        });

        console.log('[PVGeneration] Génération terminée:', documentId);
    } catch (error) {
        console.error('[PVGeneration] Erreur:', error);

        const job = getJob(jobId);
        if (job && job.retryCount < job.maxRetries) {
            // Retry
            updateJobProgress(jobId, {
                status: 'queued',
                retryCount: job.retryCount + 1,
                error: undefined,
            });

            // Relancer après un délai
            setTimeout(() => {
                runPVGeneration(jobId, options);
            }, 2000 * (job.retryCount + 1));
        } else {
            // Échec définitif
            updateJobProgress(jobId, {
                status: 'failed',
                completedAt: new Date(),
                error: error instanceof Error ? error.message : 'Erreur inconnue',
            });
        }
    }
}

/**
 * Télécharge le PDF d'un document
 */
export function downloadPVDocument(documentId: string): void {
    const doc = getPVDocument(documentId);
    if (!doc || !doc.pdfUrl) {
        console.error('[PVGeneration] Document non trouvé:', documentId);
        return;
    }

    const link = document.createElement('a');
    link.href = doc.pdfUrl;
    link.download = `PV_AG_${doc.agId}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Met à jour le statut d'un document PV
 */
export function updatePVDocumentStatus(
    documentId: string,
    status: PVDocumentStatus,
    additionalData?: Partial<PVDocument>
): PVDocument | null {
    const docs = getDocuments();
    const doc = docs[documentId];

    if (!doc) return null;

    const updatedDoc = {
        ...doc,
        ...additionalData,
        status,
    };

    docs[documentId] = updatedDoc;
    saveDocuments(docs);

    return updatedDoc;
}

/**
 * Archive le PV dans la GED
 */
export async function archivePVToGED(documentId: string): Promise<string | null> {
    const doc = getPVDocument(documentId);
    if (!doc) return null;

    // TODO: Intégrer avec le vrai service GED
    // Pour l'instant, simuler l'archivage
    const gedDocumentId = `ged-pv-${documentId}-${Date.now()}`;

    updatePVDocumentStatus(documentId, 'archived', {
        archivedAt: new Date(),
        gedDocumentId,
    });

    console.log('[PVGeneration] Document archivé dans la GED:', gedDocumentId);
    return gedDocumentId;
}

/**
 * Envoie le PV aux copropriétaires
 */
export async function sendPVToCoproprietaires(
    documentId: string,
    recipientIds: string[],
    options: { sendEmail: boolean; attachPdf: boolean } = { sendEmail: true, attachPdf: true }
): Promise<{ sent: number; errors: string[] }> {
    const doc = getPVDocument(documentId);
    if (!doc) {
        return { sent: 0, errors: ['Document non trouvé'] };
    }

    // TODO: Intégrer avec le vrai service d'email
    // Pour l'instant, simuler l'envoi
    console.log('[PVGeneration] Envoi du PV à', recipientIds.length, 'copropriétaires');

    updatePVDocumentStatus(documentId, 'sent', {
        sentAt: new Date(),
    });

    return { sent: recipientIds.length, errors: [] };
}

// Export du service
export const pvGenerationService = {
    createJob: createPVJob,
    getJob,
    getLatestJobForAG,
    startGeneration: startPVGeneration,
    getDocument: getPVDocument,
    getDocumentForAG: getPVDocumentForAG,
    downloadDocument: downloadPVDocument,
    updateDocumentStatus: updatePVDocumentStatus,
    archiveToGED: archivePVToGED,
    sendToCoproprietaires: sendPVToCoproprietaires,
};

export default pvGenerationService;

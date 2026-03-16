/**
 * Service de génération de Procès-Verbal (PV) avec jobs asynchrones
 * VERSION SUPABASE - Upload vers Storage + Documents table
 *
 * Ce service gère :
 * - La génération idempotente du PV (pas de doublons)
 * - Le suivi de progression en temps réel (via state local)
 * - L'archivage automatique dans la GED (Supabase Storage + documents table)
 * - Les notifications aux copropriétaires
 */

import { createClient } from '@/lib/supabase/client';
import * as documentsApi from '@/lib/documents/api';
import { generatePVPDF } from '@/lib/pdf/generatePVPDF';

// Constantes pour cleanup legacy localStorage (one-shot en dev)
const LEGACY_JOBS_KEY = 'pv-generation-jobs';
const LEGACY_DOCUMENTS_KEY = 'pv-documents';

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
    coproId: string;
    status: PVDocumentStatus;
    version: number;
    pdfBlob?: Blob;
    pdfUrl?: string;
    filePath?: string; // Supabase storage path
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
        id: string;
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
    coproId: string;
    agData: AGDataForPV;
    resolutions: ResolutionForPV[];
    participants: ParticipantForPV[];
    signataires: SignataireForPV[];
    variables?: Record<string, string>;
    forceRegenerate?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY STATE (pour tracking des jobs en cours)
// ═══════════════════════════════════════════════════════════════

// Jobs en mémoire (pour le suivi temps réel pendant la session)
const activeJobs = new Map<string, PVJob>();
const activeDocuments = new Map<string, PVDocument>();

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let initialized = false;

function initService(): void {
    if (initialized) return;
    initialized = true;

    // Cleanup legacy localStorage (one-shot)
    if (typeof window !== 'undefined') {
        [LEGACY_JOBS_KEY, LEGACY_DOCUMENTS_KEY].forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                // Legacy localStorage cleanup
                localStorage.removeItem(key);
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// JOB MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateDocumentId(agId: string): string {
    return `pv-${agId}-${Date.now()}`;
}

/**
 * Crée un nouveau job de génération PV
 */
export function createPVJob(agId: string): PVJob {
    initService();

    // Vérifier s'il y a déjà un job en cours pour cette AG (idempotence)
    for (const job of activeJobs.values()) {
        if (job.agId === agId && (job.status === 'queued' || job.status === 'running')) {
            // Job existant trouvé
            return job;
        }
    }

    const job: PVJob = {
        id: generateJobId(),
        agId,
        status: 'queued',
        progress: {
            step: 'Initialisation',
            stepNumber: 0,
            totalSteps: 6,
            percentage: 0,
            message: 'En attente de démarrage...',
        },
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
    };

    activeJobs.set(job.id, job);
    // Nouveau job créé
    return job;
}

/**
 * Met à jour le statut d'un job
 */
export function updateJobProgress(
    jobId: string,
    updates: Partial<PVJob>
): PVJob | null {
    const job = activeJobs.get(jobId);
    if (!job) return null;

    const updatedJob = { ...job, ...updates };
    activeJobs.set(jobId, updatedJob);
    return updatedJob;
}

/**
 * Récupère un job par son ID
 */
export function getJob(jobId: string): PVJob | null {
    initService();
    return activeJobs.get(jobId) || null;
}

/**
 * Récupère le dernier job pour une AG
 */
export function getLatestJobForAG(agId: string): PVJob | null {
    initService();
    const agJobs = Array.from(activeJobs.values())
        .filter(j => j.agId === agId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return agJobs[0] || null;
}

/**
 * Récupère un document PV par son ID (d'abord mémoire, puis Supabase)
 */
export async function getPVDocument(documentId: string): Promise<PVDocument | null> {
    initService();

    // Vérifier d'abord en mémoire
    const memDoc = activeDocuments.get(documentId);
    if (memDoc) return memDoc;

    // Sinon chercher dans Supabase via documents table
    try {
        const doc = await documentsApi.getDocumentById(documentId);
        if (doc && doc.category === 'pv_ag') {
            return {
                id: doc.id,
                agId: doc.ag_id || '',
                coproId: doc.copro_id,
                status: 'archived',
                version: doc.version,
                filePath: doc.file_path,
                generatedAt: new Date(doc.created_at),
                gedDocumentId: doc.id,
                metadata: {
                    resolutionsCount: 0,
                    participantsCount: 0,
                    adoptedCount: 0,
                    rejectedCount: 0,
                },
            };
        }
    } catch (error) {
        console.error('[PVGeneration] Erreur getPVDocument:', error);
    }

    return null;
}

/**
 * Récupère le document PV pour une AG (d'abord mémoire, puis Supabase)
 */
export async function getPVDocumentForAG(agId: string, coproId: string): Promise<PVDocument | null> {
    initService();

    // Vérifier d'abord en mémoire
    for (const doc of activeDocuments.values()) {
        if (doc.agId === agId) return doc;
    }

    // Sinon chercher dans Supabase via documents table
    try {
        const supabase = createClient() as ReturnType<typeof createClient>;
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('copro_id', coproId)
            .eq('ag_id', agId)
            .eq('category', 'pv_ag')
            .eq('is_current_version', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[PVGeneration] Erreur recherche PV:', error);
        }

        if (data) {
            return {
                id: data.id,
                agId: data.ag_id || agId,
                coproId: data.copro_id,
                status: 'archived',
                version: data.version ?? 1,
                filePath: data.file_path,
                generatedAt: new Date(data.created_at),
                gedDocumentId: data.id,
                metadata: {
                    resolutionsCount: 0,
                    participantsCount: 0,
                    adoptedCount: 0,
                    rejectedCount: 0,
                },
            };
        }
    } catch (error) {
        console.error('[PVGeneration] Erreur getPVDocumentForAG:', error);
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// PDF GENERATION
// ═══════════════════════════════════════════════════════════════

const GENERATION_STEPS = [
    { name: 'Préparation des données', weight: 10 },
    { name: 'Génération du document', weight: 70 },
    { name: 'Finalisation et archivage', weight: 20 },
];

async function generatePDF(
    options: GeneratePVOptions,
    onProgress: (progress: PVJobProgress) => void
): Promise<Blob> {
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

    // Étape 2: Génération du PDF avec le nouveau design
    onProgress({
        step: GENERATION_STEPS[1].name,
        stepNumber: 2,
        totalSteps: GENERATION_STEPS.length,
        percentage: 50,
        message: 'Génération du document PDF...',
    });

    const pdfDoc = generatePVPDF({
        agData: options.agData,
        resolutions: options.resolutions,
        participants: options.participants,
        signataires: options.signataires,
        variables: options.variables,
    });

    await delay(150);

    // Étape 3: Finalisation
    onProgress({
        step: GENERATION_STEPS[2].name,
        stepNumber: 3,
        totalSteps: GENERATION_STEPS.length,
        percentage: 100,
        message: 'Finalisation du document...',
    });
    await delay(100);

    return pdfDoc.output('blob');
}

// ═══════════════════════════════════════════════════════════════
// MAIN SERVICE
// ═══════════════════════════════════════════════════════════════

/**
 * Lance la génération du PV (démarre un job)
 */
export async function startPVGeneration(options: GeneratePVOptions): Promise<PVJob> {
    initService();
    const { agId, coproId, forceRegenerate = false } = options;

    // Vérifier si un document existe déjà
    const existingDoc = await getPVDocumentForAG(agId, coproId);
    if (existingDoc && !forceRegenerate) {
        // Document existant trouvé, pas de regénération
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
 * Exécute la génération du PV et upload vers Supabase
 */
async function runPVGeneration(jobId: string, options: GeneratePVOptions): Promise<void> {
    const { agId, coproId, agData } = options;

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

        // Générer le nom de fichier
        const dateStr = new Date(agData.date).toISOString().split('T')[0];
        const fileName = `PV_AG_${agData.type}_${dateStr}.pdf`;

        // Upload vers Supabase Storage
        const supabase = createClient();
        const year = new Date(agData.date).getFullYear();
        const storagePath = `ged/${coproId}/pv_ag/${year}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('ged')
            .upload(storagePath, pdfBlob, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (uploadError) {
            console.error('[PVGeneration] Erreur upload:', uploadError);
            throw uploadError;
        }

        // Créer l'entrée dans la table documents
        const doc = await documentsApi.createDocument({
            copro_id: coproId,
            ag_id: agId,
            file_name: fileName,
            file_path: storagePath,
            file_size: pdfBlob.size,
            mime_type: 'application/pdf',
            category: 'pv_ag',
            title: `Procès-Verbal AG ${agData.type} - ${dateStr}`,
            description: `PV de l'Assemblée Générale ${agData.type} du ${dateStr}`,
            tags: ['pv', 'ag', agData.type.toLowerCase()],
            confidentiality: 'public',
            source_module: 'ag',
            document_date: agData.date,
            year,
        });

        // Créer le document PV en mémoire
        const documentId = doc.id;
        const pvDocument: PVDocument = {
            id: documentId,
            agId,
            coproId,
            status: 'generated',
            version: 1,
            pdfBlob,
            filePath: storagePath,
            generatedAt: new Date(),
            gedDocumentId: doc.id,
            metadata: {
                resolutionsCount: options.resolutions.length,
                participantsCount: options.participants.filter(p => p.mode !== 'absent').length,
                adoptedCount: options.resolutions.filter(r => r.resultat === 'ADOPTEE').length,
                rejectedCount: options.resolutions.filter(r => r.resultat !== 'ADOPTEE').length,
            },
        };

        activeDocuments.set(documentId, pvDocument);

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

        // Génération terminée
    } catch (error) {
        console.error('[PVGeneration] Erreur:', error);

        const job = getJob(jobId);
        if (job && job.retryCount < job.maxRetries) {
            updateJobProgress(jobId, {
                status: 'queued',
                retryCount: job.retryCount + 1,
                error: undefined,
            });

            setTimeout(() => {
                runPVGeneration(jobId, options);
            }, 2000 * (job.retryCount + 1));
        } else {
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
export async function downloadPVDocument(documentId: string): Promise<void> {
    const pvDoc = await getPVDocument(documentId);
    if (!pvDoc) {
        console.error('[PVGeneration] Document non trouvé:', documentId);
        return;
    }

    let downloadUrl: string;

    // Si on a le blob en mémoire, l'utiliser
    if (pvDoc.pdfBlob) {
        downloadUrl = URL.createObjectURL(pvDoc.pdfBlob);
    } else if (pvDoc.filePath) {
        // Sinon récupérer depuis Supabase Storage
        downloadUrl = await documentsApi.getDocumentUrl(pvDoc.filePath);
    } else {
        console.error('[PVGeneration] Pas de fichier disponible');
        return;
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `PV_AG_${pvDoc.agId}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup blob URL si créé
    if (pvDoc.pdfBlob) {
        URL.revokeObjectURL(downloadUrl);
    }
}

/**
 * Met à jour le statut d'un document PV
 */
export async function updatePVDocumentStatus(
    documentId: string,
    status: PVDocumentStatus,
    additionalData?: Partial<PVDocument>
): Promise<PVDocument | null> {
    const doc = activeDocuments.get(documentId);
    if (!doc) return null;

    const updatedDoc = {
        ...doc,
        ...additionalData,
        status,
    };

    activeDocuments.set(documentId, updatedDoc);
    return updatedDoc;
}

/**
 * Archive le PV dans la GED (déjà fait lors de la génération)
 */
export async function archivePVToGED(documentId: string): Promise<string | null> {
    const doc = await getPVDocument(documentId);
    if (!doc) return null;

    // Si déjà archivé (gedDocumentId présent), retourner l'ID
    if (doc.gedDocumentId) {
        await updatePVDocumentStatus(documentId, 'archived', {
            archivedAt: new Date(),
        });
        return doc.gedDocumentId;
    }

    return null;
}

/**
 * Envoie le PV aux copropriétaires (stub - nécessite service email)
 */
export async function sendPVToCoproprietaires(
    documentId: string,
    recipientIds: string[],
    _options: { sendEmail: boolean; attachPdf: boolean } = { sendEmail: true, attachPdf: true }
): Promise<{ sent: number; errors: string[] }> {
    const doc = await getPVDocument(documentId);
    if (!doc) {
        return { sent: 0, errors: ['Document non trouvé'] };
    }

    // TODO: Intégrer avec le vrai service d'email
    // Envoi du PV aux copropriétaires

    await updatePVDocumentStatus(documentId, 'sent', {
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

/**
 * Service de distribution des Procès-Verbaux
 * VERSION SUPABASE - Utilise Documents API pour l'archivage GED
 *
 * Ce service gère :
 * - L'archivage automatique dans la GED (via documents API)
 * - L'envoi par email aux copropriétaires (stub)
 * - Le suivi des notifications
 * - Les options de configuration (envoi automatique, etc.)
 */

import * as documentsApi from '@/lib/documents/api';

// Constantes pour cleanup legacy localStorage (one-shot en dev)
const LEGACY_DISTRIBUTION_JOBS_KEY = 'pv-distribution-jobs';
const LEGACY_GED_DOCUMENTS_KEY = 'ged-pv-documents';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
export type NotificationChannel = 'email' | 'sms' | 'postal';

export interface GEDArchiveResult {
    success: boolean;
    documentId: string;
    gedCategoryId: string;
    gedPath: string;
    archivedAt: Date;
    error?: string;
}

export interface NotificationRecipient {
    id: string;
    coproprietaireId: string;
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    preferredChannel: NotificationChannel;
    status: NotificationStatus;
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
}

export interface DistributionJob {
    id: string;
    pvDocumentId: string;
    agId: string;
    coproId: string;
    type: 'archive' | 'notification' | 'full';
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: number;
    message: string;
    archiveResult?: GEDArchiveResult;
    notifications: NotificationRecipient[];
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    options: DistributionOptions;
}

export interface DistributionOptions {
    autoSendAfterArchive: boolean;
    includeAttachment: boolean;
    attachmentFormat: 'pdf' | 'link';
    emailSubject?: string;
    emailBody?: string;
    reminderDays?: number;
    excludedCoproprietaireIds?: string[];
}

export interface GEDCategory {
    id: string;
    name: string;
    path: string;
    parentId?: string;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY STATE
// ═══════════════════════════════════════════════════════════════

const activeDistributionJobs = new Map<string, DistributionJob>();

let initialized = false;

function initService(): void {
    if (initialized) return;
    initialized = true;

    // Cleanup legacy localStorage (one-shot)
    if (typeof window !== 'undefined') {
        [LEGACY_DISTRIBUTION_JOBS_KEY, LEGACY_GED_DOCUMENTS_KEY].forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                // Legacy localStorage cleanup
                localStorage.removeItem(key);
            }
        });
    }
}

function generateJobId(): string {
    return `dist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// GED CATEGORIES
// ═══════════════════════════════════════════════════════════════

const GED_PV_CATEGORY: GEDCategory = {
    id: 'cat-pv-ag',
    name: 'Procès-Verbaux AG',
    path: '/documents/ag/proces-verbaux',
};

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

class PVDistributionService {
    /**
     * Archive le PV dans la GED via l'API documents
     */
    async archiveToGED(
        pvDocumentId: string,
        agId: string,
        coproId: string,
        agData: { date: string; type: string },
        pdfBlob?: Blob
    ): Promise<GEDArchiveResult> {
        initService();
        // Archivage GED en cours

        try {
            // Générer le chemin dans la GED
            const year = new Date(agData.date).getFullYear();
            const dateStr = new Date(agData.date).toISOString().split('T')[0];

            // Si on a un blob PDF, l'uploader
            if (pdfBlob) {
                const fileName = `PV_AG_${agData.type}_${dateStr}.pdf`;
                const storagePath = `ged/${coproId}/pv_ag/${year}/${Date.now()}_${fileName}`;

                const doc = await documentsApi.uploadDocument(
                    new File([pdfBlob], fileName, { type: 'application/pdf' }),
                    coproId,
                    'pv_ag',
                    {
                        title: `Procès-Verbal AG ${agData.type} - ${dateStr}`,
                        description: `PV de l'Assemblée Générale ${agData.type} du ${dateStr}`,
                        tags: ['pv', 'ag', agData.type.toLowerCase(), 'archived'],
                    }
                );

                // Lier au AG
                await documentsApi.linkDocumentToEntity(doc.id, 'ag', agId, 'main');

                const result: GEDArchiveResult = {
                    success: true,
                    documentId: doc.id,
                    gedCategoryId: GED_PV_CATEGORY.id,
                    gedPath: storagePath,
                    archivedAt: new Date(),
                };

                // Document archivé
                return result;
            }

            // Si pas de blob, le document existe probablement déjà
            // Vérifier via l'ID fourni
            const existingDoc = await documentsApi.getDocumentById(pvDocumentId);
            if (existingDoc) {
                return {
                    success: true,
                    documentId: existingDoc.id,
                    gedCategoryId: GED_PV_CATEGORY.id,
                    gedPath: existingDoc.file_path,
                    archivedAt: new Date(),
                };
            }

            throw new Error('Document non trouvé et aucun fichier fourni');
        } catch (error) {
            console.error('[PVDistribution] Erreur archivage:', error);
            return {
                success: false,
                documentId: pvDocumentId,
                gedCategoryId: GED_PV_CATEGORY.id,
                gedPath: '',
                archivedAt: new Date(),
                error: error instanceof Error ? error.message : 'Erreur inconnue',
            };
        }
    }

    /**
     * Envoie le PV aux copropriétaires par email
     */
    async sendToCoproprietaires(
        pvDocumentId: string,
        agId: string,
        agData: { date: string; type: string },
        recipients: Array<{
            id: string;
            nom: string;
            email?: string;
            telephone?: string;
        }>,
        options: Partial<DistributionOptions> = {}
    ): Promise<{
        sent: number;
        failed: number;
        results: NotificationRecipient[];
    }> {
        initService();
        // Envoi aux copropriétaires

        const defaultOptions: DistributionOptions = {
            autoSendAfterArchive: true,
            includeAttachment: true,
            attachmentFormat: 'pdf',
            ...options,
        };

        const results: NotificationRecipient[] = [];
        let sent = 0;
        let failed = 0;

        // Filtrer les destinataires exclus
        const excludedIds = new Set(defaultOptions.excludedCoproprietaireIds || []);
        const filteredRecipients = recipients.filter(r => !excludedIds.has(r.id));

        for (const recipient of filteredRecipients) {
            const notification: NotificationRecipient = {
                id: `notif-${recipient.id}-${Date.now()}`,
                coproprietaireId: recipient.id,
                nom: recipient.nom,
                email: recipient.email,
                telephone: recipient.telephone,
                preferredChannel: recipient.email ? 'email' : 'postal',
                status: 'pending',
            };

            if (!recipient.email) {
                notification.status = 'failed';
                notification.error = 'Adresse email manquante';
                failed++;
            } else {
                // Simuler l'envoi d'email
                await new Promise(resolve => setTimeout(resolve, 100));

                // TODO: Appeler le vrai service d'email ici
                // await emailService.send({
                //     to: recipient.email,
                //     subject: defaultOptions.emailSubject || getDefaultEmailSubject(agData.date, agData.type),
                //     body: defaultOptions.emailBody || getDefaultEmailBody(recipient.nom, agData.date, agData.type, defaultOptions.includeAttachment),
                //     attachments: defaultOptions.includeAttachment ? [{ name: 'PV_AG.pdf', blob: pdfBlob }] : [],
                // });

                notification.status = 'sent';
                notification.sentAt = new Date();
                sent++;

                // Email envoyé
            }

            results.push(notification);
        }

        // Envoi terminé
        return { sent, failed, results };
    }

    /**
     * Lance un job de distribution complet (archivage + envoi)
     */
    async startDistributionJob(
        pvDocumentId: string,
        agId: string,
        coproId: string,
        agData: { date: string; type: string },
        recipients: Array<{
            id: string;
            nom: string;
            email?: string;
        }>,
        options: Partial<DistributionOptions> = {}
    ): Promise<DistributionJob> {
        initService();
        const jobId = generateJobId();

        const job: DistributionJob = {
            id: jobId,
            pvDocumentId,
            agId,
            coproId,
            type: 'full',
            status: 'queued',
            progress: 0,
            message: 'En attente de démarrage...',
            notifications: [],
            createdAt: new Date(),
            options: {
                autoSendAfterArchive: true,
                includeAttachment: true,
                attachmentFormat: 'pdf',
                ...options,
            },
        };

        activeDistributionJobs.set(jobId, job);

        // Lancer le job en arrière-plan
        this.runDistributionJob(jobId, agData, recipients).catch(error => {
            console.error('[PVDistribution] Erreur job:', error);
        });

        return job;
    }

    /**
     * Exécute le job de distribution
     */
    private async runDistributionJob(
        jobId: string,
        agData: { date: string; type: string },
        recipients: Array<{
            id: string;
            nom: string;
            email?: string;
        }>
    ): Promise<void> {
        const job = activeDistributionJobs.get(jobId);
        if (!job) return;

        try {
            // Démarrer
            job.status = 'running';
            job.startedAt = new Date();
            job.progress = 10;
            job.message = 'Archivage dans la GED...';
            activeDistributionJobs.set(jobId, { ...job });

            // Étape 1: Archivage GED
            const archiveResult = await this.archiveToGED(job.pvDocumentId, job.agId, job.coproId, agData);
            job.archiveResult = archiveResult;
            job.progress = 40;
            job.message = 'Document archivé, préparation des envois...';
            activeDistributionJobs.set(jobId, { ...job });

            // Étape 2: Envoi aux copropriétaires (si autoSend activé)
            if (job.options.autoSendAfterArchive) {
                job.progress = 50;
                job.message = 'Envoi des notifications...';
                activeDistributionJobs.set(jobId, { ...job });

                const sendResult = await this.sendToCoproprietaires(
                    job.pvDocumentId,
                    job.agId,
                    agData,
                    recipients,
                    job.options
                );

                job.notifications = sendResult.results;
                job.progress = 100;
                job.message = `Distribution terminée: ${sendResult.sent} envoyé(s), ${sendResult.failed} échec(s)`;
            } else {
                job.progress = 100;
                job.message = 'Archivage terminé (envoi manuel requis)';
            }

            job.status = 'completed';
            job.completedAt = new Date();
            activeDistributionJobs.set(jobId, { ...job });

            // Job terminé
        } catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : 'Erreur inconnue';
            job.completedAt = new Date();
            activeDistributionJobs.set(jobId, { ...job });

            console.error('[PVDistribution] Job échoué:', jobId, error);
        }
    }

    /**
     * Récupère un job par son ID
     */
    getJob(jobId: string): DistributionJob | null {
        initService();
        return activeDistributionJobs.get(jobId) || null;
    }

    /**
     * Récupère les jobs pour une AG
     */
    getJobsForAG(agId: string): DistributionJob[] {
        initService();
        return Array.from(activeDistributionJobs.values()).filter(j => j.agId === agId);
    }

    /**
     * Récupère l'historique GED pour une AG via documents API
     */
    async getGEDHistoryForAG(agId: string, _coproId: string): Promise<GEDArchiveResult[]> {
        initService();

        try {
            // Récupérer les documents liés à cette AG
            const documents = await documentsApi.getDocumentsForEntity('ag', agId);

            return documents
                .filter(d => d.category === 'pv_ag')
                .map(d => ({
                    success: true,
                    documentId: d.id,
                    gedCategoryId: GED_PV_CATEGORY.id,
                    gedPath: d.file_path,
                    archivedAt: new Date(d.created_at),
                }))
                .sort((a, b) => b.archivedAt.getTime() - a.archivedAt.getTime());
        } catch (error) {
            console.error('[PVDistribution] Erreur getGEDHistoryForAG:', error);
            return [];
        }
    }

    /**
     * Vérifie si le PV a déjà été archivé (via documents API)
     */
    async isAlreadyArchived(agId: string, _coproId: string): Promise<boolean> {
        try {
            const documents = await documentsApi.getDocumentsForEntity('ag', agId);
            return documents.some(d => d.category === 'pv_ag');
        } catch {
            // Vérifier en mémoire
            for (const job of activeDistributionJobs.values()) {
                if (job.agId === agId && job.archiveResult?.success) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Vérifie si le PV a déjà été envoyé
     */
    isAlreadySent(pvDocumentId: string): boolean {
        initService();
        for (const job of activeDistributionJobs.values()) {
            if (job.pvDocumentId === pvDocumentId && job.notifications.some(n => n.status === 'sent')) {
                return true;
            }
        }
        return false;
    }
}

// Export singleton
export const pvDistributionService = new PVDistributionService();
export default pvDistributionService;

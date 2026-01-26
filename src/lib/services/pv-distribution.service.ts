/**
 * Service de distribution des Procès-Verbaux
 *
 * Ce service gère :
 * - L'archivage automatique dans la GED (catégorie PV)
 * - L'envoi par email aux copropriétaires
 * - Le suivi des notifications
 * - Les options de configuration (envoi automatique, etc.)
 */

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
// STORAGE
// ═══════════════════════════════════════════════════════════════

const DISTRIBUTION_JOBS_KEY = 'pv-distribution-jobs';
const GED_DOCUMENTS_KEY = 'ged-pv-documents';

function getDistributionJobs(): Record<string, DistributionJob> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(DISTRIBUTION_JOBS_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveDistributionJobs(jobs: Record<string, DistributionJob>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DISTRIBUTION_JOBS_KEY, JSON.stringify(jobs));
}

function getGEDDocuments(): Record<string, GEDArchiveResult> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(GED_DOCUMENTS_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveGEDDocuments(docs: Record<string, GEDArchiveResult>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GED_DOCUMENTS_KEY, JSON.stringify(docs));
}

function generateJobId(): string {
    return `dist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// GED CATEGORIES (Mock - à remplacer par l'API réelle)
// ═══════════════════════════════════════════════════════════════

const GED_PV_CATEGORY: GEDCategory = {
    id: 'cat-pv-ag',
    name: 'Procès-Verbaux AG',
    path: '/documents/ag/proces-verbaux',
};

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function getDefaultEmailSubject(agDate: string, agType: string): string {
    const dateStr = new Date(agDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    return `Procès-verbal de l'Assemblée Générale ${agType} du ${dateStr}`;
}

function getDefaultEmailBody(coproprietaireName: string, agDate: string, agType: string, hasAttachment: boolean): string {
    const dateStr = new Date(agDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return `Madame, Monsieur ${coproprietaireName},

Vous trouverez ${hasAttachment ? 'ci-joint' : 'via le lien ci-dessous'} le procès-verbal de l'Assemblée Générale ${agType} qui s'est tenue le ${dateStr}.

Ce document récapitule l'ensemble des résolutions votées et leurs résultats.

Conformément à l'article 17 du décret du 17 mars 1967, ce procès-verbal vous est notifié dans un délai d'un mois à compter de la tenue de l'assemblée générale.

Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Le syndic`;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

class PVDistributionService {
    /**
     * Archive le PV dans la GED
     */
    async archiveToGED(
        pvDocumentId: string,
        agId: string,
        agData: { date: string; type: string },
        pdfBlob?: Blob
    ): Promise<GEDArchiveResult> {
        console.log('[PVDistribution] Archivage GED en cours...', pvDocumentId);

        // Simuler un délai d'archivage
        await new Promise(resolve => setTimeout(resolve, 500));

        // Générer le chemin dans la GED
        const year = new Date(agData.date).getFullYear();
        const dateStr = new Date(agData.date).toISOString().split('T')[0];
        const gedPath = `${GED_PV_CATEGORY.path}/${year}/PV_AG_${agData.type}_${dateStr}.pdf`;

        const result: GEDArchiveResult = {
            success: true,
            documentId: `ged-${pvDocumentId}-${Date.now()}`,
            gedCategoryId: GED_PV_CATEGORY.id,
            gedPath,
            archivedAt: new Date(),
        };

        // Sauvegarder dans le "GED" (localStorage pour l'instant)
        const gedDocs = getGEDDocuments();
        gedDocs[result.documentId] = result;
        saveGEDDocuments(gedDocs);

        console.log('[PVDistribution] Document archivé:', gedPath);
        return result;
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
        console.log('[PVDistribution] Envoi aux copropriétaires...', recipients.length);

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

                console.log('[PVDistribution] Email envoyé à:', recipient.email);
            }

            results.push(notification);
        }

        console.log('[PVDistribution] Envoi terminé:', { sent, failed });
        return { sent, failed, results };
    }

    /**
     * Lance un job de distribution complet (archivage + envoi)
     */
    async startDistributionJob(
        pvDocumentId: string,
        agId: string,
        agData: { date: string; type: string },
        recipients: Array<{
            id: string;
            nom: string;
            email?: string;
        }>,
        options: Partial<DistributionOptions> = {}
    ): Promise<DistributionJob> {
        const jobId = generateJobId();

        const job: DistributionJob = {
            id: jobId,
            pvDocumentId,
            agId,
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

        const jobs = getDistributionJobs();
        jobs[jobId] = job;
        saveDistributionJobs(jobs);

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
        const jobs = getDistributionJobs();
        const job = jobs[jobId];
        if (!job) return;

        try {
            // Démarrer
            job.status = 'running';
            job.startedAt = new Date();
            job.progress = 10;
            job.message = 'Archivage dans la GED...';
            saveDistributionJobs(jobs);

            // Étape 1: Archivage GED
            const archiveResult = await this.archiveToGED(job.pvDocumentId, job.agId, agData);
            job.archiveResult = archiveResult;
            job.progress = 40;
            job.message = 'Document archivé, préparation des envois...';
            saveDistributionJobs(jobs);

            // Étape 2: Envoi aux copropriétaires (si autoSend activé)
            if (job.options.autoSendAfterArchive) {
                job.progress = 50;
                job.message = 'Envoi des notifications...';
                saveDistributionJobs(jobs);

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
            saveDistributionJobs(jobs);

            console.log('[PVDistribution] Job terminé:', jobId);
        } catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : 'Erreur inconnue';
            job.completedAt = new Date();
            saveDistributionJobs(jobs);

            console.error('[PVDistribution] Job échoué:', jobId, error);
        }
    }

    /**
     * Récupère un job par son ID
     */
    getJob(jobId: string): DistributionJob | null {
        const jobs = getDistributionJobs();
        return jobs[jobId] || null;
    }

    /**
     * Récupère les jobs pour une AG
     */
    getJobsForAG(agId: string): DistributionJob[] {
        const jobs = getDistributionJobs();
        return Object.values(jobs).filter(j => j.agId === agId);
    }

    /**
     * Récupère l'historique GED pour une AG
     */
    getGEDHistoryForAG(agId: string): GEDArchiveResult[] {
        const jobs = getDistributionJobs();
        return Object.values(jobs)
            .filter(j => j.agId === agId && j.archiveResult)
            .map(j => j.archiveResult!)
            .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
    }

    /**
     * Vérifie si le PV a déjà été archivé
     */
    isAlreadyArchived(pvDocumentId: string): boolean {
        const jobs = getDistributionJobs();
        return Object.values(jobs).some(
            j => j.pvDocumentId === pvDocumentId && j.archiveResult?.success
        );
    }

    /**
     * Vérifie si le PV a déjà été envoyé
     */
    isAlreadySent(pvDocumentId: string): boolean {
        const jobs = getDistributionJobs();
        return Object.values(jobs).some(
            j => j.pvDocumentId === pvDocumentId && j.notifications.some(n => n.status === 'sent')
        );
    }
}

// Export singleton
export const pvDistributionService = new PVDistributionService();
export default pvDistributionService;

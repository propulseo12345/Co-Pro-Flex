/**
 * Service de signature électronique pour les Procès-Verbaux
 *
 * Architecture extensible pour supporter différents providers :
 * - Sur place (canvas signature)
 * - DocuSign
 * - Yousign
 * - Autres providers
 *
 * Le service gère :
 * - Le workflow de signature (draft -> ready_to_sign -> signing -> signed)
 * - L'intégration avec les providers externes
 * - Le suivi des statuts de signature
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SignatureProvider = 'on_premise' | 'docusign' | 'yousign' | 'custom';
export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired' | 'voided';
export type DocumentSignatureStatus = 'draft' | 'ready_to_sign' | 'signing_in_progress' | 'partially_signed' | 'fully_signed' | 'voided';

export interface SignatureRecipient {
    id: string;
    name: string;
    email: string;
    role: 'president' | 'secretaire' | 'scrutateur' | 'other';
    roleLabel: string;
    order: number; // Ordre de signature (1, 2, 3...)
    status: SignatureStatus;
    signedAt?: Date;
    declinedAt?: Date;
    declineReason?: string;
    signatureImageUrl?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface SignatureRequest {
    id: string;
    documentId: string;
    agId: string;
    provider: SignatureProvider;
    status: DocumentSignatureStatus;
    recipients: SignatureRecipient[];
    createdAt: Date;
    expiresAt?: Date;
    completedAt?: Date;
    webhookUrl?: string;
    externalId?: string; // ID chez le provider (DocuSign envelope ID, etc.)
    metadata?: Record<string, unknown>;
}

export interface SignatureProviderConfig {
    provider: SignatureProvider;
    apiKey?: string;
    apiSecret?: string;
    environment?: 'sandbox' | 'production';
    webhookSecret?: string;
    customConfig?: Record<string, unknown>;
}

export interface CreateSignatureRequestOptions {
    documentId: string;
    agId: string;
    pdfUrl?: string;
    pdfBlob?: Blob;
    recipients: Omit<SignatureRecipient, 'id' | 'status'>[];
    expiresInDays?: number;
    message?: string;
    subject?: string;
}

export interface SignatureProviderInterface {
    readonly name: SignatureProvider;

    /**
     * Initialise le provider avec sa configuration
     */
    initialize(config: SignatureProviderConfig): Promise<void>;

    /**
     * Crée une demande de signature
     */
    createSignatureRequest(options: CreateSignatureRequestOptions): Promise<SignatureRequest>;

    /**
     * Récupère le statut d'une demande de signature
     */
    getSignatureStatus(requestId: string): Promise<SignatureRequest>;

    /**
     * Annule une demande de signature
     */
    voidSignatureRequest(requestId: string, reason?: string): Promise<void>;

    /**
     * Envoie un rappel aux signataires en attente
     */
    sendReminder(requestId: string, recipientId?: string): Promise<void>;

    /**
     * Récupère le document signé
     */
    getSignedDocument(requestId: string): Promise<Blob>;

    /**
     * Gère les webhooks du provider
     */
    handleWebhook(payload: unknown): Promise<SignatureRequest>;
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

const SIGNATURE_REQUESTS_KEY = 'pv-signature-requests';

function getSignatureRequests(): Record<string, SignatureRequest> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(SIGNATURE_REQUESTS_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveSignatureRequests(requests: Record<string, SignatureRequest>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SIGNATURE_REQUESTS_KEY, JSON.stringify(requests));
}

function generateRequestId(): string {
    return `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// ON-PREMISE PROVIDER (Signature sur place)
// ═══════════════════════════════════════════════════════════════

class OnPremiseSignatureProvider implements SignatureProviderInterface {
    readonly name: SignatureProvider = 'on_premise';

    async initialize(): Promise<void> {
        // Pas de configuration nécessaire pour la signature sur place
    }

    async createSignatureRequest(options: CreateSignatureRequestOptions): Promise<SignatureRequest> {
        const requestId = generateRequestId();

        const recipients: SignatureRecipient[] = options.recipients.map((r, index) => ({
            ...r,
            id: `recipient-${index}-${Date.now()}`,
            status: 'pending' as SignatureStatus,
        }));

        const request: SignatureRequest = {
            id: requestId,
            documentId: options.documentId,
            agId: options.agId,
            provider: 'on_premise',
            status: 'ready_to_sign',
            recipients,
            createdAt: new Date(),
            expiresAt: options.expiresInDays
                ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
                : undefined,
        };

        const requests = getSignatureRequests();
        requests[requestId] = request;
        saveSignatureRequests(requests);

        return request;
    }

    async getSignatureStatus(requestId: string): Promise<SignatureRequest> {
        const requests = getSignatureRequests();
        const request = requests[requestId];
        if (!request) {
            throw new Error(`Demande de signature ${requestId} non trouvée`);
        }
        return request;
    }

    async voidSignatureRequest(requestId: string, reason?: string): Promise<void> {
        const requests = getSignatureRequests();
        const request = requests[requestId];
        if (!request) {
            throw new Error(`Demande de signature ${requestId} non trouvée`);
        }

        request.status = 'voided';
        request.metadata = { ...request.metadata, voidReason: reason };
        saveSignatureRequests(requests);
    }

    async sendReminder(): Promise<void> {
        // Pour la signature sur place, on ne peut pas envoyer de rappel automatique
        // Rappel non applicable pour signature sur place
    }

    async getSignedDocument(_requestId: string): Promise<Blob> {
        // Pour la signature sur place, le document est déjà local
        // On pourrait récupérer le PDF depuis le service de génération
        throw new Error('getSignedDocument non implémenté pour on_premise');
    }

    async handleWebhook(): Promise<SignatureRequest> {
        throw new Error('Webhooks non applicables pour signature sur place');
    }

    /**
     * Enregistre une signature manuscrite (spécifique à on_premise)
     */
    async recordManualSignature(
        requestId: string,
        recipientId: string,
        signatureImageBase64: string,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<SignatureRequest> {
        const requests = getSignatureRequests();
        const request = requests[requestId];

        if (!request) {
            throw new Error(`Demande de signature ${requestId} non trouvée`);
        }

        const recipientIndex = request.recipients.findIndex(r => r.id === recipientId);
        if (recipientIndex === -1) {
            throw new Error(`Signataire ${recipientId} non trouvé`);
        }

        // Mettre à jour le signataire
        request.recipients[recipientIndex] = {
            ...request.recipients[recipientIndex],
            status: 'signed',
            signedAt: new Date(),
            signatureImageUrl: signatureImageBase64,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
        };

        // Mettre à jour le statut global
        const allSigned = request.recipients.every(r => r.status === 'signed');
        const someSigned = request.recipients.some(r => r.status === 'signed');

        if (allSigned) {
            request.status = 'fully_signed';
            request.completedAt = new Date();
        } else if (someSigned) {
            request.status = 'partially_signed';
        }

        requests[requestId] = request;
        saveSignatureRequests(requests);

        return request;
    }
}

// ═══════════════════════════════════════════════════════════════
// DOCUSIGN PROVIDER (Stub)
// ═══════════════════════════════════════════════════════════════

class DocuSignProvider implements SignatureProviderInterface {
    readonly name: SignatureProvider = 'docusign';
    private config: SignatureProviderConfig | null = null;

    async initialize(config: SignatureProviderConfig): Promise<void> {
        this.config = config;
        // TODO: Initialiser le client DocuSign avec les credentials
        // DocuSign provider initialized (stub)
    }

    async createSignatureRequest(options: CreateSignatureRequestOptions): Promise<SignatureRequest> {
        // TODO: Implémenter l'appel API DocuSign pour créer une envelope
        // https://developers.docusign.com/docs/esign-rest-api/how-to/request-signature-email-remote/

        const requestId = generateRequestId();
        const recipients: SignatureRecipient[] = options.recipients.map((r, index) => ({
            ...r,
            id: `recipient-${index}-${Date.now()}`,
            status: 'sent' as SignatureStatus,
        }));

        const request: SignatureRequest = {
            id: requestId,
            documentId: options.documentId,
            agId: options.agId,
            provider: 'docusign',
            status: 'signing_in_progress',
            recipients,
            createdAt: new Date(),
            externalId: `docusign-envelope-${Date.now()}`, // Remplacer par le vrai ID
        };

        const requests = getSignatureRequests();
        requests[requestId] = request;
        saveSignatureRequests(requests);

        // DocuSign request created (stub)
        return request;
    }

    async getSignatureStatus(requestId: string): Promise<SignatureRequest> {
        // TODO: Appeler l'API DocuSign pour récupérer le statut de l'envelope
        const requests = getSignatureRequests();
        return requests[requestId];
    }

    async voidSignatureRequest(_requestId: string, _reason?: string): Promise<void> {
        // TODO: Appeler l'API DocuSign pour annuler l'envelope
        // DocuSign cancellation (stub)
    }

    async sendReminder(_requestId: string, _recipientId?: string): Promise<void> {
        // TODO: Appeler l'API DocuSign pour envoyer un rappel
        // DocuSign reminder sent (stub)
    }

    async getSignedDocument(_requestId: string): Promise<Blob> {
        // TODO: Télécharger le document signé depuis DocuSign
        throw new Error('[DocuSign] getSignedDocument non implémenté');
    }

    async handleWebhook(_payload: unknown): Promise<SignatureRequest> {
        // TODO: Parser le webhook DocuSign et mettre à jour le statut
        // DocuSign webhook received (stub)
        throw new Error('[DocuSign] handleWebhook non implémenté');
    }
}

// ═══════════════════════════════════════════════════════════════
// YOUSIGN PROVIDER (Stub)
// ═══════════════════════════════════════════════════════════════

class YouSignProvider implements SignatureProviderInterface {
    readonly name: SignatureProvider = 'yousign';
    private config: SignatureProviderConfig | null = null;

    async initialize(config: SignatureProviderConfig): Promise<void> {
        this.config = config;
        // TODO: Initialiser le client Yousign avec les credentials
        // Yousign provider initialized (stub)
    }

    async createSignatureRequest(options: CreateSignatureRequestOptions): Promise<SignatureRequest> {
        // TODO: Implémenter l'appel API Yousign
        // https://developers.yousign.com/

        const requestId = generateRequestId();
        const recipients: SignatureRecipient[] = options.recipients.map((r, index) => ({
            ...r,
            id: `recipient-${index}-${Date.now()}`,
            status: 'sent' as SignatureStatus,
        }));

        const request: SignatureRequest = {
            id: requestId,
            documentId: options.documentId,
            agId: options.agId,
            provider: 'yousign',
            status: 'signing_in_progress',
            recipients,
            createdAt: new Date(),
            externalId: `yousign-procedure-${Date.now()}`,
        };

        const requests = getSignatureRequests();
        requests[requestId] = request;
        saveSignatureRequests(requests);

        // Yousign request created (stub)
        return request;
    }

    async getSignatureStatus(requestId: string): Promise<SignatureRequest> {
        const requests = getSignatureRequests();
        return requests[requestId];
    }

    async voidSignatureRequest(_requestId: string, _reason?: string): Promise<void> {
        // Yousign cancellation (stub)
    }

    async sendReminder(_requestId: string, _recipientId?: string): Promise<void> {
        // Yousign reminder sent (stub)
    }

    async getSignedDocument(_requestId: string): Promise<Blob> {
        throw new Error('[Yousign] getSignedDocument non implémenté');
    }

    async handleWebhook(_payload: unknown): Promise<SignatureRequest> {
        // Yousign webhook received (stub)
        throw new Error('[Yousign] handleWebhook non implémenté');
    }
}

// ═══════════════════════════════════════════════════════════════
// SERVICE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class ElectronicSignatureService {
    private providers: Map<SignatureProvider, SignatureProviderInterface> = new Map();
    private currentProvider: SignatureProvider = 'on_premise';

    constructor() {
        // Enregistrer les providers disponibles
        this.providers.set('on_premise', new OnPremiseSignatureProvider());
        this.providers.set('docusign', new DocuSignProvider());
        this.providers.set('yousign', new YouSignProvider());
    }

    /**
     * Configure et active un provider
     */
    async configureProvider(config: SignatureProviderConfig): Promise<void> {
        const provider = this.providers.get(config.provider);
        if (!provider) {
            throw new Error(`Provider ${config.provider} non disponible`);
        }

        await provider.initialize(config);
        this.currentProvider = config.provider;
    }

    /**
     * Récupère le provider actuel
     */
    getProvider(): SignatureProviderInterface {
        const provider = this.providers.get(this.currentProvider);
        if (!provider) {
            throw new Error('Aucun provider configuré');
        }
        return provider;
    }

    /**
     * Crée une demande de signature
     */
    async createSignatureRequest(options: CreateSignatureRequestOptions): Promise<SignatureRequest> {
        return this.getProvider().createSignatureRequest(options);
    }

    /**
     * Récupère le statut d'une demande
     */
    async getSignatureStatus(requestId: string): Promise<SignatureRequest> {
        return this.getProvider().getSignatureStatus(requestId);
    }

    /**
     * Récupère une demande par document ID
     */
    getSignatureRequestByDocument(documentId: string): SignatureRequest | null {
        const requests = getSignatureRequests();
        return Object.values(requests).find(r => r.documentId === documentId) || null;
    }

    /**
     * Récupère les demandes pour une AG
     */
    getSignatureRequestsForAG(agId: string): SignatureRequest[] {
        const requests = getSignatureRequests();
        return Object.values(requests).filter(r => r.agId === agId);
    }

    /**
     * Annule une demande
     */
    async voidSignatureRequest(requestId: string, reason?: string): Promise<void> {
        return this.getProvider().voidSignatureRequest(requestId, reason);
    }

    /**
     * Envoie un rappel
     */
    async sendReminder(requestId: string, recipientId?: string): Promise<void> {
        return this.getProvider().sendReminder(requestId, recipientId);
    }

    /**
     * Récupère le document signé
     */
    async getSignedDocument(requestId: string): Promise<Blob> {
        return this.getProvider().getSignedDocument(requestId);
    }

    /**
     * Enregistre une signature manuscrite (on_premise uniquement)
     */
    async recordManualSignature(
        requestId: string,
        recipientId: string,
        signatureImageBase64: string,
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<SignatureRequest> {
        const provider = this.providers.get('on_premise') as OnPremiseSignatureProvider;
        return provider.recordManualSignature(requestId, recipientId, signatureImageBase64, metadata);
    }

    /**
     * Liste des providers disponibles
     */
    getAvailableProviders(): SignatureProvider[] {
        return Array.from(this.providers.keys());
    }
}

// Export singleton
export const electronicSignatureService = new ElectronicSignatureService();
export default electronicSignatureService;

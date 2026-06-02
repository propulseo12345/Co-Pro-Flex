// @vitest-environment jsdom

/**
 * Tests unitaires pour le service de génération PV
 */

import {
    createPVJob,
    getJob,
    getLatestJobForAG,
    updateJobProgress,
    getPVDocument,
    getPVDocumentForAG,
    startPVGeneration,
    type GeneratePVOptions,
} from '../pv-generation.service';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('pv-generation.service', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('createPVJob', () => {
        it('should create a new job with correct initial state', () => {
            const job = createPVJob('ag-123');

            expect(job).toBeDefined();
            expect(job.id).toMatch(/^job-/);
            expect(job.agId).toBe('ag-123');
            expect(job.status).toBe('queued');
            expect(job.progress.percentage).toBe(0);
            expect(job.retryCount).toBe(0);
            expect(job.maxRetries).toBe(3);
        });

        it('should return existing job if one is already running (idempotence)', () => {
            const job1 = createPVJob('ag-123');
            const job2 = createPVJob('ag-123');

            expect(job1.id).toBe(job2.id);
        });

        it('should create new job for different AG', () => {
            const job1 = createPVJob('ag-123');
            const job2 = createPVJob('ag-456');

            expect(job1.id).not.toBe(job2.id);
        });
    });

    describe('getJob', () => {
        it('should return null for non-existent job', () => {
            const job = getJob('non-existent');
            expect(job).toBeNull();
        });

        it('should return job by ID', () => {
            const created = createPVJob('ag-123');
            const retrieved = getJob(created.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(created.id);
        });
    });

    describe('getLatestJobForAG', () => {
        it('should return null if no jobs exist', () => {
            // agId jamais utilisé ailleurs : le store activeJobs (Map mémoire) n'est pas
            // réinitialisé entre tests, donc on isole via un identifiant dédié.
            const job = getLatestJobForAG('ag-sans-aucun-job');
            expect(job).toBeNull();
        });

        it('should return the most recent job for AG', () => {
            const job1 = createPVJob('ag-123');
            // Simuler la complétion du premier job
            updateJobProgress(job1.id, { status: 'succeeded' });

            // Créer un deuxième job (maintenant possible car le premier est terminé)
            const job2 = createPVJob('ag-123');

            const latest = getLatestJobForAG('ag-123');
            expect(latest?.id).toBe(job2.id);
        });
    });

    describe('updateJobProgress', () => {
        it('should update job status and progress', () => {
            const job = createPVJob('ag-123');

            const updated = updateJobProgress(job.id, {
                status: 'running',
                progress: {
                    step: 'Génération en cours',
                    stepNumber: 2,
                    totalSteps: 5,
                    percentage: 40,
                    message: 'Processing...',
                },
            });

            expect(updated?.status).toBe('running');
            expect(updated?.progress.percentage).toBe(40);
        });

        it('should return null for non-existent job', () => {
            const result = updateJobProgress('non-existent', { status: 'running' });
            expect(result).toBeNull();
        });
    });
});

describe('PV Document operations', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('getPVDocument', () => {
        it('should return null for non-existent document', async () => {
            const doc = await getPVDocument('non-existent');
            expect(doc).toBeNull();
        });
    });

    describe('getPVDocumentForAG', () => {
        it('should return null if no document exists', async () => {
            const doc = await getPVDocumentForAG('ag-123');
            expect(doc).toBeNull();
        });
    });
});

describe('Vote calculations', () => {
    // Helper pour calculer les résultats de vote
    const calculateVoteResult = (
        pour: number,
        contre: number,
        abstention: number,
        majorite: string,
        totalTantiemes: number
    ) => {
        const total = pour + contre + abstention;
        const seuilArt25 = Math.floor(totalTantiemes / 2) + 1;

        switch (majorite) {
            case 'ART_24':
                // Majorité simple art. 24 : pour > contre (abstentions hors décompte)
                return pour > contre;
            case 'ART_25':
                return pour >= seuilArt25;
            default:
                return pour > total / 2;
        }
    };

    it('should correctly calculate Article 24 majority (simple majority)', () => {
        // 60 pour, 40 contre sur 100 présents
        expect(calculateVoteResult(60, 40, 0, 'ART_24', 1000)).toBe(true);
        // 40 pour, 60 contre sur 100 présents
        expect(calculateVoteResult(40, 60, 0, 'ART_24', 1000)).toBe(false);
        // 50 pour > 40 contre : adoptée (les abstentions ne comptent pas au dénominateur, art. 24)
        expect(calculateVoteResult(50, 40, 10, 'ART_24', 1000)).toBe(true);
    });

    it('should correctly calculate Article 25 majority (absolute majority)', () => {
        // 600 pour sur 1000 tantièmes totaux
        expect(calculateVoteResult(600, 200, 0, 'ART_25', 1000)).toBe(true);
        // 400 pour sur 1000 tantièmes totaux (insuffisant)
        expect(calculateVoteResult(400, 200, 0, 'ART_25', 1000)).toBe(false);
    });
});

describe('Quorum calculations', () => {
    const calculateQuorum = (participatingTantiemes: number, totalTantiemes: number) => {
        return (participatingTantiemes / totalTantiemes) * 100;
    };

    it('should correctly calculate quorum percentage', () => {
        expect(calculateQuorum(750, 1000)).toBe(75);
        expect(calculateQuorum(500, 1000)).toBe(50);
        expect(calculateQuorum(333, 1000)).toBeCloseTo(33.3, 1);
    });
});

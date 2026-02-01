'use client';

/**
 * Page de désignation des rôles de séance
 * MIGRATION 2026-01-31: Source de vérité = Supabase uniquement
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Users, Check, Briefcase } from 'lucide-react';
import { RolesAG } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { RoleSelect, type RoleType } from '@/components/features/ag/RoleSelect';
import styles from './designation-roles.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

interface CoproprietaireDB {
    id: string;
    full_name: string;
    email: string | null;
    tantiemes: number;
}

interface GestionnaireDB {
    id: string;
    full_name: string;
    email: string | null;
    syndic_name: string | null;
}

export default function DesignationRolesPage() {
    const router = useRouter();
    const params = useParams();
    const agId = params.id as string;

    const [coproprietairesPresents, setCoproprietairesPresents] = useState<CoproprietaireDB[]>([]);
    const [gestionnaires, setGestionnaires] = useState<GestionnaireDB[]>([]);
    const [roles, setRoles] = useState<RolesAG>({});
    const [showRoleSelectModal, setShowRoleSelectModal] = useState(false);
    const [currentRole, setCurrentRole] = useState<RoleType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load data from Supabase
    useEffect(() => {
        if (!isValidUUID(agId)) {
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);

            try {
                const supabase = createUntypedClient();

                // 1. Get AG info to get copro_id
                const { data: agData, error: agError } = await supabase
                    .from('ag_meetings')
                    .select('copro_id')
                    .eq('id', agId)
                    .single();

                if (agError || !agData) {
                    console.error('[DesignationRolesPage] AG not found:', agError);
                    setIsLoading(false);
                    return;
                }

                const coproprieteId = agData.copro_id;

                // 2. Load attendance (present coproprietaires)
                const { data: attendanceData, error: attendanceError } = await supabase
                    .from('ag_attendance')
                    .select('coproprietaire_id, presence_type')
                    .eq('ag_id', agId)
                    .in('presence_type', ['present', 'proxy']);

                if (attendanceError) {
                    console.error('[DesignationRolesPage] Error loading attendance:', attendanceError);
                }

                // Get present coproprietaire IDs
                const presentIds = (attendanceData || []).map((a: { coproprietaire_id: string }) => a.coproprietaire_id);

                // 3. Load coproprietaires from view (has display_name and total_tantiemes)
                if (presentIds.length > 0) {
                    const { data: coprosData, error: coprosError } = await supabase
                        .from('v_coproprietaires_overview')
                        .select('id, display_name, email, total_tantiemes')
                        .in('id', presentIds);

                    if (coprosError) {
                        console.error('[DesignationRolesPage] Error loading coproprietaires:', coprosError);
                    }

                    // Map view result to expected format, deduplicate by ID
                    const uniqueMap = new Map<string, { id: string; full_name: string; email: string | null; tantiemes: number }>();
                    (coprosData || []).forEach((c: { id: string; display_name: string; email: string | null; total_tantiemes: number }) => {
                        if (!uniqueMap.has(c.id)) {
                            uniqueMap.set(c.id, {
                                id: c.id,
                                full_name: c.display_name,
                                email: c.email,
                                tantiemes: c.total_tantiemes,
                            });
                        }
                    });

                    setCoproprietairesPresents(Array.from(uniqueMap.values()));
                }

                // 4. Load gestionnaires (from memberships with role='manager' or 'admin')
                const { data: membershipsData, error: membershipsError } = await supabase
                    .from('memberships')
                    .select('user_id, role, profiles(id, full_name, email), coproprietes(name)')
                    .eq('copro_id', coproprieteId)
                    .in('role', ['manager', 'admin']);

                if (membershipsError) {
                    console.error('[DesignationRolesPage] Error loading memberships:', membershipsError);
                }

                const mappedGestionnaires: GestionnaireDB[] = (membershipsData || []).map((m: {
                    user_id: string;
                    profiles: { id: string; full_name: string; email: string | null } | null;
                    coproprietes: { name: string } | null;
                }) => ({
                    id: m.user_id,
                    full_name: m.profiles?.full_name || 'Gestionnaire',
                    email: m.profiles?.email || null,
                    syndic_name: m.coproprietes?.name || null,
                }));

                setGestionnaires(mappedGestionnaires);

                // 5. Load existing roles from ag_session_drafts via RPC
                const { data: draftData, error: draftError } = await supabase.rpc('get_ag_session_draft', {
                    p_ag_id: agId,
                    p_draft_type: 'roles',
                });

                if (draftError) {
                    console.error('[DesignationRolesPage] Error loading roles draft:', draftError);
                }

                if (draftData?.draft_data) {
                    setRoles(draftData.draft_data as RolesAG);
                }

            } catch (err) {
                console.error('[DesignationRolesPage] Error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [agId]);

    // Save roles to Supabase (debounced)
    const saveRoles = useCallback(async (rolesToSave: RolesAG) => {
        if (!isValidUUID(agId)) return;

        setIsSaving(true);

        try {
            const supabase = createUntypedClient();

            const { error } = await supabase.rpc('save_ag_session_draft', {
                p_ag_id: agId,
                p_draft_type: 'roles',
                p_draft_data: rolesToSave,
            });

            if (error) {
                console.error('[DesignationRolesPage] Error saving roles:', error);
            }
        } catch (err) {
            console.error('[DesignationRolesPage] Save error:', err);
        } finally {
            setIsSaving(false);
        }
    }, [agId]);

    // Debounced save effect
    useEffect(() => {
        if (Object.keys(roles).length === 0) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveRoles(roles);
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [roles, saveRoles]);

    const handleOpenModal = (role: RoleType) => {
        setCurrentRole(role);
        setShowRoleSelectModal(true);
    };

    const handleCloseModal = () => {
        setShowRoleSelectModal(false);
        setCurrentRole(null);
    };

    const handleSelectPerson = (personne: {
        id?: string;
        nom: string;
        type: 'coproprietaire' | 'gestionnaire' | 'autre';
        estGestionnaire?: boolean;
        representeSyndic?: string;
        email?: string;
        telephone?: string;
    }) => {
        if (!currentRole) return;

        const dateDesignation = new Date().toISOString();

        switch (currentRole) {
            case 'president':
                setRoles({
                    ...roles,
                    presidentSeance: {
                        coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
                        nom: personne.nom,
                        dateDesignation
                    }
                });
                break;
            case 'secretaire':
                setRoles({
                    ...roles,
                    secretaireSeance: {
                        coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
                        nom: personne.nom,
                        dateDesignation,
                        estGestionnaire: personne.estGestionnaire,
                        representeSyndic: personne.representeSyndic
                    }
                });
                break;
            case 'scrutateur':
                setRoles({
                    ...roles,
                    scrutateur: {
                        coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
                        nom: personne.nom,
                        dateDesignation
                    }
                });
                break;
            case 'conseilTitulaire':
            case 'conseilSuppleant':
                const membres = roles.membresConseilSyndical || [];
                setRoles({
                    ...roles,
                    membresConseilSyndical: [
                        ...membres,
                        {
                            coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
                            nom: personne.nom,
                            type: currentRole === 'conseilTitulaire' ? 'TITULAIRE' : 'SUPPLEANT',
                            dateDesignation
                        }
                    ]
                });
                break;
        }

        handleCloseModal();
    };

    const handleRemoveMembre = (index: number) => {
        const membres = roles.membresConseilSyndical || [];
        setRoles({
            ...roles,
            membresConseilSyndical: membres.filter((_, i) => i !== index)
        });
    };

    const allRolesDesigned = roles.presidentSeance && roles.secretaireSeance && roles.scrutateur;

    // Map DB coproprietaires to expected format for RoleSelect
    const mappedCoproprietaires = coproprietairesPresents.map(cp => ({
        id: cp.id,
        nom: cp.full_name,
        email: cp.email || '',
        telephone: '',
        lot: '', // Not needed for role selection
        tantiemes: cp.tantiemes || 0,
    }));

    // Map gestionnaires to expected format
    const mappedGestionnaires = gestionnaires.map(g => {
        const nameParts = (g.full_name || '').split(' ');
        return {
            id: g.id,
            nom: nameParts.slice(1).join(' ') || g.full_name,
            prenom: nameParts[0] || '',
            email: g.email || '',
            telephone: '',
            syndicId: '',
            syndicNom: g.syndic_name || '',
        };
    });

    if (isLoading) {
        return (
            <div className="container">
                <p>Chargement...</p>
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <ArrowLeft size={20} aria-hidden="true" />
                    Retour
                </button>
                <div>
                    <h1 className={styles.title}>Désignation des rôles</h1>
                    <p className={styles.subtitle}>
                        Pendant l'AG - {coproprietairesPresents.length} copropriétaire(s) présent(s) ou représenté(s)
                        {isSaving && <span className={styles.savingIndicator}> (enregistrement...)</span>}
                    </p>
                </div>
            </div>

            {coproprietairesPresents.length === 0 && (
                <div className={styles.warning}>
                    <p>Aucun copropriétaire présent ou représenté. Veuillez d'abord remplir la feuille de présence.</p>
                    <button onClick={() => router.push(`/ag/${agId}/feuille-presence`)} className="btn btn-primary">
                        Aller à la feuille de présence
                    </button>
                </div>
            )}

            {coproprietairesPresents.length > 0 && (
                <>
                    {/* Rôles principaux */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Rôles obligatoires de séance</h2>

                        <div className={styles.roleCards}>
                            {/* Président de séance */}
                            <div className={styles.roleCard}>
                                <div className={styles.roleHeader}>
                                    <h3 className={styles.roleTitle}>Président de séance</h3>
                                    {roles.presidentSeance && <Check size={20} className={styles.roleCheck} aria-hidden="true" />}
                                </div>
                                {roles.presidentSeance ? (
                                    <div className={styles.roleContent}>
                                        <div className={styles.roleName}>{roles.presidentSeance.nom}</div>
                                        <div className={styles.roleDate}>
                                            Désigné le {new Date(roles.presidentSeance.dateDesignation).toLocaleString('fr-FR')}
                                        </div>
                                        <button
                                            onClick={() => handleOpenModal('president')}
                                            className="btn btn-sm btn-secondary"
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleOpenModal('president')}
                                        className="btn btn-primary"
                                    >
                                        <UserPlus size={16} aria-hidden="true" />
                                        Désigner
                                    </button>
                                )}
                            </div>

                            {/* Secrétaire de séance */}
                            <div className={styles.roleCard}>
                                <div className={styles.roleHeader}>
                                    <h3 className={styles.roleTitle}>Secrétaire de séance</h3>
                                    {roles.secretaireSeance && <Check size={20} className={styles.roleCheck} aria-hidden="true" />}
                                </div>
                                {roles.secretaireSeance ? (
                                    <div className={styles.roleContent}>
                                        <div className={styles.roleName}>
                                            {roles.secretaireSeance.nom}
                                            {roles.secretaireSeance.estGestionnaire && (
                                                <span className={styles.gestionnaireBadge}>
                                                    <Briefcase size={12} aria-hidden="true" />
                                                    Gestionnaire
                                                </span>
                                            )}
                                        </div>
                                        {roles.secretaireSeance.estGestionnaire && roles.secretaireSeance.representeSyndic && (
                                            <div className={styles.representeSyndic}>
                                                Représentant le syndic {roles.secretaireSeance.representeSyndic}
                                            </div>
                                        )}
                                        <div className={styles.roleDate}>
                                            Désigné le {new Date(roles.secretaireSeance.dateDesignation).toLocaleString('fr-FR')}
                                        </div>
                                        <button
                                            onClick={() => handleOpenModal('secretaire')}
                                            className="btn btn-sm btn-secondary"
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleOpenModal('secretaire')}
                                        className="btn btn-primary"
                                    >
                                        <UserPlus size={16} aria-hidden="true" />
                                        Désigner
                                    </button>
                                )}
                            </div>

                            {/* Scrutateur */}
                            <div className={styles.roleCard}>
                                <div className={styles.roleHeader}>
                                    <h3 className={styles.roleTitle}>Scrutateur</h3>
                                    {roles.scrutateur && <Check size={20} className={styles.roleCheck} aria-hidden="true" />}
                                </div>
                                {roles.scrutateur ? (
                                    <div className={styles.roleContent}>
                                        <div className={styles.roleName}>{roles.scrutateur.nom}</div>
                                        <div className={styles.roleDate}>
                                            Désigné le {new Date(roles.scrutateur.dateDesignation).toLocaleString('fr-FR')}
                                        </div>
                                        <button
                                            onClick={() => handleOpenModal('scrutateur')}
                                            className="btn btn-sm btn-secondary"
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleOpenModal('scrutateur')}
                                        className="btn btn-primary"
                                    >
                                        <UserPlus size={16} aria-hidden="true" />
                                        Désigner
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conseil syndical */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Membres du conseil syndical</h2>

                        <div className={styles.conseilSection}>
                            <div className={styles.conseilActions}>
                                <button
                                    onClick={() => handleOpenModal('conseilTitulaire')}
                                    className="btn btn-primary"
                                >
                                    <UserPlus size={16} aria-hidden="true" />
                                    Ajouter un titulaire
                                </button>
                                <button
                                    onClick={() => handleOpenModal('conseilSuppleant')}
                                    className="btn btn-secondary"
                                >
                                    <UserPlus size={16} aria-hidden="true" />
                                    Ajouter un suppléant
                                </button>
                            </div>

                            {roles.membresConseilSyndical && roles.membresConseilSyndical.length > 0 ? (
                                <div className={styles.membresList}>
                                    {roles.membresConseilSyndical.map((membre, index) => (
                                        <div key={index} className={styles.membreCard}>
                                            <div className={styles.membreInfo}>
                                                <div className={styles.membreName}>{membre.nom}</div>
                                                <div className={styles.membreType}>
                                                    {membre.type === 'TITULAIRE' ? 'Titulaire' : 'Suppléant'}
                                                </div>
                                                <div className={styles.membreDate}>
                                                    {new Date(membre.dateDesignation).toLocaleString('fr-FR')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMembre(index)}
                                                className="btn btn-sm btn-danger"
                                            >
                                                Retirer
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Users size={48} aria-hidden="true" />
                                    <p>Aucun membre du conseil syndical désigné</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    {allRolesDesigned && (
                        <div className={styles.successBanner}>
                            <Check size={20} aria-hidden="true" />
                            <span>Tous les rôles obligatoires ont été désignés</span>
                        </div>
                    )}
                </>
            )}

            {/* Modal de sélection avec RoleSelect */}
            {showRoleSelectModal && currentRole && (
                <RoleSelect
                    role={currentRole}
                    roleLabel={
                        currentRole === 'president' ? 'le président de séance' :
                        currentRole === 'secretaire' ? 'le secrétaire de séance' :
                        currentRole === 'scrutateur' ? 'le scrutateur' :
                        currentRole === 'conseilTitulaire' ? 'un membre titulaire' :
                        'un membre suppléant'
                    }
                    coproprietairesPresents={mappedCoproprietaires}
                    gestionnaires={mappedGestionnaires}
                    autoriserGestionnaire={currentRole === 'secretaire'}
                    onSelect={handleSelectPerson}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}

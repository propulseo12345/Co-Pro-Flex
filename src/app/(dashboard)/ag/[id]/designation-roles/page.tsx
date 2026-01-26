'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Users, Check, Briefcase } from 'lucide-react';
import { FeuillePresence, RolesAG } from '@/types';
import { MOCK_COPROPRIETAIRES, MOCK_GESTIONNAIRES, type Coproprietaire, type Gestionnaire } from '@/data/mock';
import { RoleSelect, type RoleType } from '@/components/features/ag/RoleSelect';
import styles from './designation-roles.module.css';

export default function DesignationRolesPage() {
    const router = useRouter();
    const params = useParams();
    const agId = params.id as string;

    const [feuillePresence, setFeuillePresence] = useState<FeuillePresence | null>(null);
    const [roles, setRoles] = useState<RolesAG>({});
    const [showRoleSelectModal, setShowRoleSelectModal] = useState(false);
    const [currentRole, setCurrentRole] = useState<RoleType | null>(null);

    // Charger la feuille de présence et les rôles
    useEffect(() => {
        const savedFeuille = localStorage.getItem(`feuille-presence-${agId}`);
        if (savedFeuille) {
            setFeuillePresence(JSON.parse(savedFeuille));
        }

        const savedRoles = localStorage.getItem(`roles-ag-${agId}`);
        if (savedRoles) {
            setRoles(JSON.parse(savedRoles));
        }
    }, [agId]);

    // Sauvegarder automatiquement
    useEffect(() => {
        if (Object.keys(roles).length > 0) {
            localStorage.setItem(`roles-ag-${agId}`, JSON.stringify(roles));
        }
    }, [roles, agId]);

    // Obtenir les copropriétaires présents ou représentés
    const getCoproprietairesPresents = (): Coproprietaire[] => {
        if (!feuillePresence) return [];

        const presentIds = feuillePresence.signatures
            .filter(sig => sig.statut === 'PRESENT' || sig.statut === 'REPRESENTE')
            .map(sig => sig.coproprietaireId);

        return MOCK_COPROPRIETAIRES.filter(cp => presentIds.includes(cp.id));
    };

    const getCoproInfo = (cpId?: string) => {
        if (!cpId) return null;
        return MOCK_COPROPRIETAIRES.find(cp => cp.id === cpId);
    };

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

    const coproPresents = getCoproprietairesPresents();
    const allRolesDesigned = roles.presidentSeance && roles.secretaireSeance && roles.scrutateur;

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
                        Pendant l'AG - {coproPresents.length} copropriétaire(s) présent(s) ou représenté(s)
                    </p>
                </div>
            </div>

            {coproPresents.length === 0 && (
                <div className={styles.warning}>
                    <p>Aucun copropriétaire présent ou représenté. Veuillez d'abord remplir la feuille de présence.</p>
                    <button onClick={() => router.push(`/ag/${agId}/feuille-presence`)} className="btn btn-primary">
                        Aller à la feuille de présence
                    </button>
                </div>
            )}

            {coproPresents.length > 0 && (
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
                    coproprietairesPresents={coproPresents}
                    gestionnaires={MOCK_GESTIONNAIRES}
                    autoriserGestionnaire={currentRole === 'secretaire'}
                    onSelect={handleSelectPerson}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}

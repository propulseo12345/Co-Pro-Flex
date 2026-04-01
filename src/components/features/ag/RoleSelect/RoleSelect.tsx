'use client';

import { useState } from 'react';
import { Users, Briefcase, User, Check, X, UserCheck, Building2 } from 'lucide-react';
import type { Coproprietaire, Gestionnaire } from '@/types';
import styles from './RoleSelect.module.css';

export type RoleType = 'president' | 'secretaire' | 'scrutateur' | 'conseilTitulaire' | 'conseilSuppleant';

interface PersonneSelectionnee {
    id?: string;
    nom: string;
    type: 'coproprietaire' | 'gestionnaire' | 'autre';
    estGestionnaire?: boolean;
    representeSyndic?: string;
    email?: string;
    telephone?: string;
}

interface RoleSelectProps {
    role: RoleType;
    roleLabel: string;
    coproprietairesPresents: Coproprietaire[];
    gestionnaires?: Gestionnaire[];
    /** Autoriser la sélection de gestionnaire pour ce rôle (secrétaire uniquement) */
    autoriserGestionnaire?: boolean;
    onSelect: (personne: PersonneSelectionnee) => void;
    onClose: () => void;
}

export function RoleSelect({
    role,
    roleLabel,
    coproprietairesPresents,
    gestionnaires = [],
    autoriserGestionnaire = false,
    onSelect,
    onClose
}: RoleSelectProps) {
    const [customName, setCustomName] = useState('');
    const [activeTab, setActiveTab] = useState<'coproprietaires' | 'gestionnaires'>('coproprietaires');

    const handleSelectCoproprietaire = (copro: Coproprietaire) => {
        // Extraction prénom/nom
        const parts = copro.nom.split(' ');
        const prenom = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        const nom = parts.length > 1 ? parts[parts.length - 1] : copro.nom;

        onSelect({
            id: copro.id,
            nom: `${prenom} ${nom}`.trim(),
            type: 'coproprietaire',
            estGestionnaire: false,
            email: copro.email,
            telephone: copro.telephone
        });
    };

    const handleSelectGestionnaire = (gestionnaire: Gestionnaire) => {
        onSelect({
            id: gestionnaire.id,
            nom: `${gestionnaire.prenom} ${gestionnaire.nom}`,
            type: 'gestionnaire',
            estGestionnaire: true,
            representeSyndic: gestionnaire.syndicNom,
            email: gestionnaire.email,
            telephone: gestionnaire.telephone
        });
    };

    const handleAddCustomPerson = () => {
        if (!customName.trim()) return;

        onSelect({
            nom: customName.trim(),
            type: 'autre',
            estGestionnaire: false
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="role-select-title"
            >
                <div className={styles.modalHeader}>
                    <h2 id="role-select-title" className={styles.modalTitle}>
                        Sélectionner {roleLabel}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.closeButton}
                        aria-label="Fermer"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Onglets si gestionnaire autorisé */}
                    {autoriserGestionnaire && gestionnaires.length > 0 && (
                        <div className={styles.tabs}>
                            <button
                                type="button"
                                className={`${styles.tab} ${activeTab === 'coproprietaires' ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab('coproprietaires')}
                            >
                                <Users size={16} aria-hidden="true" />
                                Copropriétaires
                            </button>
                            <button
                                type="button"
                                className={`${styles.tab} ${activeTab === 'gestionnaires' ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab('gestionnaires')}
                            >
                                <Briefcase size={16} aria-hidden="true" />
                                Gestionnaires syndic
                            </button>
                        </div>
                    )}

                    {/* Liste copropriétaires */}
                    {activeTab === 'coproprietaires' && (
                        <>
                            <h3 className={styles.sectionTitle}>
                                <UserCheck size={18} aria-hidden="true" />
                                Copropriétaires présents
                            </h3>
                            {coproprietairesPresents.length > 0 ? (
                                <div className={styles.personList}>
                                    {coproprietairesPresents.map(copro => (
                                        <button
                                            key={copro.id}
                                            type="button"
                                            onClick={() => handleSelectCoproprietaire(copro)}
                                            className={styles.personButton}
                                        >
                                            <div className={styles.personInfo}>
                                                <div className={styles.personName}>
                                                    {copro.nom}
                                                </div>
                                                <div className={styles.personDetails}>
                                                    Lot {copro.lot} • {copro.tantiemes} tantièmes
                                                </div>
                                            </div>
                                            <Check size={16} className={styles.selectIcon} aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Users size={32} aria-hidden="true" />
                                    <p>Aucun copropriétaire présent</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Liste gestionnaires */}
                    {activeTab === 'gestionnaires' && autoriserGestionnaire && (
                        <>
                            <h3 className={styles.sectionTitle}>
                                <Building2 size={18} aria-hidden="true" />
                                Représentants du syndic
                            </h3>
                            <p className={styles.infoText}>
                                Le gestionnaire apparaîtra dans le PV comme &quot;représentant le syndic [Nom]&quot;
                            </p>
                            {gestionnaires.length > 0 ? (
                                <div className={styles.personList}>
                                    {gestionnaires.map(gestionnaire => (
                                        <button
                                            key={gestionnaire.id}
                                            type="button"
                                            onClick={() => handleSelectGestionnaire(gestionnaire)}
                                            className={`${styles.personButton} ${styles.gestionnaireButton}`}
                                        >
                                            <div className={styles.personInfo}>
                                                <div className={styles.personName}>
                                                    {gestionnaire.prenom} {gestionnaire.nom}
                                                    <span className={styles.gestionnaireBadge}>
                                                        <Briefcase size={12} aria-hidden="true" />
                                                        Gestionnaire
                                                    </span>
                                                </div>
                                                <div className={styles.personDetails}>
                                                    {gestionnaire.syndicNom}
                                                </div>
                                                {gestionnaire.email && (
                                                    <div className={styles.personEmail}>
                                                        {gestionnaire.email}
                                                    </div>
                                                )}
                                            </div>
                                            <Check size={16} className={styles.selectIcon} aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Briefcase size={32} aria-hidden="true" />
                                    <p>Aucun gestionnaire disponible</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Divider */}
                    <div className={styles.divider}>
                        <span>OU</span>
                    </div>

                    {/* Saisie manuelle */}
                    <h3 className={styles.sectionTitle}>
                        <User size={18} aria-hidden="true" />
                        Personne non enregistrée
                    </h3>
                    <p className={styles.infoText}>
                        Pour une SCI, indivision, ou mandataire non enregistré
                    </p>
                    <div className={styles.customForm}>
                        <input
                            type="text"
                            placeholder="Nom complet ou raison sociale"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className={styles.customInput}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddCustomPerson();
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleAddCustomPerson}
                            className="btn btn-primary"
                            disabled={!customName.trim()}
                        >
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RoleSelect;

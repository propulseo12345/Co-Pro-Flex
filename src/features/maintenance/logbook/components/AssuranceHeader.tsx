'use client';

import { SousTypeAssurance } from '@/types';
import { getAssuranceTypeLabel } from '@/components/features/maintenance/Logbook/utils';
import { ArrowLeft, Edit2, Save, X, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import styles from './AssuranceHeader.module.css';

interface AssuranceHeaderProps {
    nom: string;
    sousType: string;
    assureur: string;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
}

export function AssuranceHeader({ nom, sousType, assureur, isEditing, onEdit, onSave, onCancel }: AssuranceHeaderProps) {
    return (
        <>
            <Link href="/maintenance/logbook" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour au carnet d'entretien
            </Link>

            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <div className={styles.titleRow}>
                        <ShieldCheck size={24} className={styles.titleIcon} aria-hidden="true" />
                        <h1 className={styles.title}>{nom}</h1>
                    </div>
                    <p className={styles.subtitle}>
                        {getAssuranceTypeLabel(sousType as SousTypeAssurance)} • {assureur}
                    </p>
                </div>
                <div className={styles.actions}>
                    {!isEditing ? (
                        <button className="btn btn-primary" onClick={onEdit}>
                            <Edit2 size={18} aria-hidden="true" /> Modifier
                        </button>
                    ) : (
                        <>
                            <button className="btn btn-secondary" onClick={onCancel}>
                                <X size={18} aria-hidden="true" /> Annuler
                            </button>
                            <button className="btn btn-primary" onClick={onSave}>
                                <Save size={18} aria-hidden="true" /> Enregistrer
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

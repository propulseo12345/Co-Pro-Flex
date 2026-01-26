'use client';

import { Edit2, Trash2, Plus, Star } from 'lucide-react';
import { MOCK_DOMAINES_ACTIVITE } from '@/data/mock';
import { Prestataire } from '@/types';
import styles from './ProviderDetailHeader.module.css';

interface ProviderDetailHeaderProps {
    prestataire: Prestataire;
    onEdit: () => void;
    onDelete: () => void;
    onAddIntervention: () => void;
}

export function ProviderDetailHeader({ prestataire, onEdit, onDelete, onAddIntervention }: ProviderDetailHeaderProps) {
    return (
        <div className={styles.header}>
            <div className={styles.headerLeft}>
                <div className={styles.avatar}>{prestataire.nom.charAt(0)}</div>
                <div className={styles.headerInfo}>
                    <div className={styles.titleRow}>
                        <h1 className={styles.title}>{prestataire.nom}</h1>
                        <span className={styles.categorieBadge}>{prestataire.categorie}</span>
                    </div>
                    <div className={styles.domaines}>
                        {prestataire.domaines.map((d, i) => (
                            <span key={i} className={styles.badge}>
                                {MOCK_DOMAINES_ACTIVITE.find(da => da.value === d)?.label || d}
                            </span>
                        ))}
                    </div>
                    {prestataire.categorie === 'COPROFLEX' && prestataire.noteMoyenne && (
                        <div className={styles.rating}>
                            <Star size={18} fill="#F59E0B" color="#F59E0B" aria-hidden="true" />
                            <span className={styles.ratingValue}>{prestataire.noteMoyenne.toFixed(1)}</span>
                            <span className={styles.ratingCount}>({prestataire.nombreAvis} avis)</span>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.actions}>
                <button className="btn btn-secondary" onClick={onEdit}>
                    <Edit2 size={18} aria-hidden="true" /> Modifier
                </button>
                <button className="btn btn-danger" onClick={onDelete}>
                    <Trash2 size={18} aria-hidden="true" /> Supprimer
                </button>
                <button className="btn btn-primary" onClick={onAddIntervention}>
                    <Plus size={18} aria-hidden="true" /> Intervention
                </button>
            </div>
        </div>
    );
}

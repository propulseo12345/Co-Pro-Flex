'use client';

import { ContratDetaille, Prestataire } from '@/types';
import { ArrowLeft, Edit2, Download, XCircle, Shield, Mail } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from './ContractDetailHeader.module.css';

interface ContractDetailHeaderProps {
    contrat: ContratDetaille;
    fromLogbook: boolean;
    typeLabel: string;
    onModifier: () => void;
    onDownloadPDF: () => void;
    onResiliation: () => void;
    onContactProvider: () => void;
}

export function ContractDetailHeader({
    contrat,
    fromLogbook,
    typeLabel,
    onModifier,
    onDownloadPDF,
    onResiliation,
    onContactProvider
}: ContractDetailHeaderProps) {
    return (
        <>
            <Link href={fromLogbook ? "/maintenance/logbook" : "/maintenance/contracts"} className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> {fromLogbook ? "Retour au carnet d'entretien" : "Retour aux contrats"}
            </Link>

            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <div className={styles.titleRow}>
                        <h1 className={styles.title}>{contrat.nom}</h1>
                        <span className={clsx(styles.badge, styles[contrat.statut.toLowerCase()])}>{contrat.statut}</span>
                        {contrat.estReglementaire && (
                            <span className={styles.badgeReglementaire}>
                                <Shield size={12} aria-hidden="true" /> Réglementaire
                            </span>
                        )}
                    </div>
                    {contrat.numeroContrat && (
                        <p className={styles.subtitle}>N° {contrat.numeroContrat}</p>
                    )}
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-primary" onClick={onContactProvider} aria-label="Contacter le prestataire">
                        <Mail size={18} aria-hidden="true" /> Contacter le prestataire
                    </button>
                    <button className="btn btn-secondary" onClick={onModifier}>
                        <Edit2 size={18} aria-hidden="true" /> Modifier
                    </button>
                    {contrat.fichierPDF && (
                        <button className="btn btn-secondary" onClick={onDownloadPDF}>
                            <Download size={18} aria-hidden="true" /> Télécharger PDF
                        </button>
                    )}
                    {(contrat.statut === 'ACTIF' || contrat.statut === 'A_RENOUVELER') && (
                        <button onClick={onResiliation} className="btn btn-danger">
                            <XCircle size={18} aria-hidden="true" /> Résilier
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

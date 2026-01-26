'use client';

import { useState } from 'react';
import { ContratDetaille } from '@/types';
import { MoreVertical, Edit2, XCircle, Download } from 'lucide-react';
import styles from './Contracts.module.css';

interface ActionsDropdownProps {
    contrat: ContratDetaille;
    onModifier: () => void;
    onResilier: () => void;
    onTelecharger: () => void;
}

export default function ActionsDropdown({
    contrat,
    onModifier,
    onResilier,
    onTelecharger
}: ActionsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={styles.actionsDropdown}>
            <button
                className={styles.actionsBtn}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                aria-label="Actions"
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <MoreVertical size={18} aria-hidden="true" />
            </button>
            {isOpen && (
                <>
                    <div className={styles.dropdownOverlay} onClick={() => setIsOpen(false)} aria-hidden="true" />
                    <div className={styles.dropdownMenu} role="menu" aria-label="Actions disponibles">
                        <button onClick={(e) => { e.stopPropagation(); onModifier(); setIsOpen(false); }} role="menuitem">
                            <Edit2 size={14} aria-hidden="true" /> Modifier
                        </button>
                        {contrat.statut !== 'RESILIE' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onResilier(); setIsOpen(false); }}
                                className={styles.dangerAction}
                                role="menuitem"
                            >
                                <XCircle size={14} aria-hidden="true" /> Résilier
                            </button>
                        )}
                        {contrat.fichierPDF && (
                            <button onClick={(e) => { e.stopPropagation(); onTelecharger(); setIsOpen(false); }} role="menuitem">
                                <Download size={14} aria-hidden="true" /> Télécharger PDF
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

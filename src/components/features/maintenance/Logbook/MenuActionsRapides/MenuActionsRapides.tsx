'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, CheckCircle, Calendar, Paperclip, XCircle } from 'lucide-react';
import type { MenuActionsRapidesProps } from '../types';
import { ACTIONS_CONFIG } from '@/lib/constants/statuts-intervention';
import styles from './MenuActionsRapides.module.css';

const ICONES = {
    CheckCircle,
    Calendar,
    Paperclip,
    XCircle,
} as const;

/**
 * Menu dropdown pour les actions rapides sur une intervention
 * Les actions disponibles dépendent du statut de l'intervention
 */
export function MenuActionsRapides({
    actions,
    onAction,
}: MenuActionsRapidesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Fermer au clic extérieur
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fermer sur Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen]);

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className={styles.container} ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={styles.btnTrigger}
                aria-label="Actions"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <MoreVertical size={18} aria-hidden="true" />
            </button>

            {isOpen && (
                <div className={styles.menu} role="menu">
                    {actions.map((action) => {
                        const config = ACTIONS_CONFIG[action];
                        const Icone = ICONES[config.icone];

                        return (
                            <button
                                key={action}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(action);
                                    setIsOpen(false);
                                }}
                                className={`${styles.menuItem} ${config.danger ? styles.menuItemDanger : ''}`}
                                role="menuitem"
                            >
                                <Icone size={16} aria-hidden="true" />
                                {config.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default MenuActionsRapides;

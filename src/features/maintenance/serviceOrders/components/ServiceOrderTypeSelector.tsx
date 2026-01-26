'use client';

import { TypeOrdreService } from '@/types';
import clsx from 'clsx';
import styles from './ServiceOrderTypeSelector.module.css';

interface TypeSelectorProps {
    typeOrdre: TypeOrdreService;
    onTypeChange: (type: TypeOrdreService) => void;
}

export function ServiceOrderTypeSelector({ typeOrdre, onTypeChange }: TypeSelectorProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Type d'ordre de service</h2>
            <div className={styles.radioCards}>
                <div
                    className={clsx(styles.radioCard, typeOrdre === 'CLASSIQUE' && styles.radioCardSelected)}
                    onClick={() => onTypeChange('CLASSIQUE')}
                >
                    <input
                        type="radio"
                        name="typeOrdre"
                        value="CLASSIQUE"
                        checked={typeOrdre === 'CLASSIQUE'}
                        onChange={() => onTypeChange('CLASSIQUE')}
                        className={styles.radioInput}
                    />
                    <div className={styles.radioCardContent}>
                        <h3 className={styles.radioCardTitle}>Classique</h3>
                        <p className={styles.radioCardDescription}>
                            Intervention ponctuelle avec sélection directe du prestataire
                        </p>
                    </div>
                </div>

                <div
                    className={clsx(styles.radioCard, typeOrdre === 'CONTRACTUEL' && styles.radioCardSelected)}
                    onClick={() => onTypeChange('CONTRACTUEL')}
                >
                    <input
                        type="radio"
                        name="typeOrdre"
                        value="CONTRACTUEL"
                        checked={typeOrdre === 'CONTRACTUEL'}
                        onChange={() => onTypeChange('CONTRACTUEL')}
                        className={styles.radioInput}
                    />
                    <div className={styles.radioCardContent}>
                        <h3 className={styles.radioCardTitle}>Contractuel</h3>
                        <p className={styles.radioCardDescription}>
                            Intervention dans le cadre d'un contrat d'entretien actif
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

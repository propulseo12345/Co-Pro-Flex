'use client';

import { useState } from 'react';
import { Search, CheckCircle, FileText, Filter } from 'lucide-react';
import type { CoproprietaireWithVoteStatus } from '@/hooks/modules/useVotesCorrespondance';
import styles from './VotesCorrespondance.module.css';

interface CoproListProps {
    coproprietaires: CoproprietaireWithVoteStatus[];
    selectedCoproId: string | null;
    onSelectCopro: (coproId: string) => void;
}

export function CoproList({
    coproprietaires,
    selectedCoproId,
    onSelectCopro,
}: CoproListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

    const filteredCoproprietaires = coproprietaires.filter(copro => {
        // Filtre de recherche
        const matchesSearch = copro.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            copro.lot.toLowerCase().includes(searchTerm.toLowerCase());

        // Filtre incomplets uniquement
        const matchesFilter = showIncompleteOnly
            ? copro.completionStatus === 'INCOMPLET'
            : true;

        return matchesSearch && matchesFilter;
    });

    const incompleteCount = coproprietaires.filter(c => c.completionStatus === 'INCOMPLET').length;

    return (
        <div className={`card ${styles.coproListCard}`}>
            <div className={styles.coproListHeader}>
                <h3 className={styles.coproListTitle}>
                    Copropriétaires ({coproprietaires.length})
                </h3>

                <div className={styles.coproListSearch}>
                    <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <button
                    onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                    className={`${styles.filterButton} ${showIncompleteOnly ? styles.filterButtonActive : ''}`}
                    title={showIncompleteOnly ? 'Afficher tous' : 'Incomplets uniquement'}
                >
                    <Filter size={16} aria-hidden="true" />
                    {incompleteCount > 0 && (
                        <span className={styles.filterBadge}>{incompleteCount}</span>
                    )}
                </button>
            </div>

            <div className={styles.coproListItems}>
                {filteredCoproprietaires.length === 0 ? (
                    <div className={styles.emptyList}>
                        <p>Aucun copropriétaire trouvé</p>
                    </div>
                ) : (
                    filteredCoproprietaires.map(copro => {
                        const isSelected = selectedCoproId === copro.id;
                        const isComplete = copro.completionStatus === 'COMPLET';

                        return (
                            <button
                                key={copro.id}
                                onClick={() => onSelectCopro(copro.id)}
                                className={`${styles.coproItem} ${isSelected ? styles.coproItemSelected : ''} ${isComplete ? styles.coproItemComplete : ''}`}
                            >
                                <div className={styles.coproItemInfo}>
                                    <span className={styles.coproItemName}>{copro.nom}</span>
                                    <span className={styles.coproItemDetails}>
                                        Lot {copro.lot} • {copro.tantiemes} tantièmes
                                    </span>
                                </div>
                                <div className={styles.coproItemStatus}>
                                    <span className={styles.coproItemProgress}>
                                        {copro.votesCount}/{copro.totalResolutions}
                                    </span>
                                    <div className={styles.coproItemIcons}>
                                        {copro.hasJustificatif && (
                                            <FileText
                                                size={14}
                                                className={styles.coproItemIconFile}
                                                aria-label="Justificatif uploadé"
                                            />
                                        )}
                                        {isComplete && (
                                            <CheckCircle
                                                size={14}
                                                className={styles.coproItemIconComplete}
                                                aria-label="Complet"
                                            />
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default CoproList;

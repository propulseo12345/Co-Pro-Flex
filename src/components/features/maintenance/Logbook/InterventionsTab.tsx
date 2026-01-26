'use client';

import {
    Search,
    Calendar,
    Wrench,
    AlertTriangle,
    CheckCircle,
    Euro,
    Clock,
    ClipboardList,
} from 'lucide-react';
import clsx from 'clsx';
import type { InterventionsTabProps, Intervention } from './types';
import { InterventionCard } from './InterventionCard';
import { type ActionRapide } from '@/lib/constants/statuts-intervention';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function InterventionsTab({
    interventions,
    allInterventions,
    interventionsCourantes,
    travauxImportants,
    statsCategorie,
    interventionView,
    searchTerm,
    statutFilter,
    prestataireFilter,
    equipementFilter,
    anneeFilter,
    years,
    equipements,
    allPrestataires,
    onInterventionViewChange,
    onSearchChange,
    onStatutFilterChange,
    onPrestataireFilterChange,
    onEquipementFilterChange,
    onAnneeFilterChange,
    onEditIntervention
}: InterventionsTabProps) {
    const displayedInterventions = interventionView === 'all'
        ? interventions
        : interventionView === 'courantes'
            ? interventionsCourantes
            : travauxImportants;

    // Handler pour les actions rapides
    // Note: En production, ces actions seront persistées via Supabase
    const handleActionRapide = (intervention: Intervention, action: ActionRapide) => {
        switch (action) {
            case 'cloturer':
                // Ouvrir le formulaire d'édition pour clôturer l'intervention
                onEditIntervention(intervention);
                break;
            case 'replanifier':
                // Ouvrir le formulaire d'édition pour modifier la date
                onEditIntervention(intervention);
                break;
            case 'ajouter_pj':
                // Ouvrir le formulaire d'édition
                onEditIntervention(intervention);
                break;
            case 'annuler':
                if (confirm(`Êtes-vous sûr de vouloir annuler l'intervention "${intervention.titre}" ?`)) {
                    // En production, cela mettrait à jour le statut via l'API
                    // Pour l'instant, on redirige vers le formulaire d'édition
                    onEditIntervention(intervention);
                }
                break;
        }
    };

    return (
        <>
            {/* Sous-onglets avec statistiques */}
            <div className={styles.subTabsContainer}>
                <div className={styles.subTabs}>
                    <button
                        className={clsx(styles.subTab, interventionView === 'all' && styles.subTabActive)}
                        onClick={() => onInterventionViewChange('all')}
                    >
                        <ClipboardList size={16} aria-hidden="true" />
                        <span>Toutes</span>
                        <span className={styles.subTabCount}>{allInterventions.length}</span>
                    </button>
                    <button
                        className={clsx(styles.subTab, styles.subTabCourante, interventionView === 'courantes' && styles.subTabActive)}
                        onClick={() => onInterventionViewChange('courantes')}
                    >
                        <Wrench size={16} aria-hidden="true" />
                        <span>Interventions courantes</span>
                        <span className={styles.subTabCount}>{allInterventions.filter(i => i.categorie === 'COURANTE').length}</span>
                    </button>
                    <button
                        className={clsx(styles.subTab, styles.subTabTravaux, interventionView === 'travaux' && styles.subTabActive)}
                        onClick={() => onInterventionViewChange('travaux')}
                    >
                        <AlertTriangle size={16} aria-hidden="true" />
                        <span>Travaux importants</span>
                        <span className={styles.subTabCount}>{allInterventions.filter(i => i.categorie === 'TRAVAUX_IMPORTANTS').length}</span>
                    </button>
                </div>

                {/* Description de la vue */}
                {interventionView === 'courantes' && (
                    <div className={styles.viewDescription}>
                        <Wrench size={16} aria-hidden="true" />
                        <p>Maintenance quotidienne, entretiens réguliers, petites réparations</p>
                    </div>
                )}
                {interventionView === 'travaux' && (
                    <div className={clsx(styles.viewDescription, styles.viewDescriptionTravaux)}>
                        <AlertTriangle size={16} aria-hidden="true" />
                        <p>Travaux significatifs : ravalement, toiture, ascenseur, chauffage...</p>
                    </div>
                )}

                {/* Panneau de statistiques par catégorie */}
                {interventionView !== 'all' && (
                    <div className={clsx(
                        styles.categoryStatsPanel,
                        interventionView === 'travaux' && styles.categoryStatsPanelTravaux
                    )}>
                        <div className={styles.categoryStatItem}>
                            <div className={styles.categoryStatIcon}>
                                <CheckCircle size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.categoryStatContent}>
                                <span className={styles.categoryStatValue}>
                                    {interventionView === 'courantes'
                                        ? statsCategorie.courantes.terminees
                                        : statsCategorie.travaux.terminees}
                                </span>
                                <span className={styles.categoryStatLabel}>Terminées</span>
                            </div>
                        </div>
                        <div className={styles.categoryStatItem}>
                            <div className={clsx(styles.categoryStatIcon, styles.categoryStatIconWarning)}>
                                <Clock size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.categoryStatContent}>
                                <span className={styles.categoryStatValue}>
                                    {interventionView === 'courantes'
                                        ? statsCategorie.courantes.enCours
                                        : statsCategorie.travaux.enCours}
                                </span>
                                <span className={styles.categoryStatLabel}>En cours</span>
                            </div>
                        </div>
                        <div className={styles.categoryStatItem}>
                            <div className={clsx(styles.categoryStatIcon, styles.categoryStatIconInfo)}>
                                <Calendar size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.categoryStatContent}>
                                <span className={styles.categoryStatValue}>
                                    {interventionView === 'courantes'
                                        ? statsCategorie.courantes.planifiees
                                        : statsCategorie.travaux.planifiees}
                                </span>
                                <span className={styles.categoryStatLabel}>Planifiées</span>
                            </div>
                        </div>
                        <div className={styles.categoryStatDivider} />
                        <div className={styles.categoryStatItem}>
                            <div className={clsx(styles.categoryStatIcon, styles.categoryStatIconEuro)}>
                                <Euro size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.categoryStatContent}>
                                <span className={styles.categoryStatValue}>
                                    {(interventionView === 'courantes'
                                        ? statsCategorie.courantes.coutTotal
                                        : statsCategorie.travaux.coutTotal).toLocaleString()} €
                                </span>
                                <span className={styles.categoryStatLabel}>Coût total</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filtres avancés */}
            <div className={styles.filtersSection}>
                <div className={styles.searchBox}>
                    <Search size={18} aria-hidden="true" />
                    <input type="text" placeholder="Rechercher une intervention..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    <select value={statutFilter} onChange={(e) => onStatutFilterChange(e.target.value)}>
                        <option value="TOUS">Tous statuts</option>
                        <option value="PLANIFIEE">Planifiée</option>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINEE">Terminée</option>
                    </select>
                    <select value={prestataireFilter} onChange={(e) => onPrestataireFilterChange(e.target.value)}>
                        <option value="TOUS">Tous prestataires</option>
                        {allPrestataires.map(p => (
                            <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                    </select>
                    <select value={equipementFilter} onChange={(e) => onEquipementFilterChange(e.target.value)}>
                        <option value="TOUS">Tous équipements</option>
                        {equipements.map(eq => (
                            <option key={eq} value={eq}>{eq}</option>
                        ))}
                    </select>
                    <select value={anneeFilter} onChange={(e) => onAnneeFilterChange(e.target.value)}>
                        <option value="TOUS">Toutes années</option>
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Résultats filtrés */}
            <div className={styles.resultsHeader}>
                <p>
                    {interventionView === 'all' && `${interventions.length} intervention(s) trouvée(s)`}
                    {interventionView === 'courantes' && `${interventionsCourantes.length} intervention(s) courante(s)`}
                    {interventionView === 'travaux' && `${travauxImportants.length} travaux important(s)`}
                </p>
                {interventionView === 'all' && (
                    <div className={styles.statsChips}>
                        <span className={styles.statChipCourante}>
                            <Wrench size={12} aria-hidden="true" /> {interventionsCourantes.length} courante(s)
                        </span>
                        <span className={styles.statChipTravaux}>
                            <AlertTriangle size={12} aria-hidden="true" /> {travauxImportants.length} travaux
                        </span>
                    </div>
                )}
            </div>

            {/* Liste des interventions avec cartes améliorées */}
            <div className={styles.interventionsList}>
                {displayedInterventions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Aucune intervention ne correspond aux filtres sélectionnés.</p>
                    </div>
                ) : (
                    displayedInterventions.map((intervention) => (
                        <InterventionCard
                            key={intervention.id}
                            intervention={intervention}
                            onEdit={onEditIntervention}
                            onActionRapide={handleActionRapide}
                        />
                    ))
                )}
            </div>
        </>
    );
}

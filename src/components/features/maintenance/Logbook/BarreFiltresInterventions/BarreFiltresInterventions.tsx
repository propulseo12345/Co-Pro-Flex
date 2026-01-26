'use client';

import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import type { BarreFiltresInterventionsProps, InterventionStatut } from '../types';
import { STATUTS_INTERVENTION, COULEURS_STATUT } from '@/lib/constants/statuts-intervention';
import styles from './BarreFiltresInterventions.module.css';

/**
 * Barre de filtres avancée pour les interventions
 * - Recherche textuelle
 * - Filtres par statut (chips cliquables)
 * - Panneau déroulant avec filtres avancés (équipement, prestataire, période)
 */
export function BarreFiltresInterventions({
    filtres,
    onFiltreChange,
    onToggleStatut,
    onReset,
    nbFiltresActifs,
    equipements,
    prestataires,
}: BarreFiltresInterventionsProps) {
    const [panneauOuvert, setPanneauOuvert] = useState(false);

    // Liste des statuts disponibles (exclure ANNULEE qui n'existe pas encore dans le modèle)
    const statutsDisponibles: InterventionStatut[] = ['PLANIFIEE', 'EN_COURS', 'TERMINEE'];

    return (
        <div className={styles.container}>
            {/* Ligne principale : recherche + bouton filtres */}
            <div className={styles.lignePrincipale}>
                <div className={styles.recherche}>
                    <Search size={18} className={styles.iconeRecherche} aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Rechercher une intervention..."
                        value={filtres.recherche}
                        onChange={(e) => onFiltreChange('recherche', e.target.value)}
                        className={styles.inputRecherche}
                    />
                    {filtres.recherche && (
                        <button
                            onClick={() => onFiltreChange('recherche', '')}
                            className={styles.btnClear}
                            aria-label="Effacer la recherche"
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setPanneauOuvert(!panneauOuvert)}
                    className={`${styles.btnFiltres} ${nbFiltresActifs > 0 ? styles.btnFiltresActif : ''}`}
                    aria-expanded={panneauOuvert}
                >
                    <Filter size={18} aria-hidden="true" />
                    Filtres
                    {nbFiltresActifs > 0 && (
                        <span className={styles.badge}>{nbFiltresActifs}</span>
                    )}
                    <ChevronDown
                        size={16}
                        className={panneauOuvert ? styles.chevronOuvert : ''}
                        aria-hidden="true"
                    />
                </button>

                {nbFiltresActifs > 0 && (
                    <button onClick={onReset} className={styles.btnReset}>
                        <X size={14} aria-hidden="true" />
                        Réinitialiser
                    </button>
                )}
            </div>

            {/* Filtres par statut (toujours visibles) */}
            <div className={styles.filtresStatut}>
                {statutsDisponibles.map((statut) => {
                    const config = STATUTS_INTERVENTION[statut];
                    const actif = filtres.statuts.includes(statut);
                    const couleurs = COULEURS_STATUT[config.couleur];

                    return (
                        <button
                            key={statut}
                            onClick={() => onToggleStatut(statut)}
                            className={styles.chipStatut}
                            style={actif ? {
                                backgroundColor: couleurs.bg,
                                color: couleurs.text,
                                borderColor: couleurs.border,
                            } : undefined}
                            aria-pressed={actif}
                        >
                            <span
                                className={styles.dot}
                                style={actif ? { backgroundColor: couleurs.dot } : undefined}
                            />
                            {config.label}
                        </button>
                    );
                })}
            </div>

            {/* Panneau de filtres avancés */}
            {panneauOuvert && (
                <div className={styles.panneauAvance}>
                    <div className={styles.filtreGroupe}>
                        <label className={styles.filtreLabel}>Équipement</label>
                        <select
                            value={filtres.equipementId || ''}
                            onChange={(e) => onFiltreChange('equipementId', e.target.value || null)}
                            className={styles.select}
                        >
                            <option value="">Tous les équipements</option>
                            {equipements.map(eq => (
                                <option key={eq} value={eq}>{eq}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filtreGroupe}>
                        <label className={styles.filtreLabel}>Prestataire</label>
                        <select
                            value={filtres.prestataireId || ''}
                            onChange={(e) => onFiltreChange('prestataireId', e.target.value || null)}
                            className={styles.select}
                        >
                            <option value="">Tous les prestataires</option>
                            {prestataires.map(p => (
                                <option key={p.id} value={p.id}>{p.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filtreGroupe}>
                        <label className={styles.filtreLabel}>Période</label>
                        <div className={styles.dateRange}>
                            <input
                                type="date"
                                value={filtres.dateDebut?.toISOString().split('T')[0] || ''}
                                onChange={(e) => onFiltreChange('dateDebut', e.target.value ? new Date(e.target.value) : null)}
                                className={styles.inputDate}
                            />
                            <span className={styles.dateSeparator}>→</span>
                            <input
                                type="date"
                                value={filtres.dateFin?.toISOString().split('T')[0] || ''}
                                onChange={(e) => onFiltreChange('dateFin', e.target.value ? new Date(e.target.value) : null)}
                                className={styles.inputDate}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BarreFiltresInterventions;

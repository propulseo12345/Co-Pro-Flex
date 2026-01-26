'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, HelpCircle } from 'lucide-react';
import styles from './new-resolution.module.css';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import { ModeEcheancier, Echeance } from '@/types';
import { creerEcheancier, genererEcheances, getLibelleMode } from '@/lib/utils/echeancier';

// Clés de répartition basées sur les tantièmes de la copropriété
const CLES_REPARTITION = [
    { value: 'CHARGES_GENERALES', label: 'Charges générales' },
    { value: 'BATIMENT_A', label: 'Bâtiment A' },
    { value: 'BATIMENT_B', label: 'Bâtiment B' },
    { value: 'BATIMENT_C', label: 'Bâtiment C' },
    { value: 'PARKING', label: 'Parking' },
    { value: 'ESPACES_VERTS', label: 'Espaces verts' }
];

export default function NewResolutionPage() {
    const router = useRouter();
    const params = useParams();
    const agId = params.id as string;

    const [showAlert, setShowAlert] = useState(true);
    const [titre, setTitre] = useState('');
    const [majorite, setMajorite] = useState<MajorityType>('ART_24');
    const [cleRepartition, setCleRepartition] = useState('CHARGES_GENERALES');
    const [corps, setCorps] = useState('');

    // Nouveaux états pour les échéances d'appels de fonds
    const [estAppelFonds, setEstAppelFonds] = useState(false);
    const [modeEcheancier, setModeEcheancier] = useState<ModeEcheancier>('UNE_FOIS');
    const [montantTotal, setMontantTotal] = useState<number>(0);
    const [dateDebut, setDateDebut] = useState<string>('');
    const [nombreEcheancesPersonnalisees, setNombreEcheancesPersonnalisees] = useState<number>(2);
    const [echeances, setEcheances] = useState<Echeance[]>([]);

    // Fonction pour générer les échéances automatiquement
    const handleModeEcheancierChange = (newMode: ModeEcheancier) => {
        setModeEcheancier(newMode);
        if (montantTotal > 0 && dateDebut) {
            const nouvellesEcheances = genererEcheances(
                newMode,
                montantTotal,
                dateDebut,
                newMode === 'PERSONNALISE' ? nombreEcheancesPersonnalisees : undefined
            );
            setEcheances(nouvellesEcheances);
        }
    };

    const handleMontantOrDateChange = () => {
        if (montantTotal > 0 && dateDebut) {
            const nouvellesEcheances = genererEcheances(
                modeEcheancier,
                montantTotal,
                dateDebut,
                modeEcheancier === 'PERSONNALISE' ? nombreEcheancesPersonnalisees : undefined
            );
            setEcheances(nouvellesEcheances);
        }
    };

    const handleEcheanceChange = (index: number, field: 'dateExigibilite' | 'montantTotal', value: string | number) => {
        const nouvEcheances = [...echeances];
        nouvEcheances[index] = {
            ...nouvEcheances[index],
            [field]: value
        };
        setEcheances(nouvEcheances);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!titre.trim() || !corps.trim()) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        // Valider les échéances si c'est un appel de fonds
        if (estAppelFonds) {
            if (montantTotal <= 0) {
                alert('Veuillez saisir un montant total valide');
                return;
            }
            if (!dateDebut) {
                alert('Veuillez saisir une date de début');
                return;
            }
            if (echeances.length === 0) {
                alert('Veuillez générer les échéances');
                return;
            }
        }

        // Charger les résolutions existantes
        const savedResolutions = localStorage.getItem('ag-resolutions-' + agId);
        const resolutions = savedResolutions ? JSON.parse(savedResolutions) : [];

        // Créer l'échéancier si c'est un appel de fonds
        let echeancier = undefined;
        if (estAppelFonds) {
            echeancier = creerEcheancier(
                modeEcheancier,
                montantTotal,
                dateDebut,
                undefined,
                undefined,
                cleRepartition,
                modeEcheancier === 'PERSONNALISE' ? nombreEcheancesPersonnalisees : undefined
            );
            echeancier.echeances = echeances; // Utiliser les échéances modifiées
        }

        // Créer la nouvelle résolution
        const newResolution = {
            id: 'res-' + Date.now(),
            titre: titre.trim(),
            texte: corps.trim(),
            majorite: majorite,
            cleRepartition: cleRepartition,
            custom: true,
            estAppelFonds: estAppelFonds,
            echeancier: echeancier
        };

        // Ajouter à la liste
        resolutions.push(newResolution);
        localStorage.setItem('ag-resolutions-' + agId, JSON.stringify(resolutions));

        // Rediriger vers l'ordre du jour
        router.push(`/ag/${agId}/agenda`);
    };

    return (
        <div className="container">
            <div className={styles.header}>
                <button onClick={() => router.push(`/ag/${agId}/agenda`)} className={styles.backButton}>
                    <ArrowLeft size={20} aria-hidden="true" />
                    Retour à l'ordre du jour
                </button>
                <div>
                    <h1 className={styles.title}>Nouvelle résolution</h1>
                </div>
            </div>

            {showAlert && (
                <div className={styles.alertBox}>
                    <AlertTriangle size={20} className={styles.alertIcon} aria-hidden="true" />
                    <div className={styles.alertContent}>
                        <strong>Important</strong>
                        <p>
                            Pour les votes de <strong>budget courant ou de travaux</strong>, veuillez utiliser les résolutions déjà créées par Matera de vote de budget courant et de vote de travaux.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAlert(false)}
                        className={styles.alertClose}
                        aria-label="Fermer l'alerte"
                    >
                        ×
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Affichage du titre au-dessus du formulaire */}
                {titre && (
                    <div className={styles.titreAffichage}>
                        <h2>{titre}</h2>
                    </div>
                )}

                <div className={styles.formContent}>
                    {/* Titre de la résolution */}
                    <div className={styles.formGroup}>
                        <label htmlFor="titre" className={styles.label}>
                            Titre de la résolution
                        </label>
                        <input
                            type="text"
                            id="titre"
                            className={styles.input}
                            placeholder="Ex : Point d'information sur ..."
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            required
                        />
                    </div>

                    {/* Checkbox pour appel de fonds */}
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={estAppelFonds}
                                onChange={(e) => setEstAppelFonds(e.target.checked)}
                            />
                            <span>Cette résolution est un appel de fonds</span>
                        </label>
                    </div>

                    {/* Majorité */}
                    <div className={styles.formGroup}>
                        <label htmlFor="majorite" className={styles.label}>
                            Majorité
                        </label>
                        <div className={styles.selectWrapper}>
                            <select
                                id="majorite"
                                className={styles.select}
                                value={majorite}
                                onChange={(e) => setMajorite(e.target.value as MajorityType)}
                                required
                            >
                                {Object.entries(MAJORITES).map(([key, maj]) => (
                                    <option key={key} value={key}>
                                        {maj.nom} - {maj.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <a href="#" className={styles.helpLink} onClick={(e) => { e.preventDefault(); alert('Les majorités déterminent le seuil de votes nécessaires pour adopter une résolution. Article 24 : majorité simple des voix exprimées. Article 25 : majorité absolue (50% + 1). Article 25-1 et 26 : double majorité. Unanimité : 100% des copropriétaires.'); }}>
                            <HelpCircle size={16} aria-hidden="true" />
                            Comprendre les majorités
                        </a>
                    </div>

                    {/* Clé de répartition */}
                    <div className={styles.formGroup}>
                        <label htmlFor="cleRepartition" className={styles.label}>
                            Clé de répartition
                        </label>
                        <div className={styles.selectWrapper}>
                            <select
                                id="cleRepartition"
                                className={styles.select}
                                value={cleRepartition}
                                onChange={(e) => setCleRepartition(e.target.value)}
                                required
                            >
                                {CLES_REPARTITION.map(cle => (
                                    <option key={cle.value} value={cle.value}>
                                        {cle.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <a href="#" className={styles.helpLink} onClick={(e) => { e.preventDefault(); alert('La clé de répartition détermine comment les charges seront réparties entre les copropriétaires. Choisissez la clé la plus appropriée selon le type de résolution.'); }}>
                            <HelpCircle size={16} aria-hidden="true" />
                            Bien choisir la clé de répartition
                        </a>
                    </div>

                    {/* Corps de la résolution */}
                    <div className={styles.formGroup}>
                        <label htmlFor="corps" className={styles.label}>
                            Corps de la résolution
                        </label>
                        <textarea
                            id="corps"
                            className={styles.textarea}
                            placeholder="Ajouter ici le corps de votre résolution"
                            value={corps}
                            onChange={(e) => setCorps(e.target.value)}
                            rows={10}
                            required
                        />
                    </div>

                    {/* Section Échéancier d'appels de fonds */}
                    {estAppelFonds && (
                        <div className={styles.echeancierSection}>
                            <h3 className={styles.sectionTitle}>Échéancier d'appels de fonds</h3>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="montantTotal" className={styles.label}>
                                        Montant total
                                    </label>
                                    <input
                                        type="number"
                                        id="montantTotal"
                                        className={styles.input}
                                        placeholder="0.00"
                                        step="0.01"
                                        value={montantTotal || ''}
                                        onChange={(e) => {
                                            setMontantTotal(parseFloat(e.target.value) || 0);
                                            setTimeout(handleMontantOrDateChange, 100);
                                        }}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="dateDebut" className={styles.label}>
                                        Date de début
                                    </label>
                                    <input type="date" id="dateDebut" className={styles.input} value={dateDebut} onChange={(e) => {
                                            setDateDebut(e.target.value);
                                            setTimeout(handleMontantOrDateChange, 100);}}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="modeEcheancier" className={styles.label}>
                                    Mode de paiement
                                </label>
                                <div className={styles.selectWrapper}>
                                    <select
                                        id="modeEcheancier"
                                        className={styles.select}
                                        value={modeEcheancier}
                                        onChange={(e) => handleModeEcheancierChange(e.target.value as ModeEcheancier)}
                                    >
                                        <option value="UNE_FOIS">Paiement en une fois</option>
                                        <option value="SEMESTRIEL">Paiement semestriel (2 échéances)</option>
                                        <option value="TRIMESTRIEL">Paiement trimestriel (4 échéances)</option>
                                        <option value="PERSONNALISE">Échéancier personnalisé</option>
                                    </select>
                                </div>
                            </div>

                            {modeEcheancier === 'PERSONNALISE' && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="nombreEcheances" className={styles.label}>
                                        Nombre d'échéances
                                    </label>
                                    <input type="number" id="nombreEcheances" className={styles.input} min="1" max="12" value={nombreEcheancesPersonnalisees} onChange={(e) => {
                                            setNombreEcheancesPersonnalisees(parseInt(e.target.value) || 2);
                                            setTimeout(handleMontantOrDateChange, 100);}}
                                    />
                                </div>
                            )}

                            {/* Affichage des échéances générées */}
                            {echeances.length > 0 && (
                                <div className={styles.echeancesList}>
                                    <h4 className={styles.echeancesTitle}>Échéances générées</h4>
                                    {echeances.map((echeance, index) => (
                                        <div key={echeance.id} className={styles.echeanceItem}>
                                            <div className={styles.echeanceNum}>#{index + 1}</div>
                                            <div className={styles.echeanceFields}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Date d'exigibilité</label>
                                                    <input type="date" className={styles.input} value={echeance.dateExigibilite} onChange={(e) => handleEcheanceChange(index, 'dateExigibilite', e.target.value)}
                                                    />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Montant</label>
                                                    <input type="number" className={styles.input} step="0.01" value={echeance.montantTotal} onChange={(e) => handleEcheanceChange(index, 'montantTotal', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                {echeance.description && (
                                                    <div className={styles.echeanceDescription}>
                                                        {echeance.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                    >
                        Ajouter à l'ordre du jour
                    </button>
                </div>
            </form>
        </div>
    );
}


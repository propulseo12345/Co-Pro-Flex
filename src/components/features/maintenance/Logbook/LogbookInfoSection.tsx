'use client';

import {
    Building2,
    Eye,
    EyeOff,
    Edit3,
    X,
    Save,
    Settings,
    ChevronRight,
    Phone
} from 'lucide-react';
import clsx from 'clsx';
import type { LogbookInfoSectionProps } from './types';
import { LogbookContactsSection } from './LogbookContactsSection';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function LogbookInfoSection({
    formData,
    coproprieteInfo,
    isEditing,
    isSimplifiedView,
    equipementsPrincipaux,
    onFormDataChange,
    onToggleEdit,
    onToggleSimplifiedView,
    onSaveInfo,
    onSelectEquipement
}: LogbookInfoSectionProps) {
    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    <Building2 size={20} aria-hidden="true" /> Informations générales
                </h2>
                <div className={styles.sectionActions}>
                    <button
                        className={clsx(styles.viewToggle, isSimplifiedView && styles.active)}
                        onClick={onToggleSimplifiedView}
                        title={isSimplifiedView ? 'Vue détaillée' : 'Vue simplifiée'}
                    >
                        {isSimplifiedView ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
                        {isSimplifiedView ? 'Détails' : 'Simplifier'}
                    </button>
                    {isEditing ? (
                        <>
                            <button className="btn btn-sm btn-secondary" onClick={onToggleEdit}>
                                <X size={14} aria-hidden="true" /> Annuler
                            </button>
                            <button className="btn btn-sm btn-primary" onClick={onSaveInfo}>
                                <Save size={14} aria-hidden="true" /> Enregistrer
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-sm btn-secondary" onClick={onToggleEdit}>
                            <Edit3 size={14} aria-hidden="true" /> Modifier
                        </button>
                    )}
                </div>
            </div>

            {/* Vue simplifiée */}
            {isSimplifiedView ? (
                <div className={styles.simplifiedView}>
                    <div className={styles.simplifiedMain}>
                        <h3 className={styles.simplifiedName}>{formData.nom}</h3>
                        <p className={styles.simplifiedAddress}>
                            {formData.adresse}, {formData.codePostal} {formData.ville}
                        </p>
                    </div>
                    <div className={styles.simplifiedStats}>
                        <div className={styles.simplifiedStat}>
                            <span className={styles.statValue}>{formData.anneeConstruction}</span>
                            <span className={styles.statLabel}>Construction</span>
                        </div>
                        <div className={styles.simplifiedStat}>
                            <span className={styles.statValue}>{formData.nombreBatiments}</span>
                            <span className={styles.statLabel}>Bâtiments</span>
                        </div>
                        <div className={styles.simplifiedStat}>
                            <span className={styles.statValue}>{formData.nombreLots}</span>
                            <span className={styles.statLabel}>Lots</span>
                        </div>
                        <div className={styles.simplifiedStat}>
                            <span className={styles.statValue}>{equipementsPrincipaux.length}</span>
                            <span className={styles.statLabel}>Équipements</span>
                        </div>
                    </div>
                    <div className={styles.simplifiedSyndic}>
                        <span>Syndic: </span>
                        <strong>{formData.syndicNom}</strong>
                        <span className={styles.simplifiedContact}>{formData.syndicTelephone}</span>
                    </div>
                </div>
            ) : (
                /* Vue détaillée */
                <div className={styles.infoGrid}>
                    <div className={styles.infoCard}>
                        <h3>Copropriété</h3>
                        {isEditing ? (
                            <div className={styles.editForm}>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={(e) => onFormDataChange({ ...formData, nom: e.target.value })}
                                    placeholder="Nom de la copropriété"
                                    className={styles.editInput}
                                />
                                <input
                                    type="text"
                                    value={formData.adresse}
                                    onChange={(e) => onFormDataChange({ ...formData, adresse: e.target.value })}
                                    placeholder="Adresse"
                                    className={styles.editInput}
                                />
                                <div className={styles.editRow}>
                                    <input
                                        type="text"
                                        value={formData.codePostal}
                                        onChange={(e) => onFormDataChange({ ...formData, codePostal: e.target.value })}
                                        placeholder="Code postal"
                                        className={styles.editInput}
                                    />
                                    <input
                                        type="text"
                                        value={formData.ville}
                                        onChange={(e) => onFormDataChange({ ...formData, ville: e.target.value })}
                                        placeholder="Ville"
                                        className={styles.editInput}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className={styles.buildingName}>{formData.nom}</p>
                                <p>{formData.adresse}</p>
                                <p>{formData.codePostal} {formData.ville}</p>
                            </>
                        )}
                    </div>
                    <div className={styles.infoCard}>
                        <h3>Caractéristiques</h3>
                        {isEditing ? (
                            <div className={styles.editForm}>
                                <div className={styles.editFieldRow}>
                                    <label>Année de construction</label>
                                    <input type="number" value={formData.anneeConstruction} onChange={(e) => onFormDataChange({ ...formData, anneeConstruction: parseInt(e.target.value)})}
                                        className={styles.editInputSmall}
                                    />
                                </div>
                                <div className={styles.editFieldRow}>
                                    <label>Nombre de bâtiments</label>
                                    <input type="number" value={formData.nombreBatiments} onChange={(e) => onFormDataChange({ ...formData, nombreBatiments: parseInt(e.target.value)})}
                                        className={styles.editInputSmall}
                                    />
                                </div>
                                <div className={styles.editFieldRow}>
                                    <label>Nombre de lots</label>
                                    <input type="number" value={formData.nombreLots} onChange={(e) => onFormDataChange({ ...formData, nombreLots: parseInt(e.target.value)})}
                                        className={styles.editInputSmall}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={styles.infoRow}>
                                    <span>Année de construction:</span>
                                    <strong>{formData.anneeConstruction}</strong>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>Nombre de bâtiments:</span>
                                    <strong>{formData.nombreBatiments}</strong>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>Nombre de lots:</span>
                                    <strong>{formData.nombreLots}</strong>
                                </div>
                            </>
                        )}
                    </div>
                    <div className={styles.infoCard}>
                        <h3>Équipements principaux</h3>
                        <p className={styles.equipmentHint}>Cliquez pour voir les contrats et interventions</p>
                        <ul className={styles.equipmentList}>
                            {equipementsPrincipaux.map((eq, index) => (
                                <li
                                    key={index}
                                    className={styles.equipmentItem}
                                    onClick={() => onSelectEquipement(eq)}
                                >
                                    <Settings size={14} aria-hidden="true" />
                                    <span>{eq}</span>
                                    <ChevronRight size={14} className={styles.equipmentArrow} aria-hidden="true" />
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Section Contacts - Vue compacte pour l'édition */}
                    {isEditing ? (
                        <div className={styles.infoCard}>
                            <h3>Contacts Syndic</h3>
                            <div className={styles.editForm}>
                                <p className={styles.editLabel}>Syndic</p>
                                <input
                                    type="text"
                                    value={formData.syndicNom}
                                    onChange={(e) => onFormDataChange({ ...formData, syndicNom: e.target.value })}
                                    placeholder="Nom du syndic"
                                    className={styles.editInput}
                                />
                                <input
                                    type="tel"
                                    value={formData.syndicTelephone}
                                    onChange={(e) => onFormDataChange({ ...formData, syndicTelephone: e.target.value })}
                                    placeholder="Téléphone"
                                    className={styles.editInput}
                                />
                                <input
                                    type="email"
                                    value={formData.syndicEmail}
                                    onChange={(e) => onFormDataChange({ ...formData, syndicEmail: e.target.value })}
                                    placeholder="Email"
                                    className={styles.editInput}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Section Contacts Complète - Affichée uniquement en mode lecture */}
            {!isSimplifiedView && !isEditing && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Phone size={20} aria-hidden="true" /> Carnet de contacts
                        </h2>
                    </div>
                    <LogbookContactsSection coproprieteInfo={coproprieteInfo} />
                </div>
            )}
        </div>
    );
}

'use client';

import {
    Building2,
    Edit3,
    X,
    Save,
    Phone,
    Mail,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Shield,
    User,
} from 'lucide-react';
import { useState } from 'react';
import type { LogbookInfoSectionProps } from './types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

// Couleurs par type d'équipement
const EQUIP_COLORS: Record<string, string> = {
    Ascenseur: '#5b8def',
    'Chaudière': '#e5a63e',
    VMC: '#3ecf8e',
    Toiture: '#9b8afb',
    Espaces: '#3ecf8e',
    Portail: '#5b8def',
    Interphone: '#7b8498',
};

function getEquipColor(name: string): string {
    for (const [key, color] of Object.entries(EQUIP_COLORS)) {
        if (name.toLowerCase().includes(key.toLowerCase())) return color;
    }
    return '#7b8498';
}

// Contacts clés extraits du coproprieteInfo
function ContactsCompact({ coproprieteInfo }: { coproprieteInfo: LogbookInfoSectionProps['coproprieteInfo'] }) {
    const { syndic, gestionnaire, gardien, conseilSyndical, servicesUrgence, assurance } = coproprieteInfo;
    const president = conseilSyndical?.membres.find(m => m.role === 'PRESIDENT');

    const contacts: Array<{
        role: string;
        name: string;
        tel?: string;
        email?: string;
        color: string;
        icon: typeof Building2;
    }> = [];

    contacts.push({
        role: 'Syndic',
        name: syndic.nom,
        tel: syndic.telephone,
        email: syndic.email,
        color: '#5b8def',
        icon: Building2,
    });

    if (gardien) {
        contacts.push({
            role: 'Gardien',
            name: gardien.nom,
            tel: gardien.telephone,
            email: gardien.email,
            color: '#3ecf8e',
            icon: User,
        });
    }

    if (president) {
        contacts.push({
            role: 'Président CS',
            name: president.nom,
            tel: president.telephone || undefined,
            email: president.email,
            color: '#9b8afb',
            icon: Shield,
        });
    }

    if (gestionnaire) {
        contacts.push({
            role: 'Gestionnaire',
            name: gestionnaire.nom,
            tel: gestionnaire.telephone,
            email: gestionnaire.email,
            color: '#5b8def',
            icon: User,
        });
    }

    const urgenceGaz = servicesUrgence?.find(s => s.type === 'URGENCE_GAZ');
    if (urgenceGaz) {
        contacts.push({
            role: 'Urgence Gaz',
            name: urgenceGaz.nom,
            tel: urgenceGaz.telephone,
            color: '#e35d6a',
            icon: AlertTriangle,
        });
    }

    if (assurance) {
        contacts.push({
            role: 'Assurance',
            name: `${assurance.compagnie}`,
            tel: assurance.telephoneSinistre || assurance.telephone,
            color: '#e5a63e',
            icon: Shield,
        });
    }

    return (
        <div className={styles.v2ContactList}>
            {contacts.map(c => {
                const I = c.icon;
                return (
                    <div key={c.role} className={styles.v2ContactItem}>
                        <div className={styles.v2ContactIcon} style={{ background: c.color + '12', color: c.color }}>
                            <I size={12} />
                        </div>
                        <div className={styles.v2ContactInfo}>
                            <div className={styles.v2ContactRole}>{c.role}</div>
                            <div className={styles.v2ContactName}>{c.name}</div>
                        </div>
                        <div className={styles.v2ContactActions}>
                            {c.tel && (
                                <a href={`tel:${c.tel.replace(/\s/g, '')}`} className={styles.v2ContactBtn} title={c.tel}>
                                    <Phone size={11} />
                                </a>
                            )}
                            {c.email && (
                                <a href={`mailto:${c.email}`} className={styles.v2ContactBtn} title={c.email}>
                                    <Mail size={11} />
                                </a>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function LogbookInfoSection({
    formData,
    coproprieteInfo,
    isEditing,
    equipementsPrincipaux,
    onFormDataChange,
    onToggleEdit,
    onSaveInfo,
    onSelectEquipement
}: LogbookInfoSectionProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);

    return (
        <div className={styles.v2InfoSection}>
            {/* Ligne résumé */}
            <div className={styles.v2InfoBar}>
                <div className={styles.v2InfoBarLeft}>
                    <Building2 size={16} className={styles.v2InfoBarIcon} />
                    <span className={styles.v2InfoBarName}>{formData.nom}</span>
                    <span className={styles.v2InfoBarSep}>·</span>
                    <span className={styles.v2InfoBarDetail}>{formData.adresse}, {formData.codePostal} {formData.ville}</span>
                    <span className={styles.v2InfoBarSep}>·</span>
                    <span className={styles.v2InfoBarDetail}>{formData.nombreLots} lots — {formData.nombreBatiments} bât. — {formData.anneeConstruction}</span>
                </div>
                <div className={styles.v2InfoBarActions}>
                    {isEditing ? (
                        <>
                            <button className="btn btn-sm btn-secondary" onClick={onToggleEdit}>
                                <X size={14} /> Annuler
                            </button>
                            <button className="btn btn-sm btn-primary" onClick={onSaveInfo}>
                                <Save size={14} /> Enregistrer
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-sm btn-secondary" onClick={onToggleEdit}>
                            <Edit3 size={14} /> Modifier
                        </button>
                    )}
                    <button className={styles.v2InfoBarToggle} onClick={() => setDetailsOpen(!detailsOpen)}>
                        {detailsOpen ? 'Masquer' : 'Voir détails'}
                        {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Détails dépliables — 3 colonnes */}
            {detailsOpen && !isEditing && (
                <div className={styles.v2InfoBody}>
                    <div className={styles.v2InfoGrid3}>
                        {/* Copropriété compact */}
                        <div className={styles.v2InfoBlock}>
                            <div className={styles.v2InfoBlockHeader}>
                                <span className={styles.v2InfoBlockAccent} />
                                <span className={styles.v2InfoBlockTitle}>Copropriété</span>
                            </div>
                            <div className={styles.v2InfoCompact}>
                                <div className={styles.v2InfoCompactRow}>
                                    <span className={styles.v2InfoCompactLabel}>Adresse</span>
                                    <span className={styles.v2InfoCompactValue}>{formData.adresse}, {formData.codePostal} {formData.ville}</span>
                                </div>
                                <div className={styles.v2InfoCompactRow}>
                                    <span className={styles.v2InfoCompactLabel}>Construction</span>
                                    <span className={styles.v2InfoCompactValue}>{formData.anneeConstruction}</span>
                                </div>
                                <div className={styles.v2InfoCompactRow}>
                                    <span className={styles.v2InfoCompactLabel}>Bâtiments / Lots</span>
                                    <span className={styles.v2InfoCompactValue}>{formData.nombreBatiments} bâtiments — {formData.nombreLots} lots</span>
                                </div>
                                <div className={styles.v2InfoCompactRow}>
                                    <span className={styles.v2InfoCompactLabel}>Syndic</span>
                                    <span className={styles.v2InfoCompactValue}>{formData.syndicNom}</span>
                                </div>
                            </div>
                        </div>

                        {/* Équipements chips */}
                        <div className={styles.v2InfoBlock}>
                            <div className={styles.v2InfoBlockHeader}>
                                <span className={styles.v2InfoBlockAccent} />
                                <span className={styles.v2InfoBlockTitle}>Équipements principaux</span>
                            </div>
                            <div className={styles.v2EquipGrid}>
                                {equipementsPrincipaux.map((eq) => (
                                    <button key={eq} className={styles.v2EquipChip} onClick={() => onSelectEquipement(eq)}>
                                        <span className={styles.v2EquipDot} style={{ background: getEquipColor(eq) }} />
                                        <span className={styles.v2EquipName}>{eq}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contacts clés */}
                        <div className={styles.v2InfoBlock}>
                            <div className={styles.v2InfoBlockHeader}>
                                <span className={styles.v2InfoBlockAccent} />
                                <span className={styles.v2InfoBlockTitle}>Contacts clés</span>
                            </div>
                            <ContactsCompact coproprieteInfo={coproprieteInfo} />
                        </div>
                    </div>
                </div>
            )}

            {/* Mode édition */}
            {detailsOpen && isEditing && (
                <div className={styles.v2InfoBody}>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoCard}>
                            <h3>Copropriété</h3>
                            <div className={styles.editForm}>
                                <input type="text" value={formData.nom} onChange={(e) => onFormDataChange({ ...formData, nom: e.target.value })} placeholder="Nom" className={styles.editInput} />
                                <input type="text" value={formData.adresse} onChange={(e) => onFormDataChange({ ...formData, adresse: e.target.value })} placeholder="Adresse" className={styles.editInput} />
                                <div className={styles.editRow}>
                                    <input type="text" value={formData.codePostal} onChange={(e) => onFormDataChange({ ...formData, codePostal: e.target.value })} placeholder="Code postal" className={styles.editInput} />
                                    <input type="text" value={formData.ville} onChange={(e) => onFormDataChange({ ...formData, ville: e.target.value })} placeholder="Ville" className={styles.editInput} />
                                </div>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <h3>Caractéristiques</h3>
                            <div className={styles.editForm}>
                                <div className={styles.editFieldRow}><label>Année</label><input type="number" value={formData.anneeConstruction} onChange={(e) => onFormDataChange({ ...formData, anneeConstruction: parseInt(e.target.value) })} className={styles.editInputSmall} /></div>
                                <div className={styles.editFieldRow}><label>Bâtiments</label><input type="number" value={formData.nombreBatiments} onChange={(e) => onFormDataChange({ ...formData, nombreBatiments: parseInt(e.target.value) })} className={styles.editInputSmall} /></div>
                                <div className={styles.editFieldRow}><label>Lots</label><input type="number" value={formData.nombreLots} onChange={(e) => onFormDataChange({ ...formData, nombreLots: parseInt(e.target.value) })} className={styles.editInputSmall} /></div>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <h3>Syndic</h3>
                            <div className={styles.editForm}>
                                <input type="text" value={formData.syndicNom} onChange={(e) => onFormDataChange({ ...formData, syndicNom: e.target.value })} placeholder="Nom du syndic" className={styles.editInput} />
                                <input type="tel" value={formData.syndicTelephone} onChange={(e) => onFormDataChange({ ...formData, syndicTelephone: e.target.value })} placeholder="Téléphone" className={styles.editInput} />
                                <input type="email" value={formData.syndicEmail} onChange={(e) => onFormDataChange({ ...formData, syndicEmail: e.target.value })} placeholder="Email" className={styles.editInput} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

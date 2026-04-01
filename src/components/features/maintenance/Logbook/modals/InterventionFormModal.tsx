'use client';

import {
    Plus,
    Edit3,
    X,
    Save
} from 'lucide-react';
import clsx from 'clsx';
import type { InterventionFormModalProps } from '../types';
import { EquipementCombobox } from '../EquipementCombobox';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function InterventionFormModal({
    isOpen,
    isEditing,
    formData,
    equipementsPrincipaux,
    prestataires,
    isSubmitting,
    onFormDataChange,
    onSubmit,
    onClose
}: InterventionFormModalProps) {
    if (!isOpen) return null;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem',
    };
    const modalStyle: React.CSSProperties = {
        background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 600,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(148, 163, 184, 0.08)',
    };
    const headerStyle: React.CSSProperties = {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
    };
    const titleStyle: React.CSSProperties = {
        margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)',
        display: 'flex', alignItems: 'center', gap: 10,
    };
    const closeStyle: React.CSSProperties = {
        background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer',
        padding: 6, borderRadius: 6, display: 'flex',
    };
    const contentStyle: React.CSSProperties = {
        flex: 1, overflowY: 'auto', padding: 24,
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600,
        color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
    };
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px',
        border: '1px solid rgba(148, 163, 184, 0.08)', borderRadius: 8,
        fontSize: 13, color: 'var(--text-main)', background: 'var(--bg-secondary)',
        fontFamily: 'inherit', outline: 'none',
    };
    const textareaStyle: React.CSSProperties = {
        ...inputStyle, minHeight: 80, resize: 'vertical',
    };
    const rowStyle: React.CSSProperties = {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
    };
    const groupStyle: React.CSSProperties = { marginBottom: 16 };
    const footerStyle: React.CSSProperties = {
        padding: '12px 24px', borderTop: '1px solid rgba(148, 163, 184, 0.08)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
    };
    const btnCancelStyle: React.CSSProperties = {
        padding: '8px 16px', background: 'var(--bg-secondary)',
        border: '1px solid rgba(148, 163, 184, 0.08)', borderRadius: 8,
        color: 'var(--text-main)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
    };
    const btnSubmitStyle: React.CSSProperties = {
        padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 8,
        color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
    };

    return (
        <div style={overlayStyle} aria-hidden="true" onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div style={headerStyle}>
                    <h3 style={titleStyle}>
                        {isEditing ? <Edit3 size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                        {isEditing ? " Modifier l'intervention" : ' Nouvelle intervention'}
                    </h3>
                    <button style={closeStyle} onClick={onClose} aria-label="Fermer"><X size={18} aria-hidden="true" /></button>
                </div>
                <div style={contentStyle}>
                    <div style={groupStyle}>
                        <label style={labelStyle}>Titre</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={formData.titre}
                            onChange={(e) => onFormDataChange({ ...formData, titre: e.target.value })}
                            placeholder="Titre de l'intervention"
                        />
                    </div>
                    <div style={groupStyle}>
                        <label style={labelStyle}>Description</label>
                        <textarea
                            style={textareaStyle}
                            value={formData.description}
                            onChange={(e) => onFormDataChange({ ...formData, description: e.target.value})}
                            placeholder="Description détaillée de l'intervention"
                        />
                    </div>
                    <div style={{ ...rowStyle, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Date</label>
                            <input type="date" style={inputStyle} value={formData.date} onChange={(e) => onFormDataChange({ ...formData, date: e.target.value})} />
                        </div>
                        <div>
                            <label style={labelStyle}>Catégorie</label>
                            <select
                                style={inputStyle}
                                value={formData.categorie}
                                onChange={(e) => onFormDataChange({ ...formData, categorie: e.target.value as 'COURANTE' | 'TRAVAUX_IMPORTANTS'})}
                            >
                                <option value="COURANTE">Intervention courante</option>
                                <option value="TRAVAUX_IMPORTANTS">Travaux importants</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ ...rowStyle, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Type</label>
                            <select
                                style={inputStyle}
                                value={formData.type}
                                onChange={(e) => onFormDataChange({ ...formData, type: e.target.value as 'ENTRETIEN' | 'REPARATION' | 'INSPECTION'})}
                            >
                                <option value="ENTRETIEN">Entretien</option>
                                <option value="REPARATION">Réparation</option>
                                <option value="INSPECTION">Inspection</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Statut</label>
                            <select
                                style={inputStyle}
                                value={formData.statut}
                                onChange={(e) => onFormDataChange({ ...formData, statut: e.target.value as 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE'})}
                            >
                                <option value="PLANIFIEE">Planifiée</option>
                                <option value="EN_COURS">En cours</option>
                                <option value="TERMINEE">Terminée</option>
                            </select>
                        </div>
                    </div>
                    <div style={groupStyle}>
                        <label style={labelStyle}>Prestataire</label>
                        <select
                            style={inputStyle}
                            value={formData.prestataireId}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__new__') {
                                    onFormDataChange({ ...formData, prestataireId: '__new__', nouveauPrestataire: '', intervenant: '' });
                                } else {
                                    const prest = prestataires.find(p => p.id === val);
                                    onFormDataChange({ ...formData, prestataireId: val, nouveauPrestataire: '', intervenant: prest?.nom || '' });
                                }
                            }}
                        >
                            <option value="">— Sélectionner un prestataire —</option>
                            {prestataires.map(p => (
                                <option key={p.id} value={p.id}>{p.nom}</option>
                            ))}
                            <option value="__new__">+ Créer un nouveau prestataire</option>
                        </select>
                    </div>
                    {formData.prestataireId === '__new__' && (
                        <div style={groupStyle}>
                            <label style={labelStyle}>Nom du nouveau prestataire</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.nouveauPrestataire}
                                onChange={(e) => onFormDataChange({ ...formData, nouveauPrestataire: e.target.value, intervenant: e.target.value })}
                                placeholder="Nom de la société ou de l'intervenant"
                                autoFocus
                            />
                        </div>
                    )}
                    <div style={{ ...rowStyle, marginBottom: 16 }}>
                        <EquipementCombobox
                            value={formData.equipementConcerne}
                            equipementsPrincipaux={equipementsPrincipaux}
                            onChange={(equipement) => onFormDataChange({ ...formData, equipementConcerne: equipement })}
                            placeholder="Rechercher ou créer un équipement..."
                        />
                        <div>
                            <label style={labelStyle}>Coût (€)</label>
                            <input type="number" style={inputStyle} value={formData.cout} onChange={(e) => onFormDataChange({ ...formData, cout: e.target.value})}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>
                </div>
                <div style={footerStyle}>
                    <button style={btnCancelStyle} onClick={onClose}>
                        Annuler
                    </button>
                    <button style={{ ...btnSubmitStyle, opacity: isSubmitting ? 0.6 : 1 }} onClick={onSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            'Enregistrement...'
                        ) : isEditing ? (
                            <><Save size={14} aria-hidden="true" /> Enregistrer</>
                        ) : (
                            <><Plus size={14} aria-hidden="true" /> Créer l&apos;intervention</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

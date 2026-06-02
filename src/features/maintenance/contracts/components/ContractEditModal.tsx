'use client';

import { ContractEditForm } from '../hooks/useContractDetailPage';
import type { ContractType } from '@/types/domain';
import { Prestataire } from '@/types';
import { X, Save, FileText } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { isValid, parseISO, format } from 'date-fns';

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'ascenseur', label: 'Ascenseur' },
    { value: 'chauffage', label: 'Chauffage' },
    { value: 'nettoyage', label: 'Nettoyage' },
    { value: 'espaces_verts', label: 'Espaces verts' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'assurance', label: 'Assurance' },
    { value: 'autre', label: 'Autre' },
];

interface ContractEditModalProps {
    editForm: ContractEditForm;
    prestataires: Prestataire[];
    onFormChange: (form: ContractEditForm) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function ContractEditModal({ editForm, prestataires, onFormChange, onSave, onCancel }: ContractEditModalProps) {
    const overlay: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem',
    };
    const modal: React.CSSProperties = {
        background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 640,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        border: '1px solid rgba(148,163,184,0.08)',
    };
    const header: React.CSSProperties = {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid rgba(148,163,184,0.08)',
    };
    const lbl: React.CSSProperties = {
        display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600,
        color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
    };
    const input: React.CSSProperties = {
        width: '100%', padding: '10px 14px',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 8,
        fontSize: 13, color: 'var(--text-main)', background: 'var(--bg-secondary)',
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    };
    const textarea: React.CSSProperties = { ...input, minHeight: 70, resize: 'vertical' };
    const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
    const group: React.CSSProperties = { marginBottom: 16 };
    const footer: React.CSSProperties = {
        padding: '12px 24px', borderTop: '1px solid rgba(148,163,184,0.08)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
    };
    const btnCancel: React.CSSProperties = {
        padding: '8px 16px', background: 'var(--bg-secondary)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 8,
        color: 'var(--text-main)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 6,
    };
    const btnSubmit: React.CSSProperties = {
        padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 8,
        color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
    };
    const checkLabel: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        color: 'var(--text-main)', cursor: 'pointer', paddingTop: 22,
    };

    return (
        <div style={overlay} onClick={onCancel}>
            <div style={modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div style={header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={18} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>Modifier le contrat</span>
                    </div>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 6, borderRadius: 6 }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    {/* Libellé + Numéro */}
                    <div style={row}>
                        <div style={group}>
                            <label style={lbl}>Libellé du contrat <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input style={input} value={editForm.nom}
                                onChange={e => onFormChange({ ...editForm, nom: e.target.value })} />
                        </div>
                        <div style={group}>
                            <label style={lbl}>Numéro de contrat</label>
                            <input style={input} value={editForm.numeroContrat}
                                onChange={e => onFormChange({ ...editForm, numeroContrat: e.target.value })} />
                        </div>
                    </div>

                    {/* Type + Prestataire */}
                    <div style={row}>
                        <div style={group}>
                            <label style={lbl}>Type de contrat <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select style={input} value={editForm.type}
                                onChange={e => onFormChange({ ...editForm, type: e.target.value as ContractType | '' })}>
                                <option value="">— Sélectionner —</option>
                                {CONTRACT_TYPE_OPTIONS.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={group}>
                            <label style={lbl}>Prestataire</label>
                            <select style={input} value={editForm.prestataireId}
                                onChange={e => onFormChange({ ...editForm, prestataireId: e.target.value })}>
                                <option value="">— Sélectionner —</option>
                                {prestataires.map(p => (
                                    <option key={p.id} value={p.id}>{p.nom}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div style={group}>
                        <label style={lbl}>Description</label>
                        <textarea style={textarea} value={editForm.description}
                            onChange={e => onFormChange({ ...editForm, description: e.target.value })}
                            rows={3} />
                    </div>

                    {/* Dates */}
                    <div style={{ ...row, marginBottom: 16 }}>
                        <DatePicker
                            label="Date de début"
                            value={editForm.dateDebut ? parseISO(editForm.dateDebut) : null}
                            onChange={(date) => {
                                if (date && isValid(date)) {
                                    onFormChange({ ...editForm, dateDebut: format(date, 'yyyy-MM-dd') });
                                } else {
                                    onFormChange({ ...editForm, dateDebut: '' });
                                }
                            }}
                            required
                        />
                        <DatePicker
                            label="Date de fin"
                            value={editForm.dateFin ? parseISO(editForm.dateFin) : null}
                            onChange={(date) => {
                                if (date && isValid(date)) {
                                    onFormChange({ ...editForm, dateFin: format(date, 'yyyy-MM-dd') });
                                } else {
                                    onFormChange({ ...editForm, dateFin: '' });
                                }
                            }}
                            required
                            minDate={editForm.dateDebut ? parseISO(editForm.dateDebut) : undefined}
                        />
                    </div>

                    {/* Coût + Délai */}
                    <div style={row}>
                        <div style={group}>
                            <label style={lbl}>Coût annuel (€) <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input type="number" step="0.01" style={input} value={editForm.coutAnnuel}
                                onChange={e => onFormChange({ ...editForm, coutAnnuel: e.target.value })} />
                        </div>
                        <div style={group}>
                            <label style={lbl}>Délai de résiliation (jours)</label>
                            <input type="number" style={input} value={editForm.delaiResiliation}
                                onChange={e => onFormChange({ ...editForm, delaiResiliation: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>

                    {/* Tacite reconduction */}
                    <div style={group}>
                        <label style={checkLabel}>
                            <input type="checkbox" checked={editForm.taciteReconduction}
                                onChange={e => onFormChange({ ...editForm, taciteReconduction: e.target.checked })}
                                style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
                            Tacite reconduction
                        </label>
                    </div>
                </div>

                <div style={footer}>
                    <button style={btnCancel} onClick={onCancel}>
                        <X size={14} /> Annuler
                    </button>
                    <button style={btnSubmit} onClick={onSave}>
                        <Save size={14} /> Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}

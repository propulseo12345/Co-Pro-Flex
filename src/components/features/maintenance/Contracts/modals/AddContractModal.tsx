'use client';

import { useState } from 'react';
import { ContratDetaille, TypeContrat } from '@/types';
import { TYPES_CONTRAT } from '@/lib/constants/categories-contrat';
import { Plus, Upload, X, FileText } from 'lucide-react';
import { isValid, parseISO, format } from 'date-fns';
import { DatePicker } from '@/components/ui/DatePicker';
import { generateId } from '../utils';

interface AddContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    prestataires: { id: string; nom: string }[];
    onAdd: (contrat: ContratDetaille) => void;
}

export default function AddContractModal({ isOpen, onClose, prestataires, onAdd }: AddContractModalProps) {
    const [formData, setFormData] = useState({
        libelle: '',
        numeroContrat: '',
        type: '' as TypeContrat | '',
        prestataireId: '',
        description: '',
        conditionsParticulieres: '',
        dateDebut: '',
        dateFin: '',
        taciteReconduction: false,
        delaiResiliation: 30,
        coutAnnuel: '',
        fichierPDF: '',
        estReglementaire: false
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.libelle.trim()) newErrors.libelle = 'Le libellé est requis';
        if (!formData.type) newErrors.type = 'Le type est requis';
        if (!formData.prestataireId) newErrors.prestataireId = 'Le prestataire est requis';
        if (!formData.dateDebut) newErrors.dateDebut = 'La date de début est requise';
        if (!formData.dateFin) newErrors.dateFin = 'La date de fin est requise';
        if (!formData.coutAnnuel || parseFloat(formData.coutAnnuel) <= 0) {
            newErrors.coutAnnuel = 'Le coût annuel est requis';
        }
        if (formData.dateDebut && formData.dateFin && formData.dateDebut > formData.dateFin) {
            newErrors.dateFin = 'La date de fin doit être après la date de début';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const prestataire = prestataires.find(p => p.id === formData.prestataireId);

        const newContrat: ContratDetaille = {
            id: generateId(),
            nom: formData.libelle,
            numeroContrat: formData.numeroContrat || undefined,
            prestataireId: formData.prestataireId,
            fournisseur: prestataire?.nom || '',
            type: formData.type as TypeContrat,
            dateDebut: formData.dateDebut,
            dateFin: formData.dateFin,
            coutAnnuel: parseFloat(formData.coutAnnuel),
            statut: 'ACTIF',
            description: formData.description || undefined,
            conditionsParticulieres: formData.conditionsParticulieres || undefined,
            taciteReconduction: formData.taciteReconduction,
            delaiResiliation: formData.delaiResiliation,
            fichierPDF: formData.fichierPDF || undefined,
            dateUploadPDF: formData.fichierPDF ? new Date().toISOString() : undefined,
            interventionIds: [],
            pieceJointes: [],
            estReglementaire: formData.estReglementaire
        };

        onAdd(newContrat);
        setFormData({
            libelle: '', numeroContrat: '', type: '', prestataireId: '',
            description: '', conditionsParticulieres: '', dateDebut: '', dateFin: '',
            taciteReconduction: false, delaiResiliation: 30, coutAnnuel: '',
            fichierPDF: '', estReglementaire: false
        });
        setErrors({});
        onClose();
    };

    // Styles inline dark theme
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
    const label: React.CSSProperties = {
        display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600,
        color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
    };
    const input: React.CSSProperties = {
        width: '100%', padding: '10px 14px',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 8,
        fontSize: 13, color: 'var(--text-main)', background: 'var(--bg-secondary)',
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    };
    const inputErr: React.CSSProperties = { ...input, borderColor: 'var(--danger)' };
    const textarea: React.CSSProperties = { ...input, minHeight: 70, resize: 'vertical' };
    const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
    const group: React.CSSProperties = { marginBottom: 16 };
    const errText: React.CSSProperties = { fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'block' };
    const footer: React.CSSProperties = {
        padding: '12px 24px', borderTop: '1px solid rgba(148,163,184,0.08)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
    };
    const btnCancel: React.CSSProperties = {
        padding: '8px 16px', background: 'var(--bg-secondary)',
        border: '1px solid rgba(148,163,184,0.08)', borderRadius: 8,
        color: 'var(--text-main)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
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
        <div style={overlay} onClick={onClose}>
            <div style={modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div style={header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={18} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>Nouveau contrat</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 6, borderRadius: 6 }}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    {/* Libellé + Numéro */}
                    <div style={row}>
                        <div style={group}>
                            <label style={label}>Libellé du contrat <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input style={errors.libelle ? inputErr : input} value={formData.libelle}
                                onChange={e => setFormData({ ...formData, libelle: e.target.value })}
                                placeholder="Ex: Maintenance Ascenseur" />
                            {errors.libelle && <span style={errText}>{errors.libelle}</span>}
                        </div>
                        <div style={group}>
                            <label style={label}>Numéro de contrat</label>
                            <input style={input} value={formData.numeroContrat}
                                onChange={e => setFormData({ ...formData, numeroContrat: e.target.value })}
                                placeholder="Ex: CT-2024-001" />
                        </div>
                    </div>

                    {/* Type + Prestataire */}
                    <div style={row}>
                        <div style={group}>
                            <label style={label}>Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select style={errors.type ? inputErr : input} value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as TypeContrat })}>
                                <option value="">— Sélectionner un type —</option>
                                {TYPES_CONTRAT.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                            {errors.type && <span style={errText}>{errors.type}</span>}
                        </div>
                        <div style={group}>
                            <label style={label}>Prestataire <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select style={errors.prestataireId ? inputErr : input} value={formData.prestataireId}
                                onChange={e => setFormData({ ...formData, prestataireId: e.target.value })}>
                                <option value="">— Sélectionner un prestataire —</option>
                                {prestataires.map(p => (
                                    <option key={p.id} value={p.id}>{p.nom}</option>
                                ))}
                            </select>
                            {errors.prestataireId && <span style={errText}>{errors.prestataireId}</span>}
                        </div>
                    </div>

                    {/* Description */}
                    <div style={group}>
                        <label style={label}>Description</label>
                        <textarea style={textarea} value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Informations complémentaires sur le contrat..." rows={3} />
                    </div>

                    {/* Conditions */}
                    <div style={group}>
                        <label style={label}>Conditions particulières</label>
                        <textarea style={textarea} value={formData.conditionsParticulieres}
                            onChange={e => setFormData({ ...formData, conditionsParticulieres: e.target.value })}
                            placeholder="Clauses spécifiques, conditions de renouvellement..." rows={2} />
                    </div>

                    {/* Dates */}
                    <div style={{ ...row, marginBottom: 16 }}>
                        <DatePicker
                            label="Date de début"
                            value={formData.dateDebut ? parseISO(formData.dateDebut) : null}
                            onChange={(date) => {
                                if (date && isValid(date)) {
                                    setFormData({ ...formData, dateDebut: format(date, 'yyyy-MM-dd') });
                                } else {
                                    setFormData({ ...formData, dateDebut: '' });
                                }
                            }}
                            required
                            error={errors.dateDebut}
                        />
                        <DatePicker
                            label="Date de fin"
                            value={formData.dateFin ? parseISO(formData.dateFin) : null}
                            onChange={(date) => {
                                if (date && isValid(date)) {
                                    setFormData({ ...formData, dateFin: format(date, 'yyyy-MM-dd') });
                                } else {
                                    setFormData({ ...formData, dateFin: '' });
                                }
                            }}
                            required
                            minDate={formData.dateDebut ? parseISO(formData.dateDebut) : undefined}
                            error={errors.dateFin}
                        />
                    </div>

                    {/* Tacite reconduction + Délai résiliation */}
                    <div style={row}>
                        <div style={group}>
                            <label style={checkLabel}>
                                <input type="checkbox" checked={formData.taciteReconduction}
                                    onChange={e => setFormData({ ...formData, taciteReconduction: e.target.checked })}
                                    style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
                                Tacite reconduction
                            </label>
                        </div>
                        <div style={group}>
                            <label style={label}>Délai de résiliation (jours)</label>
                            <input type="number" style={input} value={formData.delaiResiliation}
                                onChange={e => setFormData({ ...formData, delaiResiliation: parseInt(e.target.value) || 0 })}
                                min="0" />
                        </div>
                    </div>

                    {/* Coût annuel + Réglementaire */}
                    <div style={row}>
                        <div style={group}>
                            <label style={label}>Coût annuel (€) <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input type="number" style={errors.coutAnnuel ? inputErr : input} value={formData.coutAnnuel}
                                onChange={e => setFormData({ ...formData, coutAnnuel: e.target.value })}
                                min="0" step="0.01" placeholder="0.00" />
                            {errors.coutAnnuel && <span style={errText}>{errors.coutAnnuel}</span>}
                        </div>
                        <div style={group}>
                            <label style={checkLabel}>
                                <input type="checkbox" checked={formData.estReglementaire}
                                    onChange={e => setFormData({ ...formData, estReglementaire: e.target.checked })}
                                    style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
                                Contrat réglementaire
                            </label>
                        </div>
                    </div>

                    {/* Upload PDF */}
                    <div style={group}>
                        <label style={label}>Document PDF du contrat</label>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 8,
                            border: '1px dashed rgba(148,163,184,0.15)', background: 'var(--bg-secondary)',
                            cursor: 'pointer', position: 'relative',
                        }}>
                            <input type="file" accept=".pdf" id="contrat-pdf-upload"
                                onChange={e => setFormData({ ...formData, fichierPDF: e.target.files?.[0]?.name || '' })}
                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                            <Upload size={16} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontSize: 13, color: formData.fichierPDF ? 'var(--text-main)' : 'var(--text-tertiary)' }}>
                                {formData.fichierPDF || 'Choisir un fichier PDF'}
                            </span>
                            {formData.fichierPDF && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, fichierPDF: '' }); }}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2 }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                <div style={footer}>
                    <button type="button" style={btnCancel} onClick={onClose}>Annuler</button>
                    <button type="button" style={btnSubmit} onClick={handleSubmit as unknown as () => void}>
                        <Plus size={14} /> Créer le contrat
                    </button>
                </div>
            </div>
        </div>
    );
}

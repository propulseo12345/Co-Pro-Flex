'use client';

import { useState, useMemo } from 'react';
import { TYPES_CONTRAT } from '@/lib/constants/categories-contrat';
import { TypeContrat } from '@/types';
import ProviderSelector from '@/components/features/maintenance/ProviderSelector';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { createContract } from '@/lib/maintenance/writes';
import { uploadDocument } from '@/lib/documents/api';
import { useProviders } from '@/hooks/modules/useMaintenanceData';
import styles from './new-contract.module.css';

// Type de contrat (UI, MAJUSCULES) -> slug du référentiel work_domain (domain_id).
// Aligné sur le mapping canonique de l'onboarding (StepContracts).
const TYPE_TO_DOMAIN: Record<TypeContrat, string> = {
    ASCENSEUR: 'ascenseur',
    CHAUFFAGE: 'chauffage',
    MENAGE: 'menage',
    EAU: 'eau',
    ELECTRICITE: 'electricite',
    ASSURANCE: 'assurance',
    ESPACES_VERTS: 'espaces_verts',
    TOITURE: 'toiture',
    FACADE: 'facade',
    INTERPHONE: 'interphone',
    PORTAIL: 'portail',
    JURIDIQUE: 'juridique',
    AUTRE: 'autre',
};

export default function NewContractPage() {
    const router = useRouter();
    const { currentCoproId } = useCopro();
    const { providers } = useProviders({ autoFetch: true });
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        nom: '',
        numeroContrat: '',
        type: '' as TypeContrat | '',
        prestataireId: '',
        description: '',
        dateDebut: '',
        dateFin: '',
        taciteReconduction: true,
        preavisMois: 3,
        coutAnnuel: '',
        fichierPDF: null as File | null,
        infosSupp: ''
    });

    // Map Supabase providers to the format expected by ProviderSelector
    const allPrestataires = useMemo(() =>
        providers.map(p => ({
            id: p.id as string,
            nom: p.name as string,
            categorie: ((p.category as string) || 'copropriete').toUpperCase() as import('@/types').CategoriePrestataire,
            domaines: ((p.domains as string[]) || []).map(d => d.toUpperCase()) as import('@/types').DomaineActivite[],
            telephone: (p.phone as string) || '',
            email: (p.email as string) || '',
            adresse: (p.address as string) || '',
            dateAjout: (p.created_at as string) || '',
            nombreInterventions: (p.interventions_count as number) || 0,
        })),
    [providers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentCoproId) {
            alert('Aucune copropriété sélectionnée');
            return;
        }
        if (!formData.fichierPDF) {
            alert('Veuillez joindre le fichier PDF du contrat (champ obligatoire)');
            return;
        }

        setIsSaving(true);
        try {
            const supabase = createClient();

            // 1) Persister le contrat (colonnes cibles via les alias legacy de createContract).
            const description = [formData.description, formData.infosSupp].filter(Boolean).join('\n\n');
            const contract = await createContract(supabase, currentCoproId, {
                provider_id: formData.prestataireId,
                title: formData.nom,
                contract_number: formData.numeroContrat || undefined,
                contract_type: TYPE_TO_DOMAIN[formData.type as TypeContrat] ?? 'autre',
                description: description || undefined,
                start_date: formData.dateDebut,
                end_date: formData.dateFin || undefined,
                annual_amount: parseFloat(formData.coutAnnuel) || undefined,
                tacit_renewal: formData.taciteReconduction,
                notice_months: formData.preavisMois,
                status: 'active',
            });

            // 2) Uploader le PDF dans la GED et le lier au contrat (vrai fichier, pas juste un nom).
            await uploadDocument(formData.fichierPDF, currentCoproId, 'contrat', {
                contractId: contract.id,
                title: `Contrat ${formData.nom}`,
                sourceModule: 'maintenance',
                documentDate: formData.dateDebut || undefined,
            });

            router.push('/maintenance/contracts');
        } catch (err) {
            alert("Erreur lors de l'enregistrement : " + (err instanceof Error ? err.message : 'erreur inconnue'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container">
            <Link href="/maintenance/contracts" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" /> Retour aux contrats</Link>
            <h1 className={styles.title}>Nouveau contrat</h1>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Informations générales</h2>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}><label>Libellé du contrat *</label><input type="text" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} required /></div>
                        <div className={styles.formGroup}><label>Numéro de contrat</label><input type="text" value={formData.numeroContrat} onChange={(e) => setFormData({...formData, numeroContrat: e.target.value})} /></div>
                        <div className={styles.formGroup}><label>Type de contrat *</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as TypeContrat})} required><option value="">Sélectionner...</option>{TYPES_CONTRAT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                        <div className={styles.formGroup}><ProviderSelector value={formData.prestataireId} onChange={(id) => setFormData({...formData, prestataireId: id})} prestataires={allPrestataires} label="Prestataire *" required /></div>
                    </div>
                    <div className={styles.formGroup}><label>Description</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} /></div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Dates et montants</h2>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}><label>Date de début *</label><input type="date" value={formData.dateDebut} onChange={(e) => setFormData({...formData, dateDebut: e.target.value})} required /></div>
                        <div className={styles.formGroup}><label>Date de fin *</label><input type="date" value={formData.dateFin} onChange={(e) => setFormData({...formData, dateFin: e.target.value})} required /></div>
                        <div className={styles.formGroup}><label>Tacite reconduction</label><div className={styles.checkbox}><input type="checkbox" checked={formData.taciteReconduction} onChange={(e) => setFormData({...formData, taciteReconduction: e.target.checked})} /><span>Oui</span></div></div>
                        <div className={styles.formGroup}><label>Délai de préavis (mois)</label><input type="number" min="0" value={formData.preavisMois} onChange={(e) => setFormData({...formData, preavisMois: parseInt(e.target.value) || 0})} /></div>
                        <div className={styles.formGroup}><label>Coût annuel (€) *</label><input type="number" step="0.01" value={formData.coutAnnuel} onChange={(e) => setFormData({...formData, coutAnnuel: e.target.value})} required /></div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Documents</h2>
                    <div className={styles.formGroup}><label>PDF du contrat *</label><div className={styles.fileInput}><Upload size={18} aria-hidden="true" /><input type="file" accept=".pdf" onChange={(e) => setFormData({...formData, fichierPDF: e.target.files?.[0] || null})} required /><span>{formData.fichierPDF?.name || 'Aucun fichier sélectionné'}</span></div></div>
                    <div className={styles.formGroup}><label>Informations supplémentaires</label><textarea value={formData.infosSupp} onChange={(e) => setFormData({...formData, infosSupp: e.target.value})} rows={3} /></div>
                </div>

                <div className={styles.actions}>
                    <Link href="/maintenance/contracts" className="btn btn-secondary">Annuler</Link>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Enregistrement…' : 'Créer le contrat'}</button>
                </div>
            </form>
        </div>
    );
}

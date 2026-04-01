'use client';

import { useState, useMemo } from 'react';
import { TYPES_CONTRAT } from '@/lib/constants/categories-contrat';
import { TypeContrat, ContratDetaille } from '@/types';
import ProviderSelector from '@/components/features/maintenance/ProviderSelector';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addContrat } from '@/lib/services/contracts.service';
import { useProviders } from '@/hooks/modules/useMaintenanceData';
import styles from './new-contract.module.css';

export default function NewContractPage() {
    const router = useRouter();
    const { providers } = useProviders({ autoFetch: true });
    const [formData, setFormData] = useState({
        nom: '',
        numeroContrat: '',
        type: '' as TypeContrat | '',
        prestataireId: '',
        description: '',
        dateDebut: '',
        dateFin: '',
        taciteReconduction: true,
        delaiResiliation: 60,
        coutAnnuel: '',
        fichierPDF: '',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fichierPDF) {
            alert('Veuillez joindre le fichier PDF du contrat (champ obligatoire)');
            return;
        }

        const prestataire = allPrestataires.find(p => p.id === formData.prestataireId);

        // Créer le nouveau contrat
        const newContrat: ContratDetaille = {
            id: `contrat-${Date.now()}`,
            nom: formData.nom,
            numeroContrat: formData.numeroContrat || undefined,
            type: formData.type as TypeContrat,
            prestataireId: formData.prestataireId,
            fournisseur: prestataire?.nom || '',
            dateDebut: formData.dateDebut,
            dateFin: formData.dateFin,
            coutAnnuel: parseFloat(formData.coutAnnuel) || 0,
            statut: 'ACTIF',
            description: formData.description || undefined,
            taciteReconduction: formData.taciteReconduction,
            delaiResiliation: formData.delaiResiliation,
            fichierPDF: formData.fichierPDF,
            dateUploadPDF: new Date().toISOString(),
            interventionIds: [],
            pieceJointes: [],
            estReglementaire: false,
        };

        // Ajouter via le service
        addContrat(newContrat);

        router.push('/maintenance/contracts');
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
                        <div className={styles.formGroup}><label>Délai de résiliation (jours)</label><input type="number" value={formData.delaiResiliation} onChange={(e) => setFormData({...formData, delaiResiliation: parseInt(e.target.value)})} /></div>
                        <div className={styles.formGroup}><label>Coût annuel (€) *</label><input type="number" step="0.01" value={formData.coutAnnuel} onChange={(e) => setFormData({...formData, coutAnnuel: e.target.value})} required /></div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Documents</h2>
                    <div className={styles.formGroup}><label>PDF du contrat *</label><div className={styles.fileInput}><Upload size={18} aria-hidden="true" /><input type="file" accept=".pdf" onChange={(e) => setFormData({...formData, fichierPDF: e.target.files?.[0]?.name || ''})} required /><span>{formData.fichierPDF || 'Aucun fichier sélectionné'}</span></div></div>
                    <div className={styles.formGroup}><label>Informations supplémentaires</label><textarea value={formData.infosSupp} onChange={(e) => setFormData({...formData, infosSupp: e.target.value})} rows={3} /></div>
                </div>

                <div className={styles.actions}>
                    <Link href="/maintenance/contracts" className="btn btn-secondary">Annuler</Link>
                    <button type="submit" className="btn btn-primary">Créer le contrat</button>
                </div>
            </form>
        </div>
    );
}

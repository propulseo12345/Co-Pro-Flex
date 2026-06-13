'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContratAssurance } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { DocumentAssurance, SousTypeAssuranceLiteral } from '@/types/models/maintenance';
import { updateAssurance } from '@/lib/services/assurances.service';

export const SOUS_TYPES_ASSURANCE = [
    { value: 'MRI', label: 'MRI (Multirisque Immeuble)' },
    { value: 'RC_SYNDICAT', label: 'RC Syndicat' },
    { value: 'DOMMAGES_OUVRAGE', label: 'Dommages-Ouvrage' },
    { value: 'PROTECTION_JURIDIQUE', label: 'Protection Juridique' },
    { value: 'AUTRE', label: 'Autre' }
] as const;

export const TYPE_DOCUMENTS = [
    { value: 'CONTRAT', label: 'Contrat' },
    { value: 'CONDITIONS_PARTICULIERES', label: 'Conditions particulières' },
    { value: 'ATTESTATION', label: 'Attestation' },
    { value: 'AVENANT', label: 'Avenant' },
    { value: 'AUTRE', label: 'Autre' }
] as const;

export interface AssuranceFormData {
    nom: string;
    sousType: string;
    assureur: string;
    numeroPolice: string;
    dateDebut: string;
    dateFin: string;
    primeAnnuelle: string;
    franchise: string;
    garanties: string[];
    travauxConcernes: string;
    dateReceptionTravaux: string;
    observations: string;
}

export function useAssuranceDetailPage(id: string) {
    const router = useRouter();
    const { currentCoproId } = useCopro();
    const [assurance, setAssurance] = useState<ContratAssurance | undefined>(undefined);

    // Load insurance from Supabase
    useEffect(() => {
        if (!currentCoproId || !id) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        supabase
            .from('insurance_policies')
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data }: { data: Record<string, unknown> | null }) => {
                if (data) {
                    setAssurance({
                        id: data.id as string,
                        type: 'ASSURANCE',
                        sousType: ((data.sub_type as string) || 'MRI').toUpperCase(),
                        nom: (data.insurer_name as string) || '',
                        assureur: (data.insurer_name as string) || '',
                        numeroPolice: (data.policy_number as string) || '',
                        dateDebut: ((data.created_at as string) || '').split('T')[0],
                        dateFin: '',
                        primeAnnuelle: Number(data.annual_premium) || 0,
                        franchise: data.deductible ? Number(data.deductible) : undefined,
                        garanties: (data.guarantees as string[]) || [],
                        observations: (data.observations as string) || undefined,
                    } as ContratAssurance);
                }
            });
    }, [currentCoproId, id]);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<AssuranceFormData>({
        nom: '',
        sousType: 'MRI',
        assureur: '',
        numeroPolice: '',
        dateDebut: '',
        dateFin: '',
        primeAnnuelle: '0',
        franchise: '',
        garanties: [],
        travauxConcernes: '',
        dateReceptionTravaux: '',
        observations: ''
    });

    // Sync form data when assurance is loaded
    useEffect(() => {
        if (assurance) {
            setFormData({
                nom: assurance.nom || '',
                sousType: assurance.sousType || 'MRI',
                assureur: assurance.assureur || '',
                numeroPolice: assurance.numeroPolice || '',
                dateDebut: assurance.dateDebut || '',
                dateFin: assurance.dateFin || '',
                primeAnnuelle: assurance.primeAnnuelle?.toString() || '0',
                franchise: assurance.franchise?.toString() || '',
                garanties: assurance.garanties || [],
                travauxConcernes: assurance.travauxConcernes || '',
                dateReceptionTravaux: assurance.dateReceptionTravaux || '',
                observations: assurance.observations || '',
            });
        }
    }, [assurance]);

    const [documents, setDocuments] = useState<DocumentAssurance[]>(assurance?.documents || []);
    const [showAddDocument, setShowAddDocument] = useState(false);
    const [newDocument, setNewDocument] = useState({
        nom: '',
        type: 'CONTRAT' as DocumentAssurance['type'],
        fichier: null as File | null
    });

    const handleSave = useCallback(() => {
        if (!formData.nom || !formData.assureur || !formData.numeroPolice || !formData.dateDebut || !formData.dateFin) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        const result = updateAssurance(id, {
            nom: formData.nom,
            sousType: formData.sousType as SousTypeAssuranceLiteral,
            assureur: formData.assureur,
            numeroPolice: formData.numeroPolice,
            dateDebut: formData.dateDebut,
            dateFin: formData.dateFin,
            primeAnnuelle: parseFloat(formData.primeAnnuelle) || 0,
            franchise: formData.franchise ? parseFloat(formData.franchise) : undefined,
            garanties: formData.garanties,
            travauxConcernes: formData.travauxConcernes || undefined,
            dateReceptionTravaux: formData.dateReceptionTravaux || undefined,
            observations: formData.observations || undefined,
            documents: documents
        });

        if (!result.succes) {
            if (result.erreurs) {
                const firstError = Object.values(result.erreurs)[0];
                alert(firstError);
            } else if (result.erreurGlobale) {
                alert(result.erreurGlobale);
            }
            return;
        }

        if (assurance) {
            Object.assign(assurance, result.data);
        }

        setIsEditing(false);
        router.refresh();
    }, [id, formData, documents, assurance, router]);

    const handleCancel = useCallback(() => {
        if (!assurance) return;
        setFormData({
            nom: assurance.nom,
            sousType: assurance.sousType,
            assureur: assurance.assureur,
            numeroPolice: assurance.numeroPolice,
            dateDebut: assurance.dateDebut,
            dateFin: assurance.dateFin,
            primeAnnuelle: assurance.primeAnnuelle.toString(),
            franchise: assurance.franchise?.toString() || '',
            garanties: [...assurance.garanties],
            travauxConcernes: assurance.travauxConcernes || '',
            dateReceptionTravaux: assurance.dateReceptionTravaux || '',
            observations: assurance.observations || ''
        });
        setDocuments([...(assurance.documents || [])]);
        setIsEditing(false);
    }, [assurance]);

    const handleAddDocument = useCallback(() => {
        if (!newDocument.nom || !newDocument.type) return;
        const newDoc: DocumentAssurance = {
            id: `doc-${Date.now()}`,
            nom: newDocument.nom,
            type: newDocument.type,
            url: newDocument.fichier?.name || `${newDocument.nom.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            dateUpload: new Date().toISOString().split('T')[0]
        };
        setDocuments(prev => [...prev, newDoc]);
        setNewDocument({ nom: '', type: 'CONTRAT', fichier: null });
        setShowAddDocument(false);
    }, [newDocument]);

    const handleDeleteDocument = useCallback((docId: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            setDocuments(prev => prev.filter(d => d.id !== docId));
        }
    }, []);

    const updateFormField = useCallback(<K extends keyof AssuranceFormData>(field: K, value: AssuranceFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    return {
        assurance,
        isEditing,
        formData,
        documents,
        showAddDocument,
        newDocument,
        setIsEditing,
        setFormData,
        setShowAddDocument,
        setNewDocument,
        handleSave,
        handleCancel,
        handleAddDocument,
        handleDeleteDocument,
        updateFormField
    };
}

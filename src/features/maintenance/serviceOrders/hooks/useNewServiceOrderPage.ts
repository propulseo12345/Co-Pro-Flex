'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import {
    TypeOrdreService,
    OrdreService,
    Prestataire,
    ContratDetaille,
    PieceJointeOS
} from '@/types';
import {
    CategorieIntervention,
    filtrerPrestatairesParCategorie,
    getAlerteIncoherence
} from '@/lib/utils/intervention-coherence';
import { useServiceOrders, useProviders, useContracts } from '@/hooks/modules/useMaintenanceData';
import type { ServiceOrderInsert, ProviderOverview, ContractOverview } from '@/types/supabase';

export interface ServiceOrderFormData {
    typeOrdre: TypeOrdreService;
    categorieIntervention: CategorieIntervention | '';
    fournisseurId: string;
    contratId: string;
    fournisseurNom: string;
    fournisseurEmail: string;
    fournisseurTelephone: string;
    contratNom: string;
    titre: string;
    description: string;
    priorite: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    montantEstime: string;
    devisRequis: boolean;
    emailObjet: string;
    emailCorps: string;
    piecesJointes: PieceJointeOS[];
    contactSurPlaceId: string;
    contactSurPlaceNom: string;
    contactSurPlaceTelephone: string;
    contactSurPlaceEmail: string;
}

// Adapter ProviderOverview Supabase → Prestataire legacy
function adaptProviderToLegacy(p: ProviderOverview): Prestataire {
    return {
        id: p.id || '',
        nom: p.name || '',
        email: p.email || '',
        telephone: p.phone || '',
        adresse: p.address || '',
        codePostal: p.postal_code || '',
        ville: p.city || '',
        siret: p.siret || '',
        domaines: (p.domains || []).map(d => d.toUpperCase()) as unknown as string[],
        categorie: (p.category || 'syndic') as unknown as string,
        estActif: p.is_active !== false,
        note: p.rating_avg || 0,
        nombreAvis: p.rating_count || 0,
        contactNom: p.contact_name || undefined,
        contactRole: p.contact_role || undefined,
    } as unknown as Prestataire;
}

// Adapter ContractOverview Supabase → ContratDetaille legacy
function adaptContractToLegacy(c: ContractOverview): ContratDetaille {
    return {
        id: c.id || '',
        nom: c.title || '',
        numero: c.contract_number || '',
        type: c.contract_type || '',
        prestataireId: c.provider_id || '',
        fournisseur: c.provider_name || '',
        dateDebut: c.start_date || '',
        dateFin: c.end_date || '',
        montantAnnuel: c.annual_amount || 0,
        statut: c.status || 'active',
        description: c.description || '',
    } as unknown as ContratDetaille;
}

const initialFormData: ServiceOrderFormData = {
    typeOrdre: 'CLASSIQUE',
    categorieIntervention: '',
    fournisseurId: '',
    contratId: '',
    fournisseurNom: '',
    fournisseurEmail: '',
    fournisseurTelephone: '',
    contratNom: '',
    titre: '',
    description: '',
    priorite: 'NORMAL',
    montantEstime: '',
    devisRequis: false,
    emailObjet: '',
    emailCorps: '',
    piecesJointes: [],
    contactSurPlaceId: '',
    contactSurPlaceNom: '',
    contactSurPlaceTelephone: '',
    contactSurPlaceEmail: ''
};

export function useNewServiceOrderPage() {
    const router = useRouter();
    const { createOrder } = useServiceOrders({ autoFetch: false });
    const { providers: supabaseProviders } = useProviders();
    const { contracts: supabaseContracts } = useContracts();
    const [formData, setFormData] = useState<ServiceOrderFormData>(initialFormData);
    const [errors, setErrors] = useState<Partial<Record<keyof ServiceOrderFormData, string>>>({});
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [showContactDropdown, setShowContactDropdown] = useState(false);

    const allPrestataires: Prestataire[] = useMemo(() =>
        supabaseProviders.map(adaptProviderToLegacy),
    [supabaseProviders]);

    const prestatairesFiltered = useMemo(() => {
        return formData.categorieIntervention
            ? filtrerPrestatairesParCategorie(allPrestataires, formData.categorieIntervention as CategorieIntervention)
            : allPrestataires;
    }, [allPrestataires, formData.categorieIntervention]);

    const selectedPrestataire = useMemo(() =>
        allPrestataires.find(p => p.id === formData.fournisseurId) || null,
        [allPrestataires, formData.fournisseurId]
    );

    const alerteCoherence = useMemo(() => {
        return formData.categorieIntervention && selectedPrestataire
            ? getAlerteIncoherence(selectedPrestataire, formData.categorieIntervention as CategorieIntervention)
            : null;
    }, [formData.categorieIntervention, selectedPrestataire]);

    const filteredCoproprietaires = useMemo(() => {
        return MOCK_COPROPRIETAIRES.filter(copro =>
            copro.nom.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
            (copro.email && copro.email.toLowerCase().includes(contactSearchTerm.toLowerCase()))
        ).slice(0, 5);
    }, [contactSearchTerm]);

    const validate = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof ServiceOrderFormData, string>> = {};
        if (!formData.titre.trim()) newErrors.titre = 'Le titre est obligatoire';
        if (!formData.description.trim()) newErrors.description = 'La description est obligatoire';
        if (formData.typeOrdre === 'CLASSIQUE' && !formData.fournisseurId) {
            newErrors.fournisseurId = 'Le prestataire est obligatoire en mode classique';
        }
        if (formData.typeOrdre === 'CONTRACTUEL' && !formData.contratId) {
            newErrors.contratId = 'Le contrat est obligatoire en mode contractuel';
        }
        if (!formData.emailObjet.trim()) newErrors.emailObjet = 'L\'objet de l\'email est obligatoire';
        if (!formData.emailCorps.trim()) newErrors.emailCorps = 'Le corps de l\'email est obligatoire';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleTypeChange = useCallback((type: TypeOrdreService) => {
        setFormData(prev => ({
            ...prev,
            typeOrdre: type,
            categorieIntervention: '',
            fournisseurId: '',
            contratId: '',
            fournisseurNom: '',
            fournisseurEmail: '',
            fournisseurTelephone: '',
            contratNom: ''
        }));
        setErrors({});
    }, []);

    const handleCategorieChange = useCallback((categorie: CategorieIntervention | '') => {
        setFormData(prev => ({
            ...prev,
            categorieIntervention: categorie,
            fournisseurId: '',
            fournisseurNom: '',
            fournisseurEmail: '',
            fournisseurTelephone: ''
        }));
    }, []);

    const handleProviderSelect = useCallback((id: string, prestataire: Prestataire | null) => {
        if (prestataire) {
            setFormData(prev => ({
                ...prev,
                fournisseurId: id,
                fournisseurNom: prestataire.nom,
                fournisseurEmail: prestataire.email,
                fournisseurTelephone: prestataire.telephone
            }));
        }
    }, []);

    const handleContractSelect = useCallback((id: string, contrat: ContratDetaille | null) => {
        if (contrat) {
            const prestataire = allPrestataires.find(p => p.id === contrat.prestataireId);
            setFormData(prev => ({
                ...prev,
                contratId: id,
                contratNom: contrat.nom,
                fournisseurId: prestataire?.id || '',
                fournisseurNom: prestataire?.nom || contrat.fournisseur,
                fournisseurEmail: prestataire?.email || '',
                fournisseurTelephone: prestataire?.telephone || ''
            }));
        }
    }, [allPrestataires]);

    const handleEmailChange = useCallback((objet: string, corps: string) => {
        setFormData(prev => ({ ...prev, emailObjet: objet, emailCorps: corps }));
    }, []);

    const handleAttachmentsChange = useCallback((attachments: PieceJointeOS[]) => {
        setFormData(prev => ({ ...prev, piecesJointes: attachments }));
    }, []);

    const handleContactSelect = useCallback((copro: typeof MOCK_COPROPRIETAIRES[0]) => {
        setFormData(prev => ({
            ...prev,
            contactSurPlaceId: copro.id,
            contactSurPlaceNom: copro.nom,
            contactSurPlaceTelephone: copro.telephone || '',
            contactSurPlaceEmail: copro.email || ''
        }));
        setContactSearchTerm(copro.nom);
        setShowContactDropdown(false);
    }, []);

    const handleClearContact = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            contactSurPlaceId: '',
            contactSurPlaceNom: '',
            contactSurPlaceTelephone: '',
            contactSurPlaceEmail: ''
        }));
        setContactSearchTerm('');
    }, []);

    const updateFormField = useCallback(<K extends keyof ServiceOrderFormData>(field: K, value: ServiceOrderFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const createOrdreService = useCallback((statut: 'BROUILLON' | 'ENVOYE'): OrdreService => {
        const now = new Date().toISOString();
        return {
            id: `os-${Date.now()}`,
            date: now.split('T')[0],
            dateCreation: now,
            dateModification: now,
            titre: formData.titre,
            description: formData.description,
            typeOrdre: formData.typeOrdre,
            fournisseurId: formData.fournisseurId,
            fournisseurNom: formData.fournisseurNom,
            fournisseurEmail: formData.fournisseurEmail,
            fournisseurTelephone: formData.fournisseurTelephone,
            contratId: formData.typeOrdre === 'CONTRACTUEL' ? formData.contratId : undefined,
            contratNom: formData.typeOrdre === 'CONTRACTUEL' ? formData.contratNom : undefined,
            statut: statut,
            dateEnvoi: statut === 'ENVOYE' ? now : undefined,
            emailObjet: formData.emailObjet,
            emailCorps: formData.emailCorps,
            piecesJointes: formData.piecesJointes,
            montantEstime: formData.montantEstime ? parseFloat(formData.montantEstime) : undefined,
            devisRequis: formData.devisRequis,
            contactSurPlace: formData.contactSurPlaceId ? {
                id: formData.contactSurPlaceId,
                nom: formData.contactSurPlaceNom,
                telephone: formData.contactSurPlaceTelephone || undefined,
                email: formData.contactSurPlaceEmail || undefined,
                coproprietaireId: formData.contactSurPlaceId
            } : undefined,
            historique: [{
                id: `h-${Date.now()}`,
                date: now,
                auteur: 'Syndic Admin',
                action: statut === 'BROUILLON' ? 'Création en brouillon' : 'Création et envoi'
            }]
        };
    }, [formData]);

    const saveToLocalStorage = useCallback((os: OrdreService) => {
        const storedOS = localStorage.getItem('newOrdresService');
        const existingOS: OrdreService[] = storedOS ? JSON.parse(storedOS) : [];
        existingOS.push(os);
        localStorage.setItem('newOrdresService', JSON.stringify(existingOS));
    }, []);

    const buildSupabaseInsert = useCallback((status: 'draft' | 'sent'): ServiceOrderInsert => {
        return {
            copro_id: '', // Rempli par le hook createOrder
            provider_id: formData.fournisseurId || null,
            contract_id: formData.typeOrdre === 'CONTRACTUEL' ? formData.contratId : null,
            subject: formData.titre,
            description: formData.description || null,
            urgency: formData.priorite === 'URGENT' ? 'high' : formData.priorite === 'HIGH' ? 'high' : formData.priorite === 'LOW' ? 'low' : 'normal',
            order_type: formData.typeOrdre === 'CONTRACTUEL' ? 'contractuel' : 'classique',
            origin: 'syndic',
            status,
            estimated_amount: formData.montantEstime ? parseFloat(formData.montantEstime) : null,
            is_art18_emergency: false,
        } as unknown as ServiceOrderInsert;
    }, [formData]);

    const handleSaveDraft = useCallback(async () => {
        if (!formData.titre.trim()) {
            alert('Le titre est obligatoire pour sauvegarder un brouillon');
            return;
        }
        try {
            await createOrder(buildSupabaseInsert('draft'));
            alert('✓ Brouillon sauvegardé avec succès !');
            router.push('/maintenance/service-orders');
        } catch (err) {
            console.error('[createOrder] Erreur Supabase:', err);
            // Fallback localStorage si Supabase échoue
            const os = createOrdreService('BROUILLON');
            saveToLocalStorage(os);
            alert(`⚠ Sauvegardé localement (erreur DB: ${err instanceof Error ? err.message : 'inconnue'})`);
            router.push('/maintenance/service-orders');
        }
    }, [formData.titre, createOrder, buildSupabaseInsert, createOrdreService, saveToLocalStorage, router]);

    const handleSend = useCallback(async () => {
        if (!validate()) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }
        try {
            await createOrder(buildSupabaseInsert('sent'));
            alert(`✓ Ordre de service envoyé à ${formData.fournisseurNom} !`);
            router.push('/maintenance/service-orders');
        } catch (err) {
            console.error('[createOrder] Erreur Supabase:', err);
            // Fallback localStorage si Supabase échoue
            const os = createOrdreService('ENVOYE');
            saveToLocalStorage(os);
            alert(`⚠ Sauvegardé localement (erreur DB: ${err instanceof Error ? err.message : 'inconnue'})`);
            router.push('/maintenance/service-orders');
        }
    }, [validate, createOrder, buildSupabaseInsert, createOrdreService, saveToLocalStorage, formData.fournisseurNom, router]);

    return {
        formData,
        errors,
        contactSearchTerm,
        showContactDropdown,
        prestatairesFiltered,
        alerteCoherence,
        filteredCoproprietaires,
        contrats: supabaseContracts.map(adaptContractToLegacy),
        setContactSearchTerm,
        setShowContactDropdown,
        handleTypeChange,
        handleCategorieChange,
        handleProviderSelect,
        handleContractSelect,
        handleEmailChange,
        handleAttachmentsChange,
        handleContactSelect,
        handleClearContact,
        handleSaveDraft,
        handleSend,
        updateFormField
    };
}

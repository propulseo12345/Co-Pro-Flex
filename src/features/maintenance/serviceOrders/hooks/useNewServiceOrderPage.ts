'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    MOCK_CONTRATS_DETAILLES,
    MOCK_PRESTATAIRES_SYNDIC,
    MOCK_PRESTATAIRES_COPRO,
    MOCK_COPROPRIETAIRES
} from '@/data/mock';
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
    const [formData, setFormData] = useState<ServiceOrderFormData>(initialFormData);
    const [errors, setErrors] = useState<Partial<Record<keyof ServiceOrderFormData, string>>>({});
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [showContactDropdown, setShowContactDropdown] = useState(false);

    const allPrestataires: Prestataire[] = useMemo(() => [
        ...MOCK_PRESTATAIRES_SYNDIC,
        ...MOCK_PRESTATAIRES_COPRO
    ], []);

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

    const handleSaveDraft = useCallback(() => {
        if (!formData.titre.trim()) {
            alert('Le titre est obligatoire pour sauvegarder un brouillon');
            return;
        }
        const os = createOrdreService('BROUILLON');
        saveToLocalStorage(os);
        alert('✓ Brouillon sauvegardé avec succès !');
        router.push('/maintenance/service-orders');
    }, [formData.titre, createOrdreService, saveToLocalStorage, router]);

    const handleSend = useCallback(() => {
        if (!validate()) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }
        const os = createOrdreService('ENVOYE');
        saveToLocalStorage(os);
        alert(`✓ Ordre de service envoyé à ${formData.fournisseurNom} (${formData.fournisseurEmail}) !`);
        router.push('/maintenance/service-orders');
    }, [validate, createOrdreService, saveToLocalStorage, formData.fournisseurNom, formData.fournisseurEmail, router]);

    return {
        formData,
        errors,
        contactSearchTerm,
        showContactDropdown,
        prestatairesFiltered,
        alerteCoherence,
        filteredCoproprietaires,
        contrats: MOCK_CONTRATS_DETAILLES,
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

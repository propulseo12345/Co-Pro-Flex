'use client';

import { ServiceOrderFormData } from '../hooks/useNewServiceOrderPage';
import { CategorieIntervention, CATEGORIES_INTERVENTION } from '@/lib/utils/intervention-coherence';
import { Prestataire, ContratDetaille, PieceJointeOS } from '@/types';
import { EMAIL_TEMPLATES_OS } from '@/lib/constants/email-templates-os';
import { AlertTriangle } from 'lucide-react';
import ProviderSelector from '@/components/features/maintenance/ProviderSelector';
import ContractSelector from '../../../../app/(dashboard)/maintenance/service-orders/components/ContractSelector';
import EmailEditor from '../../../../app/(dashboard)/maintenance/service-orders/components/EmailEditor';
import AttachmentUpload from '../../../../app/(dashboard)/maintenance/service-orders/components/AttachmentUpload';
import clsx from 'clsx';
import styles from './ServiceOrderFormSections.module.css';

interface CategorySectionProps {
    categorieIntervention: CategorieIntervention | '';
    prestatairesCount: number;
    onCategorieChange: (cat: CategorieIntervention | '') => void;
}

export function ServiceOrderCategorySection({ categorieIntervention, prestatairesCount, onCategorieChange }: CategorySectionProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Catégorie d'intervention</h2>
            <p className={styles.sectionDescription}>
                Sélectionnez le type d'intervention pour filtrer les prestataires compétents.
            </p>
            <div className={styles.formGroup}>
                <select
                    id="categorieIntervention"
                    className="input"
                    value={categorieIntervention}
                    onChange={(e) => onCategorieChange(e.target.value as CategorieIntervention | '')}
                >
                    <option value="">-- Toutes catégories --</option>
                    {(Object.keys(CATEGORIES_INTERVENTION) as CategorieIntervention[]).map((cat) => (
                        <option key={cat} value={cat}>
                            {CATEGORIES_INTERVENTION[cat].label} - {CATEGORIES_INTERVENTION[cat].description}
                        </option>
                    ))}
                </select>
            </div>
            {categorieIntervention && (
                <div className={styles.categoryInfo}>
                    <strong>{prestatairesCount}</strong> prestataire(s) disponible(s) pour cette catégorie
                </div>
            )}
        </div>
    );
}

interface ProviderSectionProps {
    formData: ServiceOrderFormData;
    prestataires: Prestataire[];
    contrats: ContratDetaille[];
    alerteCoherence: string | null;
    errors: Partial<Record<keyof ServiceOrderFormData, string>>;
    onProviderSelect: (id: string, p: Prestataire | null) => void;
    onContractSelect: (id: string, c: ContratDetaille | null) => void;
}

export function ServiceOrderProviderSection({
    formData,
    prestataires,
    contrats,
    alerteCoherence,
    errors,
    onProviderSelect,
    onContractSelect
}: ProviderSectionProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
                {formData.typeOrdre === 'CLASSIQUE' ? 'Prestataire' : 'Contrat'}
            </h2>

            {formData.typeOrdre === 'CLASSIQUE' ? (
                <>
                    <ProviderSelector
                        value={formData.fournisseurId}
                        onChange={onProviderSelect}
                        prestataires={prestataires}
                        label="Sélectionner un prestataire"
                        placeholder={formData.categorieIntervention
                            ? `Rechercher parmi les ${prestataires.length} prestataires...`
                            : "Rechercher par nom, email ou domaine..."}
                        required
                        error={errors.fournisseurId}
                    />
                    {alerteCoherence && (
                        <div className={styles.alerteCoherence}>
                            <AlertTriangle size={16} aria-hidden="true" />
                            <span>{alerteCoherence}</span>
                        </div>
                    )}
                </>
            ) : (
                <ContractSelector
                    value={formData.contratId}
                    onChange={onContractSelect}
                    contrats={contrats}
                    label="Sélectionner un contrat"
                    placeholder="Rechercher un contrat actif..."
                    required
                    error={errors.contratId}
                />
            )}

            {formData.fournisseurNom && (
                <div className={styles.providerInfo}>
                    <div className={styles.infoRow}><strong>Prestataire :</strong> {formData.fournisseurNom}</div>
                    {formData.fournisseurEmail && (
                        <div className={styles.infoRow}><strong>Email :</strong> {formData.fournisseurEmail}</div>
                    )}
                    {formData.fournisseurTelephone && (
                        <div className={styles.infoRow}><strong>Téléphone :</strong> {formData.fournisseurTelephone}</div>
                    )}
                    {formData.contratNom && (
                        <div className={styles.infoRow}><strong>Contrat :</strong> {formData.contratNom}</div>
                    )}
                </div>
            )}
        </div>
    );
}

interface DetailsSectionProps {
    formData: ServiceOrderFormData;
    errors: Partial<Record<keyof ServiceOrderFormData, string>>;
    onFieldChange: <K extends keyof ServiceOrderFormData>(field: K, value: ServiceOrderFormData[K]) => void;
}

export function ServiceOrderDetailsSection({ formData, errors, onFieldChange }: DetailsSectionProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Détails de l'intervention</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="titre" className={styles.label}>Titre de l'intervention *</label>
                    <input
                        id="titre"
                        type="text"
                        className={clsx('input', errors.titre && styles.inputError)}
                        placeholder="Ex: Réparation fuite toiture"
                        value={formData.titre}
                        onChange={(e) => onFieldChange('titre', e.target.value)}
                    />
                    {errors.titre && <span className={styles.errorText}>{errors.titre}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="priorite" className={styles.label}>Priorité</label>
                    <select
                        id="priorite"
                        className="input"
                        value={formData.priorite}
                        onChange={(e) => onFieldChange('priorite', e.target.value as ServiceOrderFormData['priorite'])}
                    >
                        <option value="LOW">Basse</option>
                        <option value="NORMAL">Normale</option>
                        <option value="HIGH">Haute</option>
                        <option value="URGENT">Urgente</option>
                    </select>
                </div>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.label}>Description détaillée *</label>
                <textarea
                    id="description"
                    className={clsx('input', errors.description && styles.inputError)}
                    rows={5}
                    placeholder="Décrivez précisément la nature de l'intervention..."
                    value={formData.description}
                    onChange={(e) => onFieldChange('description', e.target.value)}
                />
                {errors.description && <span className={styles.errorText}>{errors.description}</span>}
            </div>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="montant" className={styles.label}>Montant estimé (€)</label>
                    <input
                        id="montant"
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                        value={formData.montantEstime}
                        onChange={(e) => onFieldChange('montantEstime', e.target.value)}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Options</label>
                    <div className={styles.checkbox}>
                        <input
                            id="devisRequis"
                            type="checkbox"
                            checked={formData.devisRequis}
                            onChange={(e) => onFieldChange('devisRequis', e.target.checked)}
                        />
                        <label htmlFor="devisRequis">Devis requis si montant &gt; 300 €</label>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ContactSectionProps {
    formData: ServiceOrderFormData;
    contactSearchTerm: string;
    showContactDropdown: boolean;
    filteredCoproprietaires: Array<{ id: string; nom: string; email?: string; telephone?: string }>;
    onSearchTermChange: (term: string) => void;
    onShowDropdown: (show: boolean) => void;
    onContactSelect: (copro: { id: string; nom: string; email?: string; telephone?: string }) => void;
    onClearContact: () => void;
}

export function ServiceOrderContactSection({
    formData,
    contactSearchTerm,
    showContactDropdown,
    filteredCoproprietaires,
    onSearchTermChange,
    onShowDropdown,
    onContactSelect,
    onClearContact
}: ContactSectionProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact sur place (optionnel)</h2>
            <p className={styles.sectionDescription}>
                Indiquez un copropriétaire qui accueillera l'intervenant si le gestionnaire ne peut pas se déplacer.
            </p>
            <div className={styles.formGroup}>
                <label htmlFor="contactSurPlace" className={styles.label}>Copropriétaire contact</label>
                <div className={styles.searchContainer}>
                    <input
                        id="contactSurPlace"
                        type="text"
                        className="input"
                        placeholder="Rechercher un copropriétaire par nom ou email..."
                        value={contactSearchTerm}
                        onChange={(e) => {
                            onSearchTermChange(e.target.value);
                            onShowDropdown(true);
                        }}
                        onFocus={() => onShowDropdown(true)}
                    />
                    {formData.contactSurPlaceId && (
                        <button type="button" className={styles.clearButton} onClick={onClearContact} title="Effacer le contact">×</button>
                    )}
                    {showContactDropdown && contactSearchTerm && filteredCoproprietaires.length > 0 && (
                        <div className={styles.dropdown}>
                            {filteredCoproprietaires.map(copro => (
                                <div key={copro.id} className={styles.dropdownItem} onClick={() => onContactSelect(copro)}>
                                    <strong>{copro.nom}</strong>
                                    <span className={styles.dropdownMeta}>
                                        {copro.email && <span>{copro.email}</span>}
                                        {copro.telephone && <span> • {copro.telephone}</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {formData.contactSurPlaceId && (
                <div className={styles.providerInfo}>
                    <div className={styles.infoRow}><strong>Contact :</strong> {formData.contactSurPlaceNom}</div>
                    {formData.contactSurPlaceTelephone && (
                        <div className={styles.infoRow}><strong>Téléphone :</strong> {formData.contactSurPlaceTelephone}</div>
                    )}
                    {formData.contactSurPlaceEmail && (
                        <div className={styles.infoRow}><strong>Email :</strong> {formData.contactSurPlaceEmail}</div>
                    )}
                </div>
            )}
        </div>
    );
}

interface EmailSectionProps {
    formData: ServiceOrderFormData;
    onEmailChange: (objet: string, corps: string) => void;
}

export function ServiceOrderEmailSection({ formData, onEmailChange }: EmailSectionProps) {
    return (
        <div className={styles.section}>
            <EmailEditor
                typeOrdre={formData.typeOrdre}
                templates={EMAIL_TEMPLATES_OS}
                onEmailChange={onEmailChange}
                formData={{
                    titre: formData.titre,
                    description: formData.description,
                    fournisseurNom: formData.fournisseurNom,
                    contratNom: formData.contratNom
                }}
            />
        </div>
    );
}

interface AttachmentSectionProps {
    attachments: PieceJointeOS[];
    onAttachmentsChange: (attachments: PieceJointeOS[]) => void;
}

export function ServiceOrderAttachmentSection({ attachments, onAttachmentsChange }: AttachmentSectionProps) {
    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Pièces jointes</h2>
            <AttachmentUpload
                attachments={attachments}
                onAttachmentsChange={onAttachmentsChange}
                maxFiles={10}
                maxSizeMB={10}
            />
        </div>
    );
}

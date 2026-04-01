'use client';

import { ContratDetaille, TemplateResiliation, ModeEnvoiResiliation } from '@/types';
import { useState, useEffect, useId } from 'react';
import { X, FileText, Mail, Download, CheckCircle, Printer, Info, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { generateResiliationPDF } from '@/lib/pdf/generateResiliationPDF';
import { recommandeService, isRecommandeElectroniqueConfigured } from '@/services/recommande';
import { useCopro } from '@/providers/CoproContext';
import { autoFileToGED } from '@/lib/services/auto-file-ged.service';
import styles from './ResiliationModal.module.css';

interface ResiliationModalProps {
    contrat: ContratDetaille;
    onClose: () => void;
    onConfirm: (data: TemplateResiliation) => void;
}

// Informations du syndic (en production, ces données viendront du contexte Supabase)
const SYNDIC_INFO = {
    nom: '',
    representant: '',
    fonction: 'Gestionnaire de copropriété',
    adresse: '',
    email: '',
    telephone: '',
};

export default function ResiliationModal({ contrat, onClose, onConfirm }: ResiliationModalProps) {
    const { currentCoproId, currentCopro } = useCopro();
    const coproNom = currentCopro?.name || '';
    const coproAdresse = currentCopro?.address || '';
    const coproCodePostal = currentCopro?.postal_code || '';
    const coproVille = currentCopro?.city || '';
    const [step, setStep] = useState(1); // 1: Form, 2: Preview, 3: Mode d'envoi
    const [dateResiliation, setDateResiliation] = useState('');
    const [courrierTexte, setCourrierTexte] = useState('');
    const [modeEnvoi, setModeEnvoi] = useState<ModeEnvoiResiliation>('NON_DEFINI');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [pdfGenerated, setPdfGenerated] = useState(false);
    const [envoiElectroniqueStatus, setEnvoiElectroniqueStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const titleId = useId();
    const dateInputId = useId();
    const textareaId = useId();
    const focusTrapRef = useFocusTrap<HTMLDivElement>({
        isActive: true,
        escapeDeactivates: true,
        onEscape: onClose,
    });

    // Générer le texte prérempli avec les variables
    const generatePrefilledText = (dateEffet: string): string => {
        const dateEffetFormatted = dateEffet
            ? new Date(dateEffet).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            : '{date_effet_résiliation}';

        return `Objet : Résiliation du contrat n° ${contrat.numeroContrat || contrat.id}

Madame, Monsieur,

En ma qualité de syndic de la copropriété ${coproNom}, sise ${coproAdresse}, ${coproCodePostal} ${coproVille}, je vous informe par la présente de la décision de résilier le contrat de prestations de services référencé sous le numéro ${contrat.numeroContrat || contrat.id}, conclu avec votre société ${contrat.fournisseur}.

Conformément aux dispositions contractuelles, et notamment au délai de préavis de ${contrat.delaiResiliation || 60} jours, la résiliation prendra effet à compter du ${dateEffetFormatted}, la présente valant notification formelle de notre volonté de mettre un terme audit contrat.

Je vous remercie de bien vouloir :
– cesser toute intervention à compter de cette date,
– nous transmettre l'ensemble des documents, rapports techniques et informations nécessaires au suivi des installations de la copropriété,
– établir et nous adresser, dans les meilleurs délais, votre facture de solde couvrant les prestations effectuées jusqu'à la date d'effet de la résiliation.

Vous pouvez adresser toute correspondance relative à la présente résiliation à l'attention de ${SYNDIC_INFO.representant}, ${SYNDIC_INFO.fonction}, à l'adresse suivante : ${SYNDIC_INFO.adresse}, ou par courriel à ${SYNDIC_INFO.email}.

Dans l'attente, veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${SYNDIC_INFO.representant}

Pour le syndic : ${SYNDIC_INFO.nom}
${SYNDIC_INFO.adresse}
${SYNDIC_INFO.email} – ${SYNDIC_INFO.telephone}`;
    };

    // Initialiser le texte prérempli au montage du composant
    useEffect(() => {
        setCourrierTexte(generatePrefilledText(''));
    }, []);

    // Mettre à jour le texte quand la date change
    useEffect(() => {
        if (dateResiliation) {
            setCourrierTexte(generatePrefilledText(dateResiliation));
        }
    }, [dateResiliation]);

    const generateCourrierHTML = (): string => {
        const aujourdhui = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        // Convertir le texte en HTML avec les sauts de ligne
        const texteHTML = courrierTexte.replace(/\n/g, '<br/>');

        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <div style="text-align: right; margin-bottom: 40px; font-size: 0.9em;">
                <strong>${coproNom}</strong><br/>
                ${coproAdresse}<br/>
                ${coproCodePostal} ${coproVille}<br/>
                <br/>
                ${coproVille}, le ${aujourdhui}
            </div>

            <div style="margin-bottom: 40px; font-size: 0.9em;">
                <strong>${contrat.fournisseur}</strong><br/>
                [Adresse du prestataire]
            </div>

            <div style="white-space: pre-wrap;">
                ${texteHTML}
            </div>

            <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.75em; color: #666;">
                <p>Ce courrier de résiliation a été généré automatiquement par CoProFlex.</p>
            </div>
        </div>
        `;
    };

    const handlePreview = () => {
        if (!dateResiliation) {
            alert('Veuillez sélectionner une date de résiliation');
            return;
        }
        setStep(2);
    };

    const handleGoToDelivery = () => {
        setStep(3);
    };

    const handleDownloadPDF = () => {
        const copropriete = MOCK_INFORMATIONS_COPROPRIETE;
        const doc = generateResiliationPDF({
            contrat,
            dateEffet: dateResiliation,
            courrierTexte,
            syndicInfo: SYNDIC_INFO,
            copropriete: {
                nom: copropriete.nom,
                adresse: copropriete.adresse,
                codePostal: copropriete.codePostal,
                ville: copropriete.ville
            }
        });
        const numeroContratSafe = (contrat.numeroContrat || contrat.id).replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `resiliation_RAR_${numeroContratSafe}_${dateStr}.pdf`;
        doc.save(fileName);

        // Fire-and-forget: archive dans la GED
        if (currentCoproId) {
            const blob = doc.output('blob');
            autoFileToGED({
                blob,
                fileName,
                coproId: currentCoproId,
                category: 'contrat',
                sourceModule: 'maintenance',
                subFolderName: `Résiliations ${new Date().getFullYear()}`,
                year: new Date().getFullYear(),
            });
        }

        setPdfGenerated(true);
        setModeEnvoi('RECOMMANDE_POSTAL');
    };

    const handleEnvoiElectronique = async () => {
        if (!isRecommandeElectroniqueConfigured()) {
            alert('Le service de recommandé électronique n\'est pas encore configuré. Cette fonctionnalité sera disponible prochainement.');
            return;
        }

        setEnvoiElectroniqueStatus('sending');
        setModeEnvoi('RECOMMANDE_ELECTRONIQUE');

        try {
            const copropriete = MOCK_INFORMATIONS_COPROPRIETE;
            const response = await recommandeService.envoyer({
                destinataire: {
                    nom: contrat.fournisseur,
                    email: '', // À compléter avec l'email du prestataire
                },
                expediteur: {
                    nom: copropriete.nom,
                    email: SYNDIC_INFO.email,
                },
                objet: `Résiliation du contrat n° ${contrat.numeroContrat || contrat.id}`,
                contenu: courrierTexte,
                referenceInterne: contrat.id
            });

            if (response.success) {
                setEnvoiElectroniqueStatus('sent');
            } else {
                setEnvoiElectroniqueStatus('error');
                alert(`Erreur lors de l'envoi : ${response.error}`);
            }
        } catch {
            setEnvoiElectroniqueStatus('error');
            alert('Une erreur est survenue lors de l\'envoi du recommandé électronique.');
        }
    };

    const handleCloturer = () => {
        setProcessing(true);

        const template: TemplateResiliation = {
            destinataire: contrat.fournisseur,
            adresse: '',
            numeroContrat: contrat.numeroContrat || contrat.id,
            dateEffet: dateResiliation,
            motif: courrierTexte || undefined,
            htmlContent: generateCourrierHTML(),
            modeEnvoi: modeEnvoi,
            statutEnvoi: modeEnvoi === 'RECOMMANDE_POSTAL' && pdfGenerated ? 'PREPARE' :
                         modeEnvoi === 'RECOMMANDE_ELECTRONIQUE' && envoiElectroniqueStatus === 'sent' ? 'ENVOYE' : 'NON_ENVOYE',
            datePrepare: pdfGenerated || envoiElectroniqueStatus === 'sent' ? new Date().toISOString() : undefined
        };

        // Simuler un traitement
        setTimeout(() => {
            setProcessing(false);
            setSuccess(true);

            setTimeout(() => {
                onConfirm(template);
                onClose();
            }, 1500);
        }, 1000);
    };

    if (success) {
        return (
            <div className={styles.overlay} aria-hidden="true" onClick={onClose}>
                <div
                    className={styles.modal}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Confirmation de résiliation"
                >
                    <div className={styles.successContent} role="status" aria-live="polite">
                        <CheckCircle size={64} className={styles.successIcon} aria-hidden="true" />
                        <h2>Contrat résilié avec succès</h2>
                        <p>Le statut du contrat a été mis à jour et le courrier ajouté aux pièces jointes.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.overlay} aria-hidden="true" onClick={onClose}>
            <div
                ref={focusTrapRef}
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className={styles.header}>
                    <div>
                        <h2 id={titleId} className={styles.title}>Résilier le contrat</h2>
                        <p className={styles.subtitle}>{contrat.nom}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeButton} aria-label="Fermer">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {step === 1 ? (
                    <>
                        <div className={styles.content}>
                            <div className={styles.infoBox}>
                                <FileText size={20} aria-hidden="true" />
                                <div>
                                    <p><strong>Numéro de contrat :</strong> {contrat.numeroContrat || contrat.id}</p>
                                    <p><strong>Prestataire :</strong> {contrat.fournisseur}</p>
                                    <p><strong>Date de début :</strong> {new Date(contrat.dateDebut).toLocaleDateString('fr-FR')}</p>
                                    {contrat.delaiResiliation && (
                                        <p><strong>Délai de résiliation :</strong> {contrat.delaiResiliation} jours</p>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor={dateInputId} className={styles.label}>
                                    Date de résiliation souhaitée <span className={styles.required} aria-hidden="true">*</span>
                                    <span className="sr-only">(obligatoire)</span>
                                </label>
                                <input
                                    id={dateInputId}
                                    type="date"
                                    value={dateResiliation}
                                    onChange={(e) => setDateResiliation(e.target.value)}
                                    className={styles.input}
                                    aria-required="true"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor={textareaId} className={styles.label}>
                                    Courrier de résiliation <span className={styles.labelHint}>(modifiable)</span>
                                </label>
                                <textarea
                                    id={textareaId}
                                    value={courrierTexte}
                                    onChange={(e) => setCourrierTexte(e.target.value)}
                                    className={styles.textarea}
                                    rows={16}
                                    placeholder="Le courrier sera généré automatiquement..."
                                />
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button onClick={onClose} className="btn btn-secondary">
                                Annuler
                            </button>
                            <button onClick={handlePreview} className="btn btn-primary">
                                Aperçu du courrier
                            </button>
                        </div>
                    </>
                ) : step === 2 ? (
                    <>
                        <div className={styles.content}>
                            <div className={styles.previewHeader}>
                                <h3>Aperçu du courrier de résiliation</h3>
                                <button onClick={() => setStep(1)} className="btn btn-secondary btn-sm">
                                    Modifier
                                </button>
                            </div>

                            <div
                                className={styles.preview}
                                dangerouslySetInnerHTML={{ __html: generateCourrierHTML() }}
                            />
                        </div>

                        <div className={styles.actions}>
                            <button onClick={() => setStep(1)} className="btn btn-secondary">
                                <ArrowLeft size={18} aria-hidden="true" />
                                Retour
                            </button>
                            <button onClick={handleGoToDelivery} className="btn btn-primary">
                                Choisir le mode d&apos;envoi
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.content}>
                            <div className={styles.deliverySection}>
                                <h3 className={styles.deliverySectionTitle}>
                                    Comment souhaitez-vous envoyer cette résiliation ?
                                </h3>

                                <div className={styles.deliveryOptions}>
                                    <button
                                        className={clsx(
                                            styles.deliveryOption,
                                            modeEnvoi === 'RECOMMANDE_POSTAL' && styles.selected
                                        )}
                                        onClick={() => setModeEnvoi('RECOMMANDE_POSTAL')}
                                        type="button"
                                    >
                                        <div className={styles.deliveryOptionIcon}>
                                            <Printer size={24} aria-hidden="true" />
                                        </div>
                                        <div className={styles.deliveryOptionContent}>
                                            <h4 className={styles.deliveryOptionTitle}>
                                                Courrier recommandé postal
                                            </h4>
                                            <p className={styles.deliveryOptionDescription}>
                                                Téléchargez un PDF avec mention RAR à imprimer et envoyer par La Poste.
                                                Le document inclut toutes les mentions légales requises.
                                            </p>
                                        </div>
                                    </button>

                                    <button
                                        className={clsx(
                                            styles.deliveryOption,
                                            modeEnvoi === 'RECOMMANDE_ELECTRONIQUE' && styles.selected,
                                            !isRecommandeElectroniqueConfigured() && styles.disabled
                                        )}
                                        onClick={() => isRecommandeElectroniqueConfigured() && setModeEnvoi('RECOMMANDE_ELECTRONIQUE')}
                                        type="button"
                                        disabled={!isRecommandeElectroniqueConfigured()}
                                    >
                                        <div className={styles.deliveryOptionIcon}>
                                            <Mail size={24} aria-hidden="true" />
                                        </div>
                                        <div className={styles.deliveryOptionContent}>
                                            <h4 className={styles.deliveryOptionTitle}>
                                                Recommandé électronique
                                                {!isRecommandeElectroniqueConfigured() && (
                                                    <span className={styles.comingSoonBadge}>Bientôt</span>
                                                )}
                                            </h4>
                                            <p className={styles.deliveryOptionDescription}>
                                                Envoi via un service de recommandé électronique certifié (AR24, Maileva).
                                                Valeur juridique équivalente au recommandé postal.
                                            </p>
                                        </div>
                                    </button>
                                </div>

                                {modeEnvoi === 'RECOMMANDE_POSTAL' && (
                                    <div className={styles.deliveryNote}>
                                        <Info size={16} aria-hidden="true" />
                                        <p>
                                            Le PDF généré comportera la mention « Lettre recommandée avec accusé de réception ».
                                            Pensez à conserver l&apos;accusé de réception une fois le courrier envoyé.
                                        </p>
                                    </div>
                                )}

                                {modeEnvoi === 'RECOMMANDE_ELECTRONIQUE' && isRecommandeElectroniqueConfigured() && (
                                    <div className={styles.deliveryNote}>
                                        <Info size={16} aria-hidden="true" />
                                        <p>
                                            Le recommandé électronique sera envoyé via notre partenaire certifié.
                                            Vous recevrez une confirmation et un accusé de réception électronique.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button onClick={() => setStep(2)} className="btn btn-secondary">
                                <ArrowLeft size={18} aria-hidden="true" />
                                Retour
                            </button>

                            {modeEnvoi === 'RECOMMANDE_POSTAL' && (
                                <button onClick={handleDownloadPDF} className="btn btn-secondary">
                                    <Download size={18} aria-hidden="true" />
                                    {pdfGenerated ? 'Télécharger à nouveau' : 'Télécharger le PDF RAR'}
                                </button>
                            )}

                            {modeEnvoi === 'RECOMMANDE_ELECTRONIQUE' && isRecommandeElectroniqueConfigured() && (
                                <button
                                    onClick={handleEnvoiElectronique}
                                    className="btn btn-secondary"
                                    disabled={envoiElectroniqueStatus === 'sending'}
                                >
                                    <Mail size={18} aria-hidden="true" />
                                    {envoiElectroniqueStatus === 'sending' ? 'Envoi en cours...' :
                                     envoiElectroniqueStatus === 'sent' ? 'Envoyé ✓' : 'Envoyer le recommandé'}
                                </button>
                            )}

                            <button
                                onClick={handleCloturer}
                                className="btn btn-primary"
                                disabled={processing || modeEnvoi === 'NON_DEFINI'}
                                aria-busy={processing}
                            >
                                {processing ? (
                                    <>
                                        <div className={styles.spinner} aria-hidden="true" />
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} aria-hidden="true" />
                                        Clôturer le contrat
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

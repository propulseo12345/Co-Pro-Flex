'use client';

import { useState, useMemo } from 'react';
import { X, Mail, Send, FileText } from 'lucide-react';
import { Prestataire } from '@/types';
import { MOCK_INFORMATIONS_COPROPRIETE, MOCK_PARAMETRES } from '@/data/mock';
import styles from './ContactProviderModal.module.css';

export type EmailTemplateType = 'demande_intervention' | 'declaration_sinistre' | 'renouvellement_contrat' | 'question_generale';

interface EmailTemplate {
  type: EmailTemplateType;
  label: string;
  sujet: string;
  corps: string;
}

interface ContactProviderModalProps {
  isOpen: boolean;
  prestataire: Prestataire | null;
  contrat?: {
    nom: string;
    numeroContrat?: string;
    type: string;
    dateFin?: string;
  };
  onClose: () => void;
}

const TEMPLATES: EmailTemplate[] = [
  {
    type: 'demande_intervention',
    label: 'Demande d\'intervention',
    sujet: 'Demande d\'intervention - {{CONTRAT_NOM}}',
    corps: `Bonjour,

Nous souhaitons solliciter une intervention concernant le contrat suivant :
- Contrat : {{CONTRAT_NOM}}
{{#CONTRAT_NUMERO}}- Référence : {{CONTRAT_NUMERO}}{{/CONTRAT_NUMERO}}
- Type : {{CONTRAT_TYPE}}

Pouvez-vous nous indiquer vos disponibilités pour une intervention ?

Cordialement,
{{COPRO_NOM}}
{{COPRO_ADRESSE}}`
  },
  {
    type: 'declaration_sinistre',
    label: 'Déclaration de sinistre',
    sujet: 'Déclaration de sinistre - {{CONTRAT_NOM}}',
    corps: `Bonjour,

Nous souhaitons déclarer un sinistre concernant le contrat suivant :
- Contrat : {{CONTRAT_NOM}}
{{#CONTRAT_NUMERO}}- Référence : {{CONTRAT_NUMERO}}{{/CONTRAT_NUMERO}}
- Type : {{CONTRAT_TYPE}}

Date du sinistre : [À compléter]
Description du sinistre : [À compléter]

Merci de nous indiquer la procédure à suivre.

Cordialement,
{{COPRO_NOM}}
{{COPRO_ADRESSE}}`
  },
  {
    type: 'renouvellement_contrat',
    label: 'Renouvellement de contrat',
    sujet: 'Renouvellement de contrat - {{CONTRAT_NOM}}',
    corps: `Bonjour,

Nous souhaitons discuter du renouvellement du contrat suivant :
- Contrat : {{CONTRAT_NOM}}
{{#CONTRAT_NUMERO}}- Référence : {{CONTRAT_NUMERO}}{{/CONTRAT_NUMERO}}
- Type : {{CONTRAT_TYPE}}
{{#CONTRAT_DATE_FIN}}- Date de fin actuelle : {{CONTRAT_DATE_FIN}}{{/CONTRAT_DATE_FIN}}

Pouvez-vous nous faire parvenir votre proposition de renouvellement ?

Cordialement,
{{COPRO_NOM}}
{{COPRO_ADRESSE}}`
  },
  {
    type: 'question_generale',
    label: 'Question générale',
    sujet: 'Question concernant {{CONTRAT_NOM}}',
    corps: `Bonjour,

Nous avons une question concernant le contrat suivant :
- Contrat : {{CONTRAT_NOM}}
{{#CONTRAT_NUMERO}}- Référence : {{CONTRAT_NUMERO}}{{/CONTRAT_NUMERO}}
- Type : {{CONTRAT_TYPE}}

[Votre question ici]

Cordialement,
{{COPRO_NOM}}
{{COPRO_ADRESSE}}`
  }
];

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  // Remplacer les variables simples {{VAR}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  // Gérer les blocs conditionnels {{#VAR}}...{{/VAR}}
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, varName, content) => {
    return variables[varName] ? content : '';
  });
  
  return result;
}

export function ContactProviderModal({ isOpen, prestataire, contrat, onClose }: ContactProviderModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType>('demande_intervention');
  const [customSujet, setCustomSujet] = useState('');
  const [customCorps, setCustomCorps] = useState('');

  const coproInfo = MOCK_INFORMATIONS_COPROPRIETE;
  const coproParams = MOCK_PARAMETRES.informationsCopro;

  const variables = useMemo(() => {
    const vars: Record<string, string> = {
      COPRO_NOM: coproParams.nom || coproInfo.nom,
      COPRO_ADRESSE: coproParams.adresse || `${coproInfo.adresse}, ${coproInfo.codePostal} ${coproInfo.ville}`,
      PRESTATAIRE_NOM: prestataire?.nom || '',
      PRESTATAIRE_EMAIL: prestataire?.email || '',
    };

    if (contrat) {
      vars.CONTRAT_NOM = contrat.nom;
      vars.CONTRAT_NUMERO = contrat.numeroContrat || '';
      vars.CONTRAT_TYPE = contrat.type;
      if (contrat.dateFin) {
        vars.CONTRAT_DATE_FIN = new Date(contrat.dateFin).toLocaleDateString('fr-FR');
      }
    }

    return vars;
  }, [coproInfo, coproParams, prestataire, contrat]);

  const currentTemplate = TEMPLATES.find(t => t.type === selectedTemplate) || TEMPLATES[0];

  const sujetFinal = customSujet || replaceVariables(currentTemplate.sujet, variables);
  const corpsFinal = customCorps || replaceVariables(currentTemplate.corps, variables);

  const handleTemplateChange = (type: EmailTemplateType) => {
    setSelectedTemplate(type);
    setCustomSujet('');
    setCustomCorps('');
  };

  const handleSendEmail = () => {
    if (!prestataire?.email) {
      alert('Aucune adresse email disponible pour ce prestataire');
      return;
    }

    const subject = encodeURIComponent(sujetFinal);
    const body = encodeURIComponent(corpsFinal);
    const mailtoLink = `mailto:${prestataire.email}?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
    onClose();
  };

  const handleCopyToClipboard = () => {
    const fullEmail = `À : ${prestataire?.email || ''}\nSujet : ${sujetFinal}\n\n${corpsFinal}`;
    navigator.clipboard.writeText(fullEmail).then(() => {
      alert('Email copié dans le presse-papiers');
    });
  };

  if (!isOpen || !prestataire) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="contact-provider-title">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerInfo}>
            <Mail size={24} className={styles.headerIcon} aria-hidden="true" />
            <div>
              <h2 id="contact-provider-title" className={styles.modalTitle}>Contacter le prestataire</h2>
              <p className={styles.modalSubtitle}>{prestataire.nom}</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.templateSection}>
            <label htmlFor="template-select" className={styles.label}>
              Modèle d'email
            </label>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value as EmailTemplateType)}
              className={styles.select}
            >
              {TEMPLATES.map(template => (
                <option key={template.type} value={template.type}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.emailSection}>
            <div className={styles.emailField}>
              <label htmlFor="email-to" className={styles.label}>
                Destinataire
              </label>
              <div className={styles.emailDisplay}>
                <Mail size={16} aria-hidden="true" />
                <span>{prestataire.email}</span>
              </div>
            </div>

            <div className={styles.emailField}>
              <label htmlFor="email-subject" className={styles.label}>
                Sujet
              </label>
              <input
                id="email-subject"
                type="text"
                value={customSujet || sujetFinal}
                onChange={(e) => setCustomSujet(e.target.value)}
                className={styles.input}
                placeholder="Sujet de l'email"
              />
            </div>

            <div className={styles.emailField}>
              <label htmlFor="email-body" className={styles.label}>
                Message
              </label>
              <textarea
                id="email-body"
                value={customCorps || corpsFinal}
                onChange={(e) => setCustomCorps(e.target.value)}
                className={styles.textarea}
                rows={12}
                placeholder="Corps de l'email"
              />
            </div>
          </div>

          <div className={styles.infoBox}>
            <FileText size={16} aria-hidden="true" />
            <div>
              <strong>Variables disponibles :</strong>
              <ul className={styles.variablesList}>
                <li><code>{'{{COPRO_NOM}}'}</code> - Nom de la copropriété</li>
                <li><code>{'{{COPRO_ADRESSE}}'}</code> - Adresse de la copropriété</li>
                <li><code>{'{{CONTRAT_NOM}}'}</code> - Nom du contrat</li>
                <li><code>{'{{CONTRAT_NUMERO}}'}</code> - Numéro du contrat</li>
                <li><code>{'{{CONTRAT_TYPE}}'}</code> - Type de contrat</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyToClipboard}
          >
            <FileText size={16} aria-hidden="true" />
            Copier
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSendEmail}
            disabled={!prestataire.email}
          >
            <Send size={16} aria-hidden="true" />
            Ouvrir l'email
          </button>
        </div>
      </div>
    </div>
  );
}

import { OrdreService, PieceJointeOS } from '@/types';

/**
 * Substitue les variables dans un template email
 * Remplace les patterns {{variable}} par les valeurs correspondantes
 */
export const substituteVariables = (
  template: string,
  data: Record<string, string>
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
};

/**
 * Simule l'envoi d'un email (mockup)
 * Retourne une Promise qui se résout après 2 secondes
 */
export const simulateEmailSend = (_ordreService: OrdreService): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 2000);
  });
};

/**
 * Génère et télécharge un document PDF (mockup en texte)
 * Télécharge un fichier texte avec les détails complets de l'ordre de service
 */
export const generatePdfDownload = (ordreService: OrdreService): void => {
  const pdfContent = `
================================================================================
                            ORDRE DE SERVICE
================================================================================

N° ${ordreService.id}
Statut: ${getStatutLabel(ordreService.statut)}
Type: ${getTypeLabel(ordreService.typeOrdre)}

--------------------------------------------------------------------------------
COPROPRIÉTÉ
--------------------------------------------------------------------------------
Résidence Les Jardins
50 Route La Carrière au Loup
75002 Paris

--------------------------------------------------------------------------------
PRESTATAIRE
--------------------------------------------------------------------------------
${ordreService.fournisseurNom}
${ordreService.fournisseurEmail ? `Email: ${ordreService.fournisseurEmail}` : ''}
${ordreService.fournisseurTelephone ? `Téléphone: ${ordreService.fournisseurTelephone}` : ''}
${ordreService.contratNom ? `Contrat: ${ordreService.contratNom}` : ''}
${ordreService.contactSurPlace ? `
--------------------------------------------------------------------------------
CONTACT SUR PLACE
--------------------------------------------------------------------------------
${ordreService.contactSurPlace.nom}
${ordreService.contactSurPlace.telephone ? `Téléphone: ${ordreService.contactSurPlace.telephone}` : ''}
${ordreService.contactSurPlace.email ? `Email: ${ordreService.contactSurPlace.email}` : ''}
` : ''}

--------------------------------------------------------------------------------
DÉTAILS DE L'INTERVENTION
--------------------------------------------------------------------------------
${ordreService.titre}

${ordreService.description}

--------------------------------------------------------------------------------
EMAIL ENVOYÉ
--------------------------------------------------------------------------------
Objet: ${ordreService.emailObjet}
${ordreService.dateEnvoi ? `Date d'envoi: ${formatDateTime(ordreService.dateEnvoi)}` : 'Non envoyé'}

${ordreService.emailCorps}

--------------------------------------------------------------------------------
PIÈCES JOINTES (${ordreService.piecesJointes.length})
--------------------------------------------------------------------------------
${ordreService.piecesJointes.length > 0
  ? ordreService.piecesJointes.map(pj => `- ${pj.nom} (${pj.taille})`).join('\n')
  : 'Aucune pièce jointe'}

--------------------------------------------------------------------------------
DATES & WORKFLOW
--------------------------------------------------------------------------------
Création: ${formatDateTime(ordreService.dateCreation)}
${ordreService.dateEnvoi ? `Envoi: ${formatDateTime(ordreService.dateEnvoi)}` : ''}
${ordreService.dateInterventionProgrammee ? `Intervention programmée: ${formatDateTime(ordreService.dateInterventionProgrammee)}` : ''}
${ordreService.dateInterventionRealisee ? `Intervention réalisée: ${formatDateTime(ordreService.dateInterventionRealisee)}` : ''}
${ordreService.dateCloture ? `Clôture: ${formatDateTime(ordreService.dateCloture)}` : ''}

--------------------------------------------------------------------------------
MONTANTS
--------------------------------------------------------------------------------
Montant estimé: ${ordreService.montantEstime ? ordreService.montantEstime.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : 'Non renseigné'}
Montant final: ${ordreService.montantFinal ? ordreService.montantFinal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : 'Non renseigné'}
Devis requis: ${ordreService.devisRequis ? 'Oui' : 'Non'}

================================================================================
Document généré le ${formatDateTime(new Date().toISOString())}
CoProFlex - Gestion de copropriété
================================================================================
  `.trim();

  // Créer et télécharger le fichier
  const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ordre_service_${ordreService.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Simule la génération d'un PDF enrichi (mockup) - version avec alert
 * @deprecated Utilisez generatePdfDownload à la place
 */
export const simulatePdfGeneration = (ordreService: OrdreService): void => {
  generatePdfDownload(ordreService);
};

/**
 * Simule l'upload d'un fichier
 * Crée un Object URL pour permettre la prévisualisation et le téléchargement
 * Note: Dans un environnement de production, cela serait remplacé par un upload vers Supabase Storage
 */
export const simulateFileUpload = (file: File): Promise<PieceJointeOS> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Créer un Object URL pour permettre le preview/download
      const objectUrl = URL.createObjectURL(file);

      const mockAttachment: PieceJointeOS = {
        id: `pj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        nom: file.name,
        type: file.type.includes('pdf') ? 'PDF' :
              file.type.includes('image') ? 'IMAGE' : 'AUTRE',
        taille: `${(file.size / 1024 / 1024).toFixed(2)} Mo`,
        url: objectUrl,
        dateAjout: new Date().toISOString()
      };
      resolve(mockAttachment);
    }, 500);
  });
};

/**
 * Télécharge une pièce jointe
 * Déclenche le téléchargement du fichier via son URL
 */
export const downloadPieceJointe = (pieceJointe: PieceJointeOS): void => {
  if (!pieceJointe.url || pieceJointe.url.includes('mockup')) {
    alert('Ce fichier n\'est pas disponible au téléchargement (données de démonstration)');
    return;
  }

  const link = document.createElement('a');
  link.href = pieceJointe.url;
  link.download = pieceJointe.nom;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Prévisualise une pièce jointe
 * Ouvre le fichier dans un nouvel onglet
 */
export const previewPieceJointe = (pieceJointe: PieceJointeOS): void => {
  if (!pieceJointe.url || pieceJointe.url.includes('mockup')) {
    alert('Ce fichier n\'est pas disponible en prévisualisation (données de démonstration)');
    return;
  }

  window.open(pieceJointe.url, '_blank', 'noopener,noreferrer');
};

/**
 * Simule l'archivage dans la GED (mockup)
 * Retourne une Promise avec l'ID GED après 1.5 secondes
 */
export const simulateGedArchive = (ordreService: OrdreService): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const gedId = `ged-os-${ordreService.id}-${Date.now()}`;
      resolve(gedId);
    }, 1500);
  });
};

/**
 * Retourne le label français d'un statut
 */
export const getStatutLabel = (statut: string): string => {
  const labels: Record<string, string> = {
    BROUILLON: 'Brouillon',
    A_ENVOYER: 'À envoyer',
    ENVOYE: 'Envoyé',
    ACCEPTE: 'Accepté',
    REFUSE: 'Refusé',
    PLANIFIE: 'Planifié',
    EN_COURS: 'En cours',
    REALISE: 'Réalisé',
    FACTURE: 'Facturé',
    PAYE: 'Payé',
    CLOTURE: 'Clôturé',
    ANNULE: 'Annulé',
    // Legacy aliases
    EN_ATTENTE_PRESTATAIRE: 'Envoyé',
    INTERVENTION_PROGRAMMEE: 'Planifié',
    INTERVENTION_REALISEE: 'Réalisé'
  };
  return labels[statut] || statut;
};

/**
 * Retourne la classe CSS correspondant au statut
 */
export const getStatutClass = (statut: string): string => {
  const classes: Record<string, string> = {
    BROUILLON: 'statutBrouillon',
    A_ENVOYER: 'statutAEnvoyer',
    ENVOYE: 'statutEnvoye',
    ACCEPTE: 'statutAccepte',
    REFUSE: 'statutRefuse',
    PLANIFIE: 'statutPlanifie',
    EN_COURS: 'statutEnCours',
    REALISE: 'statutRealise',
    FACTURE: 'statutFacture',
    PAYE: 'statutPaye',
    CLOTURE: 'statutCloture',
    ANNULE: 'statutAnnule',
    // Legacy aliases
    EN_ATTENTE_PRESTATAIRE: 'statutEnvoye',
    INTERVENTION_PROGRAMMEE: 'statutPlanifie',
    INTERVENTION_REALISEE: 'statutRealise'
  };
  return classes[statut] || '';
};

/**
 * Retourne le label français d'un type d'ordre de service
 */
export const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    CLASSIQUE: 'Classique',
    CONTRACTUEL: 'Contractuel'
  };
  return labels[type] || type;
};

/**
 * Retourne la classe CSS correspondant au type
 */
export const getTypeClass = (type: string): string => {
  const classes: Record<string, string> = {
    CLASSIQUE: 'typeClassique',
    CONTRACTUEL: 'typeContractuel'
  };
  return classes[type] || '';
};

/**
 * Formate une date ISO en format français
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR');
};

/**
 * Formate une date ISO en format français avec heure
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR');
};

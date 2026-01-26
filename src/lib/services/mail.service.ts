import {
  Mail,
  MailStatut,
  MailHistorique,
  MailHistoriqueAction,
  MailStorageData,
  PieceJointeMail,
  BrouillonData,
  MailOnglet,
  MailFiltres,
  MAIL_CORBEILLE_JOURS,
  generateMailId,
  generatePJId,
  validerFichierPJ,
  joursRestantsCorbeille,
} from '@/types/models/mail';

/**
 * Service de gestion des mails
 * NOTE: Version frontend - stockage localStorage en attendant Supabase
 */

const STORAGE_KEY = 'coproflex-mails';
const DEFAULT_COPROPRIETE_ID = 'copro-1';
const UTILISATEUR_COURANT = 'Syndic';
const UTILISATEUR_ID = 'syndic-1';

// ========================================
// DONNÉES MOCKÉES INITIALES
// ========================================

const MOCK_MAILS: Mail[] = [
  // Mails reçus (inbox)
  {
    id: 'mail-101',
    coproprieteId: DEFAULT_COPROPRIETE_ID,
    subject: "RE: Demande d'information sur les travaux",
    body: `Suite à votre mail concernant les travaux de ravalement, j'aurais quelques questions :

1. Quelle sera la durée estimée des travaux ?
2. Y aura-t-il des nuisances sonores importantes ?
3. Devrons-nous fermer nos volets pendant certaines phases ?

Je vous remercie par avance pour vos réponses.

Cordialement,
Marie Martin`,
    preview: "Suite à votre mail concernant les travaux de ravalement, j'aurais quelques questions...",
    sender: { id: 'u1', nom: 'Marie Martin', lot: 'Lot 12', email: 'marie.martin@email.com', type: 'coproprietaire' },
    recipients: [{ id: 'syndic-1', nom: 'Syndic', type: 'syndic' }],
    recipientType: 'individual',
    piecesJointes: [],
    statut: 'received',
    isRead: false,
    hasAttachment: false,
    dateCreation: '2025-12-22T10:30:00',
  },
  {
    id: 'mail-102',
    coproprieteId: DEFAULT_COPROPRIETE_ID,
    subject: 'Problème de fuite au 3ème étage',
    body: `Je vous signale une fuite d'eau constatée ce matin dans ma salle de bain.

L'eau semble provenir du plafond, ce qui suggère un problème au niveau de l'appartement du dessus ou des canalisations communes.

Vous trouverez en pièce jointe des photos de la fuite.

Cordialement,
Jean-Pierre Dubois`,
    preview: "Je vous signale une fuite d'eau constatée dans ma salle de bain...",
    sender: { id: 'u2', nom: 'Jean-Pierre Dubois', lot: 'Lot 8', email: 'jp.dubois@email.com', type: 'coproprietaire' },
    recipients: [{ id: 'syndic-1', nom: 'Syndic', type: 'syndic' }],
    recipientType: 'individual',
    piecesJointes: [
      { id: 'pj-102-1', nom: 'fuite_photo_1.jpg', taille: 245000, mimeType: 'image/jpeg', url: '', dateAjout: '2025-12-21T14:15:00' },
      { id: 'pj-102-2', nom: 'fuite_photo_2.jpg', taille: 312000, mimeType: 'image/jpeg', url: '', dateAjout: '2025-12-21T14:15:00' },
    ],
    statut: 'received',
    isRead: false,
    hasAttachment: true,
    dateCreation: '2025-12-21T14:15:00',
  },
  {
    id: 'mail-103',
    coproprieteId: DEFAULT_COPROPRIETE_ID,
    subject: 'Question sur les charges du T4',
    body: `Je souhaiterais obtenir des éclaircissements concernant le montant des charges du dernier trimestre.

Le montant me semble plus élevé que d'habitude.

Cordialement,
Sophie Leroy`,
    preview: 'Je souhaiterais obtenir des éclaircissements concernant le montant des charges...',
    sender: { id: 'u3', nom: 'Sophie Leroy', lot: 'Lot 3', email: 's.leroy@email.com', type: 'coproprietaire' },
    recipients: [{ id: 'syndic-1', nom: 'Syndic', type: 'syndic' }],
    recipientType: 'individual',
    piecesJointes: [],
    statut: 'received',
    isRead: true,
    hasAttachment: false,
    dateCreation: '2025-12-20T09:45:00',
  },
  // Mails envoyés
  {
    id: 'mail-1',
    coproprieteId: DEFAULT_COPROPRIETE_ID,
    subject: 'Convocation Assemblée Générale - 15 Décembre 2025',
    body: `Madame, Monsieur,

Nous avons le plaisir de vous convoquer à l'Assemblée Générale Ordinaire de la copropriété située au 10 rue du 4 Septembre, 75002 Paris.

Date : Dimanche 15 Décembre 2025
Heure : 10h00
Lieu : Salle des fêtes, 15 rue de la Mairie, 75002 Paris

L'ordre du jour sera le suivant :
1. Élection du bureau de l'assemblée
2. Approbation des comptes de l'exercice clos au 31/12/2024
3. Vote du budget prévisionnel 2025
4. Travaux de réfection de la toiture - Devis et vote
5. Renouvellement du contrat de gardiennage
6. Questions diverses

Cordialement,
Le Conseil Syndical`,
    preview: "Nous avons le plaisir de vous convoquer à l'Assemblée Générale...",
    sender: { id: 'syndic-1', nom: 'Syndic', type: 'syndic' },
    recipients: [{ id: 'all', nom: 'Tous les copropriétaires (42 destinataires)', type: 'groupe' }],
    recipientType: 'all',
    piecesJointes: [
      { id: 'pj-1-1', nom: 'Convocation_AG_2025.pdf', taille: 250880, mimeType: 'application/pdf', url: '', dateAjout: '2025-11-28T14:30:00' },
      { id: 'pj-1-2', nom: 'Ordre_du_jour_AG_2025.pdf', taille: 131072, mimeType: 'application/pdf', url: '', dateAjout: '2025-11-28T14:30:00' },
      { id: 'pj-1-3', nom: 'Comptes_exercice_2024.pdf', taille: 1258291, mimeType: 'application/pdf', url: '', dateAjout: '2025-11-28T14:30:00' },
    ],
    statut: 'opened',
    template: 'Convocation AG',
    isRead: true,
    hasAttachment: true,
    dateCreation: '2025-11-28T14:00:00',
    dateEnvoi: '2025-11-28T14:30:00',
    stats: { sent: 42, opened: 38, received: 35 },
  },
  {
    id: 'mail-2',
    coproprieteId: DEFAULT_COPROPRIETE_ID,
    subject: 'Avis de travaux - Réfection toiture',
    body: `Madame, Monsieur,

Nous vous informons que des travaux de réfection de la toiture débuteront prochainement.

Ces travaux sont nécessaires suite au diagnostic réalisé et aux infiltrations constatées.

Un planning détaillé vous sera communiqué très prochainement.

Cordialement,
Le Syndic`,
    preview: 'Nous vous informons que des travaux de réfection de la toiture...',
    sender: { id: 'syndic-1', nom: 'Syndic', type: 'syndic' },
    recipients: [{ id: 'all', nom: 'Tous les copropriétaires', type: 'groupe' }],
    recipientType: 'all',
    piecesJointes: [],
    statut: 'sent',
    isRead: true,
    hasAttachment: false,
    dateCreation: '2025-11-25T09:00:00',
    dateEnvoi: '2025-11-25T09:15:00',
  },
  // Brouillons
  {
    id: 'mail-201',
    coproprieteId: DEFAULT_COPROPRIETE_ID,
    subject: 'Information travaux ascenseur',
    body: `Madame, Monsieur,

Nous vous informons que l'ascenseur sera en maintenance du...`,
    preview: "Nous vous informons que l'ascenseur sera en maintenance du...",
    sender: { id: 'syndic-1', nom: 'Syndic', type: 'syndic' },
    recipients: [{ id: 'all', nom: 'Tous les copropriétaires', type: 'groupe' }],
    recipientType: 'all',
    piecesJointes: [],
    statut: 'draft',
    isRead: true,
    hasAttachment: false,
    dateCreation: '2025-12-22T08:00:00',
  },
  {
    id: 'mail-202',
    coproprieteId: DEFAULT_COPROPRIETE_ID,
    subject: 'Rappel règlement intérieur',
    body: `Madame, Monsieur,

Suite à quelques incidents récents, nous tenons à rappeler les règles du règlement intérieur concernant...`,
    preview: 'Suite à quelques incidents récents, nous tenons à rappeler les règles...',
    sender: { id: 'syndic-1', nom: 'Syndic', type: 'syndic' },
    recipients: [{ id: 'all', nom: 'Tous les copropriétaires', type: 'groupe' }],
    recipientType: 'all',
    piecesJointes: [],
    statut: 'draft',
    isRead: true,
    hasAttachment: false,
    dateCreation: '2025-12-20T15:30:00',
  },
];

// ========================================
// CLASSE SERVICE
// ========================================

class MailService {
  // ----------------------------------------
  // STORAGE
  // ----------------------------------------

  private getStorageData(): MailStorageData {
    if (typeof window === 'undefined') {
      return { mails: MOCK_MAILS, historique: {} };
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as MailStorageData;
      } catch {
        // Ignorer l'erreur de parsing
      }
    }

    // Initialiser avec les données mock
    const initialData: MailStorageData = { mails: MOCK_MAILS, historique: {} };
    this.saveStorageData(initialData);
    return initialData;
  }

  private saveStorageData(data: MailStorageData): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  // ----------------------------------------
  // LECTURE
  // ----------------------------------------

  getMails(coproprieteId: string = DEFAULT_COPROPRIETE_ID, filtres?: MailFiltres): Mail[] {
    const data = this.getStorageData();
    let mails = data.mails.filter((m) => m.coproprieteId === coproprieteId);

    if (filtres) {
      // Filtre par onglet
      switch (filtres.onglet) {
        case 'inbox':
          mails = mails.filter((m) => m.statut === 'received');
          break;
        case 'sent':
          mails = mails.filter((m) => m.statut === 'sent' || m.statut === 'opened');
          break;
        case 'drafts':
          mails = mails.filter((m) => m.statut === 'draft');
          break;
        case 'trash':
          mails = mails.filter((m) => m.statut === 'deleted');
          break;
        case 'archived':
          // Pour l'instant, pas de statut archived séparé
          mails = [];
          break;
      }

      // Filtre par recherche
      if (filtres.recherche) {
        const recherche = filtres.recherche.toLowerCase();
        mails = mails.filter(
          (m) =>
            m.subject.toLowerCase().includes(recherche) ||
            m.preview?.toLowerCase().includes(recherche) ||
            m.sender?.nom.toLowerCase().includes(recherche)
        );
      }

      // Filtre par pièce jointe
      if (filtres.hasAttachment !== undefined) {
        mails = mails.filter((m) => m.hasAttachment === filtres.hasAttachment);
      }

      // Filtre par lecture
      if (filtres.isRead !== undefined) {
        mails = mails.filter((m) => m.isRead === filtres.isRead);
      }
    }

    // Trier par date (plus récent en premier)
    return mails.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
  }

  getMailsCorbeille(coproprieteId: string = DEFAULT_COPROPRIETE_ID): Mail[] {
    const data = this.getStorageData();
    return data.mails
      .filter((m) => m.coproprieteId === coproprieteId && m.statut === 'deleted')
      .sort((a, b) => new Date(b.dateSuppression || b.dateCreation).getTime() - new Date(a.dateSuppression || a.dateCreation).getTime());
  }

  getMailById(id: string): Mail | null {
    const data = this.getStorageData();
    return data.mails.find((m) => m.id === id) || null;
  }

  getMailsByOnglet(onglet: MailOnglet, coproprieteId: string = DEFAULT_COPROPRIETE_ID): Mail[] {
    return this.getMails(coproprieteId, { onglet, recherche: '' });
  }

  // ----------------------------------------
  // CRÉATION / MODIFICATION
  // ----------------------------------------

  createMail(brouillon: BrouillonData, coproprieteId: string = DEFAULT_COPROPRIETE_ID): Mail {
    const data = this.getStorageData();

    const newMail: Mail = {
      id: brouillon.id || generateMailId(),
      coproprieteId,
      subject: brouillon.subject,
      body: brouillon.body,
      preview: brouillon.body.substring(0, 100) + (brouillon.body.length > 100 ? '...' : ''),
      sender: { id: UTILISATEUR_ID, nom: UTILISATEUR_COURANT, type: 'syndic' },
      recipients: brouillon.recipients,
      recipientType: brouillon.recipientType,
      piecesJointes: brouillon.piecesJointes,
      statut: 'draft',
      template: brouillon.template,
      isRead: true,
      hasAttachment: brouillon.piecesJointes.length > 0,
      dateCreation: new Date().toISOString(),
    };

    data.mails.push(newMail);
    this.saveStorageData(data);

    // Log
    this.logAction(newMail.id, 'creation');

    return newMail;
  }

  updateMail(id: string, updates: Partial<BrouillonData>): Mail | null {
    const data = this.getStorageData();
    const index = data.mails.findIndex((m) => m.id === id);

    if (index === -1) return null;

    const mail = data.mails[index];

    if (updates.subject !== undefined) mail.subject = updates.subject;
    if (updates.body !== undefined) {
      mail.body = updates.body;
      mail.preview = updates.body.substring(0, 100) + (updates.body.length > 100 ? '...' : '');
    }
    if (updates.recipients !== undefined) mail.recipients = updates.recipients;
    if (updates.recipientType !== undefined) mail.recipientType = updates.recipientType;
    if (updates.template !== undefined) mail.template = updates.template;
    if (updates.piecesJointes !== undefined) {
      mail.piecesJointes = updates.piecesJointes;
      mail.hasAttachment = updates.piecesJointes.length > 0;
    }

    data.mails[index] = mail;
    this.saveStorageData(data);

    return mail;
  }

  // ----------------------------------------
  // ENVOI
  // ----------------------------------------

  envoyerMail(id: string): Mail | null {
    const data = this.getStorageData();
    const index = data.mails.findIndex((m) => m.id === id);

    if (index === -1) return null;

    const mail = data.mails[index];

    if (mail.statut !== 'draft') {
      throw new Error('Seuls les brouillons peuvent être envoyés');
    }

    mail.statut = 'sent';
    mail.dateEnvoi = new Date().toISOString();
    mail.stats = {
      sent: mail.recipientType === 'all' ? 42 : mail.recipients.length,
      opened: 0,
      received: 0,
    };

    data.mails[index] = mail;
    this.saveStorageData(data);

    // Log
    this.logAction(id, 'envoi', `Envoyé à ${mail.recipients.length} destinataire(s)`);

    return mail;
  }

  // ----------------------------------------
  // SUPPRESSION SÉCURISÉE (CORBEILLE)
  // ----------------------------------------

  supprimerMail(id: string): boolean {
    const data = this.getStorageData();
    const index = data.mails.findIndex((m) => m.id === id);

    if (index === -1) return false;

    const mail = data.mails[index];
    const statutPrecedent = mail.statut;

    mail.statut = 'deleted';
    mail.dateSuppression = new Date().toISOString();

    data.mails[index] = mail;
    this.saveStorageData(data);

    // Log
    this.logAction(id, 'suppression', `Déplacé depuis ${statutPrecedent}`);

    return true;
  }

  restaurerMail(id: string, statutOriginal: MailStatut = 'received'): boolean {
    const data = this.getStorageData();
    const index = data.mails.findIndex((m) => m.id === id);

    if (index === -1) return false;

    const mail = data.mails[index];

    if (mail.statut !== 'deleted') return false;

    mail.statut = statutOriginal;
    mail.dateSuppression = undefined;

    data.mails[index] = mail;
    this.saveStorageData(data);

    // Log
    this.logAction(id, 'restauration');

    return true;
  }

  supprimerDefinitivement(id: string): boolean {
    const data = this.getStorageData();
    const mail = data.mails.find((m) => m.id === id);

    if (!mail) return false;

    // Log avant suppression
    this.logAction(id, 'suppression_definitive', `Sujet: ${mail.subject}`);

    // Supprimer les blobs des PJ
    mail.piecesJointes.forEach((pj) => {
      if (pj.url.startsWith('blob:')) {
        URL.revokeObjectURL(pj.url);
      }
    });

    data.mails = data.mails.filter((m) => m.id !== id);
    this.saveStorageData(data);

    return true;
  }

  viderCorbeille(coproprieteId: string = DEFAULT_COPROPRIETE_ID): number {
    const data = this.getStorageData();
    const mailsCorbeille = data.mails.filter(
      (m) => m.coproprieteId === coproprieteId && m.statut === 'deleted'
    );

    // Supprimer les blobs
    mailsCorbeille.forEach((mail) => {
      mail.piecesJointes.forEach((pj) => {
        if (pj.url.startsWith('blob:')) {
          URL.revokeObjectURL(pj.url);
        }
      });
      this.logAction(mail.id, 'suppression_definitive', `Vidage corbeille - Sujet: ${mail.subject}`);
    });

    const count = mailsCorbeille.length;
    data.mails = data.mails.filter(
      (m) => !(m.coproprieteId === coproprieteId && m.statut === 'deleted')
    );
    this.saveStorageData(data);

    return count;
  }

  // ----------------------------------------
  // PURGE AUTOMATIQUE (30 JOURS)
  // ----------------------------------------

  purgerMailsExpires(coproprieteId: string = DEFAULT_COPROPRIETE_ID): number {
    const data = this.getStorageData();
    const maintenant = new Date();

    const mailsASupprimer = data.mails.filter((m) => {
      if (m.coproprieteId !== coproprieteId || m.statut !== 'deleted') return false;
      if (!m.dateSuppression) return false;

      const joursRestants = joursRestantsCorbeille(m.dateSuppression);
      return joursRestants <= 0;
    });

    // Supprimer les blobs
    mailsASupprimer.forEach((mail) => {
      mail.piecesJointes.forEach((pj) => {
        if (pj.url.startsWith('blob:')) {
          URL.revokeObjectURL(pj.url);
        }
      });
      this.logAction(mail.id, 'suppression_definitive', `Purge auto 30 jours - Sujet: ${mail.subject}`);
    });

    const idsASupprimer = new Set(mailsASupprimer.map((m) => m.id));
    data.mails = data.mails.filter((m) => !idsASupprimer.has(m.id));
    data.lastPurgeDate = maintenant.toISOString();
    this.saveStorageData(data);

    return mailsASupprimer.length;
  }

  // ----------------------------------------
  // PIÈCES JOINTES
  // ----------------------------------------

  async ajouterPJ(mailId: string, file: File): Promise<PieceJointeMail | null> {
    const validation = validerFichierPJ(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const data = this.getStorageData();
    const mail = data.mails.find((m) => m.id === mailId);

    if (!mail) return null;

    const pj: PieceJointeMail = {
      id: generatePJId(),
      nom: file.name,
      taille: file.size,
      mimeType: file.type,
      url: URL.createObjectURL(file),
      dateAjout: new Date().toISOString(),
    };

    mail.piecesJointes.push(pj);
    mail.hasAttachment = true;

    this.saveStorageData(data);
    return pj;
  }

  supprimerPJ(mailId: string, pjId: string): boolean {
    const data = this.getStorageData();
    const mail = data.mails.find((m) => m.id === mailId);

    if (!mail) return false;

    const pj = mail.piecesJointes.find((p) => p.id === pjId);
    if (pj && pj.url.startsWith('blob:')) {
      URL.revokeObjectURL(pj.url);
    }

    mail.piecesJointes = mail.piecesJointes.filter((p) => p.id !== pjId);
    mail.hasAttachment = mail.piecesJointes.length > 0;

    this.saveStorageData(data);
    return true;
  }

  telechargerPJ(pj: PieceJointeMail): void {
    const link = document.createElement('a');
    link.href = pj.url;
    link.download = pj.nom;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  telechargerToutesPJ(mail: Mail): void {
    mail.piecesJointes.forEach((pj, index) => {
      setTimeout(() => this.telechargerPJ(pj), index * 300);
    });
  }

  // ----------------------------------------
  // LECTURE
  // ----------------------------------------

  marquerCommeLu(id: string): boolean {
    const data = this.getStorageData();
    const mail = data.mails.find((m) => m.id === id);

    if (!mail || mail.isRead) return false;

    mail.isRead = true;
    this.saveStorageData(data);

    // Log première lecture
    this.logAction(id, 'lecture');

    return true;
  }

  marquerCommeNonLu(id: string): boolean {
    const data = this.getStorageData();
    const mail = data.mails.find((m) => m.id === id);

    if (!mail) return false;

    mail.isRead = false;
    this.saveStorageData(data);

    return true;
  }

  // ----------------------------------------
  // HISTORIQUE / JOURNALISATION
  // ----------------------------------------

  getHistorique(mailId: string): MailHistorique[] {
    const data = this.getStorageData();
    return (data.historique[mailId] || []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  private logAction(mailId: string, action: MailHistoriqueAction, details?: string): void {
    const data = this.getStorageData();

    if (!data.historique[mailId]) {
      data.historique[mailId] = [];
    }

    const log: MailHistorique = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      mailId,
      action,
      date: new Date().toISOString(),
      utilisateur: UTILISATEUR_COURANT,
      utilisateurId: UTILISATEUR_ID,
      details,
    };

    data.historique[mailId].push(log);
    this.saveStorageData(data);
  }

  // ----------------------------------------
  // STATISTIQUES
  // ----------------------------------------

  getStats(coproprieteId: string = DEFAULT_COPROPRIETE_ID): {
    inbox: number;
    inboxNonLus: number;
    sent: number;
    drafts: number;
    trash: number;
  } {
    const data = this.getStorageData();
    const mails = data.mails.filter((m) => m.coproprieteId === coproprieteId);

    const inbox = mails.filter((m) => m.statut === 'received');
    const sent = mails.filter((m) => m.statut === 'sent' || m.statut === 'opened');
    const drafts = mails.filter((m) => m.statut === 'draft');
    const trash = mails.filter((m) => m.statut === 'deleted');

    return {
      inbox: inbox.length,
      inboxNonLus: inbox.filter((m) => !m.isRead).length,
      sent: sent.length,
      drafts: drafts.length,
      trash: trash.length,
    };
  }

  // ----------------------------------------
  // RESET (DEBUG)
  // ----------------------------------------

  resetToMock(): void {
    const data: MailStorageData = { mails: MOCK_MAILS, historique: {} };
    this.saveStorageData(data);
  }
}

// Export singleton
export const mailService = new MailService();

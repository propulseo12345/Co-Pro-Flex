import {
  PieceJustificative,
  DepenseAvecPJ,
  RoleAccesPJ,
  getDroitsAccesPJ,
  extraireFormat,
  TypePieceJustificative,
} from '@/types/models/piece-justificative';


/**
 * Service de gestion des pièces justificatives
 * NOTE: Version frontend - stockage localStorage en attendant Supabase
 */
export class PiecesJustificativesService {
  private storageKey = 'coproflex-pieces-justificatives';

  // ========================================
  // RÉCUPÉRATION
  // ========================================

  /**
   * Récupère toutes les PJ d'une dépense
   */
  async getPiecesParDepense(depenseId: string): Promise<PieceJustificative[]> {
    const toutes = this.getAllPieces();
    return toutes.filter((pj) => pj.depenseId === depenseId);
  }

  /**
   * Récupère une PJ par son ID
   */
  async getPieceById(pieceId: string): Promise<PieceJustificative | null> {
    const toutes = this.getAllPieces();
    return toutes.find((pj) => pj.id === pieceId) || null;
  }

  /**
   * Récupère les dépenses avec leurs PJ
   */
  async getDepensesAvecPJ(depenses: Array<{ id: string }>): Promise<DepenseAvecPJ[]> {
    const toutesPJ = this.getAllPieces();

    return depenses.map((depense) => ({
      ...depense,
      piecesJustificatives: toutesPJ.filter((pj) => pj.depenseId === depense.id),
    })) as DepenseAvecPJ[];
  }

  // ========================================
  // VÉRIFICATION D'ACCÈS
  // ========================================

  /**
   * Vérifie si l'utilisateur peut voir une PJ
   */
  peutVoirPiece(piece: PieceJustificative, role: RoleAccesPJ): boolean {
    const droits = getDroitsAccesPJ(role);

    if (!droits.peutVoir) return false;

    // Les gestionnaires voient tout
    if (role === 'gestionnaire') return true;

    // Les PJ confidentielles ne sont pas visibles par les copropriétaires
    if (piece.estConfidentiel && role === 'coproprietaire') return false;

    // Les PJ non publiques ne sont pas visibles par les copropriétaires
    if (!piece.estPublic && role === 'coproprietaire') return false;

    return true;
  }

  /**
   * Vérifie si l'utilisateur peut télécharger une PJ
   */
  peutTelechargerPiece(piece: PieceJustificative, role: RoleAccesPJ): boolean {
    const droits = getDroitsAccesPJ(role);
    return droits.peutTelecharger && this.peutVoirPiece(piece, role);
  }

  // ========================================
  // GÉNÉRATION D'URL
  // ========================================

  /**
   * Génère l'URL de visualisation d'une PJ
   */
  getUrlVisualisation(piece: PieceJustificative): string {
    // En production, ce serait une URL Supabase Storage ou autre
    return piece.urlFichier;
  }

  /**
   * Génère l'URL de téléchargement d'une PJ
   */
  getUrlTelechargement(piece: PieceJustificative): string {
    // En production, ajouter un paramètre pour forcer le téléchargement
    return `${piece.urlFichier}?download=true`;
  }

  // ========================================
  // UPLOAD (préparation pour Supabase)
  // ========================================

  /**
   * Upload une nouvelle PJ
   * NOTE: En attendant Supabase, simule l'upload
   */
  async uploadPiece(
    depenseId: string,
    fichier: File,
    metadata: Partial<PieceJustificative>,
    utilisateurId: string
  ): Promise<PieceJustificative> {
    // Simuler un délai d'upload
    await new Promise((r) => setTimeout(r, 500));

    const nouvellePiece: PieceJustificative = {
      id: `pj-${Date.now()}`,
      depenseId,
      nomFichier: fichier.name,
      urlFichier: URL.createObjectURL(fichier), // En production: URL Supabase
      format: extraireFormat(fichier.name),
      tailleFichier: fichier.size,
      type: metadata.type || 'AUTRE',
      description: metadata.description,
      dateDocument: metadata.dateDocument,
      reference: metadata.reference,
      uploadePar: utilisateurId,
      uploadeLe: new Date().toISOString(),
      estPublic: metadata.estPublic ?? true,
      estConfidentiel: metadata.estConfidentiel ?? false,
    };

    // Sauvegarder
    const toutes = this.getAllPieces();
    toutes.push(nouvellePiece);
    localStorage.setItem(this.storageKey, JSON.stringify(toutes));

    return nouvellePiece;
  }

  /**
   * Supprime une PJ
   */
  async supprimerPiece(pieceId: string): Promise<boolean> {
    const toutes = this.getAllPieces();
    const index = toutes.findIndex((pj) => pj.id === pieceId);

    if (index === -1) return false;

    toutes.splice(index, 1);
    localStorage.setItem(this.storageKey, JSON.stringify(toutes));

    return true;
  }

  // ========================================
  // STOCKAGE LOCAL
  // ========================================

  private getAllPieces(): PieceJustificative[] {
    if (typeof window === 'undefined') {
      return this.getMockPieces();
    }

    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
      // Initialiser avec les données de démo
      const mockPieces = this.getMockPieces();
      localStorage.setItem(this.storageKey, JSON.stringify(mockPieces));
      return mockPieces;
    } catch {
      return this.getMockPieces();
    }
  }

  /**
   * Données de démonstration
   * Les IDs correspondent aux dépenses dans MOCK_DEPENSES_BUDGETS
   */
  private getMockPieces(): PieceJustificative[] {
    return [
      // Facture eau T1
      {
        id: 'pj-1',
        depenseId: 'd1',
        nomFichier: 'Facture_Eau_T1_2024.pdf',
        urlFichier: '/demo/factures/eau-t1.pdf',
        format: 'pdf',
        tailleFichier: 125000,
        type: 'FACTURE' as TypePieceJustificative,
        description: 'Facture eau 1er trimestre',
        dateDocument: '2024-01-15',
        reference: 'FAC-VE-2024-0142',
        uploadePar: 'user-1',
        uploadeParNom: 'Marie Dupont',
        uploadeLe: '2024-01-20T10:30:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
      // Facture eau T2
      {
        id: 'pj-2',
        depenseId: 'd2',
        nomFichier: 'Facture_Eau_T2_2024.pdf',
        urlFichier: '/demo/factures/eau-t2.pdf',
        format: 'pdf',
        tailleFichier: 118000,
        type: 'FACTURE' as TypePieceJustificative,
        description: 'Facture eau 2ème trimestre',
        dateDocument: '2024-04-18',
        reference: 'FAC-VE-2024-0356',
        uploadePar: 'user-1',
        uploadeParNom: 'Marie Dupont',
        uploadeLe: '2024-04-20T09:15:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
      // Facture électricité
      {
        id: 'pj-3',
        depenseId: 'd5',
        nomFichier: 'Facture_EDF_T1_2024.pdf',
        urlFichier: '/demo/factures/edf-t1.pdf',
        format: 'pdf',
        tailleFichier: 89000,
        type: 'FACTURE' as TypePieceJustificative,
        description: 'Facture électricité 1er trimestre',
        dateDocument: '2024-01-20',
        reference: 'EDF-2024-789456',
        uploadePar: 'user-1',
        uploadeParNom: 'Marie Dupont',
        uploadeLe: '2024-01-25T14:00:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
      // Attestation assurance
      {
        id: 'pj-4',
        depenseId: 'd9',
        nomFichier: 'Attestation_Assurance_2024.pdf',
        urlFichier: '/demo/contrats/assurance-2024.pdf',
        format: 'pdf',
        tailleFichier: 245000,
        type: 'ATTESTATION' as TypePieceJustificative,
        description: 'Attestation assurance immeuble',
        dateDocument: '2024-01-01',
        reference: 'ATT-2024-001',
        uploadePar: 'user-1',
        uploadeParNom: 'Marie Dupont',
        uploadeLe: '2024-01-05T09:00:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
      // Contrat assurance (2ème PJ pour la même dépense)
      {
        id: 'pj-5',
        depenseId: 'd9',
        nomFichier: 'Contrat_Assurance_MRI_2024.pdf',
        urlFichier: '/demo/contrats/contrat-assurance.pdf',
        format: 'pdf',
        tailleFichier: 520000,
        type: 'CONTRAT' as TypePieceJustificative,
        description: 'Contrat assurance multirisques immeuble',
        dateDocument: '2024-01-01',
        reference: 'CON-MRI-2024',
        uploadePar: 'user-1',
        uploadeParNom: 'Marie Dupont',
        uploadeLe: '2024-01-05T09:15:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
      // Facture ménage
      {
        id: 'pj-6',
        depenseId: 'd10',
        nomFichier: 'Facture_Menage_Jan_2024.pdf',
        urlFichier: '/demo/factures/menage-jan.pdf',
        format: 'pdf',
        tailleFichier: 78000,
        type: 'FACTURE' as TypePieceJustificative,
        description: 'Facture ménage janvier',
        dateDocument: '2024-01-31',
        reference: 'FAC-NET-2024-012',
        uploadePar: 'user-1',
        uploadeParNom: 'Marie Dupont',
        uploadeLe: '2024-02-02T11:00:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
      // Facture ascenseur
      {
        id: 'pj-7',
        depenseId: 'd14',
        nomFichier: 'Facture_Ascenseur_T1_2024.pdf',
        urlFichier: '/demo/factures/ascenseur-t1.pdf',
        format: 'pdf',
        tailleFichier: 156000,
        type: 'FACTURE' as TypePieceJustificative,
        description: 'Contrat maintenance ascenseur T1',
        dateDocument: '2024-01-15',
        reference: 'FAC-ASC-2024-0045',
        uploadePar: 'user-1',
        uploadeParNom: 'Marie Dupont',
        uploadeLe: '2024-01-18T16:30:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
      // Photo de facture (image)
      {
        id: 'pj-8',
        depenseId: 'd17',
        nomFichier: 'Photo_Facture_Espaces_Verts.jpg',
        urlFichier: '/demo/factures/espaces-verts.jpg',
        format: 'jpg',
        tailleFichier: 2500000,
        type: 'FACTURE' as TypePieceJustificative,
        description: 'Photo de la facture espaces verts',
        dateDocument: '2024-02-10',
        reference: 'FAC-JD-2024-089',
        uploadePar: 'user-2',
        uploadeParNom: 'Pierre Martin',
        uploadeLe: '2024-02-12T14:45:00Z',
        estPublic: true,
        estConfidentiel: false,
      },
    ];
  }
}

export const piecesJustificativesService = new PiecesJustificativesService();

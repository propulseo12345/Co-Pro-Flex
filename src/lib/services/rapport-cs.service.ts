/**
 * Service de gestion des rapports d'activité du Conseil Syndical
 *
 * Note: Ce service utilise actuellement des données mockées.
 * Prêt pour l'intégration Supabase (voir les commentaires TODO).
 */

import {
  RapportActiviteCS,
  SectionRapportCS,
  AnnexeRapportCS,
  StatutRapportCS,
  CreateRapportCSData,
  UpdateRapportCSContenu,
  CreateSectionData,
  CreateAnnexeData,
} from '@/types/models/conseil-syndical';

// Données mockées pour le développement
const MOCK_RAPPORTS: RapportActiviteCS[] = [];
let mockIdCounter = 1;

/**
 * Génère un ID unique pour le mock
 */
function generateMockId(): string {
  return `rapport-cs-${mockIdCounter++}-${Date.now()}`;
}

/**
 * Utilitaire pour supprimer les balises HTML
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Service de gestion des rapports d'activité du Conseil Syndical
 */
export class RapportCSService {
  // TODO: Remplacer par createClient de Supabase
  // private supabase = createClient();

  // ========================================
  // CRUD RAPPORT
  // ========================================

  /**
   * Crée un nouveau rapport
   */
  async creerRapport(data: CreateRapportCSData): Promise<RapportActiviteCS> {
    // TODO: Intégration Supabase
    /*
    const { data: rapport, error } = await this.supabase
      .from('rapports_activite_cs')
      .insert({
        conseil_syndical_id: data.conseilSyndicalId,
        copropriete_id: data.coproprieteId,
        auteur_id: data.auteurId,
        periode_debut: data.periodeDebut.toISOString(),
        periode_fin: data.periodeFin.toISOString(),
        titre: data.titre,
        statut: 'brouillon',
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur création rapport: ${error.message}`);
    return this.mapToRapport(rapport);
    */

    const newRapport: RapportActiviteCS = {
      id: generateMockId(),
      conseilSyndicalId: data.conseilSyndicalId,
      coproprieteId: data.coproprieteId,
      auteurId: data.auteurId,
      periodeDebut: data.periodeDebut,
      periodeFin: data.periodeFin,
      titre: data.titre,
      introduction: '',
      contenu: '',
      contenuBrut: '',
      sections: [],
      annexes: [],
      statut: 'brouillon',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    MOCK_RAPPORTS.push(newRapport);
    return newRapport;
  }

  /**
   * Récupère un rapport par ID
   */
  async getRapport(id: string): Promise<RapportActiviteCS | null> {
    // TODO: Intégration Supabase
    /*
    const { data, error } = await this.supabase
      .from('rapports_activite_cs')
      .select(`
        *,
        sections:sections_rapport_cs(*),
        annexes:annexes_rapport_cs(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erreur récupération rapport: ${error.message}`);
    }

    return this.mapToRapport(data);
    */

    const rapport = MOCK_RAPPORTS.find(r => r.id === id);
    return rapport || null;
  }

  /**
   * Liste les rapports d'une copropriété
   */
  async listerRapports(
    coproprieteId: string,
    options: { statut?: StatutRapportCS; agId?: string } = {}
  ): Promise<RapportActiviteCS[]> {
    // TODO: Intégration Supabase
    /*
    let query = this.supabase
      .from('rapports_activite_cs')
      .select('*')
      .eq('copropriete_id', coproprieteId)
      .order('created_at', { ascending: false });

    if (options.statut) {
      query = query.eq('statut', options.statut);
    }

    if (options.agId) {
      query = query.eq('ag_id', options.agId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Erreur liste rapports: ${error.message}`);
    return data.map(this.mapToRapport);
    */

    let rapports = MOCK_RAPPORTS.filter(r => r.coproprieteId === coproprieteId);

    if (options.statut) {
      rapports = rapports.filter(r => r.statut === options.statut);
    }

    if (options.agId) {
      rapports = rapports.filter(r => r.agId === options.agId);
    }

    return rapports.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  /**
   * Met à jour le contenu du rapport
   */
  async mettreAJourContenu(
    id: string,
    contenu: UpdateRapportCSContenu
  ): Promise<RapportActiviteCS> {
    // TODO: Intégration Supabase
    /*
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (contenu.titre) updates.titre = contenu.titre;
    if (contenu.introduction) updates.introduction = contenu.introduction;
    if (contenu.contenu) {
      updates.contenu = contenu.contenu;
      updates.contenu_brut = stripHtml(contenu.contenu);
    }

    const { data, error } = await this.supabase
      .from('rapports_activite_cs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erreur mise à jour rapport: ${error.message}`);
    return this.mapToRapport(data);
    */

    const index = MOCK_RAPPORTS.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Rapport non trouvé: ${id}`);
    }

    const rapport = MOCK_RAPPORTS[index];
    if (contenu.titre) rapport.titre = contenu.titre;
    if (contenu.introduction) rapport.introduction = contenu.introduction;
    if (contenu.contenu) {
      rapport.contenu = contenu.contenu;
      rapport.contenuBrut = stripHtml(contenu.contenu);
    }
    rapport.updatedAt = new Date();

    MOCK_RAPPORTS[index] = rapport;
    return rapport;
  }

  // ========================================
  // GESTION DES SECTIONS
  // ========================================

  /**
   * Ajoute une section au rapport
   */
  async ajouterSection(
    rapportId: string,
    section: CreateSectionData
  ): Promise<SectionRapportCS> {
    // TODO: Intégration Supabase
    /*
    const { data, error } = await this.supabase
      .from('sections_rapport_cs')
      .insert({
        rapport_id: rapportId,
        titre: section.titre,
        contenu: section.contenu,
        ordre: section.ordre,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur ajout section: ${error.message}`);
    return this.mapToSection(data);
    */

    const rapport = MOCK_RAPPORTS.find(r => r.id === rapportId);
    if (!rapport) {
      throw new Error(`Rapport non trouvé: ${rapportId}`);
    }

    const newSection: SectionRapportCS = {
      id: `section-${Date.now()}`,
      titre: section.titre,
      contenu: section.contenu,
      ordre: section.ordre,
    };

    rapport.sections.push(newSection);
    return newSection;
  }

  /**
   * Met à jour une section
   */
  async mettreAJourSection(
    sectionId: string,
    updates: Partial<CreateSectionData>
  ): Promise<SectionRapportCS> {
    // TODO: Intégration Supabase
    /*
    const { data, error } = await this.supabase
      .from('sections_rapport_cs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw new Error(`Erreur mise à jour section: ${error.message}`);
    return this.mapToSection(data);
    */

    for (const rapport of MOCK_RAPPORTS) {
      const sectionIndex = rapport.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex !== -1) {
        const section = rapport.sections[sectionIndex];
        if (updates.titre !== undefined) section.titre = updates.titre;
        if (updates.contenu !== undefined) section.contenu = updates.contenu;
        if (updates.ordre !== undefined) section.ordre = updates.ordre;
        rapport.sections[sectionIndex] = section;
        return section;
      }
    }

    throw new Error(`Section non trouvée: ${sectionId}`);
  }

  /**
   * Supprime une section
   */
  async supprimerSection(sectionId: string): Promise<void> {
    // TODO: Intégration Supabase
    /*
    const { error } = await this.supabase
      .from('sections_rapport_cs')
      .delete()
      .eq('id', sectionId);

    if (error) throw new Error(`Erreur suppression section: ${error.message}`);
    */

    for (const rapport of MOCK_RAPPORTS) {
      const sectionIndex = rapport.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex !== -1) {
        rapport.sections.splice(sectionIndex, 1);
        return;
      }
    }
  }

  // ========================================
  // GESTION DES ANNEXES
  // ========================================

  /**
   * Ajoute une annexe au rapport
   */
  async ajouterAnnexe(
    rapportId: string,
    annexe: CreateAnnexeData
  ): Promise<AnnexeRapportCS> {
    // TODO: Intégration Supabase
    /*
    // Récupérer le prochain ordre
    const { data: existantes } = await this.supabase
      .from('annexes_rapport_cs')
      .select('ordre')
      .eq('rapport_id', rapportId)
      .order('ordre', { ascending: false })
      .limit(1);

    const ordre = existantes && existantes.length > 0 ? existantes[0].ordre + 1 : 1;

    const { data, error } = await this.supabase
      .from('annexes_rapport_cs')
      .insert({
        rapport_id: rapportId,
        nom: annexe.nom,
        description: annexe.description,
        type: annexe.type,
        fichier_url: annexe.fichierUrl,
        fichier_nom: annexe.fichierNom,
        fichier_taille: annexe.fichierTaille,
        contenu_integre: annexe.contenuIntegre,
        ordre,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur ajout annexe: ${error.message}`);
    return this.mapToAnnexe(data);
    */

    const rapport = MOCK_RAPPORTS.find(r => r.id === rapportId);
    if (!rapport) {
      throw new Error(`Rapport non trouvé: ${rapportId}`);
    }

    const maxOrdre = rapport.annexes.reduce((max, a) => Math.max(max, a.ordre), 0);

    const newAnnexe: AnnexeRapportCS = {
      id: `annexe-${Date.now()}`,
      rapportId,
      nom: annexe.nom,
      description: annexe.description,
      type: annexe.type,
      fichierUrl: annexe.fichierUrl,
      fichierNom: annexe.fichierNom,
      fichierTaille: annexe.fichierTaille,
      contenuIntegre: annexe.contenuIntegre,
      ordre: maxOrdre + 1,
      createdAt: new Date().toISOString(),
    };

    rapport.annexes.push(newAnnexe);
    return newAnnexe;
  }

  /**
   * Supprime une annexe
   */
  async supprimerAnnexe(annexeId: string): Promise<void> {
    // TODO: Intégration Supabase
    /*
    const { error } = await this.supabase
      .from('annexes_rapport_cs')
      .delete()
      .eq('id', annexeId);

    if (error) throw new Error(`Erreur suppression annexe: ${error.message}`);
    */

    for (const rapport of MOCK_RAPPORTS) {
      const annexeIndex = rapport.annexes.findIndex(a => a.id === annexeId);
      if (annexeIndex !== -1) {
        rapport.annexes.splice(annexeIndex, 1);
        return;
      }
    }
  }

  // ========================================
  // WORKFLOW DE VALIDATION
  // ========================================

  /**
   * Change le statut du rapport
   */
  async changerStatut(
    id: string,
    nouveauStatut: StatutRapportCS,
    membreId?: string
  ): Promise<RapportActiviteCS> {
    // TODO: Intégration Supabase
    /*
    const updates: Record<string, unknown> = {
      statut: nouveauStatut,
      updated_at: new Date().toISOString(),
    };

    if (nouveauStatut === 'valide' && membreId) {
      updates.valide_par = membreId;
      updates.date_validation = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('rapports_activite_cs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erreur changement statut: ${error.message}`);
    return this.mapToRapport(data);
    */

    const index = MOCK_RAPPORTS.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Rapport non trouvé: ${id}`);
    }

    const rapport = MOCK_RAPPORTS[index];
    rapport.statut = nouveauStatut;
    rapport.updatedAt = new Date();

    if (nouveauStatut === 'valide' && membreId) {
      rapport.validePar = membreId;
      rapport.dateValidation = new Date();
    }

    MOCK_RAPPORTS[index] = rapport;
    return rapport;
  }

  /**
   * Soumet le rapport pour révision
   */
  async soumettreRevision(id: string): Promise<RapportActiviteCS> {
    return this.changerStatut(id, 'en_revision');
  }

  /**
   * Valide le rapport
   */
  async validerRapport(id: string, membreId: string): Promise<RapportActiviteCS> {
    return this.changerStatut(id, 'valide', membreId);
  }

  /**
   * Publie le rapport (le lie à une AG)
   */
  async publierRapport(id: string, agId: string): Promise<RapportActiviteCS> {
    // TODO: Intégration Supabase
    /*
    const { data, error } = await this.supabase
      .from('rapports_activite_cs')
      .update({
        statut: 'publie',
        ag_id: agId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erreur publication rapport: ${error.message}`);
    return this.mapToRapport(data);
    */

    const index = MOCK_RAPPORTS.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Rapport non trouvé: ${id}`);
    }

    const rapport = MOCK_RAPPORTS[index];
    rapport.statut = 'publie';
    rapport.agId = agId;
    rapport.updatedAt = new Date();

    MOCK_RAPPORTS[index] = rapport;
    return rapport;
  }

  // ========================================
  // LIEN AVEC AG ET RÉSOLUTIONS
  // ========================================

  /**
   * Récupère le rapport lié à une AG
   */
  async getRapportPourAG(agId: string): Promise<RapportActiviteCS | null> {
    // TODO: Intégration Supabase
    /*
    const { data, error } = await this.supabase
      .from('rapports_activite_cs')
      .select(`
        *,
        sections:sections_rapport_cs(*),
        annexes:annexes_rapport_cs(*)
      `)
      .eq('ag_id', agId)
      .eq('statut', 'publie')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erreur récupération rapport AG: ${error.message}`);
    }

    return this.mapToRapport(data);
    */

    const rapport = MOCK_RAPPORTS.find(
      r => r.agId === agId && r.statut === 'publie'
    );
    return rapport || null;
  }

  /**
   * Lie le rapport à une résolution
   */
  async lierResolution(
    rapportId: string,
    resolutionId: string
  ): Promise<RapportActiviteCS> {
    // TODO: Intégration Supabase
    /*
    const { data, error } = await this.supabase
      .from('rapports_activite_cs')
      .update({
        resolution_id: resolutionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rapportId)
      .select()
      .single();

    if (error) throw new Error(`Erreur liaison résolution: ${error.message}`);
    return this.mapToRapport(data);
    */

    const index = MOCK_RAPPORTS.findIndex(r => r.id === rapportId);
    if (index === -1) {
      throw new Error(`Rapport non trouvé: ${rapportId}`);
    }

    const rapport = MOCK_RAPPORTS[index];
    rapport.resolutionId = resolutionId;
    rapport.updatedAt = new Date();

    MOCK_RAPPORTS[index] = rapport;
    return rapport;
  }

  /**
   * Génère le texte pour la résolution à partir du rapport
   */
  genererTexteResolution(rapport: RapportActiviteCS): string {
    const periodeDebut = rapport.periodeDebut.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    const periodeFin = rapport.periodeFin.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    let texte = `L'assemblée générale prend acte du compte rendu d'activité du Conseil Syndical pour la période de ${periodeDebut} à ${periodeFin}.`;

    if (rapport.introduction) {
      texte += `\n\n${rapport.introduction}`;
    }

    texte += '\n\nLe rapport complet est annexé au présent procès-verbal.';

    return texte;
  }

  // ========================================
  // UTILITAIRES PRIVÉS (pour Supabase)
  // ========================================

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private mapToRapport(data: any): RapportActiviteCS {
    return {
      id: data.id,
      conseilSyndicalId: data.conseil_syndical_id,
      coproprieteId: data.copropriete_id,
      periodeDebut: new Date(data.periode_debut),
      periodeFin: new Date(data.periode_fin),
      titre: data.titre,
      introduction: data.introduction || '',
      contenu: data.contenu || '',
      contenuBrut: data.contenu_brut || '',
      sections: data.sections?.map(this.mapToSection.bind(this)) || [],
      annexes: data.annexes?.map(this.mapToAnnexe.bind(this)) || [],
      statut: data.statut,
      agId: data.ag_id,
      resolutionId: data.resolution_id,
      validePar: data.valide_par,
      dateValidation: data.date_validation ? new Date(data.date_validation) : undefined,
      auteurId: data.auteur_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToSection(data: any): SectionRapportCS {
    return {
      id: data.id,
      ordre: data.ordre,
      titre: data.titre,
      contenu: data.contenu || '',
    };
  }

  private mapToAnnexe(data: any): AnnexeRapportCS {
    return {
      id: data.id,
      rapportId: data.rapport_id,
      nom: data.nom,
      description: data.description,
      type: data.type,
      fichierUrl: data.fichier_url,
      fichierNom: data.fichier_nom,
      fichierTaille: data.fichier_taille,
      contenuIntegre: data.contenu_integre,
      ordre: data.ordre,
      createdAt: data.created_at,
    };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// Export singleton
export const rapportCSService = new RapportCSService();

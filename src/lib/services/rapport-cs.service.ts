/**
 * Service de gestion des rapports d'activité du Conseil Syndical.
 *
 * Persistance réelle (0053) : rapports_activite_cs + sections_rapport_cs +
 * annexes_rapport_cs. Colonnes canoniques EN en base (period_start, title,
 * status…) — l'API du service reste en camelCase métier FR (titre, statut…),
 * la traduction vit dans les mappers privés.
 */

import { createClient } from '@/lib/supabase/client';
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

// Tables 0053 absentes des types générés (regen différée) → client untyped
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

/**
 * Utilitaire pour supprimer les balises HTML
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * date → 'YYYY-MM-DD' en composantes LOCALES. Surtout pas toISOString() : les
 * dates métier sont construites à minuit local (France = UTC+1/+2) et la
 * conversion UTC les ferait glisser d'un jour en arrière (période légale fausse).
 */
function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → Date à minuit LOCAL (symétrique de toDateOnly — new Date(str) parserait en UTC) */
function fromDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RAPPORT_SELECT = `
  *,
  sections:sections_rapport_cs(*),
  annexes:annexes_rapport_cs(*)
`;

/**
 * Service de gestion des rapports d'activité du Conseil Syndical
 */
export class RapportCSService {
  // ========================================
  // CRUD RAPPORT
  // ========================================

  /**
   * Crée un nouveau rapport.
   * NB : conseilSyndicalId (legacy) est ignoré — le conseil n'est pas une
   * entité persistée, le rapport est rattaché à la copro.
   */
  async creerRapport(data: CreateRapportCSData): Promise<RapportActiviteCS> {
    const supabase = createUntypedClient();
    const { data: rapport, error } = await supabase
      .from('rapports_activite_cs')
      .insert({
        copro_id: data.coproprieteId,
        author_id: data.auteurId || null,
        period_start: toDateOnly(data.periodeDebut),
        period_end: toDateOnly(data.periodeFin),
        title: data.titre,
        status: 'brouillon',
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur création rapport: ${error.message}`);
    return this.mapToRapport(rapport);
  }

  /**
   * Récupère un rapport par ID (avec sections et annexes)
   */
  async getRapport(id: string): Promise<RapportActiviteCS | null> {
    // id issu de l'URL libre : un non-UUID (ancien id mock, typo) = introuvable,
    // pas une erreur Postgres brute (22P02) à l'écran
    if (!UUID_RE.test(id)) return null;
    const supabase = createUntypedClient();
    const { data, error } = await supabase
      .from('rapports_activite_cs')
      .select(RAPPORT_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Erreur récupération rapport: ${error.message}`);
    return data ? this.mapToRapport(data) : null;
  }

  /**
   * Liste les rapports d'une copropriété
   */
  async listerRapports(
    coproprieteId: string,
    options: { statut?: StatutRapportCS; agId?: string } = {}
  ): Promise<RapportActiviteCS[]> {
    const supabase = createUntypedClient();
    let query = supabase
      .from('rapports_activite_cs')
      .select(RAPPORT_SELECT)
      .eq('copro_id', coproprieteId)
      .order('created_at', { ascending: false });

    if (options.statut) {
      query = query.eq('status', options.statut);
    }
    if (options.agId) {
      query = query.eq('ag_id', options.agId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erreur liste rapports: ${error.message}`);
    return (data || []).map((r: Record<string, unknown>) => this.mapToRapport(r));
  }

  /**
   * Met à jour le contenu du rapport
   */
  async mettreAJourContenu(
    id: string,
    contenu: UpdateRapportCSContenu
  ): Promise<RapportActiviteCS> {
    const supabase = createUntypedClient();
    const updates: Record<string, unknown> = {};

    if (contenu.titre !== undefined) updates.title = contenu.titre;
    if (contenu.introduction !== undefined) updates.introduction = contenu.introduction;
    if (contenu.contenu !== undefined) {
      updates.content = contenu.contenu;
      updates.content_text = stripHtml(contenu.contenu);
    }

    const { data, error } = await supabase
      .from('rapports_activite_cs')
      .update(updates)
      .eq('id', id)
      .select(RAPPORT_SELECT)
      .single();

    if (error) throw new Error(`Erreur mise à jour rapport: ${error.message}`);
    return this.mapToRapport(data);
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
    const supabase = createUntypedClient();

    // copro_id obligatoire (RLS) : dérivé du rapport
    const { data: rapport, error: rapportError } = await supabase
      .from('rapports_activite_cs')
      .select('copro_id')
      .eq('id', rapportId)
      .single();
    if (rapportError) throw new Error(`Rapport non trouvé: ${rapportId}`);

    const { data, error } = await supabase
      .from('sections_rapport_cs')
      .insert({
        copro_id: rapport.copro_id,
        rapport_id: rapportId,
        title: section.titre,
        content: section.contenu,
        sort_order: section.ordre,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur ajout section: ${error.message}`);
    return this.mapToSection(data);
  }

  /**
   * Met à jour une section
   */
  async mettreAJourSection(
    sectionId: string,
    updates: Partial<CreateSectionData>
  ): Promise<SectionRapportCS> {
    const supabase = createUntypedClient();
    const row: Record<string, unknown> = {};
    if (updates.titre !== undefined) row.title = updates.titre;
    if (updates.contenu !== undefined) row.content = updates.contenu;
    if (updates.ordre !== undefined) row.sort_order = updates.ordre;

    const { data, error } = await supabase
      .from('sections_rapport_cs')
      .update(row)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw new Error(`Erreur mise à jour section: ${error.message}`);
    return this.mapToSection(data);
  }

  /**
   * Supprime une section
   */
  async supprimerSection(sectionId: string): Promise<void> {
    const supabase = createUntypedClient();
    const { error } = await supabase
      .from('sections_rapport_cs')
      .delete()
      .eq('id', sectionId);

    if (error) throw new Error(`Erreur suppression section: ${error.message}`);
  }

  // ========================================
  // GESTION DES ANNEXES
  // ========================================

  /**
   * Ajoute une annexe au rapport (ordre = max existant + 1)
   */
  async ajouterAnnexe(
    rapportId: string,
    annexe: CreateAnnexeData
  ): Promise<AnnexeRapportCS> {
    const supabase = createUntypedClient();

    const { data: rapport, error: rapportError } = await supabase
      .from('rapports_activite_cs')
      .select('copro_id')
      .eq('id', rapportId)
      .single();
    if (rapportError) throw new Error(`Rapport non trouvé: ${rapportId}`);

    const { data: existantes } = await supabase
      .from('annexes_rapport_cs')
      .select('sort_order')
      .eq('rapport_id', rapportId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const ordre = existantes && existantes.length > 0 ? existantes[0].sort_order + 1 : 1;

    const { data, error } = await supabase
      .from('annexes_rapport_cs')
      .insert({
        copro_id: rapport.copro_id,
        rapport_id: rapportId,
        name: annexe.nom,
        description: annexe.description ?? null,
        kind: annexe.type,
        file_url: annexe.fichierUrl ?? null,
        file_name: annexe.fichierNom ?? null,
        file_size: annexe.fichierTaille ?? null,
        embedded_content: annexe.contenuIntegre ?? null,
        sort_order: ordre,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur ajout annexe: ${error.message}`);
    return this.mapToAnnexe(data);
  }

  /**
   * Supprime une annexe
   */
  async supprimerAnnexe(annexeId: string): Promise<void> {
    const supabase = createUntypedClient();
    const { error } = await supabase
      .from('annexes_rapport_cs')
      .delete()
      .eq('id', annexeId);

    if (error) throw new Error(`Erreur suppression annexe: ${error.message}`);
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
    userId?: string // = profiles.id (auth.uid) — PAS un council_members.id (FK validated_by → profiles)
  ): Promise<RapportActiviteCS> {
    const supabase = createUntypedClient();
    const updates: Record<string, unknown> = { status: nouveauStatut };

    if (nouveauStatut === 'valide' && userId) {
      updates.validated_by = userId;
      updates.validated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('rapports_activite_cs')
      .update(updates)
      .eq('id', id)
      .select(RAPPORT_SELECT)
      .single();

    if (error) throw new Error(`Erreur changement statut: ${error.message}`);
    return this.mapToRapport(data);
  }

  /**
   * Soumet le rapport pour révision
   */
  async soumettreRevision(id: string): Promise<RapportActiviteCS> {
    return this.changerStatut(id, 'en_revision');
  }

  /**
   * Valide le rapport. userId = profiles.id (utilisateur de session).
   */
  async validerRapport(id: string, userId: string): Promise<RapportActiviteCS> {
    return this.changerStatut(id, 'valide', userId);
  }

  /**
   * Publie le rapport (le lie à une AG). Gardes métier :
   * - le rapport doit être 'valide' (le gate UI seul est contournable) ;
   * - l'AG doit appartenir à la MÊME copro et être à venir (draft/convoked) —
   *   le compte rendu art. 21 se présente à une AG future, pas archivée ;
   * - un seul rapport publié par AG (index 0053) : l'ancien est archivé d'abord.
   */
  async publierRapport(id: string, agId: string): Promise<RapportActiviteCS> {
    const supabase = createUntypedClient();

    const { data: rapport, error: rapportError } = await supabase
      .from('rapports_activite_cs')
      .select('copro_id, status')
      .eq('id', id)
      .single();
    if (rapportError) throw new Error(`Rapport non trouvé: ${rapportError.message}`);
    if (rapport.status !== 'valide') {
      throw new Error('Seul un rapport validé peut être publié.');
    }

    const { data: ag, error: agError } = await supabase
      .from('ag_meetings')
      .select('copro_id, status')
      .eq('id', agId)
      .maybeSingle();
    if (agError || !ag) throw new Error('AG introuvable.');
    if (ag.copro_id !== rapport.copro_id) {
      throw new Error('Cette AG appartient à une autre copropriété.');
    }
    if (!['draft', 'convoked'].includes(ag.status)) {
      throw new Error('Le rapport se publie vers une AG à venir (brouillon ou convoquée).');
    }

    // un seul rapport publié par AG : archiver l'éventuel précédent
    const { error: archiveError } = await supabase
      .from('rapports_activite_cs')
      .update({ status: 'archive' })
      .eq('ag_id', agId)
      .eq('status', 'publie')
      .neq('id', id);
    if (archiveError) throw new Error(`Erreur d'archivage du rapport précédent: ${archiveError.message}`);

    const { data, error } = await supabase
      .from('rapports_activite_cs')
      .update({ status: 'publie', ag_id: agId })
      .eq('id', id)
      .select(RAPPORT_SELECT)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Un rapport est déjà publié pour cette AG — archivez-le d\'abord.');
      }
      throw new Error(`Erreur publication rapport: ${error.message}`);
    }
    return this.mapToRapport(data);
  }

  // ========================================
  // LIEN AVEC AG ET RÉSOLUTIONS
  // ========================================

  /**
   * Récupère le rapport publié lié à une AG
   */
  async getRapportPourAG(agId: string): Promise<RapportActiviteCS | null> {
    const supabase = createUntypedClient();
    const { data, error } = await supabase
      .from('rapports_activite_cs')
      .select(RAPPORT_SELECT)
      .eq('ag_id', agId)
      .eq('status', 'publie')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Erreur récupération rapport AG: ${error.message}`);
    return data ? this.mapToRapport(data) : null;
  }

  /**
   * Lie le rapport à une résolution
   */
  async lierResolution(
    rapportId: string,
    resolutionId: string
  ): Promise<RapportActiviteCS> {
    const supabase = createUntypedClient();
    const { data, error } = await supabase
      .from('rapports_activite_cs')
      .update({ resolution_id: resolutionId })
      .eq('id', rapportId)
      .select(RAPPORT_SELECT)
      .single();

    if (error) throw new Error(`Erreur liaison résolution: ${error.message}`);
    return this.mapToRapport(data);
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
  // UTILITAIRES PRIVÉS (colonnes EN → API camelCase FR)
  // ========================================

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private mapToRapport(data: any): RapportActiviteCS {
    const sections = ((data.sections as any[]) || [])
      .map((s) => this.mapToSection(s))
      .sort((a, b) => a.ordre - b.ordre);
    const annexes = ((data.annexes as any[]) || [])
      .map((a) => this.mapToAnnexe(a))
      .sort((a, b) => a.ordre - b.ordre);
    return {
      id: data.id,
      conseilSyndicalId: '', // legacy — le conseil n'est pas une entité persistée
      coproprieteId: data.copro_id,
      periodeDebut: fromDateOnly(data.period_start),
      periodeFin: fromDateOnly(data.period_end),
      titre: data.title,
      introduction: data.introduction || '',
      contenu: data.content || '',
      contenuBrut: data.content_text || '',
      sections,
      annexes,
      statut: data.status,
      agId: data.ag_id ?? undefined,
      resolutionId: data.resolution_id ?? undefined,
      validePar: data.validated_by ?? undefined,
      dateValidation: data.validated_at ? new Date(data.validated_at) : undefined,
      auteurId: data.author_id ?? '',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToSection(data: any): SectionRapportCS {
    return {
      id: data.id,
      ordre: data.sort_order,
      titre: data.title,
      contenu: data.content || '',
    };
  }

  private mapToAnnexe(data: any): AnnexeRapportCS {
    return {
      id: data.id,
      rapportId: data.rapport_id,
      nom: data.name,
      description: data.description ?? undefined,
      type: data.kind,
      fichierUrl: data.file_url ?? undefined,
      fichierNom: data.file_name ?? undefined,
      fichierTaille: data.file_size ?? undefined,
      contenuIntegre: data.embedded_content ?? undefined,
      ordre: data.sort_order,
      createdAt: data.created_at,
    };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// Export singleton
export const rapportCSService = new RapportCSService();
export default rapportCSService;

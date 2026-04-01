import { Prestataire } from '@/types';
import { DOMAINES_ACTIVITE } from '@/lib/constants/domaines-activite';
import { getInterventionsCountByPrestataire, getDerniereInterventionByPrestataire } from '@/lib/services/interventions.service';

export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function getNoteMoyenne(prestataires: Prestataire[]): number {
    const withNotes = prestataires.filter(p => p.noteMoyenne !== undefined);
    if (withNotes.length === 0) return 0;
    const sum = withNotes.reduce((acc, p) => acc + (p.noteMoyenne || 0), 0);
    return sum / withNotes.length;
}

export function getNombreAvis(prestataires: Prestataire[]): number {
    return prestataires.reduce((acc, p) => acc + (p.nombreAvis || 0), 0);
}

export function getNombreInterventions(prestataires: Prestataire[]): number {
    return prestataires.reduce((acc, p) => acc + (p.nombreInterventions || 0), 0);
}

export function enrichirPrestatairesAvecInterventions(prestataires: Prestataire[]): Prestataire[] {
    const countMap = getInterventionsCountByPrestataire();
    const dateMap = getDerniereInterventionByPrestataire();

    return prestataires.map(p => ({
        ...p,
        nombreInterventions: countMap.get(p.id) || 0,
        derniereIntervention: dateMap.get(p.id)
    }));
}

export function getDomainesPrincipaux(prestataires: Prestataire[]): string[] {
    const domainesCount: Record<string, number> = {};
    prestataires.forEach(p => {
        p.domaines.forEach(d => {
            domainesCount[d] = (domainesCount[d] || 0) + 1;
        });
    });
    return Object.entries(domainesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([domaine]) => DOMAINES_ACTIVITE.find(d => d.value === domaine)?.label || domaine);
}

export function getDerniereIntervention(prestataires: Prestataire[]): string | null {
    const dates = prestataires
        .filter(p => p.derniereIntervention)
        .map(p => new Date(p.derniereIntervention!).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates)).toLocaleDateString('fr-FR');
}

export function getDomaineLabel(domaineValue: string): string {
    return DOMAINES_ACTIVITE.find(d => d.value === domaineValue)?.label || domaineValue;
}

export function exportPrestatairesToCsv(prestataires: Prestataire[]): void {
    const headers = 'Nom;Catégorie;Domaines;Téléphone;Email;Ville;Interventions\n';
    const rows = prestataires.map(p =>
        `${p.nom};${p.categorie};${p.domaines.join(', ')};${p.telephone};${p.email};${p.ville || ''};${p.nombreInterventions}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prestataires_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

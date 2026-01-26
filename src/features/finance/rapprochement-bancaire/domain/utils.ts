import type {
  LigneReleve,
  LigneLogiciel,
  LigneRapprochement,
  RapprochementStats,
} from './types';

export function calculerSimilarite(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2) return 100;

  if (s1.includes(s2) || s2.includes(s1)) return 80;

  const mots1 = s1.split(/\s+/);
  const mots2 = s2.split(/\s+/);
  let motsCommuns = 0;

  for (const mot of mots1) {
    if (mot.length > 2 && mots2.some(m => m.includes(mot) || mot.includes(m))) {
      motsCommuns++;
    }
  }

  const score = (motsCommuns / Math.max(mots1.length, mots2.length)) * 60;
  return Math.min(score, 60);
}

export function effectuerRapprochementAutomatique(
  lignesReleve: LigneReleve[],
  lignesLogiciel: LigneLogiciel[]
): LigneRapprochement[] {
  const resultats: LigneRapprochement[] = [];
  const logicielUtilisees = new Set<string>();
  const releveUtilisees = new Set<string>();

  // Phase 1: Matching exact (même date, même montant)
  for (const releve of lignesReleve) {
    for (const logiciel of lignesLogiciel) {
      if (logicielUtilisees.has(logiciel.id)) continue;

      if (releve.date === logiciel.date && Math.abs(releve.montant - logiciel.montant) < 0.01) {
        const similarite = calculerSimilarite(releve.libelle, logiciel.libelle);

        if (similarite >= 30) {
          resultats.push({
            id: `rap-${releve.id}-${logiciel.id}`,
            ligneReleve: releve,
            ligneLogiciel: logiciel,
            statut: 'RAPPROCHE',
            source: 'LES_DEUX',
            confianceMatch: similarite + 40,
          });
          releveUtilisees.add(releve.id);
          logicielUtilisees.add(logiciel.id);
          break;
        }
      }
    }
  }

  // Phase 2: Matching par montant avec tolérance de date (±2 jours)
  for (const releve of lignesReleve) {
    if (releveUtilisees.has(releve.id)) continue;

    for (const logiciel of lignesLogiciel) {
      if (logicielUtilisees.has(logiciel.id)) continue;

      const dateReleve = new Date(releve.date);
      const dateLogiciel = new Date(logiciel.date);
      const diffJours = Math.abs((dateReleve.getTime() - dateLogiciel.getTime()) / (1000 * 60 * 60 * 24));

      if (diffJours <= 2 && Math.abs(releve.montant - logiciel.montant) < 0.01) {
        const similarite = calculerSimilarite(releve.libelle, logiciel.libelle);

        resultats.push({
          id: `rap-${releve.id}-${logiciel.id}`,
          ligneReleve: releve,
          ligneLogiciel: logiciel,
          statut: diffJours === 0 ? 'RAPPROCHE' : 'ECART',
          source: 'LES_DEUX',
          typeEcart: diffJours > 0 ? 'DATE_DIFFERENTE' : undefined,
          confianceMatch: similarite + 30 - (diffJours * 5),
        });
        releveUtilisees.add(releve.id);
        logicielUtilisees.add(logiciel.id);
        break;
      }
    }
  }

  // Phase 3: Lignes du relevé non rapprochées
  for (const releve of lignesReleve) {
    if (!releveUtilisees.has(releve.id)) {
      resultats.push({
        id: `rap-${releve.id}-orphan`,
        ligneReleve: releve,
        statut: 'NON_RAPPROCHE',
        source: 'RELEVE',
        typeEcart: 'DANS_RELEVE_UNIQUEMENT',
      });
    }
  }

  // Phase 4: Lignes du logiciel non rapprochées
  for (const logiciel of lignesLogiciel) {
    if (!logicielUtilisees.has(logiciel.id)) {
      resultats.push({
        id: `rap-orphan-${logiciel.id}`,
        ligneLogiciel: logiciel,
        statut: 'NON_RAPPROCHE',
        source: 'LOGICIEL',
        typeEcart: 'DANS_LOGICIEL_UNIQUEMENT',
      });
    }
  }

  // Trier par date (plus récent en premier)
  resultats.sort((a, b) => {
    const dateA = a.ligneReleve?.date || a.ligneLogiciel?.date || '';
    const dateB = b.ligneReleve?.date || b.ligneLogiciel?.date || '';
    return dateB.localeCompare(dateA);
  });

  return resultats;
}

export function calculerStats(
  lignesRapprochement: LigneRapprochement[],
  lignesLogiciel: LigneLogiciel[],
  soldeReleveDebut: number,
  soldeReleveFin: number
): RapprochementStats {
  const rapprochees = lignesRapprochement.filter(l => l.statut === 'RAPPROCHE').length;
  const ecarts = lignesRapprochement.filter(l => l.statut === 'ECART' || l.statut === 'NON_RAPPROCHE').length;
  const dansReleveUniquement = lignesRapprochement.filter(l => l.typeEcart === 'DANS_RELEVE_UNIQUEMENT').length;
  const dansLogicielUniquement = lignesRapprochement.filter(l => l.typeEcart === 'DANS_LOGICIEL_UNIQUEMENT').length;

  const totalMouvementsLogiciel = lignesLogiciel.reduce((sum, l) => sum + l.montant, 0);
  const soldeTheorique = soldeReleveDebut + totalMouvementsLogiciel;
  const ecartSolde = soldeReleveFin - soldeTheorique;

  return {
    total: lignesRapprochement.length,
    rapprochees,
    ecarts,
    dansReleveUniquement,
    dansLogicielUniquement,
    tauxRapprochement: lignesRapprochement.length > 0 ? Math.round((rapprochees / lignesRapprochement.length) * 100) : 0,
    soldeTheorique: Math.round(soldeTheorique * 100) / 100,
    ecartSolde: Math.round(ecartSolde * 100) / 100,
    peutCertifier: ecarts === 0 && Math.abs(ecartSolde) < 0.01
  };
}

export function filtrerLignes(
  lignesRapprochement: LigneRapprochement[],
  filtreStatut: 'TOUS' | 'RAPPROCHE' | 'NON_RAPPROCHE' | 'ECART' | 'EN_ATTENTE',
  searchTerm: string
): LigneRapprochement[] {
  return lignesRapprochement.filter(ligne => {
    const matchStatut = filtreStatut === 'TOUS' || ligne.statut === filtreStatut;
    const libelle = ligne.ligneReleve?.libelle || ligne.ligneLogiciel?.libelle || '';
    const matchSearch = searchTerm === '' || libelle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatut && matchSearch;
  });
}

import type {
  MouvementBancaireBase,
  MouvementBancaire,
  ErreurCoherence,
  SuggestionCategorie,
  AlerteMouvementNonCategorise,
  StatutClotureMensuelle,
  EcritureComptable,
  SuggestionRapprochement,
  CategorieComptable,
} from './types';

import {
  MOTS_CLES_DETECTION,
  HEURISTIQUES_LIBELLE,
} from './constants';

export function calculerSoldesAvecValidation(
  mouvementsBase: MouvementBancaireBase[],
  soldeInitial: number
): { mouvements: MouvementBancaire[]; erreurs: ErreurCoherence[]; soldeActuel: number } {
  const erreurs: ErreurCoherence[] = [];

  const mouvementsTries = [...mouvementsBase].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let soldeRunning = soldeInitial;
  const mouvementsAvecSolde: MouvementBancaire[] = [];

  for (const mvt of mouvementsTries) {
    const nouveauSolde = soldeRunning + mvt.montant;
    const soldeArrondi = Math.round(nouveauSolde * 100) / 100;
    const soldeValide = !isNaN(soldeArrondi) && isFinite(soldeArrondi);

    if (!soldeValide) {
      erreurs.push({
        mouvementId: mvt.id,
        date: mvt.date,
        soldeAttendu: soldeArrondi,
        soldeTrouve: nouveauSolde,
        ecart: Math.abs(soldeArrondi - nouveauSolde)
      });
    }

    mouvementsAvecSolde.push({
      ...mvt,
      solde: soldeArrondi,
      soldeValide
    });

    soldeRunning = soldeArrondi;
  }

  mouvementsAvecSolde.reverse();

  return {
    mouvements: mouvementsAvecSolde,
    erreurs,
    soldeActuel: soldeRunning
  };
}

interface AppelEnAttente {
  id: string;
  coproprietaire: string;
  montant: number;
  periode: string;
}

interface FactureEnAttente {
  id: string;
  fournisseur: string;
  montant: number;
  description: string;
}

interface FournisseurConnu {
  nom: string;
  compte: string;
  label: string;
  motsClés: string[];
}

interface GenererSuggestionsOptions {
  appelsEnAttente?: AppelEnAttente[];
  facturesEnAttente?: FactureEnAttente[];
  fournisseursConnus?: FournisseurConnu[];
}

export function genererSuggestions(
  mouvement: MouvementBancaire,
  options: GenererSuggestionsOptions = {}
): SuggestionCategorie[] {
  const {
    appelsEnAttente = [],
    facturesEnAttente = [],
    fournisseursConnus = [],
  } = options;

  const suggestions: SuggestionCategorie[] = [];
  const libelleLower = mouvement.libelle.toLowerCase();

  if (mouvement.type === 'ENTREE') {
    const appelCorrespondant = appelsEnAttente.find(
      a => Math.abs(a.montant - mouvement.montant) < 0.01
    );
    if (appelCorrespondant) {
      suggestions.push({
        id: `sug-af-${appelCorrespondant.id}`,
        type: 'appel_fonds',
        confiance: 'haute',
        raison: `Montant correspond exactement à un appel de fonds en attente (${appelCorrespondant.coproprietaire} - ${appelCorrespondant.periode})`,
        categorie: 'produit',
        compte: '701',
        compteLabel: 'Appels de fonds',
        entiteReference: {
          type: 'appel_fonds',
          id: appelCorrespondant.id,
          nom: appelCorrespondant.coproprietaire,
          montant: appelCorrespondant.montant
        }
      });
    }
  }

  if (mouvement.type === 'SORTIE') {
    const factureCorrespondante = facturesEnAttente.find(
      f => Math.abs(f.montant - Math.abs(mouvement.montant)) < 0.01
    );
    if (factureCorrespondante) {
      const fournisseur = fournisseursConnus.find(
        f => f.nom.toUpperCase() === factureCorrespondante.fournisseur.toUpperCase()
      );
      suggestions.push({
        id: `sug-fac-${factureCorrespondante.id}`,
        type: 'fournisseur',
        confiance: 'haute',
        raison: `Montant correspond à la facture ${factureCorrespondante.fournisseur} - ${factureCorrespondante.description}`,
        categorie: 'charge',
        compte: fournisseur?.compte || '618',
        compteLabel: fournisseur?.label || 'Divers',
        entiteReference: {
          type: 'facture',
          id: factureCorrespondante.id,
          nom: factureCorrespondante.fournisseur,
          montant: factureCorrespondante.montant
        }
      });
    }
  }

  for (const fournisseur of fournisseursConnus) {
    const motTrouve = fournisseur.motsClés.find(mot => libelleLower.includes(mot));
    if (motTrouve) {
      if (!suggestions.some(s => s.entiteReference?.nom === fournisseur.nom)) {
        suggestions.push({
          id: `sug-fourn-${fournisseur.nom}`,
          type: 'historique',
          confiance: 'moyenne',
          raison: `Fournisseur "${fournisseur.nom}" détecté dans le libellé (historique connu)`,
          categorie: 'charge',
          compte: fournisseur.compte,
          compteLabel: fournisseur.label,
          entiteReference: {
            type: 'fournisseur',
            id: fournisseur.nom,
            nom: fournisseur.nom
          }
        });
      }
    }
  }

  if (mouvement.type === 'ENTREE') {
    const motAppelTrouve = MOTS_CLES_DETECTION.appelsFonds.find(mot => libelleLower.includes(mot));
    if (motAppelTrouve && !suggestions.some(s => s.compte === '701')) {
      suggestions.push({
        id: 'sug-kw-appel',
        type: 'libelle',
        confiance: 'moyenne',
        raison: `Mot-clé "${motAppelTrouve}" détecté - probable appel de fonds`,
        categorie: 'produit',
        compte: '701',
        compteLabel: 'Appels de fonds'
      });
    }
  }

  if (mouvement.type === 'SORTIE') {
    const motTravauxTrouve = MOTS_CLES_DETECTION.travaux.find(mot => libelleLower.includes(mot));
    if (motTravauxTrouve) {
      suggestions.push({
        id: 'sug-kw-travaux',
        type: 'libelle',
        confiance: 'moyenne',
        raison: `Mot-clé "${motTravauxTrouve}" détecté`,
        categorie: 'charge',
        compte: '605',
        compteLabel: 'Travaux'
      });
    }

    const motEntretienTrouve = MOTS_CLES_DETECTION.entretien.find(mot => libelleLower.includes(mot));
    if (motEntretienTrouve && !suggestions.some(s => s.compte === '615')) {
      suggestions.push({
        id: 'sug-kw-entretien',
        type: 'libelle',
        confiance: 'moyenne',
        raison: `Mot-clé "${motEntretienTrouve}" détecté`,
        categorie: 'charge',
        compte: '615',
        compteLabel: 'Entretien et réparations'
      });
    }

    const motAssuranceTrouve = MOTS_CLES_DETECTION.assurance.find(mot => libelleLower.includes(mot));
    if (motAssuranceTrouve) {
      suggestions.push({
        id: 'sug-kw-assurance',
        type: 'libelle',
        confiance: 'moyenne',
        raison: `Mot-clé "${motAssuranceTrouve}" détecté`,
        categorie: 'charge',
        compte: '616',
        compteLabel: 'Primes d\'assurance'
      });
    }
  }

  if (suggestions.length === 0) {
    if (mouvement.type === 'ENTREE') {
      suggestions.push({
        id: 'sug-default-entree',
        type: 'libelle',
        confiance: 'basse',
        raison: 'Aucune correspondance trouvée - suggestion par défaut pour une entrée',
        categorie: 'produit',
        compte: '758',
        compteLabel: 'Produits divers de gestion courante'
      });
    } else {
      suggestions.push({
        id: 'sug-default-sortie',
        type: 'libelle',
        confiance: 'basse',
        raison: 'Aucune correspondance trouvée - suggestion par défaut pour une sortie',
        categorie: 'charge',
        compte: '618',
        compteLabel: 'Divers'
      });
    }
  }

  const ordreConfiance = { haute: 0, moyenne: 1, basse: 2 };
  suggestions.sort((a, b) => ordreConfiance[a.confiance] - ordreConfiance[b.confiance]);

  return suggestions;
}

export function calculerAlertesNonCategorises(mouvements: MouvementBancaire[]): AlerteMouvementNonCategorise[] {
  const alertes: AlerteMouvementNonCategorise[] = [];
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);

  for (const mvt of mouvements) {
    if (!mvt.categorise) {
      const dateMouvement = new Date(mvt.date);
      dateMouvement.setHours(0, 0, 0, 0);
      const joursEcart = Math.floor((aujourdHui.getTime() - dateMouvement.getTime()) / (1000 * 60 * 60 * 24));

      if (joursEcart >= 7) {
        let urgence: 'critique' | 'haute' | 'normale' = 'normale';
        if (joursEcart > 30) {
          urgence = 'critique';
        } else if (joursEcart > 14) {
          urgence = 'haute';
        }

        alertes.push({
          mouvementId: mvt.id,
          date: mvt.date,
          libelle: mvt.libelle,
          montant: mvt.montant,
          joursNonCategorise: joursEcart,
          urgence
        });
      }
    }
  }

  const ordreUrgence = { critique: 0, haute: 1, normale: 2 };
  alertes.sort((a, b) => {
    if (ordreUrgence[a.urgence] !== ordreUrgence[b.urgence]) {
      return ordreUrgence[a.urgence] - ordreUrgence[b.urgence];
    }
    return b.joursNonCategorise - a.joursNonCategorise;
  });

  return alertes;
}

export function calculerStatutCloture(mouvements: MouvementBancaire[], mois: number, annee: number): StatutClotureMensuelle {
  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const mouvementsDuMois = mouvements.filter(m => {
    const date = new Date(m.date);
    return date.getMonth() === mois && date.getFullYear() === annee;
  });

  const nonCategorises = mouvementsDuMois.filter(m => !m.categorise);

  return {
    mois: moisNoms[mois],
    annee,
    mouvementsNonCategorises: nonCategorises.length,
    peutCloturer: nonCategorises.length === 0,
    messageBlockage: nonCategorises.length > 0
      ? `${nonCategorises.length} mouvement(s) non catégorisé(s) en ${moisNoms[mois]} ${annee}. La clôture mensuelle est bloquée tant que tous les mouvements ne sont pas catégorisés.`
      : undefined
  };
}

export function applySuggestionHeuristique(libelle: string, _montant: number): { compte: string; label: string; categorie: CategorieComptable } | null {
  for (const h of HEURISTIQUES_LIBELLE) {
    if (h.pattern.test(libelle)) {
      return { compte: h.compte, label: h.label, categorie: h.categorie };
    }
  }
  return null;
}

export function parseCSVBancaire(csvContent: string): MouvementBancaireBase[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const separator = header.includes(';') ? ';' : ',';
  const headers = header.split(separator).map(h => h.trim().replace(/"/g, ''));

  const dateIdx = headers.findIndex(h => h.includes('date'));
  const libelleIdx = headers.findIndex(h => h.includes('libel') || h.includes('description') || h.includes('intitul'));
  const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('débit'));
  const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('crédit'));
  const montantIdx = headers.findIndex(h => h.includes('montant') || h.includes('amount'));

  const mouvements: MouvementBancaireBase[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(separator).map(c => c.trim().replace(/"/g, ''));

    const dateStr = cols[dateIdx] || '';
    let parsedDate: Date | null = null;
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      parsedDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else if (dateStr.includes('-')) {
      parsedDate = new Date(dateStr);
    }
    if (!parsedDate || isNaN(parsedDate.getTime())) continue;

    const libelle = cols[libelleIdx] || `Mouvement importé ${i}`;

    let montant = 0;
    if (montantIdx >= 0) {
      montant = parseFloat(cols[montantIdx].replace(/\s/g, '').replace(',', '.')) || 0;
    } else {
      const debit = parseFloat((cols[debitIdx] || '0').replace(/\s/g, '').replace(',', '.')) || 0;
      const credit = parseFloat((cols[creditIdx] || '0').replace(/\s/g, '').replace(',', '.')) || 0;
      montant = credit > 0 ? credit : -debit;
    }

    if (montant === 0) continue;

    const suggestion = applySuggestionHeuristique(libelle, montant);

    mouvements.push({
      id: `import-${Date.now()}-${i}`,
      date: parsedDate.toISOString().split('T')[0],
      libelle: libelle.toUpperCase(),
      montant,
      type: montant > 0 ? 'ENTREE' : 'SORTIE',
      categorise: suggestion !== null,
      compteComptable: suggestion ? `${suggestion.compte} - ${suggestion.label}` : undefined,
      categorie: suggestion?.categorie,
      accountId: '', // sera rempli par le composant ImportTab
      statutRapprochement: 'non_rapproche',
      importSource: 'csv',
    });
  }

  return mouvements;
}

export function genererSuggestionsRapprochement(
  mouvement: MouvementBancaire,
  ecritures: EcritureComptable[]
): SuggestionRapprochement[] {
  const suggestions: SuggestionRapprochement[] = [];
  const montantMvt = Math.abs(mouvement.montant);
  const dateMvt = new Date(mouvement.date);

  for (const ecriture of ecritures) {
    if (ecriture.rapproche) continue;

    const montantEc = ecriture.credit > 0 ? ecriture.credit : ecriture.debit;
    const dateEc = new Date(ecriture.date);
    const ecart = Math.abs(montantMvt - montantEc);
    const ecartJours = Math.abs(dateMvt.getTime() - dateEc.getTime()) / (1000 * 60 * 60 * 24);

    if (ecart < 0.01 && ecartJours <= 3) {
      suggestions.push({
        ecritureId: ecriture.id,
        confiance: 'haute',
        raison: 'Montant identique et dates proches',
        ecart: 0,
      });
    } else if (ecart < 0.01 && ecartJours <= 15) {
      suggestions.push({
        ecritureId: ecriture.id,
        confiance: 'moyenne',
        raison: 'Montant identique',
        ecart: 0,
      });
    } else if (ecart / montantMvt < 0.05 && ecartJours <= 7) {
      suggestions.push({
        ecritureId: ecriture.id,
        confiance: 'basse',
        raison: `Montant proche (écart: ${ecart.toFixed(2)} €)`,
        ecart,
      });
    }
  }

  return suggestions.sort((a, b) => {
    const ordre = { haute: 0, moyenne: 1, basse: 2 };
    return ordre[a.confiance] - ordre[b.confiance];
  });
}

export function calculerEcartSoldes(
  soldeBancaire: number,
  ecritures: EcritureComptable[]
): { soldeComptable: number; ecart: number; mouvementsNonRapproches: number; ecrituresNonRapprochees: number } {
  const soldeComptable = ecritures.reduce((acc, ec) => acc + ec.credit - ec.debit, 0);
  const ecrituresNonRapprochees = ecritures.filter(ec => !ec.rapproche).length;

  return {
    soldeComptable,
    ecart: soldeBancaire - soldeComptable,
    mouvementsNonRapproches: 0,
    ecrituresNonRapprochees,
  };
}

export function detectCategorie(mouvement: MouvementBancaire): { categorie: CategorieComptable; compte: string } {
  const libelle = mouvement.libelle.toLowerCase();

  if (libelle.includes('appel de fonds') || libelle.includes('virement entrant')) {
    return { categorie: 'produit', compte: '701' };
  }
  if (libelle.includes('edf') || libelle.includes('electricite')) {
    return { categorie: 'charge', compte: '606' };
  }
  if (libelle.includes('eau') || libelle.includes('veolia')) {
    return { categorie: 'charge', compte: '606' };
  }
  if (libelle.includes('assurance')) {
    return { categorie: 'charge', compte: '616' };
  }
  if (libelle.includes('entretien') || libelle.includes('maintenance') || libelle.includes('ascenseur')) {
    return { categorie: 'charge', compte: '615' };
  }
  if (libelle.includes('travaux') || libelle.includes('btp')) {
    return { categorie: 'charge', compte: '605' };
  }

  return { categorie: mouvement.type === 'ENTREE' ? 'produit' : 'charge', compte: '' };
}

export function formatMontant(montant: number): string {
  return montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function getTempsDepuisSync(derniereSynchronisation: string | null): string {
  if (!derniereSynchronisation) return 'Jamais synchronisé';

  const derniere = new Date(derniereSynchronisation);
  const maintenant = new Date();
  const diffMs = maintenant.getTime() - derniere.getTime();
  const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHeures > 24) {
    const diffJours = Math.floor(diffHeures / 24);
    return `Il y a ${diffJours} jour${diffJours > 1 ? 's' : ''}`;
  }
  if (diffHeures > 0) {
    return `Il y a ${diffHeures}h${diffMinutes > 0 ? ` ${diffMinutes}min` : ''}`;
  }
  return `Il y a ${diffMinutes} min`;
}

export function getTempsJusquaSync(prochaineSynchronisation: string | null, modeActif: string): string | null {
  if (!prochaineSynchronisation || modeActif === 'manuel') {
    return null;
  }

  const prochaine = new Date(prochaineSynchronisation);
  const maintenant = new Date();
  const diffMs = prochaine.getTime() - maintenant.getTime();

  if (diffMs <= 0) return 'Imminente';

  const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHeures > 0) {
    return `Dans ${diffHeures}h${diffMinutes > 0 ? ` ${diffMinutes}min` : ''}`;
  }
  return `Dans ${diffMinutes} min`;
}

/**
 * Parse un fichier CFONB120 (format bancaire français, lignes fixes 120 chars).
 * Encodage attendu: Latin-1, converti en UTF-8.
 * Records parsés: type 04 (mouvements). Types 01/07 ignorés (header/footer).
 * Lignes malformées ignorées avec warning.
 */
export function parseCFONB120(content: string): {
  mouvements: MouvementBancaireBase[];
  warnings: string[];
} {
  const mouvements: MouvementBancaireBase[] = [];
  const warnings: string[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 120) {
      if (line.trim().length > 0) {
        warnings.push(`Ligne ${i + 1}: ignorée (${line.length} chars au lieu de 120)`);
      }
      continue;
    }

    const recordType = line.substring(0, 2);

    // Only parse type 04 (movement records)
    if (recordType !== '04') continue;

    try {
      const sens = line.substring(32, 33); // C = crédit, D = débit
      const montantStr = line.substring(33, 46).trim();
      const montantCentimes = parseInt(montantStr, 10);
      if (isNaN(montantCentimes)) {
        warnings.push(`Ligne ${i + 1}: montant invalide "${montantStr}"`);
        continue;
      }

      const montant = montantCentimes / 100;
      const dateStr = line.substring(46, 52); // JJMMAA
      const jour = dateStr.substring(0, 2);
      const mois = dateStr.substring(2, 4);
      const annee = dateStr.substring(4, 6);
      const date = `20${annee}-${mois}-${jour}`;

      const libelle = line.substring(52, 83).trim();

      mouvements.push({
        id: `cfonb-${i}`,
        date,
        libelle,
        montant: sens === 'D' ? -montant : montant,
        type: sens === 'D' ? 'SORTIE' : 'ENTREE',
        categorise: false,
        accountId: '', // sera rempli par le composant ImportTab
        statutRapprochement: 'non_rapproche',
        importSource: 'cfonb',
      });
    } catch {
      warnings.push(`Ligne ${i + 1}: erreur de parsing`);
    }
  }

  return { mouvements, warnings };
}

/**
 * Détecte le format d'un fichier bancaire par son contenu.
 */
export function detecterFormatImport(content: string, filename: string): 'csv' | 'ofx' | 'cfonb' {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'ofx' || ext === 'qfx') return 'ofx';

  // CFONB: lignes de 120 chars exactement
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length > 0 && lines.every(l => l.length === 120 || l.length === 0)) {
    return 'cfonb';
  }

  return 'csv';
}

export interface RelancePhaseConfig {
  phase: number;
  label: string;
  type: 'amiable' | 'formelle' | 'mise_en_demeure' | 'contentieux';
  delayDays: number;
  defaultChannel: 'email' | 'courrier' | 'both';
}

export const RELANCE_PHASES: RelancePhaseConfig[] = [
  { phase: 1, label: 'Relance amiable', type: 'amiable', delayDays: 15, defaultChannel: 'email' },
  { phase: 2, label: 'Relance formelle', type: 'formelle', delayDays: 30, defaultChannel: 'both' },
  { phase: 3, label: 'Mise en demeure', type: 'mise_en_demeure', delayDays: 60, defaultChannel: 'courrier' },
  { phase: 4, label: 'Contentieux', type: 'contentieux', delayDays: 90, defaultChannel: 'courrier' },
];

export interface RelanceTemplateVars {
  coproprietaire: string;
  lot: string;
  montant: string;
  echeance: string;
  appel: string;
  copropriete: string;
  syndic: string;
  date: string;
  joursRetard: number;
}

export function generateRelanceContent(
  phase: RelancePhaseConfig,
  vars: RelanceTemplateVars
): string {
  switch (phase.type) {
    case 'amiable':
      return `${vars.copropriete}
${vars.syndic}

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Rappel de charges de copropriete

Madame, Monsieur,

Nous vous informons que, sauf erreur de notre part, un montant de ${vars.montant} reste en attente de reglement pour votre lot ${vars.lot} au titre de l'appel "${vars.appel}", dont l'echeance etait fixee au ${vars.echeance}.

Si votre paiement a ete effectue entre-temps, nous vous prions de ne pas tenir compte de ce courrier.

Dans le cas contraire, nous vous serions reconnaissants de bien vouloir proceder a la regularisation dans les meilleurs delais.

Cordialement,
${vars.syndic}`;

    case 'formelle':
      return `${vars.copropriete}
${vars.syndic}

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Deuxieme rappel — Charges impayees

Madame, Monsieur,

Malgre notre precedent courrier, nous constatons que le montant de ${vars.montant} reste impaye pour votre lot ${vars.lot} au titre de l'appel "${vars.appel}".

Cette somme est echue depuis le ${vars.echeance}, soit ${vars.joursRetard} jours de retard.

Nous vous rappelons que, conformement au reglement de copropriete, des penalites de retard peuvent etre appliquees.

Nous vous prions de bien vouloir regulariser cette situation sous 15 jours.

Cordialement,
${vars.syndic}`;

    case 'mise_en_demeure':
      return `${vars.copropriete}
${vars.syndic}

LETTRE RECOMMANDEE AVEC ACCUSE DE RECEPTION

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Mise en demeure — Article 19 de la loi du 10 juillet 1965

Madame, Monsieur,

Par la presente, nous vous mettons en demeure de regler la somme de ${vars.montant} correspondant aux charges de copropriete impayees pour votre lot ${vars.lot} au titre de l'appel "${vars.appel}".

Cette somme est echue depuis le ${vars.echeance}, soit ${vars.joursRetard} jours.

Conformement a l'article 19 de la loi n° 65-557 du 10 juillet 1965, a defaut de paiement dans un delai de 8 jours a compter de la reception de la presente, nous nous verrons dans l'obligation de transmettre ce dossier au conseil syndical en vue d'engager une procedure de recouvrement judiciaire.

Les frais de procedure seraient alors a votre charge.

Cordialement,
${vars.syndic}`;

    case 'contentieux':
      return `${vars.copropriete}
${vars.syndic}

LETTRE RECOMMANDEE AVEC ACCUSE DE RECEPTION

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Engagement de procedure de recouvrement — Article 19 de la loi du 10 juillet 1965

Madame, Monsieur,

Malgre notre mise en demeure restee sans effet, nous vous informons que le conseil syndical a autorise l'engagement d'une procedure de recouvrement judiciaire pour la somme de ${vars.montant} correspondant aux charges impayees de votre lot ${vars.lot} au titre de l'appel "${vars.appel}".

Cette somme est en retard de ${vars.joursRetard} jours.

Conformement a l'article 19 de la loi n° 65-557 du 10 juillet 1965, l'ensemble des frais de procedure, y compris les honoraires d'avocat, seront a votre charge exclusive.

Cette lettre constitue le dernier avis avant transmission du dossier a notre conseil juridique.

Cordialement,
${vars.syndic}`;
  }
}

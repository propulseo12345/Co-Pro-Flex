/**
 * Templates email pour les Ordres de Service
 * Donnees de reference, pas des donnees d'entite
 */

import type { EmailTemplateOS } from '@/types';

export const EMAIL_TEMPLATES_OS: EmailTemplateOS[] = [
  {
    id: 'template-classique',
    type: 'CLASSIQUE',
    nom: 'Template Classique',
    objet: 'Ordre de service - {{titre}}',
    corps: `Bonjour,

En qualite de syndic de la copropriete situee au 50 Route La Carriere au Loup, 75002 Paris, nous vous remercions de bien vouloir intervenir pour la demande suivante :

{{description}}

Facturation :
A l'ordre de : SDC - 50 Route La Carriere au Loup
Adresse : 50 Route La Carriere au Loup, 75002 Paris
Taux de TVA applicable : 10 %
Si le montant de la prestation depasse 300 euros, merci d'etablir un devis prealable.

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriete`,
    variablesDisponibles: ['{{titre}}', '{{description}}', '{{fournisseur}}'],
  },
  {
    id: 'template-contractuel',
    type: 'CONTRACTUEL',
    nom: 'Template Contractuel',
    objet: 'Ordre de service contractuel - {{titre}}',
    corps: `Bonjour,

En qualite de syndic de la copropriete situee au 50 Route La Carriere au Loup, 75002 Paris, et conformement au contrat en cours avec votre entreprise, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Demande :
{{description}}

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriete`,
    variablesDisponibles: ['{{titre}}', '{{description}}', '{{contrat}}'],
  },
];

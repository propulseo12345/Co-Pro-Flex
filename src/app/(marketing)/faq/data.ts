export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  items: FaqItem[];
}

export const categories: FaqCategory[] = [
  {
    id: 'general',
    label: 'Général',
    items: [
      {
        question: "Qu'est-ce que CoProFlex ?",
        answer:
          "CoProFlex est un logiciel en ligne (SaaS) de gestion de copropriété. Il centralise toutes les tâches du syndic sur une seule plateforme : assemblées générales, comptabilité, appels de fonds, maintenance, documents et communication avec les copropriétaires.",
      },
      {
        question: 'CoProFlex remplace-t-il mon syndic ?',
        answer:
          "Non. C'est un outil qui aide le syndic — professionnel ou bénévole — à travailler plus efficacement. Les décisions restent entre les mains du gestionnaire et des copropriétaires.",
      },
      {
        question: 'Qui utilise CoProFlex ?',
        answer:
          "Syndics professionnels, syndics bénévoles et conseils syndicaux. Chaque profil dispose d'un accès adapté à son rôle.",
      },
      {
        question: "Faut-il être informaticien ?",
        answer:
          "Absolument pas. L'interface a été conçue pour être intuitive. Une formation d'une heure suffit pour maîtriser les fonctions essentielles.",
      },
      {
        question: 'Y a-t-il une application mobile ?',
        answer:
          "CoProFlex s'adapte parfaitement aux smartphones et tablettes via votre navigateur. Une application mobile native est prévue dans notre feuille de route.",
      },
      {
        question: 'Comment contacter le support ?',
        answer:
          'Par chat intégré, email et téléphone, du lundi au vendredi de 9h à 18h. Temps de réponse moyen inférieur à 2 heures.',
      },
    ],
  },
  {
    id: 'fonctionnalites',
    label: 'Fonctionnalités',
    items: [
      {
        question: 'Peut-on organiser les AG en ligne ?',
        answer:
          'Oui. Préparation, convocation, votes en temps réel et génération automatique du PV, tout depuis la plateforme.',
      },
      {
        question: 'Le calcul des majorités est-il conforme ?',
        answer:
          'Parfaitement. Articles 24, 25, 25-1, 26, 26-1 et unanimité. Les seuils sont calculés automatiquement.',
      },
      {
        question: 'Peut-on gérer plusieurs copropriétés ?',
        answer:
          "Oui, avec vue consolidée du portefeuille. Basculement d'une résidence à l'autre en un clic.",
      },
      {
        question: 'Les documents sont-ils accessibles aux copropriétaires ?',
        answer:
          'Oui. Chaque copropriétaire accède à son espace personnel 24h/24.',
      },
      {
        question: "Comment fonctionnent les relances d'impayés ?",
        answer:
          "Automatisées : rappel à J+15, relance J+30, mise en demeure J+60, contentieux J+90. Chaque étape traçable.",
      },
      {
        question: 'Peut-on exporter en PDF ?',
        answer:
          'Oui, tous les documents clés : convocations, PV, appels de fonds, relevés, budgets, ordres de service.',
      },
    ],
  },
  {
    id: 'tarifs',
    label: 'Tarifs',
    items: [
      {
        question: 'Y a-t-il un essai gratuit ?',
        answer:
          'Oui, 30 jours sans carte bancaire, accès à toutes les fonctionnalités.',
      },
      {
        question: 'Quel est le modèle de facturation ?',
        answer:
          'Abonnement mensuel par nombre de lots. Tout inclus : mises à jour et support.',
      },
      {
        question: 'Y a-t-il un engagement ?',
        answer:
          'Aucun sur les forfaits mensuels. Résiliation à tout moment.',
      },
      {
        question: 'Peut-on changer de plan ?',
        answer:
          'Oui, à tout moment. Passage supérieur immédiat au prorata.',
      },
      {
        question: 'Y a-t-il des frais cachés ?',
        answer:
          'Aucun. Hébergement, sauvegardes, support et mises à jour inclus.',
      },
      {
        question: 'Remise annuelle ?',
        answer:
          "Oui, deux mois gratuits soit environ 17 % d'économie.",
      },
    ],
  },
  {
    id: 'securite',
    label: 'Sécurité',
    items: [
      {
        question: 'Où sont hébergées les données ?',
        answer:
          'En France, centres certifiés ISO 27001. Aucune donnée hors UE.',
      },
      {
        question: 'Conforme RGPD ?',
        answer:
          "Oui intégralement. Droit d'accès, rectification, suppression et portabilité.",
      },
      {
        question: 'Comment sont protégées les données ?',
        answer:
          'Chiffrement TLS 1.3 en transit, AES-256 au repos. Audits réguliers.',
      },
      {
        question: 'Double authentification ?',
        answer:
          'Oui, 2FA disponible pour tous, peut être rendue obligatoire.',
      },
      {
        question: 'Que se passe-t-il si je résilie ?',
        answer:
          'Accès lecture seule 90 jours pour exporter, puis suppression RGPD.',
      },
      {
        question: 'Sauvegardes ?',
        answer:
          'Quotidiennes, rétention 30 jours, centre de données distinct.',
      },
    ],
  },
  {
    id: 'migration',
    label: 'Migration',
    items: [
      {
        question: 'Comment migrer ?',
        answer:
          'Notre équipe vous accompagne : import copropriétés, lots, copropriétaires, comptabilité et documents.',
      },
      {
        question: 'Combien de temps ?',
        answer:
          '3 à 5 jours pour une copropriété standard. Migration par tranches pour les portefeuilles.',
      },
      {
        question: 'Migration incluse ?',
        answer:
          'Oui pour tous les plans. Forfait accompagnement sur mesure pour migrations complexes.',
      },
      {
        question: 'Faut-il tout ressaisir ?',
        answer:
          "Non. Outils d'import CSV/Excel/exports des principaux logiciels.",
      },
      {
        question: 'Formation incluse ?',
        answer:
          "Oui, 1h en visio + centre d'aide + support renforcé 90 jours.",
      },
      {
        question: 'Historique conservé ?',
        answer:
          "Oui, tout l'historique transmis est importé et consultable dès le premier jour.",
      },
    ],
  },
];

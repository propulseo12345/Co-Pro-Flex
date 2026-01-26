const fs = require('fs');
const path = require('path');

// Mapping des icônes vers leurs aria-labels
const iconLabels = {
  'X': 'Fermer',
  'Trash2': 'Supprimer',
  'Trash': 'Supprimer',
  'Edit': 'Modifier',
  'Edit2': 'Modifier',
  'Edit3': 'Modifier',
  'Pencil': 'Modifier',
  'Plus': 'Ajouter',
  'Minus': 'Retirer',
  'Eye': 'Voir',
  'EyeOff': 'Masquer',
  'Download': 'Télécharger',
  'Upload': 'Importer',
  'Search': 'Rechercher',
  'Filter': 'Filtrer',
  'MoreVertical': 'Plus d\'actions',
  'MoreHorizontal': 'Plus d\'actions',
  'ChevronDown': 'Ouvrir',
  'ChevronUp': 'Fermer',
  'ChevronLeft': 'Précédent',
  'ChevronRight': 'Suivant',
  'ArrowLeft': 'Retour',
  'ArrowRight': 'Suivant',
  'Save': 'Enregistrer',
  'Send': 'Envoyer',
  'RefreshCw': 'Actualiser',
  'RefreshCcw': 'Actualiser',
  'Copy': 'Copier',
  'Check': 'Valider',
  'Settings': 'Paramètres',
  'Menu': 'Menu',
  'ZoomIn': 'Zoom avant',
  'ZoomOut': 'Zoom arrière',
  'Printer': 'Imprimer',
  'ExternalLink': 'Ouvrir dans un nouvel onglet',
  'Calendar': 'Choisir une date',
  'Clock': 'Choisir une heure',
  'Bell': 'Notifications',
  'Star': 'Favoris',
  'Heart': 'J\'aime',
  'Bookmark': 'Marquer',
  'Flag': 'Signaler',
  'Lock': 'Verrouiller',
  'Unlock': 'Déverrouiller',
  'Play': 'Lecture',
  'Pause': 'Pause',
  'Stop': 'Arrêter',
  'RotateCcw': 'Annuler',
  'RotateCw': 'Refaire',
  'Maximize': 'Agrandir',
  'Minimize': 'Réduire',
  'XCircle': 'Fermer',
  'CheckCircle': 'Valider',
  'AlertTriangle': 'Attention',
  'Info': 'Information',
  'HelpCircle': 'Aide',
};

// Fonction pour traiter un fichier
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changes = 0;

  // Pattern pour trouver les boutons avec seulement une icône (pas de texte après l'icône)
  // Match: <button ...><IconName size={...} aria-hidden="true" /></button>
  Object.entries(iconLabels).forEach(([icon, label]) => {
    // Pattern: bouton avec juste une icône, sans aria-label
    const pattern = new RegExp(
      `(<button(?![^>]*aria-label)[^>]*>)\\s*(<${icon}[^>]*aria-hidden="true"[^>]*\\/>)\\s*<\\/button>`,
      'g'
    );

    content = content.replace(pattern, (match, buttonStart, iconTag) => {
      // Vérifier que le bouton n'a pas déjà un aria-label
      if (!buttonStart.includes('aria-label')) {
        changes++;
        // Ajouter aria-label juste avant le >
        const newButtonStart = buttonStart.replace('>', ` aria-label="${label}">`);
        return `${newButtonStart}${iconTag}</button>`;
      }
      return match;
    });

    // Pattern alternatif: bouton avec icône et espace/newline
    const pattern2 = new RegExp(
      `(<button(?![^>]*aria-label)[^>]*>)([\\s\\n]*)<${icon}\\s+([^>]*)aria-hidden="true"([^>]*)\\/>([\\s\\n]*)<\\/button>`,
      'g'
    );

    content = content.replace(pattern2, (match, buttonStart, space1, props1, props2, space2) => {
      if (!buttonStart.includes('aria-label')) {
        changes++;
        const newButtonStart = buttonStart.replace('>', ` aria-label="${label}">`);
        return `${newButtonStart}${space1}<${icon} ${props1}aria-hidden="true"${props2}/>${space2}</button>`;
      }
      return match;
    });
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return changes;
  }
  return 0;
}

// Fonction pour parcourir les fichiers
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

// Exécution
console.log('🔍 Recherche des boutons icônes sans aria-label...\n');

let totalChanges = 0;
let filesModified = 0;

walkDir('./src', (filePath) => {
  const changes = processFile(filePath);
  if (changes > 0) {
    console.log(`✅ ${filePath} - ${changes} correction(s)`);
    totalChanges += changes;
    filesModified++;
  }
});

console.log(`\n📊 Résumé:`);
console.log(`   Fichiers modifiés: ${filesModified}`);
console.log(`   Boutons corrigés: ${totalChanges}`);
console.log('\n✨ Terminé!');

const fs = require('fs');
const path = require('path');

// Fonction pour traiter un fichier
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changes = 0;

  // Pattern 1: Trouver les modals avec modalOverlay et ajouter aria-hidden sur l'overlay
  // Cherche: className={styles.modalOverlay} onClick={...}>
  // Et ajoute aria-hidden="true" s'il n'existe pas
  const overlayPattern = /(<div\s+className=\{styles\.modalOverlay\}[^>]*?)(\s*onClick=)/g;
  content = content.replace(overlayPattern, (match, before, onClick) => {
    if (!match.includes('aria-hidden')) {
      changes++;
      return `${before} aria-hidden="true"${onClick}`;
    }
    return match;
  });

  // Pattern 2: Trouver le contenu du modal et ajouter role="dialog" et aria-modal="true"
  // Cherche: className={styles.modalContent...} onClick={(e) => e.stopPropagation()}>
  const modalContentPattern = /(<div\s+className=\{styles\.(modalContent[^}]*)\}[^>]*?onClick=\{[^}]+stopPropagation[^}]+\}[^>]*?)>/g;
  content = content.replace(modalContentPattern, (match, before) => {
    if (!match.includes('role="dialog"')) {
      changes++;
      return `${before}\n        role="dialog"\n        aria-modal="true"\n      >`;
    }
    return match;
  });

  // Pattern 3: Variante avec onClick avant className
  const modalContentPattern2 = /(<div[^>]*onClick=\{[^}]*stopPropagation[^}]*\}[^>]*className=\{styles\.(modalContent[^}]*|modal)\}[^>]*?)>/g;
  content = content.replace(modalContentPattern2, (match, before) => {
    if (!match.includes('role="dialog"')) {
      changes++;
      return `${before} role="dialog" aria-modal="true">`;
    }
    return match;
  });

  // Pattern 4: Overlay avec pattern différent
  const overlayPattern2 = /(<div\s+className=\{styles\.overlay\}[^>]*?)(\s*onClick=)/g;
  content = content.replace(overlayPattern2, (match, before, onClick) => {
    if (!match.includes('aria-hidden')) {
      changes++;
      return `${before} aria-hidden="true"${onClick}`;
    }
    return match;
  });

  // Pattern 5: Modal content avec pattern différent
  const modalPattern3 = /(<div\s+className=\{styles\.modal\}[^>]*?onClick=\{[^}]+stopPropagation[^}]+\}[^>]*?)>/g;
  content = content.replace(modalPattern3, (match, before) => {
    if (!match.includes('role="dialog"')) {
      changes++;
      return `${before} role="dialog" aria-modal="true">`;
    }
    return match;
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
console.log('🔍 Recherche des modals sans accessibilité...\n');

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
console.log(`   Corrections: ${totalChanges}`);
console.log('\n✨ Terminé!');

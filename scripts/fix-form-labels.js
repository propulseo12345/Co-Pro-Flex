const fs = require('fs');
const path = require('path');

let totalFixed = 0;
let filesModified = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileFixCount = 0;

  // Pattern 1: Inputs avec placeholder mais sans aria-label ni id associé à un htmlFor
  // <input ... placeholder="xxx" ... /> -> ajouter aria-label="xxx"
  const inputPattern = /(<input\s+)([^>]*?)(placeholder="([^"]+)")([^>]*?)(\/?>)/g;

  content = content.replace(inputPattern, (match, start, before, placeholderAttr, placeholder, after, end) => {
    // Skip si déjà accessible
    if (match.includes('aria-label=')) {
      return match;
    }
    // Skip si a un id et qu'il y a un htmlFor correspondant dans le fichier
    const idMatch = match.match(/id="([^"]+)"/);
    if (idMatch && originalContent.includes(`htmlFor="${idMatch[1]}"`)) {
      return match;
    }
    const idMatch2 = match.match(/id=\{([^}]+)\}/);
    if (idMatch2) {
      return match; // id dynamique, probablement lié à un htmlFor dynamique
    }

    fileFixCount++;
    // Insérer aria-label avant le />
    const cleanBefore = before.trim();
    const cleanAfter = after.trim();
    let result = `${start}${cleanBefore} ${placeholderAttr} ${cleanAfter} aria-label="${placeholder}"${end}`;
    return result.replace(/\s+/g, ' ').replace(' />', ' />');
  });

  // Pattern 2: Inputs type="search" sans aria-label
  const searchInputPattern = /(<input\s+)([^>]*?)(type="search")([^>]*?)(\/?>)/g;

  content = content.replace(searchInputPattern, (match, start, before, typeAttr, after, end) => {
    if (match.includes('aria-label=')) {
      return match;
    }
    fileFixCount++;
    const cleanBefore = before.trim();
    const cleanAfter = after.trim();
    return `${start}${cleanBefore} ${typeAttr} ${cleanAfter} aria-label="Rechercher"${end}`.replace(/\s+/g, ' ');
  });

  // Pattern 3: Inputs type="date" sans aria-label
  const dateInputPattern = /(<input\s+)([^>]*?)(type="date")([^>]*?)(\/?>)/g;

  content = content.replace(dateInputPattern, (match, start, before, typeAttr, after, end) => {
    if (match.includes('aria-label=')) {
      return match;
    }
    fileFixCount++;
    const cleanBefore = before.trim();
    const cleanAfter = after.trim();
    return `${start}${cleanBefore} ${typeAttr} ${cleanAfter} aria-label="Sélectionner une date"${end}`.replace(/\s+/g, ' ');
  });

  // Pattern 4: Inputs type="time" sans aria-label
  const timeInputPattern = /(<input\s+)([^>]*?)(type="time")([^>]*?)(\/?>)/g;

  content = content.replace(timeInputPattern, (match, start, before, typeAttr, after, end) => {
    if (match.includes('aria-label=')) {
      return match;
    }
    fileFixCount++;
    const cleanBefore = before.trim();
    const cleanAfter = after.trim();
    return `${start}${cleanBefore} ${typeAttr} ${cleanAfter} aria-label="Sélectionner une heure"${end}`.replace(/\s+/g, ' ');
  });

  // Pattern 5: Inputs type="number" sans aria-label ni placeholder
  const numberInputPattern = /(<input\s+)([^>]*?)(type="number")([^>]*?)(\/?>)/g;

  content = content.replace(numberInputPattern, (match, start, before, typeAttr, after, end) => {
    if (match.includes('aria-label=') || match.includes('placeholder=')) {
      return match;
    }
    // Chercher un contexte dans le nom ou className
    let label = "Entrer un nombre";
    if (match.includes('montant') || match.includes('Montant') || match.includes('amount')) {
      label = "Montant";
    } else if (match.includes('tantieme') || match.includes('Tantieme')) {
      label = "Tantièmes";
    } else if (match.includes('quantit') || match.includes('Quantit')) {
      label = "Quantité";
    }

    fileFixCount++;
    const cleanBefore = before.trim();
    const cleanAfter = after.trim();
    return `${start}${cleanBefore} ${typeAttr} ${cleanAfter} aria-label="${label}"${end}`.replace(/\s+/g, ' ');
  });

  // Pattern 6: Selects sans aria-label (qui n'ont pas d'id avec htmlFor)
  const selectPattern = /(<select\s+)([^>]*?)(>)/g;

  content = content.replace(selectPattern, (match, start, attrs, end) => {
    if (match.includes('aria-label=')) {
      return match;
    }
    // Skip si a un id et qu'il y a un htmlFor correspondant
    const idMatch = attrs.match(/id="([^"]+)"/);
    if (idMatch && originalContent.includes(`htmlFor="${idMatch[1]}"`)) {
      return match;
    }

    // Deviner le label depuis le contexte
    let label = "Sélectionner une option";
    const lowerAttrs = attrs.toLowerCase();
    if (lowerAttrs.includes('year') || lowerAttrs.includes('annee')) {
      label = "Sélectionner une année";
    } else if (lowerAttrs.includes('month') || lowerAttrs.includes('mois')) {
      label = "Sélectionner un mois";
    } else if (lowerAttrs.includes('statut') || lowerAttrs.includes('status')) {
      label = "Filtrer par statut";
    } else if (lowerAttrs.includes('type')) {
      label = "Filtrer par type";
    } else if (lowerAttrs.includes('tri') || lowerAttrs.includes('sort') || lowerAttrs.includes('order')) {
      label = "Trier par";
    } else if (lowerAttrs.includes('filter') || lowerAttrs.includes('filtr')) {
      label = "Filtrer";
    } else if (lowerAttrs.includes('periode') || lowerAttrs.includes('period')) {
      label = "Sélectionner une période";
    }

    fileFixCount++;
    return `${start}${attrs.trim()} aria-label="${label}"${end}`;
  });

  // Pattern 7: Textareas sans aria-label
  const textareaPattern = /(<textarea\s+)([^>]*?)(>)/g;

  content = content.replace(textareaPattern, (match, start, attrs, end) => {
    if (match.includes('aria-label=')) {
      return match;
    }
    // Skip si a un id avec htmlFor
    const idMatch = attrs.match(/id="([^"]+)"/);
    if (idMatch && originalContent.includes(`htmlFor="${idMatch[1]}"`)) {
      return match;
    }

    // Utiliser le placeholder comme label si présent
    let label = "Zone de texte";
    const placeholderMatch = attrs.match(/placeholder="([^"]+)"/);
    if (placeholderMatch) {
      label = placeholderMatch[1];
    } else if (attrs.toLowerCase().includes('comment') || attrs.toLowerCase().includes('message')) {
      label = "Votre message";
    } else if (attrs.toLowerCase().includes('description')) {
      label = "Description";
    } else if (attrs.toLowerCase().includes('note')) {
      label = "Notes";
    }

    fileFixCount++;
    return `${start}${attrs.trim()} aria-label="${label}"${end}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    totalFixed += fileFixCount;
    console.log(`✅ ${filePath} - ${fileFixCount} champ(s) corrigé(s)`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx')) {
      processFile(filePath);
    }
  });
}

console.log('🔍 Correction des formulaires (inputs, selects, textareas)...\n');
walkDir('./src');

console.log(`\n📊 Résumé:`);
console.log(`   Fichiers modifiés: ${filesModified}`);
console.log(`   Champs corrigés: ${totalFixed}`);
console.log('\n✨ Lancez "npm run build" pour vérifier.');

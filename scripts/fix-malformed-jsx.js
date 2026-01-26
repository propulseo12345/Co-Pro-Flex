const fs = require('fs');
const path = require('path');

let totalFixed = 0;
let filesModified = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileFixCount = 0;

  // Pattern 1: Fix onChange={(e) = aria-label="..."> callback}
  // Should be: onChange={(e) => callback}
  const pattern1 = /onChange=\{(\([^)]*\)|[a-z_$][a-z0-9_$]*)\s*=\s*aria-label="[^"]*">\s*([^}]+)\}/gi;
  content = content.replace(pattern1, (match, param, callback) => {
    fileFixCount++;
    return `onChange={${param} => ${callback.trim()}}`;
  });

  // Pattern 2: Fix value={...} onChange={(e) = aria-label="..."> ... on next line
  // More complex pattern for multiline
  const pattern2 = /(\s*)onChange=\{(\([^)]*\)|[a-z_$][a-z0-9_$]*)\s*=\s*aria-label="[^"]*">\s*\n(\s*)([^}]+)\}/gi;
  content = content.replace(pattern2, (match, space1, param, space2, callback) => {
    fileFixCount++;
    return `${space1}onChange={${param} =>\n${space2}${callback.trim()}}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    totalFixed += fileFixCount;
    console.log(`✅ ${filePath} - ${fileFixCount} correction(s)`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(filePath);
    }
  });
}

console.log('🔧 Correction du JSX malformé...\n');
walkDir('./src');

console.log(`\n📊 Résumé:`);
console.log(`   Fichiers modifiés: ${filesModified}`);
console.log(`   Corrections: ${totalFixed}`);

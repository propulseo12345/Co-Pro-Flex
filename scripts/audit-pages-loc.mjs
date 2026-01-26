#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const SRC_APP = join(ROOT, 'src/app');
const AUDIT_DIR = join(ROOT, 'audit');

const THRESHOLDS = {
  page: { ok: 250, warning: 400 },
  layout: { ok: 300, warning: 450 },
};

const BLACKLIST = ['__tests__', '__mocks__', 'components', 'ui', 'lib', 'utils', 'hooks'];

const FEATURES = ['finance', 'ag', 'documents', 'communication', 'maintenance', 'ventes-impayes', 'settings', 'dashboard', 'coproprietaires', 'portefeuille', 'sales', 'dossiers'];

function findFiles(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (BLACKLIST.includes(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, results);
    } else if (entry.isFile()) {
      if (/^page\.(tsx?|jsx?)$/.test(entry.name)) {
        results.push({ path: fullPath, type: 'page' });
      } else if (/^layout\.(tsx?|jsx?)$/.test(entry.name)) {
        results.push({ path: fullPath, type: 'layout' });
      }
    }
  }
  return results;
}

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const allLines = content.split('\n');
  const total = allLines.length;

  let loc = 0;
  let inBlockComment = false;

  for (const line of allLines) {
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed === '') continue;
    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) continue;
    if (trimmed.startsWith('/*')) {
      inBlockComment = true;
      continue;
    }
    if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) continue;

    loc++;
  }

  return { total, loc };
}

function getFeature(relativePath) {
  const dashboardMatch = relativePath.match(/\(dashboard\)\/([^/]+)/);
  if (dashboardMatch) {
    const segment = dashboardMatch[1];
    if (FEATURES.includes(segment)) return segment;
  }
  return 'autres';
}

function getStatus(type, loc) {
  const threshold = THRESHOLDS[type];
  if (loc <= threshold.ok) return 'OK';
  if (loc <= threshold.warning) return 'WARNING';
  return 'NON_CONFORME';
}

function escapeCsvField(field) {
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function main() {
  if (!existsSync(AUDIT_DIR)) {
    mkdirSync(AUDIT_DIR, { recursive: true });
  }

  const files = findFiles(SRC_APP);
  const results = [];

  for (const { path: filePath, type } of files) {
    const { total, loc } = countLines(filePath);
    const relativePath = relative(ROOT, filePath);
    const feature = getFeature(relativePath);
    const status = getStatus(type, loc);
    results.push({ path: relativePath, type, lines: total, loc, feature, status });
  }

  results.sort((a, b) => b.loc - a.loc);

  const csvHeader = 'path,type,lines,loc,feature,status';
  const csvRows = results.map(r =>
    [r.path, r.type, r.lines, r.loc, r.feature, r.status]
      .map(escapeCsvField)
      .join(',')
  );
  const csvContent = [csvHeader, ...csvRows].join('\n');
  writeFileSync(join(AUDIT_DIR, 'pages-length-final.csv'), csvContent);

  const jsonContent = JSON.stringify(results, null, 2);
  writeFileSync(join(AUDIT_DIR, 'pages-length-final.json'), jsonContent);

  const stats = {
    total: results.length,
    ok: results.filter(r => r.status === 'OK').length,
    warning: results.filter(r => r.status === 'WARNING').length,
    nonConforme: results.filter(r => r.status === 'NON_CONFORME').length,
  };

  console.log('\n📊 AUDIT PAGES/LAYOUTS LOC');
  console.log('═'.repeat(50));
  console.log(`Total fichiers: ${stats.total}`);
  console.log(`✅ OK: ${stats.ok}`);
  console.log(`⚠️  WARNING: ${stats.warning}`);
  console.log(`❌ NON_CONFORME: ${stats.nonConforme}`);
  console.log('═'.repeat(50));

  console.log('\n📈 TOP 10 PAGES (LOC décroissant)');
  console.log('─'.repeat(50));
  results.slice(0, 10).forEach((r, i) => {
    const idx = String(i + 1).padStart(2, ' ');
    const locStr = String(r.loc).padStart(4, ' ');
    const statusIcon = r.status === 'OK' ? '✅' : r.status === 'WARNING' ? '⚠️ ' : '❌';
    console.log(`${idx}. ${statusIcon} ${locStr} loc │ ${r.path}`);
  });
  console.log('─'.repeat(50));

  if (stats.nonConforme > 0) {
    console.log('\n❌ Fichiers NON_CONFORME:');
    results
      .filter(r => r.status === 'NON_CONFORME')
      .forEach(r => console.log(`  - ${r.path} (${r.loc} loc)`));
    console.log('');
    process.exit(1);
  }

  console.log('\n✅ Audit réussi - tous les fichiers sont conformes.\n');
  process.exit(0);
}

main();

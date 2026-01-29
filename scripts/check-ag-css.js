#!/usr/bin/env node
/**
 * CSS Architecture Guard for AG Module
 * Checks that CSS files stay within defined limits
 *
 * Limits:
 * - shared: <= 450 lines
 * - common: <= 120 lines
 * - page:   <= 250 lines
 */

const fs = require('fs');
const path = require('path');

const LIMITS = {
  shared: 450,
  common: 120,
  page: 250,
};

const CSS_FILES = [
  {
    path: 'src/app/(dashboard)/ag/dashboard/dashboard.module.css',
    type: 'page',
    name: 'dashboard.module.css',
  },
  {
    path: 'src/components/features/ag/Dashboard/components/agDashboard.shared.module.css',
    type: 'shared',
    name: 'agDashboard.shared.module.css',
  },
  // Add future common file here when created:
  // {
  //   path: 'src/components/features/ag/Dashboard/agDashboard.common.module.css',
  //   type: 'common',
  //   name: 'agDashboard.common.module.css',
  // },
];

function countLines(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  return content.split('\n').length;
}

function checkFiles() {
  let hasErrors = false;
  const results = [];

  console.log('\n📏 CSS Architecture Check - AG Module\n');
  console.log('─'.repeat(50));

  for (const file of CSS_FILES) {
    const lines = countLines(file.path);
    const limit = LIMITS[file.type];

    if (lines === null) {
      console.log(`⚠️  ${file.name}: file not found (skipped)`);
      continue;
    }

    const isOk = lines <= limit;
    const icon = isOk ? '✓' : '✗';
    const color = isOk ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon}${reset}  ${file.name}: ${lines}/${limit} lines`);

    if (!isOk) {
      hasErrors = true;
      results.push({
        file: file.name,
        lines,
        limit,
        over: lines - limit,
      });
    }
  }

  console.log('─'.repeat(50));

  if (hasErrors) {
    console.log('\n\x1b[31m✗ Some CSS files exceed their limits:\x1b[0m\n');
    for (const r of results) {
      console.log(`  • ${r.file}: ${r.over} lines over limit`);
      console.log(`    Action: Extract patterns to shared or split components\n`);
    }
    process.exit(1);
  } else {
    console.log('\n\x1b[32m✓ All CSS files within limits\x1b[0m\n');
    process.exit(0);
  }
}

checkFiles();

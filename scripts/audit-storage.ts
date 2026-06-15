/**
 * Script d'audit des usages localStorage et MOCK_
 * Usage: npx ts-node scripts/audit-storage.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface ModuleAudit {
  name: string;
  paths: string[];
}

interface AuditStats {
  localStorage: number;
  mocks: number;
  files: string[];
}

const MODULES: ModuleAudit[] = [
  {
    name: 'Finance',
    paths: [
      'src/features/finance',
      'src/hooks/modules/useFinanceData.ts',
      'src/hooks/modules/useBudgetData.ts',
      'src/components/features/finance',
    ],
  },
  {
    name: 'AG',
    paths: [
      'src/features/ag',
      'src/app/(dashboard)/ag',
      'src/hooks/modules/useAgData.ts',
      'src/hooks/modules/useAgDrafts.ts',
      'src/hooks/modules/useAgWizardState.ts',
      'src/hooks/modules/useVotesCorrespondance.ts',
      'src/hooks/modules/usePouvoirs.ts',
      'src/lib/services/ag-session-persistence.service.ts',
      'src/lib/ag',
    ],
  },
  {
    name: 'Documents',
    paths: [
      'src/components/features/documents',
      'src/hooks/modules/useDocumentsData.ts',
      'src/lib/services/document-metadata.service.ts',
      'src/lib/documents/api.ts',
      'src/lib/documents/linking.ts',
    ],
  },
  {
    name: 'Communication',
    paths: [
      'src/app/(dashboard)/communication',
      'src/hooks/modules/useCommunicationData.ts',
      'src/lib/services/mail.service.ts',
    ],
  },
];

// Seuils d'alerte
const THRESHOLDS = {
  localStorage: 20, // Hors préférences UI
  mocks: 30, // Hors fichiers de test
};

function auditModule(mod: ModuleAudit): { name: string; stats: AuditStats } {
  let totalLS = 0;
  let totalMock = 0;
  const allFiles: string[] = [];

  for (const searchPath of mod.paths) {
    // Count localStorage usage
    try {
      const lsCmd =
        process.platform === 'win32'
          ? `rg "localStorage\\.(getItem|setItem|removeItem)" "${searchPath}" --type ts -c 2>nul || exit 0`
          : `rg "localStorage\\.(getItem|setItem|removeItem)" "${searchPath}" --type ts -c 2>/dev/null || true`;

      const lsResult = execSync(lsCmd, {
        encoding: 'utf-8',
        cwd: path.resolve(__dirname, '..'),
      });

      const lsLines = lsResult.trim().split('\n').filter(Boolean);
      totalLS += lsLines.reduce((sum, line) => {
        const match = line.match(/:(\d+)$/);
        return sum + (match ? parseInt(match[1], 10) : 0);
      }, 0);
      allFiles.push(...lsLines.map((l) => l.split(':')[0]));
    } catch {
      // Path doesn't exist or no matches
    }

    // Count MOCK_ usage
    try {
      const mockCmd =
        process.platform === 'win32'
          ? `rg "MOCK_" "${searchPath}" --type ts -c 2>nul || exit 0`
          : `rg "MOCK_" "${searchPath}" --type ts -c 2>/dev/null || true`;

      const mockResult = execSync(mockCmd, {
        encoding: 'utf-8',
        cwd: path.resolve(__dirname, '..'),
      });

      const mockLines = mockResult.trim().split('\n').filter(Boolean);
      totalMock += mockLines.reduce((sum, line) => {
        const match = line.match(/:(\d+)$/);
        return sum + (match ? parseInt(match[1], 10) : 0);
      }, 0);
      allFiles.push(...mockLines.map((l) => l.split(':')[0]));
    } catch {
      // Path doesn't exist or no matches
    }
  }

  return {
    name: mod.name,
    stats: {
      localStorage: totalLS,
      mocks: totalMock,
      files: [...new Set(allFiles)],
    },
  };
}

function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       AUDIT STORAGE & MOCKS - CoProFlex            ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  let totalLS = 0;
  let totalMock = 0;
  const results: Array<{ name: string; stats: AuditStats }> = [];

  for (const mod of MODULES) {
    const result = auditModule(mod);
    results.push(result);

    const lsIcon = result.stats.localStorage > 5 ? '🔴' : result.stats.localStorage > 0 ? '🟡' : '🟢';
    const mockIcon = result.stats.mocks > 10 ? '🔴' : result.stats.mocks > 0 ? '🟡' : '🟢';

    console.log(`📁 ${mod.name}`);
    console.log(`   ${lsIcon} localStorage: ${result.stats.localStorage}`);
    console.log(`   ${mockIcon} MOCK_: ${result.stats.mocks}`);
    console.log('');

    totalLS += result.stats.localStorage;
    totalMock += result.stats.mocks;
  }

  console.log('─'.repeat(50));
  console.log('\n📊 TOTAUX:');
  console.log(`   localStorage: ${totalLS} (seuil: ${THRESHOLDS.localStorage})`);
  console.log(`   MOCK_: ${totalMock} (seuil: ${THRESHOLDS.mocks})`);

  // Check thresholds
  const lsOver = totalLS > THRESHOLDS.localStorage;
  const mockOver = totalMock > THRESHOLDS.mocks;

  console.log('\n');

  if (lsOver || mockOver) {
    console.log('❌ ÉCHEC: Seuils dépassés');
    if (lsOver) {
      console.log(`   - localStorage: ${totalLS} > ${THRESHOLDS.localStorage}`);
    }
    if (mockOver) {
      console.log(`   - MOCK_: ${totalMock} > ${THRESHOLDS.mocks}`);
    }

    // Print files with issues
    console.log('\n📋 Fichiers à traiter:');
    for (const r of results) {
      if (r.stats.files.length > 0) {
        console.log(`\n   ${r.name}:`);
        for (const f of r.stats.files.slice(0, 5)) {
          console.log(`     - ${f}`);
        }
        if (r.stats.files.length > 5) {
          console.log(`     ... et ${r.stats.files.length - 5} autres`);
        }
      }
    }

    process.exit(1);
  }

  console.log('✅ SUCCÈS: Seuils respectés');
  console.log('\n💡 Conseil: Continuez à migrer vers Supabase pour réduire ces chiffres.');

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    totals: {
      localStorage: totalLS,
      mocks: totalMock,
    },
    thresholds: THRESHOLDS,
    passed: !lsOver && !mockOver,
    modules: results.map((r) => ({
      name: r.name,
      localStorage: r.stats.localStorage,
      mocks: r.stats.mocks,
    })),
  };

  console.log('\n📄 Rapport JSON:');
  console.log(JSON.stringify(report, null, 2));
}

main();

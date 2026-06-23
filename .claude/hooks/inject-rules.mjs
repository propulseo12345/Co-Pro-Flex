// Hook UserPromptSubmit : réinjecte les règles d'or v2 + la DoD à chaque message.
// jq étant absent sur ce poste, on encode le JSON proprement via Node.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
let text = '';
try {
  text = readFileSync(join(dir, 'rules-v2.md'), 'utf8');
} catch {
  // Fichier de règles introuvable : on n'injecte rien plutôt que de planter le tour.
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: text,
    },
  }),
);

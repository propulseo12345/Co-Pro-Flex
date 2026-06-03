import assert from 'node:assert/strict';
import { shouldBlockAccountClosure } from '@/lib/onboarding/ag-guard-rules';

// 1) Arrêté des comptes demandé + 471/472 != 0 -> bloque.
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 150 }), true);
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: -0.5 }), true);

// 2) Arrêté des comptes demandé + 471/472 == 0 (tolérance) -> ne bloque pas.
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 0 }), false);
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 0.005 }), false);

// 3) Pas d'arrêté des comptes dans l'AG -> jamais bloqué, même si 471/472 != 0.
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: false, waitingBalance: 999 }), false);

console.log('ag-guard-rules.test OK');

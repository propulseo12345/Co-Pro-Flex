import { describe, it, expect } from 'vitest';
import { shouldBlockAccountClosure } from '@/lib/onboarding/ag-guard-rules';

describe('shouldBlockAccountClosure', () => {
  it('arrêté des comptes demandé + 471/472 != 0 -> bloque', () => {
    expect(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 150 })).toBe(true);
    expect(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: -0.5 })).toBe(true);
  });

  it('arrêté des comptes demandé + 471/472 == 0 (tolérance) -> ne bloque pas', () => {
    expect(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 0 })).toBe(false);
    expect(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 0.005 })).toBe(false);
  });

  it('pas d\'arrêté des comptes dans l\'AG -> jamais bloqué, même si 471/472 != 0', () => {
    expect(shouldBlockAccountClosure({ hasAccountClosure: false, waitingBalance: 999 })).toBe(false);
  });
});

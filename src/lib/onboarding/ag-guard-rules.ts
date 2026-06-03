/**
 * Garde « arrêté des comptes » (spec §5 Pivot 2 / §7), pure & testable.
 * On bloque l'arrêté des comptes en AG si, ET SEULEMENT SI :
 *  - l'AG comporte effectivement une résolution d'arrêté/approbation des comptes, ET
 *  - le solde net des comptes d'attente 471/472 est non nul (reprise inachevée).
 * Tolérance d'arrondi : |waitingBalance| < 0,01 = considéré soldé.
 */
export function shouldBlockAccountClosure(i: {
  hasAccountClosure: boolean;
  waitingBalance: number;
}): boolean {
  return i.hasAccountClosure && Math.abs(i.waitingBalance) >= 0.01;
}

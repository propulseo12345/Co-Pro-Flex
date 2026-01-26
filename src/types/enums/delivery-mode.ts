/**
 * Modes de livraison des convocations
 */

export enum DeliveryMode {
  EMAIL = 'EMAIL',
  COURRIER = 'COURRIER',
  EMAIL_ET_COURRIER = 'EMAIL_ET_COURRIER',
}

export enum EmailSendStatus {
  A_ENVOYER = 'A_ENVOYER',
  ENVOYE = 'ENVOYE',
  ECHEC = 'ECHEC',
}

export enum PostalSendType {
  LETTRE_SIMPLE = 'LETTRE_SIMPLE',
  LRAR = 'LRAR',
  AR_EXTERNE = 'AR_EXTERNE',
}

export enum ARStatus {
  NON_DISPONIBLE = 'NON_DISPONIBLE',
  EN_ATTENTE = 'EN_ATTENTE',
  RECU = 'RECU',
  ECHEC = 'ECHEC',
}

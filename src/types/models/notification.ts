import { BaseEntity, ID } from '../common';

export type NotificationType = 'CRITIQUE' | 'WARNING' | 'INFO' | 'SUCCESS';

export interface INotification extends BaseEntity {
  utilisateurId: ID;
  type: NotificationType;
  titre: string;
  message: string;
  module: string;
  actionUrl?: string;
  lu: boolean;
  dateLecture?: Date;
}

export interface IAlerte extends BaseEntity {
  coproprieteId: ID;
  type: NotificationType;
  titre: string;
  message: string;
  module: string;
  actionUrl?: string;
  active: boolean;
  seuilDeclenchement?: number;
  valeurActuelle?: number;
}

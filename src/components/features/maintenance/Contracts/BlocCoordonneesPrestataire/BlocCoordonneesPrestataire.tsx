'use client';

import { Phone, Mail, User, Building2, MapPin, FileText, PhoneCall } from 'lucide-react';
import type { Prestataire, TypeContrat } from '@/types';
import styles from './BlocCoordonneesPrestataire.module.css';
import clsx from 'clsx';

interface BlocCoordonneesProps {
  prestataire: Prestataire;
  typeContrat: TypeContrat;
  numeroContrat?: string;
  /** Afficher en mode compact (sidebar) ou complet */
  compact?: boolean;
  /** Callback pour ouvrir le formulaire d'édition */
  onCompleter?: () => void;
}

/**
 * Bloc d'affichage des coordonnées prestataire
 * Positionné en haut de la fiche contrat pour accès rapide en cas d'urgence
 */
export function BlocCoordonneesPrestataire({
  prestataire,
  typeContrat,
  numeroContrat,
  compact = false,
  onCompleter,
}: BlocCoordonneesProps) {
  const {
    nom,
    contactReferent,
    fonctionContact,
    telephone,
    telephoneUrgence,
    email,
    adresse,
    codePostal,
    ville,
  } = prestataire;

  // Libellé selon le type
  const libelleTitre = typeContrat === 'ASSURANCE'
    ? "Compagnie d'assurance"
    : 'Prestataire';

  // Adresse formatée
  const adresseComplete = [adresse, codePostal, ville].filter(Boolean).join(' ');

  const hasCoordonneesManquantes = !telephone && !email;

  return (
    <div className={clsx(styles.bloc, compact && styles.compact)}>
      <div className={styles.entete}>
        <h3 className={styles.titre}>
          <Building2 size={18} aria-hidden="true" />
          {libelleTitre}
        </h3>
        {telephoneUrgence && (
          <a
            href={`tel:${telephoneUrgence.replace(/\s/g, '')}`}
            className={styles.btnUrgence}
            aria-label={`Appeler le numéro d'urgence : ${telephoneUrgence}`}
          >
            <PhoneCall size={16} aria-hidden="true" />
            Urgence
          </a>
        )}
      </div>

      {/* Nom de la société */}
      <p className={styles.nomSociete}>{nom}</p>

      {/* Numéro de contrat/police */}
      {numeroContrat && (
        <p className={styles.numeroContrat}>
          <FileText size={14} aria-hidden="true" />
          {typeContrat === 'ASSURANCE' ? 'Police' : 'Contrat'} n° {numeroContrat}
        </p>
      )}

      {/* Contact référent */}
      {contactReferent && (
        <div className={styles.contact}>
          <User size={16} className={styles.icone} aria-hidden="true" />
          <div>
            <span className={styles.nomContact}>{contactReferent}</span>
            {fonctionContact && (
              <span className={styles.fonction}>{fonctionContact}</span>
            )}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className={styles.actions}>
        {telephone && (
          <a
            href={`tel:${telephone.replace(/\s/g, '')}`}
            className={styles.actionBtn}
            aria-label={`Appeler le ${telephone}`}
          >
            <Phone size={16} aria-hidden="true" />
            <span className={styles.actionTexte}>
              {compact ? 'Appeler' : telephone}
            </span>
          </a>
        )}

        {email && (
          <a
            href={`mailto:${email}`}
            className={styles.actionBtn}
            aria-label={`Envoyer un email à ${email}`}
          >
            <Mail size={16} aria-hidden="true" />
            <span className={styles.actionTexte}>
              {compact ? 'Email' : email}
            </span>
          </a>
        )}
      </div>

      {/* Adresse (mode complet uniquement) */}
      {!compact && adresseComplete && (
        <div className={styles.adresse}>
          <MapPin size={14} className={styles.icone} aria-hidden="true" />
          <span>{adresseComplete}</span>
        </div>
      )}

      {/* Alerte si coordonnées manquantes */}
      {hasCoordonneesManquantes && (
        <p className={styles.alerte}>
          Coordonnées incomplètes
          {onCompleter && (
            <>
              {' — '}
              <button
                type="button"
                className={styles.lienCompleter}
                onClick={onCompleter}
              >
                Compléter la fiche
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default BlocCoordonneesPrestataire;

'use client';

import {
  Calendar,
  FileText,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  Link as LinkIcon,
  Eye,
  ArrowLeftRight,
} from 'lucide-react';
import type { LigneRapprochement, StatutRapprochement, TypeEcart, SessionRapprochement } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface RapprochementTableProps {
  lignes: LigneRapprochement[];
  expandedRows: Set<string>;
  sessionActive: SessionRapprochement | null;
  onToggleExpand: (ligneId: string) => void;
  onValider: (ligneId: string) => void;
  onCreerMouvement: (ligne: LigneRapprochement) => void;
}

function renderStatutBadge(statut: StatutRapprochement, typeEcart?: TypeEcart) {
  switch (statut) {
    case 'RAPPROCHE':
      return <span className={styles.badgeRapproche}><CheckCircle size={14} /> Rapproché</span>;
    case 'ECART':
      return <span className={styles.badgeEcart}><AlertTriangle size={14} /> Écart</span>;
    case 'NON_RAPPROCHE':
      if (typeEcart === 'DANS_RELEVE_UNIQUEMENT') {
        return <span className={styles.badgeReleveUniquement}><FileText size={14} /> Relevé seul</span>;
      }
      if (typeEcart === 'DANS_LOGICIEL_UNIQUEMENT') {
        return <span className={styles.badgeLogicielUniquement}><Building2 size={14} /> Logiciel seul</span>;
      }
      return <span className={styles.badgeNonRapproche}><XCircle size={14} /> Non rapproché</span>;
    default:
      return <span className={styles.badgeEnAttente}><Clock size={14} /> En attente</span>;
  }
}

export function RapprochementTable({
  lignes,
  expandedRows,
  sessionActive,
  onToggleExpand,
  onValider,
  onCreerMouvement,
}: RapprochementTableProps) {
  if (lignes.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>
          <ArrowLeftRight size={48} />
          <p>Aucune ligne de rapprochement</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '40px' }}></th>
            <th>Date</th>
            <th>Relevé bancaire</th>
            <th>Logiciel</th>
            <th className={styles.textRight}>Montant</th>
            <th>Statut</th>
            <th className={styles.textCenter}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <>
              <tr key={ligne.id} className={`${styles.tableRow} ${styles[`row${ligne.statut}`]}`}>
                <td>
                  <button
                    className={styles.expandButton}
                    onClick={() => onToggleExpand(ligne.id)}
                  >
                    {expandedRows.has(ligne.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </td>
                <td className={styles.dateCell}>
                  <Calendar size={14} />
                  {new Date(ligne.ligneReleve?.date || ligne.ligneLogiciel?.date || '').toLocaleDateString('fr-FR')}
                </td>
                <td className={styles.libelleCell}>
                  {ligne.ligneReleve ? (
                    <div className={styles.sourceCell}>
                      <FileText size={14} className={styles.sourceIconReleve} />
                      <span>{ligne.ligneReleve.libelle}</span>
                    </div>
                  ) : (
                    <span className={styles.emptyCell}>—</span>
                  )}
                </td>
                <td className={styles.libelleCell}>
                  {ligne.ligneLogiciel ? (
                    <div className={styles.sourceCell}>
                      <Building2 size={14} className={styles.sourceIconLogiciel} />
                      <span>{ligne.ligneLogiciel.libelle}</span>
                    </div>
                  ) : (
                    <span className={styles.emptyCell}>—</span>
                  )}
                </td>
                <td className={styles.textRight}>
                  <span className={(ligne.ligneReleve?.montant || ligne.ligneLogiciel?.montant || 0) >= 0 ? styles.montantPositif : styles.montantNegatif}>
                    {(ligne.ligneReleve?.montant || ligne.ligneLogiciel?.montant || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </td>
                <td>
                  {renderStatutBadge(ligne.statut, ligne.typeEcart)}
                  {ligne.confianceMatch !== undefined && ligne.statut === 'RAPPROCHE' && (
                    <span className={styles.confianceBadge} title={`Confiance: ${ligne.confianceMatch}%`}>
                      {ligne.confianceMatch}%
                    </span>
                  )}
                </td>
                <td className={styles.actionsCell}>
                  {ligne.statut !== 'RAPPROCHE' && sessionActive?.statut !== 'CERTIFIE' && (
                    <>
                      <button
                        className={styles.actionButtonSuccess}
                        onClick={() => onValider(ligne.id)}
                        title="Valider manuellement"
                      >
                        <Check size={16} />
                      </button>
                      {ligne.typeEcart === 'DANS_RELEVE_UNIQUEMENT' && (
                        <button
                          className={styles.actionButtonPrimary}
                          onClick={() => onCreerMouvement(ligne)}
                          title="Créer le mouvement"
                        >
                          <LinkIcon size={16} />
                        </button>
                      )}
                    </>
                  )}
                  {ligne.valideManuellemnt && (
                    <span className={styles.validationManuelle} title="Validé manuellement">
                      <Eye size={14} />
                    </span>
                  )}
                </td>
              </tr>
              {expandedRows.has(ligne.id) && (
                <tr className={styles.expandedRow}>
                  <td colSpan={7}>
                    <div className={styles.expandedContent}>
                      <div className={styles.compareColumns}>
                        <div className={styles.compareColumn}>
                          <h4><FileText size={16} /> Relevé bancaire</h4>
                          {ligne.ligneReleve ? (
                            <div className={styles.compareDetails}>
                              <p><strong>Date:</strong> {new Date(ligne.ligneReleve.date).toLocaleDateString('fr-FR')}</p>
                              <p><strong>Libellé:</strong> {ligne.ligneReleve.libelle}</p>
                              <p><strong>Montant:</strong> {ligne.ligneReleve.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                              {ligne.ligneReleve.reference && <p><strong>Référence:</strong> {ligne.ligneReleve.reference}</p>}
                            </div>
                          ) : (
                            <p className={styles.emptyCompare}>Aucune ligne correspondante dans le relevé</p>
                          )}
                        </div>
                        <div className={styles.compareColumn}>
                          <h4><Building2 size={16} /> Logiciel CoProFlex</h4>
                          {ligne.ligneLogiciel ? (
                            <div className={styles.compareDetails}>
                              <p><strong>Date:</strong> {new Date(ligne.ligneLogiciel.date).toLocaleDateString('fr-FR')}</p>
                              <p><strong>Libellé:</strong> {ligne.ligneLogiciel.libelle}</p>
                              <p><strong>Montant:</strong> {ligne.ligneLogiciel.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                              {ligne.ligneLogiciel.compteComptable && <p><strong>Compte:</strong> {ligne.ligneLogiciel.compteComptable}</p>}
                              <p><strong>Catégorisé:</strong> {ligne.ligneLogiciel.categorise ? 'Oui' : 'Non'}</p>
                            </div>
                          ) : (
                            <p className={styles.emptyCompare}>Aucune ligne correspondante dans le logiciel</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

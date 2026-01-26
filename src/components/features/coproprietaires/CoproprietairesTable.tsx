'use client';

import { Phone, Mail, MoreVertical } from 'lucide-react';
import type { Coproprietaire } from '@/hooks/modules/useCoproprietairesPage';
import styles from '../../../app/(dashboard)/coproprietaires/coproprietaires.module.css';

const formatSolde = (solde: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(solde);
const getSoldeClass = (solde: number) => { if (solde < 0) return styles.soldeNegatif; if (solde > 0) return styles.soldePositif; return styles.soldeNeutral; };

interface CoproprietairesTableProps {
  data: Coproprietaire[];
  buttonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  openMenuId: string | null;
  onToggleMenu: (id: string | null) => void;
}

export function CoproprietairesTable({ data, buttonRefs, openMenuId, onToggleMenu }: CoproprietairesTableProps) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead><tr><th>Nom complet</th><th>Fonction</th><th>Solde</th><th>Téléphone</th><th>Email</th><th></th></tr></thead>
        <tbody>
          {data.length === 0 ? (<tr><td colSpan={6} className={styles.emptyState}>Aucun résultat trouvé</td></tr>) : (
            data.map((copro) => (
              <tr key={copro.id}>
                <td>
                  <div className={styles.nameCell}>
                    <div className={styles.avatar}>{copro.prenom && copro.nom ? `${copro.prenom.charAt(0)}${copro.nom.charAt(0)}` : copro.nom.substring(0, 2).toUpperCase()}</div>
                    <span>{copro.prenom ? `${copro.prenom} ${copro.nom}` : copro.nom}</span>
                  </div>
                </td>
                <td>{copro.fonction ? <span className={styles.fonctionBadge}>{copro.fonction}</span> : <span className={styles.noFonction}>—</span>}</td>
                <td><span className={getSoldeClass(copro.solde)}>{formatSolde(copro.solde)}</span></td>
                <td>{copro.telephone ? <div className={styles.contactCell}><Phone size={14} aria-hidden="true" /><span>{copro.telephone}</span></div> : <span className={styles.noData}>—</span>}</td>
                <td><div className={styles.contactCell}><Mail size={14} aria-hidden="true" /><span>{copro.email}</span></div></td>
                <td>
                  <div className={styles.actionCell}>
                    <button ref={(el) => { buttonRefs.current[copro.id] = el; }} className={styles.moreButton} aria-label="Plus d'actions" onClick={() => onToggleMenu(openMenuId === copro.id ? null : copro.id)}>
                      <MoreVertical size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

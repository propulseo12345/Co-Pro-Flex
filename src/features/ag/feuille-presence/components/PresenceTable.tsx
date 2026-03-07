'use client';

import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

interface CoproprietaireData {
  id: string;
  displayName: string;
  email: string | null;
  tantiemes: number;
}

interface AttendanceData {
  presenceType?: string;
  representedByName?: string | null;
  signed?: boolean;
  signatureData?: string;
  signedAt?: string | null;
}

interface PresenceTableProps {
  coproprietaires: CoproprietaireData[];
  attendanceByCoprId: Map<string, AttendanceData>;
  showSignatures: boolean;
  isSaving: boolean;
  onPresenceChange: (coproId: string, newValue: string) => void;
  onRepresentantChange: (coproId: string, representantName: string) => void;
  onOpenSignature: (coproId: string) => void;
}

export function PresenceTable({
  coproprietaires,
  attendanceByCoprId,
  showSignatures,
  isSaving,
  onPresenceChange,
  onRepresentantChange,
  onOpenSignature,
}: PresenceTableProps) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Copropriétaire</th>
            <th>Tantièmes</th>
            <th>Statut</th>
            <th>Représentant</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          {coproprietaires.map((copro) => {
            const attendance = attendanceByCoprId.get(copro.id);
            const presenceType = attendance?.presenceType || 'absent';
            const isPresent = presenceType !== 'absent';
            const isCorrespondence = presenceType === 'correspondence';

            return (
              <tr key={copro.id} className={isPresent ? styles.rowPresent : ''}>
                <td>
                  <div className={styles.coproName}>{copro.displayName}</div>
                  {copro.email && <div className={styles.coproEmail}>{copro.email}</div>}
                </td>
                <td className={styles.tantiemes}>{copro.tantiemes}</td>
                <td>
                  <select
                    value={presenceType}
                    onChange={(e) => onPresenceChange(copro.id, e.target.value)}
                    className={styles.statutSelect}
                    disabled={isSaving || isCorrespondence}
                    title={isCorrespondence ? 'Vote par correspondance : présence obligatoire' : undefined}
                  >
                    <option value="absent">Absent</option>
                    <option value="present">Présent</option>
                    <option value="proxy">Représenté</option>
                    <option value="correspondence">Vote correspondance</option>
                  </select>
                </td>
                <td>
                  {presenceType === 'proxy' && (
                    <input
                      type="text"
                      placeholder="Nom du représentant"
                      defaultValue={attendance?.representedByName || ''}
                      onBlur={(e) => onRepresentantChange(copro.id, e.target.value)}
                      className={styles.representantInput}
                      disabled={isSaving}
                    />
                  )}
                </td>
                <td>
                  {isPresent && presenceType !== 'correspondence' && (
                    <div className={styles.signatureCell}>
                      {attendance?.signed && showSignatures && attendance.signatureData && (
                        <img
                          src={attendance.signatureData}
                          alt="Signature"
                          className={styles.signaturePreview}
                        />
                      )}
                      <button
                        onClick={() => onOpenSignature(copro.id)}
                        className="btn btn-sm btn-secondary"
                        disabled={isSaving}
                      >
                        {attendance?.signed ? 'Modifier' : 'Signer'}
                      </button>
                      {attendance?.signedAt && (
                        <div className={styles.signatureDate}>
                          {new Date(attendance.signedAt).toLocaleString('fr-FR')}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

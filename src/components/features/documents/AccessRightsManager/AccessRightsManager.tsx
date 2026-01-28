'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Shield, Globe, Lock, Users, UserPlus, UserMinus, Eye, Download,
  History, X, Check, AlertTriangle, Search, Printer, Share2
} from 'lucide-react';
import { useDocumentPermissions } from '@/hooks/modules/useDocumentPermissions';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import { NiveauConfidentialite, UserRole } from '@/types/enums';
import type { DocumentAccessActionType } from '@/types/models/document-access';
import styles from './AccessRightsManager.module.css';

interface CoproUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
}

interface AccessRightsManagerProps {
  documentId: string;
  documentName: string;
  currentConfidentiality: NiveauConfidentialite | string;
  onClose: () => void;
  onSave?: (newLevel: NiveauConfidentialite) => void;
}

const ACTION_LABELS: Record<DocumentAccessActionType, string> = {
  VIEW: 'Consultation',
  DOWNLOAD: 'Telechargement',
  PRINT: 'Impression',
  SHARE: 'Partage',
  ACCESS_GRANTED: 'Acces accorde',
  ACCESS_REVOKED: 'Acces revoque',
  ACCESS_DENIED: 'Acces refuse',
};

const ACTION_ICONS: Record<DocumentAccessActionType, typeof Eye> = {
  VIEW: Eye,
  DOWNLOAD: Download,
  PRINT: Printer,
  SHARE: Share2,
  ACCESS_GRANTED: UserPlus,
  ACCESS_REVOKED: UserMinus,
  ACCESS_DENIED: X,
};

export function AccessRightsManager({
  documentId,
  documentName,
  currentConfidentiality,
  onClose,
  onSave,
}: AccessRightsManagerProps) {
  const { currentCoproId } = useCopro();
  const {
    canManageAccess,
    getDocumentAccessConfig,
    addAuthorizedUser,
    removeAuthorizedUser,
    updateDocumentConfidentiality,
    getDocumentAccessLogs,
  } = useDocumentPermissions();

  const [selectedLevel, setSelectedLevel] = useState<NiveauConfidentialite>(
    (currentConfidentiality as NiveauConfidentialite) || NiveauConfidentialite.PUBLIC
  );
  const [activeTab, setActiveTab] = useState<'access' | 'users' | 'history'>('access');
  const [searchQuery, setSearchQuery] = useState('');
  const [addUserReason, setAddUserReason] = useState('');
  const [availableUsers, setAvailableUsers] = useState<CoproUser[]>([]);

  const accessConfig = useMemo(
    () => getDocumentAccessConfig(documentId),
    [documentId, getDocumentAccessConfig]
  );

  const accessLogs = useMemo(
    () => getDocumentAccessLogs(documentId, 50),
    [documentId, getDocumentAccessLogs]
  );

  // Fetch users from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentCoproId) return;

      const supabase = createClient();

      // Fetch coproprietaires for this copro
      const { data: coproprietaires } = await supabase
        .from('coproprietaires')
        .select('id, first_name, last_name, email')
        .eq('copro_id', currentCoproId);

      if (coproprietaires) {
        const users: CoproUser[] = coproprietaires.map(c => ({
          id: c.id,
          nom: c.last_name || '',
          prenom: c.first_name || '',
          email: c.email || '',
          role: UserRole.COPROPRIETAIRE,
        }));
        setAvailableUsers(users);
      }
    };

    fetchUsers();
  }, [currentCoproId]);

  // Utilisateurs disponibles pour l'ajout (exclure deja autorises)
  const availableUsersForAdd = useMemo(() => {
    const authorizedIds = accessConfig?.authorizedUsers.map(u => u.userId) || [];
    return availableUsers.filter(u => !authorizedIds.includes(u.id));
  }, [accessConfig, availableUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return availableUsersForAdd;
    const query = searchQuery.toLowerCase();
    return availableUsersForAdd.filter(u =>
      u.nom.toLowerCase().includes(query) ||
      (u.prenom && u.prenom.toLowerCase().includes(query)) ||
      u.email.toLowerCase().includes(query)
    );
  }, [searchQuery, availableUsersForAdd]);

  const handleLevelChange = useCallback((level: NiveauConfidentialite) => {
    setSelectedLevel(level);
  }, []);

  const handleSave = useCallback(() => {
    updateDocumentConfidentiality(documentId, selectedLevel);
    onSave?.(selectedLevel);
    onClose();
  }, [documentId, selectedLevel, updateDocumentConfidentiality, onSave, onClose]);

  const handleAddUser = useCallback((userId: string, userName: string, userEmail: string) => {
    addAuthorizedUser(documentId, userId, userName, userEmail, addUserReason || undefined);
    setSearchQuery('');
    setAddUserReason('');
  }, [documentId, addUserReason, addAuthorizedUser]);

  const handleRemoveUser = useCallback((userId: string) => {
    removeAuthorizedUser(documentId, userId);
  }, [documentId, removeAuthorizedUser]);

  if (!canManageAccess) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.noAccess}>
            <AlertTriangle size={48} />
            <h3>Acces non autorise</h3>
            <p>Vous n&apos;avez pas les droits pour gerer les permissions de ce document.</p>
            <button className={styles.closeOnlyBtn} onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Shield size={20} />
            <h2>Gestion des droits d&apos;acces</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Document info */}
        <div className={styles.documentInfo}>
          <span className={styles.documentName}>{documentName}</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'access' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('access')}
          >
            <Shield size={16} />
            Niveau d&apos;acces
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('users')}
            disabled={selectedLevel !== NiveauConfidentialite.CONFIDENTIEL}
          >
            <Users size={16} />
            Utilisateurs autorises
            {accessConfig?.authorizedUsers.length ? (
              <span className={styles.badge}>{accessConfig.authorizedUsers.length}</span>
            ) : null}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            Historique
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Access Level Tab */}
          {activeTab === 'access' && (
            <div className={styles.accessTab}>
              <p className={styles.accessDescription}>
                Selectionnez le niveau de confidentialite du document.
              </p>

              <div className={styles.accessLevels}>
                {/* PUBLIC */}
                <button
                  className={`${styles.levelCard} ${selectedLevel === NiveauConfidentialite.PUBLIC ? styles.levelCardActive : ''}`}
                  onClick={() => handleLevelChange(NiveauConfidentialite.PUBLIC)}
                >
                  <div className={styles.levelIcon} style={{ backgroundColor: '#10B98115', color: '#10B981' }}>
                    <Globe size={24} />
                  </div>
                  <div className={styles.levelInfo}>
                    <h4>Public</h4>
                    <p>Visible par tous les coproprietaires</p>
                  </div>
                  {selectedLevel === NiveauConfidentialite.PUBLIC && (
                    <Check size={20} className={styles.checkIcon} />
                  )}
                </button>

                {/* CS_ONLY */}
                <button
                  className={`${styles.levelCard} ${selectedLevel === NiveauConfidentialite.CS_ONLY ? styles.levelCardActive : ''}`}
                  onClick={() => handleLevelChange(NiveauConfidentialite.CS_ONLY)}
                >
                  <div className={styles.levelIcon} style={{ backgroundColor: '#F59E0B15', color: '#F59E0B' }}>
                    <Users size={24} />
                  </div>
                  <div className={styles.levelInfo}>
                    <h4>Conseil Syndical</h4>
                    <p>Reserve au President et membres du CS</p>
                  </div>
                  {selectedLevel === NiveauConfidentialite.CS_ONLY && (
                    <Check size={20} className={styles.checkIcon} />
                  )}
                </button>

                {/* SYNDIC_ONLY */}
                <button
                  className={`${styles.levelCard} ${selectedLevel === NiveauConfidentialite.SYNDIC_ONLY ? styles.levelCardActive : ''}`}
                  onClick={() => handleLevelChange(NiveauConfidentialite.SYNDIC_ONLY)}
                >
                  <div className={styles.levelIcon} style={{ backgroundColor: '#EF444415', color: '#EF4444' }}>
                    <Lock size={24} />
                  </div>
                  <div className={styles.levelInfo}>
                    <h4>Syndic uniquement</h4>
                    <p>Acces restreint au syndic</p>
                  </div>
                  {selectedLevel === NiveauConfidentialite.SYNDIC_ONLY && (
                    <Check size={20} className={styles.checkIcon} />
                  )}
                </button>

                {/* CONFIDENTIEL */}
                <button
                  className={`${styles.levelCard} ${selectedLevel === NiveauConfidentialite.CONFIDENTIEL ? styles.levelCardActive : ''}`}
                  onClick={() => handleLevelChange(NiveauConfidentialite.CONFIDENTIEL)}
                >
                  <div className={styles.levelIcon} style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
                    <Shield size={24} />
                  </div>
                  <div className={styles.levelInfo}>
                    <h4>Confidentiel</h4>
                    <p>Syndic + utilisateurs specifiquement autorises</p>
                  </div>
                  {selectedLevel === NiveauConfidentialite.CONFIDENTIEL && (
                    <Check size={20} className={styles.checkIcon} />
                  )}
                </button>
              </div>

              {selectedLevel !== currentConfidentiality && (
                <div className={styles.changeWarning}>
                  <AlertTriangle size={16} />
                  <span>Le niveau d&apos;acces sera modifie apres sauvegarde.</span>
                </div>
              )}

              {selectedLevel === NiveauConfidentialite.CONFIDENTIEL && (
                <div className={styles.confidentialHint}>
                  <Shield size={16} />
                  <span>
                    Utilisez l&apos;onglet &quot;Utilisateurs autorises&quot; pour ajouter des personnes specifiques.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className={styles.usersTab}>
              {selectedLevel === NiveauConfidentialite.CONFIDENTIEL ? (
                <>
                  {/* Search to add user */}
                  <div className={styles.addUserSection}>
                    <h4>Ajouter un utilisateur</h4>
                    <div className={styles.searchBox}>
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {searchQuery && (
                      <div className={styles.searchResults}>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.slice(0, 5).map(user => (
                            <button
                              key={user.id}
                              className={styles.userResult}
                              onClick={() => handleAddUser(
                                user.id,
                                `${user.prenom || ''} ${user.nom}`.trim(),
                                user.email
                              )}
                            >
                              <div className={styles.userResultInfo}>
                                <span className={styles.userName}>
                                  {user.prenom} {user.nom}
                                </span>
                                <span className={styles.userEmail}>{user.email}</span>
                              </div>
                              <UserPlus size={16} />
                            </button>
                          ))
                        ) : (
                          <p className={styles.noResults}>Aucun utilisateur trouve</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Current authorized users */}
                  <div className={styles.authorizedUsersSection}>
                    <h4>Utilisateurs autorises ({accessConfig?.authorizedUsers.length || 0})</h4>
                    {accessConfig?.authorizedUsers.length ? (
                      <div className={styles.authorizedUsersList}>
                        {accessConfig.authorizedUsers.map(user => (
                          <div key={user.userId} className={styles.authorizedUser}>
                            <div className={styles.authorizedUserInfo}>
                              <span className={styles.userName}>{user.userName}</span>
                              <span className={styles.userEmail}>{user.userEmail}</span>
                              <span className={styles.grantedInfo}>
                                Autorise par {user.grantedByName} le{' '}
                                {new Date(user.grantedAt).toLocaleDateString('fr-FR')}
                              </span>
                              {user.reason && (
                                <span className={styles.reason}>Motif: {user.reason}</span>
                              )}
                            </div>
                            <button
                              className={styles.removeUserBtn}
                              onClick={() => handleRemoveUser(user.userId)}
                              title="Revoquer l'acces"
                            >
                              <UserMinus size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noUsers}>
                        Aucun utilisateur autorise. Utilisez la recherche ci-dessus pour en ajouter.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.usersDisabled}>
                  <Shield size={32} />
                  <p>
                    La gestion des utilisateurs autorises n&apos;est disponible que pour les documents
                    avec le niveau &quot;Confidentiel&quot;.
                  </p>
                  <button onClick={() => setActiveTab('access')}>
                    Modifier le niveau d&apos;acces
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className={styles.historyTab}>
              <h4>Historique des acces</h4>
              {accessLogs.length > 0 ? (
                <div className={styles.historyList}>
                  {accessLogs.map(log => {
                    const ActionIcon = ACTION_ICONS[log.action] || Eye;
                    return (
                      <div
                        key={log.id}
                        className={`${styles.historyEntry} ${!log.success ? styles.historyFailed : ''}`}
                      >
                        <div className={styles.historyIcon}>
                          <ActionIcon size={14} />
                        </div>
                        <div className={styles.historyInfo}>
                          <span className={styles.historyAction}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          <span className={styles.historyUser}>{log.userName}</span>
                          {log.details && (
                            <span className={styles.historyDetails}>{log.details}</span>
                          )}
                          {!log.success && log.failureReason && (
                            <span className={styles.historyError}>{log.failureReason}</span>
                          )}
                        </div>
                        <span className={styles.historyDate}>
                          {new Date(log.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.noHistory}>Aucun historique disponible pour ce document.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            <Check size={16} />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

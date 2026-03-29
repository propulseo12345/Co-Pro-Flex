'use client';

import { use, Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Mail, Edit2, XCircle, AlertTriangle, Building2, FileText, User, MapPin, Phone, Plus, X, Upload, Download, Trash2, Shield, PhoneCall, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import { ResiliationModal } from '@/components/features/maintenance';
import { ContactProviderModal } from '@/components/features/maintenance/ContactProviderModal';
import {
    ContractEditModal
} from '../../../../../features/maintenance/contracts/components';
import { useContractDetailPage, ATTACHMENT_TYPES } from '../../../../../features/maintenance/contracts/hooks/useContractDetailPage';
import type { DocumentContrat } from '../../../../../features/maintenance/contracts/hooks/useContractDetailPage';

/* ─── Couleurs Finance ─── */
const C = {
  bg: '#0f1117',
  card: '#1a1d2e',
  cardSecondary: '#131620',
  border: 'rgba(148,163,184,0.08)',
  borderLight: 'rgba(148,163,184,0.04)',
  borderDark: 'rgba(148,163,184,0.12)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textMuted: '#475569',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  successBg: 'rgba(34,197,94,0.1)',
  dangerBg: 'rgba(239,68,68,0.1)',
  warningBg: 'rgba(245,158,11,0.1)',
  infoBg: 'rgba(59,130,246,0.1)',
} as const;

const STATUT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Actif', bg: C.successBg, color: '#4ade80' },
  to_renew: { label: 'À renouveler', bg: C.warningBg, color: '#fbbf24' },
  expired: { label: 'Expiré', bg: C.dangerBg, color: '#f87171' },
  terminated: { label: 'Résilié', bg: 'rgba(148,163,184,0.1)', color: C.textSecondary },
  draft: { label: 'Brouillon', bg: 'rgba(148,163,184,0.1)', color: C.textSecondary },
  // Legacy statuts
  ACTIF: { label: 'Actif', bg: C.successBg, color: '#4ade80' },
  A_RENOUVELER: { label: 'À renouveler', bg: C.warningBg, color: '#fbbf24' },
  EXPIRE: { label: 'Expiré', bg: C.dangerBg, color: '#f87171' },
  RESILIE: { label: 'Résilié', bg: 'rgba(148,163,184,0.1)', color: C.textSecondary },
  BROUILLON: { label: 'Brouillon', bg: 'rgba(148,163,184,0.1)', color: C.textSecondary },
};

const DOMAINE_COLORS: Record<string, string> = {
  ascenseur: '#5b8def', menage: '#3ecf8e', nettoyage: '#3ecf8e', chauffage: '#e5a63e',
  maintenance: '#60A5FA', electricite: '#FBBF24', interphone: '#A78BFA',
  espaces_verts: '#34D399', assurance: '#F87171', toiture: '#9b8afb',
  eau: '#60A5FA', facade: '#60A5FA', portail: '#34D399',
  securite: '#EF4444', juridique: '#A78BFA', syndic: '#3b82f6', autre: '#64748b',
};

function ContractDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    contrat,
    contract,
    prestataire,
    provider,
    allPrestataires,
    interventions,
    pieceJointes,
    joursRestants,
    alerteRenouvellement,
    alerteUrgente,
    typeLabel,
    fromLogbook,
    isEditing,
    editForm,
    showResiliationModal,
    showContactModal,
    showAddAttachment,
    newAttachment,
    formatMontant,
    setIsEditing,
    setEditForm,
    setShowResiliationModal,
    setShowContactModal,
    setShowAddAttachment,
    setNewAttachment,
    handleCancelEdit,
    handleSaveEdit,
    handleAddAttachment,
    handleDeleteAttachment,
  } = useContractDetailPage(id);

  // Pending renewals from localStorage
  const PENDING_KEY = 'coproflex_pending_renewals';
  const [pendingRenewal, setPendingRenewal] = useState<{ nouvelleDateFin: string; dateEnvoi: string; emailEnvoye: boolean } | null>(null);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
      setPendingRenewal(all[id] || null);
    } catch { setPendingRenewal(null); }
  }, [id]);

  const handleConfirmerRenouvellement = useCallback(() => {
    if (!pendingRenewal) return;
    // Import dynamique pour éviter les dépendances circulaires
    import('@/lib/services/contracts.service').then(({ renouvelerContrat }) => {
      renouvelerContrat(id, pendingRenewal.nouvelleDateFin);
      try {
        const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
        delete all[id];
        localStorage.setItem(PENDING_KEY, JSON.stringify(all));
      } catch { /* ignore */ }
      setPendingRenewal(null);
      window.location.reload();
    });
  }, [id, pendingRenewal]);

  const handleAnnulerRenouvellement = useCallback(() => {
    try {
      const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
      delete all[id];
      localStorage.setItem(PENDING_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
    setPendingRenewal(null);
  }, [id]);

  if (!contrat) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.textSecondary }}>
        Contrat non trouvé
      </div>
    );
  }

  const statutKey = contrat.statut as string || '';
  const statut = STATUT_BADGE[statutKey] || { label: statutKey, bg: 'rgba(148,163,184,0.1)', color: C.textSecondary };
  const domainColor = DOMAINE_COLORS[(contrat.type as string) || 'autre'] || '#64748b';
  const isExpiring = statutKey === 'to_renew' || statutKey === 'A_RENOUVELER'
    || statutKey === 'expired' || statutKey === 'EXPIRE';

  const handleDownloadPDF = () => {
    const content = `CONTRAT DE MAINTENANCE\n\nRéférence : ${contrat.numeroContrat || 'N/A'}\nLibellé : ${contrat.nom}\nType : ${typeLabel}\nPrestataire : ${contrat.fournisseur}\nCoût annuel : ${formatMontant(contrat.coutAnnuel)}\n\nGénéré le ${new Date().toLocaleDateString('fr-FR')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrat_${contrat.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAttachment = (doc: DocumentContrat) => {
    const content = `PIÈCE JOINTE - ${doc.nom}\nType : ${doc.type}\nDate : ${new Date(doc.dateUpload).toLocaleDateString('fr-FR')}\nContrat : ${contrat.nom}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.nom.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Back link */}
      <Link
        href={fromLogbook ? '/maintenance/logbook' : '/maintenance/contracts'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: C.textSecondary, textDecoration: 'none', fontSize: 13,
          marginBottom: 16, fontWeight: 500,
        }}
      >
        <ArrowLeft size={15} /> {fromLogbook ? "Retour au carnet d'entretien" : 'Retour aux contrats'}
      </Link>

      {/* TopBar */}
      <FinanceTopBar
        title={contrat.nom || 'Contrat'}
        subtitle={contrat.numeroContrat ? `N° ${contrat.numeroContrat}` : undefined}
        pill={joursRestants <= 0 && isExpiring
          ? { label: `Expiré depuis ${Math.abs(joursRestants)}j`, variant: 'blue', dotVariant: 'blue' }
          : isExpiring
          ? { label: `${joursRestants}j avant échéance`, variant: 'blue', dotVariant: 'blue' }
          : { label: statut.label, variant: 'green', dotVariant: 'green' }
        }
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={() => setShowContactModal(true)}>
              <Mail size={15} /> Contacter
            </button>
            <button className={topBarStyles.btnGhost} onClick={() => setIsEditing(true)}>
              <Edit2 size={15} /> Modifier
            </button>
            {(statutKey === 'active' || statutKey === 'ACTIF' || statutKey === 'to_renew' || statutKey === 'A_RENOUVELER') && (
              <button className={topBarStyles.btnGhost} onClick={() => setShowResiliationModal(true)} style={{ color: C.danger }}>
                <XCircle size={15} /> Résilier
              </button>
            )}
          </>
        }
      />

      {/* Alert banner */}
      {alerteRenouvellement && statutKey !== 'terminated' && statutKey !== 'RESILIE' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: (joursRestants <= 0 || alerteUrgente) ? C.dangerBg : C.warningBg,
          border: `1px solid ${(joursRestants <= 0 || alerteUrgente) ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
        }}>
          <AlertTriangle size={18} style={{ color: (joursRestants <= 0 || alerteUrgente) ? C.danger : C.warning, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: joursRestants <= 0 ? '#f87171' : alerteUrgente ? '#f87171' : '#fbbf24', marginBottom: 2 }}>
              {joursRestants <= 0 ? 'Contrat expiré' : alerteUrgente ? 'Renouvellement urgent' : 'Échéance proche'}
            </div>
            <div style={{ fontSize: 13, color: joursRestants <= 0 ? '#fca5a5' : alerteUrgente ? '#fca5a5' : '#fde68a' }}>
              {joursRestants <= 0
                ? `Ce contrat a expiré depuis ${Math.abs(joursRestants)} jours.${contrat.taciteReconduction ? ' La tacite reconduction est active.' : ' Pensez à renouveler ou résilier ce contrat.'}`
                : `${joursRestants} jours avant l'échéance du contrat.${contrat.taciteReconduction ? ' Le contrat sera renouvelé automatiquement.' : ' Pensez à renouveler ou résilier ce contrat.'}`
              }
            </div>
          </div>
        </div>
      )}

      {/* Banner renouvellement en attente */}
      {pendingRenewal && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: C.infoBg,
          border: '1px solid rgba(59,130,246,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Clock size={18} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#60a5fa', marginBottom: 2 }}>
                Renouvellement en attente de confirmation
              </div>
              <div style={{ fontSize: 13, color: '#93c5fd' }}>
                Demande envoyée le {new Date(pendingRenewal.dateEnvoi).toLocaleDateString('fr-FR')}
                {' — '}nouvelle échéance prévue : {new Date(pendingRenewal.nouvelleDateFin).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleAnnulerRenouvellement}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: 'rgba(148,163,184,0.06)', border: `1px solid ${C.border}`,
                color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <X size={14} /> Annuler
            </button>
            <button
              onClick={handleConfirmerRenouvellement}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: C.success, border: 'none',
                color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <CheckCircle size={14} /> Confirmer le renouvellement
            </button>
          </div>
        </div>
      )}

      {/* Bloc prestataire */}
      {prestataire && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 24, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} style={{ color: C.primary }} />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.primary }}>
                Prestataire
              </span>
            </div>
            {prestataire.telephoneUrgence && (
              <a
                href={`tel:${prestataire.telephoneUrgence.replace(/\s/g, '')}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 8,
                  background: C.dangerBg, color: '#f87171',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none',
                }}
              >
                <PhoneCall size={14} /> Urgence
              </a>
            )}
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {prestataire.nom}
          </div>

          {contrat.numeroContrat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSecondary, marginBottom: 12 }}>
              <FileText size={14} /> Contrat n° {contrat.numeroContrat}
            </div>
          )}

          {/* Séparateur */}
          <div style={{ height: 1, background: C.border, margin: '12px 0' }} />

          {/* Contact référent */}
          {prestataire.contactReferent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <User size={16} style={{ color: C.textTertiary }} />
              <div>
                <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{prestataire.contactReferent}</span>
                {prestataire.fonctionContact && (
                  <span style={{ fontSize: 12, color: C.textTertiary, marginLeft: 8 }}>{prestataire.fonctionContact}</span>
                )}
              </div>
            </div>
          )}

          {/* Actions rapides */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {prestataire.telephone && (
              <a href={`tel:${prestataire.telephone.replace(/\s/g, '')}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                background: C.infoBg, color: '#60a5fa',
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}>
                <Phone size={14} /> {prestataire.telephone}
              </a>
            )}
            {prestataire.email && (
              <a href={`mailto:${prestataire.email}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                background: C.infoBg, color: '#60a5fa',
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}>
                <Mail size={14} /> {prestataire.email}
              </a>
            )}
          </div>

          {/* Adresse */}
          {(prestataire.adresse || prestataire.ville) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSecondary }}>
              <MapPin size={14} style={{ color: C.textTertiary }} />
              {[prestataire.adresse, prestataire.codePostal, prestataire.ville].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
      )}

      {/* Grid : Infos + Pièces jointes */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Informations principales */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 24 }}>
            Informations principales
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Prestataire */}
            <InfoField label="PRESTATAIRE" value={contrat.fournisseur || 'Non renseigné'} />

            {/* Type */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary, marginBottom: 8 }}>TYPE</div>
              <span style={{
                display: 'inline-flex', padding: '3px 12px', borderRadius: 8,
                background: `${domainColor}1f`, color: domainColor,
                fontSize: 14, fontWeight: 500,
              }}>
                {typeLabel || 'Non défini'}
              </span>
            </div>

            {/* Date début */}
            <InfoField
              label="DATE DE DÉBUT"
              value={contrat.dateDebut ? new Date(contrat.dateDebut).toLocaleDateString('fr-FR') : 'Non définie'}
            />

            {/* Date fin */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary, marginBottom: 8 }}>DATE DE FIN</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{
                  fontSize: 15, fontWeight: 600,
                  color: joursRestants <= 0 ? C.danger : alerteUrgente ? C.danger : alerteRenouvellement ? C.warning : C.text,
                }}>
                  {contrat.dateFin ? new Date(contrat.dateFin).toLocaleDateString('fr-FR') : 'Non définie'}
                </span>
                {contrat.dateFin && joursRestants <= 365 && (
                  <span style={{ fontSize: 13, color: joursRestants <= 0 ? '#f87171' : alerteUrgente ? '#fca5a5' : C.textTertiary }}>
                    ({joursRestants <= 0 ? `+${Math.abs(joursRestants)}j` : `${joursRestants}j`})
                  </span>
                )}
              </div>
            </div>

            {/* Coût annuel */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary, marginBottom: 8 }}>COÛT ANNUEL</div>
              <div style={{
                fontSize: 18, fontWeight: 700, color: C.success,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}>
                {(contrat.coutAnnuel || 0).toLocaleString('fr-FR')} &euro;
              </div>
            </div>

            {/* Tacite reconduction */}
            <InfoField label="TACITE RECONDUCTION" value={contrat.taciteReconduction ? 'Oui' : 'Non'} />

            {/* Délai résiliation */}
            <InfoField label="DÉLAI DE RÉSILIATION" value={contrat.delaiResiliation ? `${contrat.delaiResiliation} jours` : '-'} />

            {/* Réglementaire */}
            {contrat.estReglementaire && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary, marginBottom: 8 }}>RÉGLEMENTAIRE</div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 12px', borderRadius: 8,
                  background: 'rgba(139,92,246,0.1)', color: '#a78bfa',
                  fontSize: 13, fontWeight: 500,
                }}>
                  <Shield size={13} /> Obligatoire
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {contrat.description && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10 }}>Description</div>
              <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {contrat.description}
              </p>
            </div>
          )}

          {/* Conditions particulières (champ prévu) */}
        </div>

        {/* Pièces jointes */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>
              Pièces jointes ({pieceJointes.length})
            </div>
            <button
              onClick={() => setShowAddAttachment(!showAddAttachment)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: 'rgba(148,163,184,0.06)', color: C.textSecondary,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {showAddAttachment ? <><X size={14} /> Annuler</> : <><Plus size={14} /> Ajouter</>}
            </button>
          </div>

          {/* Formulaire ajout */}
          {showAddAttachment && (
            <div style={{
              padding: 16, borderRadius: 8, marginBottom: 16,
              background: C.cardSecondary, border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>
                    Nom du document *
                  </label>
                  <input
                    type="text"
                    value={newAttachment.nom}
                    onChange={(e) => setNewAttachment({ ...newAttachment, nom: e.target.value })}
                    placeholder="Ex: Avenant 2024"
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${C.borderDark}`, background: C.card,
                      color: C.text, fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>
                    Type *
                  </label>
                  <select
                    value={newAttachment.type}
                    onChange={(e) => setNewAttachment({ ...newAttachment, type: e.target.value as DocumentContrat['type'] })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${C.borderDark}`, background: C.card,
                      color: C.text, fontSize: 13,
                    }}
                  >
                    {ATTACHMENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleAddAttachment}
                  disabled={!newAttachment.nom}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: !newAttachment.nom ? C.textMuted : C.primary,
                    color: 'white', fontSize: 13, fontWeight: 500, cursor: newAttachment.nom ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            </div>
          )}

          {/* Liste documents */}
          {pieceJointes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pieceJointes.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 8,
                  background: C.cardSecondary, border: `1px solid ${C.borderLight}`,
                }}>
                  <FileText size={18} style={{ color: C.primary, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{doc.nom}</div>
                    <div style={{ fontSize: 11, color: C.textTertiary }}>{new Date(doc.dateUpload).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleDownloadAttachment(doc)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
                        background: 'transparent', color: C.textSecondary, cursor: 'pointer',
                      }}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteAttachment(doc.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
                        background: 'transparent', color: '#f87171', cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textTertiary, fontSize: 13 }}>
              Aucune pièce jointe
            </div>
          )}
        </div>
      </div>

      {/* Historique interventions */}
      {interventions.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            Historique des interventions ({interventions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {interventions.map(inter => {
              const statutColor = inter.statut === 'completed' || inter.statut === 'CLOTURE' ? C.success
                : inter.statut === 'in_progress' || inter.statut === 'EN_COURS' ? '#60a5fa'
                : inter.statut === 'scheduled' || inter.statut === 'PLANIFIEE' ? C.warning
                : C.textSecondary;
              return (
                <div key={inter.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: C.cardSecondary, border: `1px solid ${C.borderLight}`,
                }}>
                  <span style={{ color: statutColor, fontSize: 10 }}>&#9679;</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{inter.titre}</span>
                  </div>
                  <span style={{ fontSize: 12, color: C.textTertiary }}>
                    {inter.date ? new Date(inter.date).toLocaleDateString('fr-FR') : '-'}
                  </span>
                  {inter.cout != null && inter.cout > 0 && (
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: C.text,
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      {inter.cout.toLocaleString('fr-FR')} &euro;
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showResiliationModal && contrat && (
        <ResiliationModal
          contrat={contrat as unknown as import('@/types').ContratDetaille}
          onClose={() => setShowResiliationModal(false)}
          onConfirm={() => {
            setShowResiliationModal(false);
          }}
        />
      )}

      {showContactModal && (
        <ContactProviderModal
          isOpen={showContactModal}
          prestataire={(prestataire ?? null) as import('@/types').Prestataire | null}
          contrat={{
            nom: contrat.nom ?? 'Sans nom',
            numeroContrat: contrat.numeroContrat ?? undefined,
            type: typeLabel,
            dateFin: contrat.dateFin ?? undefined,
          }}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {isEditing && (
        <ContractEditModal
          editForm={editForm}
          prestataires={allPrestataires as unknown as import('@/types').Prestataire[]}
          onFormChange={setEditForm}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </>
  );
}

/* ─── Helper composant ─── */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{value}</div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: C.textSecondary }}>
      Chargement...
    </div>
  );
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ContractDetailContent params={params} />
    </Suspense>
  );
}

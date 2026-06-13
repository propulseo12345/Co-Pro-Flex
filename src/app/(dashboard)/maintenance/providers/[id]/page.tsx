'use client';

import { use, Suspense, useState } from 'react';
import type { InterventionDetaille } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Plus, Phone, Mail, MapPin, User, Building2, Calendar, FileText, Star } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import {
    AddInterventionModal,
    EditProviderModal,
} from '../../../../../features/maintenance/providers/components';
import { useProviderDetailPage } from '../../../../../features/maintenance/providers/hooks';

/* ─── Couleurs Finance ─── */
const C = {
  bg: 'var(--background)',
  card: 'var(--surface)',
  cardSecondary: 'var(--bg-secondary)',
  border: 'rgba(148,163,184,0.08)',
  borderLight: 'rgba(148,163,184,0.04)',
  borderDark: 'rgba(148,163,184,0.12)',
  text: 'var(--text-main)',
  textSecondary: 'var(--text-secondary)',
  textTertiary: 'var(--text-tertiary)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  infoBg: 'rgba(59,130,246,0.1)',
} as const;

const DOMAINE_COLORS: Record<string, string> = {
  PLOMBERIE: '#60A5FA', ELECTRICITE: '#FBBF24', CHAUFFAGE: '#e5a63e',
  ASCENSEUR: '#5b8def', MENAGE: '#3ecf8e', ESPACES_VERTS: '#34D399',
  SERRURERIE: '#8892a4', PEINTURE: '#e5a63e', ASSURANCE: '#F87171',
  JURIDIQUE: '#A78BFA', ARCHITECTURE: '#5b8def', TOITURE: '#9b8afb',
  FACADE: '#60A5FA', CLIMATISATION: '#60A5FA', INTERPHONE: '#A78BFA',
  PORTAIL: '#34D399', SECURITE: '#EF4444', AUTRE: 'var(--text-tertiary)',
};

const DOMAINE_LABELS: Record<string, string> = {
  PLOMBERIE: 'Plomberie', ELECTRICITE: 'Électricité', CHAUFFAGE: 'Chauffage',
  ASCENSEUR: 'Ascenseur', MENAGE: 'Ménage', ESPACES_VERTS: 'Espaces verts',
  SERRURERIE: 'Serrurerie', PEINTURE: 'Peinture', ASSURANCE: 'Assurance',
  JURIDIQUE: 'Juridique', ARCHITECTURE: 'Architecture', TOITURE: 'Toiture',
  FACADE: 'Façade', CLIMATISATION: 'Climatisation', INTERPHONE: 'Interphone',
  PORTAIL: 'Portail', SECURITE: 'Sécurité', AUTRE: 'Autre',
};

const CATEGORIE_LABELS: Record<string, string> = {
  SYNDIC: 'Syndic', COPROPRIETE: 'Copropriété', COPROFLEX: 'CoproFlex',
};

function ProviderDetailContent({ id }: { id: string }) {
  const {
    prestataire,
    showAddIntervention,
    setShowAddIntervention,
    showEditModal,
    setShowEditModal,
    prestataireInterventions,
    contrats,
    handleDelete,
    handleAddIntervention,
    handleEditSave,
  } = useProviderDetailPage(id);

  const [selectedIntervention, setSelectedIntervention] = useState<InterventionDetaille | null>(null);

  if (!prestataire) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Link href="/maintenance/providers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.textSecondary, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={15} /> Retour aux prestataires
        </Link>
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Prestataire introuvable</h2>
          <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>Le prestataire demandé n&apos;existe pas ou a été supprimé.</p>
          <Link href="/maintenance/providers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: C.primary, color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Voir tous les prestataires
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Back link */}
      <Link
        href="/maintenance/providers"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: C.textSecondary, textDecoration: 'none', fontSize: 13,
          marginBottom: 16, fontWeight: 500,
        }}
      >
        <ArrowLeft size={15} /> Retour aux prestataires
      </Link>

      {/* TopBar */}
      <FinanceTopBar
        title={prestataire.nom}
        subtitle={prestataire.domaines?.map(d => DOMAINE_LABELS[d] || d).join(', ')}
        pill={{
          label: CATEGORIE_LABELS[prestataire.categorie] || prestataire.categorie,
          variant: 'green',
          dotVariant: 'green',
        }}
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={() => setShowEditModal(true)}>
              <Edit2 size={15} /> Modifier
            </button>
            <button className={topBarStyles.btnGhost} onClick={handleDelete} style={{ color: C.danger }}>
              <Trash2 size={15} /> Supprimer
            </button>
            <button className={topBarStyles.btnPrimary} onClick={() => setShowAddIntervention(true)}>
              <Plus size={15} /> Intervention
            </button>
          </>
        }
      />

      {/* Grid : Coordonnées + Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Coordonnées */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <User size={16} style={{ color: C.primary }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Coordonnées</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {prestataire.contactReferent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={15} style={{ color: C.textTertiary }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary }}>CONTACT</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{prestataire.contactReferent}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={15} style={{ color: C.textTertiary }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary }}>TÉLÉPHONE</div>
                {prestataire.telephone ? (
                  <a href={`tel:${prestataire.telephone}`} style={{ fontSize: 14, fontWeight: 500, color: 'var(--secondary)', textDecoration: 'none' }}>{prestataire.telephone}</a>
                ) : (
                  <span style={{ fontSize: 14, color: C.textTertiary }}>Non renseigné</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={15} style={{ color: C.textTertiary }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary }}>EMAIL</div>
                {prestataire.email ? (
                  <a href={`mailto:${prestataire.email}`} style={{ fontSize: 14, fontWeight: 500, color: 'var(--secondary)', textDecoration: 'none' }}>{prestataire.email}</a>
                ) : (
                  <span style={{ fontSize: 14, color: C.textTertiary }}>Non renseigné</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MapPin size={15} style={{ color: C.textTertiary }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary }}>ADRESSE</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
                  {[prestataire.adresse, prestataire.codePostal, prestataire.ville].filter(Boolean).join(' ') || 'Non renseignée'}
                </div>
              </div>
            </div>

            {prestataire.siren && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building2 size={15} style={{ color: C.textTertiary }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.textTertiary }}>SIREN</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.textSecondary, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{prestataire.siren}</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            {prestataire.telephone && (
              <a href={`tel:${prestataire.telephone}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, background: C.infoBg, color: 'var(--secondary)',
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}>
                <Phone size={14} /> Appeler
              </a>
            )}
            {prestataire.email && (
              <a href={`mailto:${prestataire.email}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, background: C.infoBg, color: 'var(--secondary)',
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}>
                <Mail size={14} /> Email
              </a>
            )}
          </div>
        </div>

        {/* Statistiques + Domaines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stats */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Statistiques</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ background: C.cardSecondary, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--secondary)' }}>{prestataire.nombreInterventions || 0}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: C.textTertiary, marginTop: 4 }}>Interventions</div>
              </div>
              <div style={{ background: C.cardSecondary, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>
                  {prestataire.noteMoyenne ? `${prestataire.noteMoyenne.toFixed(1)} ★` : '—'}
                </div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: C.textTertiary, marginTop: 4 }}>Note moyenne</div>
              </div>
              <div style={{ background: C.cardSecondary, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{contrats.length}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: C.textTertiary, marginTop: 4 }}>Contrats</div>
              </div>
            </div>
          </div>

          {/* Domaines */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Domaines d&apos;activité</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(prestataire.domaines || []).map(d => {
                const color = DOMAINE_COLORS[d] || 'var(--text-tertiary)';
                return (
                  <span key={d} style={{
                    display: 'inline-flex', padding: '5px 14px', borderRadius: 8,
                    background: `${color}1f`, color, fontSize: 13, fontWeight: 500,
                  }}>
                    {DOMAINE_LABELS[d] || d}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Certifications */}
          {prestataire.certifications && prestataire.certifications.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Certifications</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {prestataire.certifications.map(cert => (
                  <span key={cert} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 14px', borderRadius: 8,
                    background: 'rgba(139,92,246,0.1)', color: '#a78bfa',
                    fontSize: 13, fontWeight: 500,
                  }}>
                    <Star size={12} /> {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contrats liés */}
      {contrats.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
            Contrats liés ({contrats.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contrats.map(c => {
              const dotColor = c.statut === 'ACTIF' ? C.success : c.statut === 'EXPIRE' ? C.danger : c.statut === 'A_RENOUVELER' ? C.warning : C.textTertiary;
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 8,
                  background: C.cardSecondary, border: `1px solid ${C.borderLight}`,
                }}>
                  <span style={{ color: dotColor, fontSize: 10 }}>&#9679;</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>{c.nom}</span>
                  <span style={{ fontSize: 12, color: C.textTertiary }}>
                    {c.dateFin ? new Date(c.dateFin).toLocaleDateString('fr-FR') : '—'}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: C.text,
                    fontVariantNumeric: 'tabular-nums', fontFamily: "'SF Mono', 'Fira Code', monospace",
                  }}>
                    {(c.coutAnnuel || 0).toLocaleString('fr-FR')} &euro;/an
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historique interventions */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            <Calendar size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
            Historique des interventions ({prestataireInterventions.length})
          </div>
          <button
            onClick={() => setShowAddIntervention(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: 'rgba(148,163,184,0.06)', color: C.textSecondary,
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {prestataireInterventions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prestataireInterventions.map(inter => {
              const statutColor = inter.statut === 'TERMINEE' ? C.success
                : inter.statut === 'EN_COURS' ? 'var(--secondary)'
                : inter.statut === 'PLANIFIEE' ? C.warning : C.textSecondary;
              return (
                <button key={inter.id} onClick={() => setSelectedIntervention(inter)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  background: C.cardSecondary, border: `1px solid ${C.borderLight}`,
                  fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s, transform 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.transform = 'none'; }}
                >
                  <span style={{ color: statutColor, fontSize: 10 }}>&#9679;</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>{inter.titre}</span>
                  <span style={{ fontSize: 12, color: C.textTertiary }}>
                    {new Date(inter.date).toLocaleDateString('fr-FR')}
                  </span>
                  {inter.montant != null && inter.montant > 0 && (
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: C.text,
                      fontVariantNumeric: 'tabular-nums', fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      {inter.montant.toLocaleString('fr-FR')} &euro;
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Calendar size={32} style={{ color: C.textTertiary, marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: C.textTertiary, marginBottom: 16 }}>Aucune intervention enregistrée</div>
            <button
              onClick={() => setShowAddIntervention(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: C.primary, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Plus size={15} /> Ajouter une intervention
            </button>
          </div>
        )}
      </div>

      {/* Notes internes */}
      {prestataire.notesInternes && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Notes internes</div>
          <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {prestataire.notesInternes}
          </p>
        </div>
      )}

      {/* Modals */}
      {showAddIntervention && (
        <AddInterventionModal
          prestataire={prestataire}
          onClose={() => setShowAddIntervention(false)}
          onAdd={handleAddIntervention}
        />
      )}

      {showEditModal && (
        <EditProviderModal
          prestataire={prestataire}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />
      )}

      {/* Modale détail intervention */}
      {selectedIntervention && (() => {
        const inter = selectedIntervention;
        const statutLabel = inter.statut === 'TERMINEE' ? 'Terminée' : inter.statut === 'EN_COURS' ? 'En cours' : 'Planifiée';
        const statutColor = inter.statut === 'TERMINEE' ? C.success : inter.statut === 'EN_COURS' ? 'var(--secondary)' : C.warning;
        const t = String(inter.type);
        const typeLabel = t === 'ENTRETIEN' ? 'Entretien' : t === 'REPARATION' ? 'Réparation' : t === 'INSPECTION' ? 'Inspection' : t;
        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}
            onClick={() => setSelectedIntervention(null)}
          >
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${C.border}` }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} style={{ color: C.textSecondary }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Détail intervention</span>
                </div>
                <button onClick={() => setSelectedIntervention(null)} style={{ background: 'none', border: 'none', color: C.textTertiary, cursor: 'pointer', padding: 4 }}>✕</button>
              </div>
              {/* Body */}
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>{inter.titre}</h3>
                  <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: `${statutColor}15`, color: statutColor }}>{statutLabel}</span>
                </div>
                {inter.description && <p style={{ margin: '0 0 20px', fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{inter.description}</p>}
                {/* KPI tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: C.cardSecondary, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: inter.montant ? C.danger : C.text, fontVariantNumeric: 'tabular-nums', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                      {inter.montant ? `${inter.montant.toLocaleString('fr-FR')} €` : '—'}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Coût</div>
                  </div>
                  <div style={{ background: C.cardSecondary, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: statutColor }}>{statutLabel}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Statut</div>
                  </div>
                  <div style={{ background: C.cardSecondary, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{typeLabel}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Type</div>
                  </div>
                </div>
                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>📅 Date</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{new Date(inter.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>👤 Intervenant</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{inter.intervenant || prestataire.nom}</div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedIntervention(null)} style={{ padding: '8px 16px', background: C.cardSecondary, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function LoadingFallback() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: C.textSecondary }}>
      Chargement...
    </div>
  );
}

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProviderDetailContent id={id} />
    </Suspense>
  );
}

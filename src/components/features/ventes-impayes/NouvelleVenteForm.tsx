'use client';

import Link from 'next/link';
import {
  Building2, Home, User, Mail, Phone, Calendar,
  FileCheck, Wrench, FileText, CheckCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import type { NouvelleVenteFormData } from '@/hooks/modules/useNouvelleVenteForm';
import { formatLotType } from '@/hooks/modules/useNouvelleVenteForm';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes/nouvelle/nouvelle-vente.module.css';

// TODO: Replace with Supabase queries / props
const MOCK_COPROPRIETAIRES: Array<{ id: string; nom: string; email: string; telephone: string }> = [];
const MOCK_LOTS: Array<{ id: string; type: string; proprietaire: string; tantiemes: number }> = [];
const MOCK_NOTAIRES: Array<{ id: string; nom: string; email: string; telephone: string; adresse: string }> = [];
const MOCK_ORDRES_SERVICE: Array<{ id: string; titre: string; date: string; statut: string }> = [];

interface DocumentOption { id: string; nom: string; description: string; obligatoire: boolean }
const DOCUMENTS_DISPONIBLES: DocumentOption[] = [
  { id: 'pre_etat_date', nom: 'Pre-etat date', description: 'Document preparatoire pour le compromis', obligatoire: true },
  { id: 'etat_date', nom: 'Etat date', description: 'Etat des charges et provisions', obligatoire: true },
  { id: 'certificat_art20', nom: 'Certificat article 20', description: 'Certificat de non-opposition a la vente', obligatoire: true },
  { id: 'carnet_entretien', nom: 'Carnet d\'entretien', description: 'Historique des travaux et entretiens', obligatoire: false },
  { id: 'reglement_copro', nom: 'Reglement de copropriete', description: 'Reglement et ses modificatifs', obligatoire: false },
  { id: 'pv_ag', nom: 'PV des 3 dernieres AG', description: 'Proces-verbaux des assemblees generales', obligatoire: false },
  { id: 'diagnostics', nom: 'Diagnostics techniques', description: 'DPE, amiante, plomb, etc.', obligatoire: false },
];

interface NouvelleVenteFormProps {
  formData: NouvelleVenteFormData;
  onUpdate: (updates: Partial<NouvelleVenteFormData>) => void;
  acquereurMode: 'selection' | 'saisie';
  onAcquereurModeChange: (mode: 'selection' | 'saisie') => void;
  notaireMode: 'selection' | 'saisie';
  onNotaireModeChange: (mode: 'selection' | 'saisie') => void;
  errors: Record<string, string>;
  expandedSections: { documents: boolean; ordresService: boolean };
  onToggleSection: (section: 'documents' | 'ordresService') => void;
  onToggleDocument: (docId: string, isObligatoire: boolean) => void;
  onToggleOrdreService: (osId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function NouvelleVenteForm({
  formData,
  onUpdate,
  acquereurMode,
  onAcquereurModeChange,
  notaireMode,
  onNotaireModeChange,
  errors,
  expandedSections,
  onToggleSection,
  onToggleDocument,
  onToggleOrdreService,
  onSubmit,
}: NouvelleVenteFormProps) {
  const handleLotChange = (lotId: string) => {
    const lot = MOCK_LOTS.find(l => l.id === lotId);
    if (lot) {
      const vendeur = MOCK_COPROPRIETAIRES.find(c => c.nom === lot.proprietaire);
      onUpdate({
        lotId,
        lotType: lot.type as NouvelleVenteFormData['lotType'],
        vendeurId: vendeur?.id || ''
      });
    }
  };

  const handleNotaireSelection = (notaireId: string) => {
    const notaire = MOCK_NOTAIRES.find(n => n.id === notaireId);
    if (notaire) {
      onUpdate({
        notaireId,
        notaireNom: notaire.nom,
        notaireEmail: notaire.email,
        notaireTelephone: notaire.telephone,
        notaireAdresse: notaire.adresse
      });
    }
  };

  const getVendeurInfo = () => MOCK_COPROPRIETAIRES.find(c => c.id === formData.vendeurId) || null;

  return (
    <form onSubmit={onSubmit}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className={styles.cardHeader}>
          <Building2 size={20} aria-hidden="true" />
          <h2 className={styles.cardTitle}>Informations principales</h2>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Lot concerné <span className={styles.required}>*</span></label>
              <select className={styles.input} value={formData.lotId} onChange={(e) => handleLotChange(e.target.value)}>
                <option value="">Sélectionner un lot</option>
                {MOCK_LOTS.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.id} - {formatLotType(lot.type)} ({lot.proprietaire})
                  </option>
                ))}
              </select>
              {errors.lotId && <span className={styles.error}>{errors.lotId}</span>}
            </div>
            {formData.lotType && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Type de lot</label>
                <div className={styles.readOnly}><Home size={16} aria-hidden="true" />{formatLotType(formData.lotType)}</div>
              </div>
            )}
            <div className={styles.formGroup}>
              <label className={styles.label}>Vendeur <span className={styles.required}>*</span></label>
              <div className={styles.readOnly}>
                <User size={16} aria-hidden="true" />
                {getVendeurInfo()?.nom || 'Sélectionnez d\'abord un lot'}
              </div>
              {getVendeurInfo() && (
                <div className={styles.vendeurDetails}>
                  <span><Mail size={12} aria-hidden="true" /> {getVendeurInfo()?.email}</span>
                  <span><Phone size={12} aria-hidden="true" /> {getVendeurInfo()?.telephone}</span>
                </div>
              )}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Statut</label>
              <div className={styles.statusBadge}>En cours</div>
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Acquéreur <span className={styles.required}>*</span></label>
            <div className={styles.toggleButtons}>
              <button type="button" className={`${styles.toggleBtn} ${acquereurMode === 'saisie' ? styles.toggleActive : ''}`} onClick={() => onAcquereurModeChange('saisie')}>Saisie libre</button>
              <button type="button" className={`${styles.toggleBtn} ${acquereurMode === 'selection' ? styles.toggleActive : ''}`} onClick={() => onAcquereurModeChange('selection')}>Sélection carnet</button>
            </div>
          </div>

          {acquereurMode === 'saisie' ? (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nom complet <span className={styles.required}>*</span></label>
                <input type="text" className={styles.input} value={formData.acquereurNom} onChange={(e) => onUpdate({ acquereurNom: e.target.value })} placeholder="Jean DUPONT" />
                {errors.acquereurNom && <span className={styles.error}>{errors.acquereurNom}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input type="email" className={styles.input} value={formData.acquereurEmail} onChange={(e) => onUpdate({ acquereurEmail: e.target.value })} placeholder="jean.dupont@example.com" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Téléphone</label>
                <input type="tel" className={styles.input} value={formData.acquereurTelephone} onChange={(e) => onUpdate({ acquereurTelephone: e.target.value })} placeholder="06 12 34 56 78" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Adresse</label>
                <input type="text" className={styles.input} value={formData.acquereurAdresse} onChange={(e) => onUpdate({ acquereurAdresse: e.target.value })} placeholder="15 rue de la Paix, 75001 Paris" />
              </div>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <select className={styles.input} value={formData.acquereurId} onChange={(e) => onUpdate({ acquereurId: e.target.value })}>
                <option value="">Sélectionner dans le carnet</option>
                {MOCK_COPROPRIETAIRES.map((copro) => (
                  <option key={copro.id} value={copro.id}>{copro.nom}</option>
                ))}
              </select>
              {errors.acquereurId && <span className={styles.error}>{errors.acquereurId}</span>}
            </div>
          )}

          <div className={styles.divider}></div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Notaire</label>
            <div className={styles.toggleButtons}>
              <button type="button" className={`${styles.toggleBtn} ${notaireMode === 'selection' ? styles.toggleActive : ''}`} onClick={() => onNotaireModeChange('selection')}>Sélection</button>
              <button type="button" className={`${styles.toggleBtn} ${notaireMode === 'saisie' ? styles.toggleActive : ''}`} onClick={() => onNotaireModeChange('saisie')}>Saisie libre</button>
            </div>
          </div>

          {notaireMode === 'selection' ? (
            <div className={styles.formGroup}>
              <select className={styles.input} value={formData.notaireId} onChange={(e) => handleNotaireSelection(e.target.value)}>
                <option value="">Sélectionner un notaire</option>
                {MOCK_NOTAIRES.map((notaire) => (
                  <option key={notaire.id} value={notaire.id}>{notaire.nom} - {notaire.email}</option>
                ))}
              </select>
              {formData.notaireId && (
                <div className={styles.notaireDetails}>
                  <span><Phone size={12} aria-hidden="true" /> {formData.notaireTelephone}</span>
                  <span><Mail size={12} aria-hidden="true" /> {formData.notaireEmail}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nom</label>
                <input type="text" className={styles.input} value={formData.notaireNom} onChange={(e) => onUpdate({ notaireNom: e.target.value })} placeholder="Me. DUPONT" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input type="email" className={styles.input} value={formData.notaireEmail} onChange={(e) => onUpdate({ notaireEmail: e.target.value })} placeholder="notaire@example.com" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Téléphone</label>
                <input type="tel" className={styles.input} value={formData.notaireTelephone} onChange={(e) => onUpdate({ notaireTelephone: e.target.value })} placeholder="01 23 45 67 89" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Adresse</label>
                <input type="text" className={styles.input} value={formData.notaireAdresse} onChange={(e) => onUpdate({ notaireAdresse: e.target.value })} placeholder="Adresse de l'étude" />
              </div>
            </div>
          )}

          <div className={styles.divider}></div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}><Calendar size={14} style={{ marginRight: 4 }} aria-hidden="true" />Date de compromis <span className={styles.required}>*</span></label>
              <input type="date" className={styles.input} value={formData.dateCompromis} onChange={(e) => onUpdate({ dateCompromis: e.target.value })} />
              {errors.dateCompromis && <span className={styles.error}>{errors.dateCompromis}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}><Calendar size={14} style={{ marginRight: 4 }} aria-hidden="true" />Date acte authentique prévue</label>
              <input type="date" className={styles.input} value={formData.dateActeAuthentique} onChange={(e) => onUpdate({ dateActeAuthentique: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}><Calendar size={14} style={{ marginRight: 4 }} aria-hidden="true" />Date notification article 6</label>
              <input type="date" className={styles.input} value={formData.dateNotificationArticle6} onChange={(e) => onUpdate({ dateNotificationArticle6: e.target.value })} />
              <span className={styles.hint}>Date de notification au syndic de la mutation</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className={`${styles.cardHeader} ${styles.cardHeaderClickable}`} onClick={() => onToggleSection('documents')}>
          <div className={styles.cardHeaderLeft}>
            <FileCheck size={20} aria-hidden="true" />
            <h2 className={styles.cardTitle}>Documents à générer automatiquement</h2>
            <span className={styles.badge}>{formData.documentsAGenerer.length} sélectionnés</span>
          </div>
          {expandedSections.documents ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
        </div>
        {expandedSections.documents && (
          <div className={styles.cardContent}>
            <p className={styles.sectionDescription}>Les documents cochés seront générés automatiquement lors de la création de la vente.</p>
            <div className={styles.documentGrid}>
              {DOCUMENTS_DISPONIBLES.map((doc) => (
                <div key={doc.id} className={`${styles.documentItem} ${formData.documentsAGenerer.includes(doc.id) ? styles.documentSelected : ''} ${doc.obligatoire ? styles.documentObligatoire : ''}`} onClick={() => onToggleDocument(doc.id, doc.obligatoire)}>
                  <div className={styles.documentCheck}>
                    {formData.documentsAGenerer.includes(doc.id) ? (<CheckCircle size={20} className={styles.checkIcon} aria-hidden="true" />) : (<div className={styles.emptyCheck} />)}
                  </div>
                  <div className={styles.documentInfo}>
                    <span className={styles.documentName}>{doc.nom}{doc.obligatoire && <span className={styles.obligatoireTag}>Obligatoire</span>}</span>
                    <span className={styles.documentDesc}>{doc.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className={`${styles.cardHeader} ${styles.cardHeaderClickable}`} onClick={() => onToggleSection('ordresService')}>
          <div className={styles.cardHeaderLeft}>
            <Wrench size={20} aria-hidden="true" />
            <h2 className={styles.cardTitle}>Ordres de service liés</h2>
            {formData.ordresService.length > 0 && (<span className={styles.badge}>{formData.ordresService.length} liés</span>)}
          </div>
          {expandedSections.ordresService ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
        </div>
        {expandedSections.ordresService && (
          <div className={styles.cardContent}>
            <p className={styles.sectionDescription}>Associez les ordres de service pertinents pour cette vente.</p>
            <div className={styles.osGrid}>
              {MOCK_ORDRES_SERVICE.map((os) => (
                <div key={os.id} className={`${styles.osItem} ${formData.ordresService.includes(os.id) ? styles.osSelected : ''}`} onClick={() => onToggleOrdreService(os.id)}>
                  <div className={styles.osCheck}>
                    {formData.ordresService.includes(os.id) ? (<CheckCircle size={18} className={styles.checkIcon} aria-hidden="true" />) : (<div className={styles.emptyCheck} />)}
                  </div>
                  <div className={styles.osInfo}>
                    <span className={styles.osTitle}>{os.titre}</span>
                    <div className={styles.osMeta}>
                      <span className={styles.osDate}>{new Date(os.date).toLocaleDateString('fr-FR')}</span>
                      <span className={`${styles.osStatut} ${styles[`os${os.statut}`]}`}>{os.statut === 'CLOTURE' ? 'Clôturé' : 'En cours'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className={styles.cardHeader}>
          <FileText size={20} aria-hidden="true" />
          <h2 className={styles.cardTitle}>Notes internes</h2>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Observations</label>
            <textarea className={styles.textarea} value={formData.observations} onChange={(e) => onUpdate({ observations: e.target.value })} rows={3} placeholder="Observations générales sur la vente..." />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Notes pour suivi interne</label>
            <textarea className={styles.textarea} value={formData.notesInternes} onChange={(e) => onUpdate({ notesInternes: e.target.value })} rows={3} placeholder="Notes confidentielles pour le suivi interne..." />
            <span className={styles.hint}>Ces notes ne seront pas visibles dans les documents générés</span>
          </div>
        </div>
      </div>
    </form>
  );
}

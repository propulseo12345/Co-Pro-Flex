# Envoi des convocations AG — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le pipeline d'envoi des convocations AG : PDF personnalisé par copropriétaire, dispatch multi-canal, archivage GED, traçabilité DB.

**Architecture:** Pipeline séquentiel dans `handleSend` avec progression UI. Chaque copropriétaire reçoit un PDF avec page de garde personnalisée. Les canaux EMAIL envoient réellement (Edge Function), les canaux postaux génèrent un ZIP téléchargeable. Tout est archivé en GED et tracé en DB.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (RPCs + Edge Functions), jsPDF, JSZip, CSS Modules

**Spec:** `docs/superpowers/specs/2026-03-14-convocation-dispatch-design.md`

---

## Chunk 1 : DB + Types fondation

### Task 1: Migration Supabase — table `ag_envoi_tracking` + RPCs

**Files:**
- Create: `supabase/migrations/20260314_ag_envoi_tracking.sql`

- [ ] **Step 1: Créer la migration**

```sql
-- =============================================================
-- Table de traçabilité des envois de convocations
-- =============================================================

CREATE TABLE ag_envoi_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN (
    'RECOMMANDE', 'LETTRE_SIMPLE', 'AVIS_ELECTRONIQUE', 'EMAIL', 'REMISE_MAIN_PROPRE'
  )),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sent', 'delivered', 'error'
  )),
  tracking_ref TEXT,
  document_id UUID,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_envoi_tracking_ag ON ag_envoi_tracking(ag_id);
CREATE INDEX idx_envoi_tracking_copro ON ag_envoi_tracking(ag_id, coproprietaire_id);
CREATE INDEX idx_envoi_tracking_copro_alone ON ag_envoi_tracking(coproprietaire_id);

ALTER TABLE ag_envoi_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envoi_tracking_access" ON ag_envoi_tracking
  FOR ALL USING (
    ag_id IN (
      SELECT id FROM ag_meetings
      WHERE copro_id IN (
        SELECT copro_id FROM memberships
        WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
      )
    )
  );

-- =============================================================
-- RPC: Bulk insert tracking entries
-- =============================================================

CREATE OR REPLACE FUNCTION save_ag_envoi_tracking(
  p_ag_id UUID,
  p_entries JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ag_envoi_tracking (
    ag_id, coproprietaire_id, method, status,
    tracking_ref, document_id, error_message, sent_at
  )
  SELECT
    p_ag_id,
    (entry->>'coproprietaireId')::UUID,
    entry->>'method',
    entry->>'status',
    entry->>'trackingRef',
    NULLIF(entry->>'documentId', '')::UUID,
    entry->>'error',
    (entry->>'sentAt')::TIMESTAMPTZ
  FROM jsonb_array_elements(p_entries) AS entry;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- RPC: Read tracking for an AG
-- =============================================================

CREATE OR REPLACE FUNCTION get_ag_envoi_tracking(p_ag_id UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'coproprietaireId', t.coproprietaire_id,
      'method', t.method,
      'status', t.status,
      'trackingRef', t.tracking_ref,
      'documentId', t.document_id,
      'error', t.error_message,
      'sentAt', t.sent_at,
      'deliveredAt', t.delivered_at
    )
  ), '[]'::JSONB)
  FROM ag_envoi_tracking t
  WHERE t.ag_id = p_ag_id;
$$ LANGUAGE sql STABLE;

-- =============================================================
-- RPC: Bundle convocation (toutes les données pour PDF)
-- Note: lot_owners est la table de jonction lots<->coproprietaires
-- =============================================================

CREATE OR REPLACE FUNCTION rpc_get_ag_convocation_bundle(p_ag_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_copro_id UUID;
BEGIN
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;

  RETURN jsonb_build_object(
    'agData', (
      SELECT row_to_json(m) FROM (
        SELECT id, type, meeting_date, meeting_time, location, copro_id,
               opening_notes, closing_notes
        FROM ag_meetings WHERE id = p_ag_id
      ) m
    ),
    'resolutions', (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.resolution_number), '[]')
      FROM (
        SELECT id, title, text, majority_type, resolution_number, status, variables
        FROM ag_resolutions WHERE ag_id = p_ag_id
      ) r
    ),
    'coproprietaires', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]')
      FROM (
        SELECT DISTINCT ON (cp.id)
          cp.id,
          cp.first_name || ' ' || cp.last_name AS nom,
          cp.email,
          cp.phone AS telephone,
          cp.address_line1,
          cp.address_line2,
          cp.city,
          cp.postal_code,
          l.id AS lot_id,
          lo.lot_id IS NOT NULL AS has_lot,
          l.tantiemes
        FROM coproprietaires cp
        LEFT JOIN lot_owners lo ON lo.coproprietaire_id = cp.id AND lo.copro_id = v_copro_id
        LEFT JOIN lots l ON l.id = lo.lot_id
        WHERE cp.copro_id = v_copro_id
        ORDER BY cp.id, l.tantiemes DESC NULLS LAST
      ) c
    ),
    'totalTantiemes', (
      SELECT COALESCE(SUM(l.tantiemes), 0)
      FROM lots l
      WHERE l.copro_id = v_copro_id
    ),
    'syndic', (
      SELECT row_to_json(s) FROM (
        SELECT name AS nom, address AS adresse, city AS ville, postal_code AS code_postal
        FROM copros WHERE id = v_copro_id
      ) s
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

- [ ] **Step 2: Appliquer la migration**

```bash
npx supabase db push
# OU si dev local :
npx supabase migration up
```

- [ ] **Step 3: Tester la RPC bundle dans SQL Editor**

```sql
SELECT rpc_get_ag_convocation_bundle('5e675917-eeaa-4723-b362-199e05c956a3');
```

Vérifier que le JSON contient `agData`, `resolutions`, `coproprietaires` (avec `address_line1`, `city`, etc.), `totalTantiemes`, `syndic`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260314_ag_envoi_tracking.sql
git commit -m "feat(ag): migration envoi tracking + RPC bundle convocation"
```

---

### Task 2: Types TypeScript pour le dispatch

**Files:**
- Create: `src/features/ag/types/envoi-dispatch.ts`

- [ ] **Step 1: Créer le fichier de types**

```typescript
/**
 * Types pour le pipeline d'envoi des convocations AG
 */

import type { SendingMethod } from '@/features/ag/hooks/useAgEnvoiPage';

// ============================================================
// DESTINATAIRE (page de garde PDF)
// ============================================================

export interface ConvocationDestinataire {
  nom: string;
  adresse: string;
  complement?: string;
  codePostal: string;
  ville: string;
  lot: string;
  tantiemes: number;
  totalTantiemes: number;
  sendingMethod: string;
}

// ============================================================
// DISPATCH
// ============================================================

export interface DispatchParams {
  blob: Blob;
  fileName: string;
  copro: {
    id: string;
    nom: string;
    email?: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
  };
  method: SendingMethod;
  agId: string;
  coproId: string;
  agDate: string;
}

export interface DispatchResult {
  coproprietaireId: string;
  method: SendingMethod;
  status: 'sent' | 'queued' | 'error';
  trackingRef?: string;
  documentId?: string;
  error?: string;
  sentAt: string;
}

// ============================================================
// BUNDLE RPC (données pour génération PDF)
// ============================================================

export interface ConvocationBundleCopro {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  lot_id?: string;
  has_lot: boolean;
  tantiemes?: number;
}

export interface ConvocationBundle {
  agData: {
    id: string;
    type: string;
    meeting_date: string;
    meeting_time: string;
    location: string;
    copro_id: string;
    opening_notes?: string;
    closing_notes?: string;
  };
  resolutions: Array<{
    id: string;
    title: string;
    text: string;
    majority_type: string;
    resolution_number: number;
    status: string;
    variables: Record<string, unknown>;
  }>;
  coproprietaires: ConvocationBundleCopro[];
  totalTantiemes: number;
  syndic: {
    nom: string;
    adresse: string;
    ville: string;
    code_postal: string;
  };
}

// ============================================================
// PROGRESSION UI
// ============================================================

export interface SendProgress {
  isActive: boolean;
  current: number;
  total: number;
  currentName: string;
  currentStep: 'loading' | 'generating' | 'dispatching' | 'archiving' | 'done' | 'cancelled';
  results: DispatchResult[];
  cancelled: boolean;
  zipUrl?: string;
}

export interface PostalEntry {
  blob: Blob;
  fileName: string;
  method: SendingMethod;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ag/types/envoi-dispatch.ts
git commit -m "feat(ag): types dispatch convocations"
```

---

## Chunk 2 : Page de garde PDF

### Task 3: Ajouter la page de garde à `generateConvocationPDF`

**Files:**
- Modify: `src/lib/pdf/generateConvocationPDF.ts`

- [ ] **Step 1: Ajouter le type `ConvocationDestinataire` dans les imports de `ConvocationPDFParams`**

Ajouter dans le fichier, après l'interface `ConvocationPDFParams` existante :

```typescript
import type { ConvocationDestinataire } from '@/features/ag/types/envoi-dispatch';

// Dans ConvocationPDFParams, ajouter :
export interface ConvocationPDFParams {
  // ... champs existants
  destinataire?: ConvocationDestinataire;
}
```

- [ ] **Step 2: Implémenter la fonction `renderCoverPage`**

Ajouter une fonction interne avant `generateConvocationPDF` :

```typescript
function renderCoverPage(
  doc: jsPDF,
  params: {
    destinataire: ConvocationDestinataire;
    syndic: { nom: string; adresse: string };
    ag: { type: string; date: string; heure: string; lieu: string };
  }
) {
  const { destinataire, syndic, ag } = params;
  let y = MARGIN;

  // En-tête syndic (expéditeur)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(syndic.nom, MARGIN, y);
  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_SEC);
  doc.text(syndic.adresse, MARGIN, y);
  y += 12;

  // Date
  const dateFormatted = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  doc.setTextColor(...TEXT);
  doc.setFontSize(10);
  doc.text(`Le ${dateFormatted}`, PW - MARGIN, y, { align: 'right' });
  y += 18;

  // Bloc destinataire (encadré)
  const boxX = PW - MARGIN - 85;
  const boxY = y;
  doc.setDrawColor(...NAVY_MID);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, 85, 35, 2, 2);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(destinataire.nom, boxX + 4, boxY + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(destinataire.adresse, boxX + 4, boxY + 12);
  if (destinataire.complement) {
    doc.text(destinataire.complement, boxX + 4, boxY + 17);
  }
  doc.text(`${destinataire.codePostal} ${destinataire.ville}`, boxX + 4, boxY + 22);
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_SEC);
  doc.text(
    `Lot ${destinataire.lot} — ${destinataire.tantiemes}/${destinataire.totalTantiemes} tantièmes`,
    boxX + 4, boxY + 28
  );
  y = boxY + 45;

  // Objet
  doc.setFont('Times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  const typeLabel = ag.type === 'ORDINAIRE' ? 'Ordinaire' :
    ag.type === 'EXTRAORDINAIRE' ? 'Extraordinaire' : 'Mixte';
  doc.text(
    `Objet : Convocation à l'Assemblée Générale ${typeLabel}`,
    MARGIN, y
  );
  y += 6;
  doc.setFont('Times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(`du ${ag.date} à ${ag.heure} — ${ag.lieu}`, MARGIN, y);
  y += 14;

  // Formule d'introduction
  doc.setFontSize(10);
  doc.text('Madame, Monsieur,', MARGIN, y);
  y += 7;
  const introText = 'Nous avons l\'honneur de vous convoquer à l\'Assemblée Générale ' +
    `${typeLabel.toLowerCase()} de la copropriété. Vous trouverez ci-après l'ordre du jour ` +
    'et les résolutions soumises au vote.';
  const introLines = doc.splitTextToSize(introText, CW);
  doc.text(introLines, MARGIN, y);
  y += introLines.length * 5 + 8;

  // Mode d'envoi
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Mode d'envoi : ${destinataire.sendingMethod}`, MARGIN, y);

  // Séparateur avant le corps
  y += 8;
  doc.setDrawColor(...GOLD_MUTED);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PW - MARGIN, y);
}
```

- [ ] **Step 3: Brancher `renderCoverPage` dans `generateConvocationPDF`**

Au début de la fonction `generateConvocationPDF`, après la création du `jsPDF` doc et avant le contenu existant :

```typescript
// Si destinataire fourni, ajouter la page de garde en première page
if (params.destinataire) {
  renderCoverPage(doc, {
    destinataire: params.destinataire,
    syndic,
    ag: {
      type: agData.type || 'ORDINAIRE',
      date: new Date(agData.date).toLocaleDateString('fr-FR'),
      heure: agData.heure || '',
      lieu: agData.lieu || '',
    },
  });
  doc.addPage();
}
// ... reste du code existant (corps de la convocation)
```

- [ ] **Step 4: Tester manuellement**

Vérifier sur `http://localhost:3000/ag/{id}/convocation` que le PDF sans destinataire fonctionne toujours (pas de régression).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generateConvocationPDF.ts
git commit -m "feat(ag): page de garde personnalisée dans convocation PDF"
```

---

## Chunk 3 : Service de dispatch

### Task 4: Créer le service `convocation-dispatch`

**Files:**
- Create: `src/lib/services/convocation-dispatch.service.ts`

- [ ] **Step 1: Implémenter le service**

```typescript
/**
 * Service de dispatch des convocations AG
 * Orchestre l'envoi par canal (email, postal, remise)
 */

import { autoFileToGED } from '@/lib/services/auto-file-ged.service';
import { createClient } from '@/lib/supabase/client';
import type {
  DispatchParams,
  DispatchResult,
  PostalEntry,
} from '@/features/ag/types/envoi-dispatch';

// ============================================================
// LABELS pour les méthodes d'envoi
// ============================================================

export const SENDING_METHOD_LABELS: Record<string, string> = {
  RECOMMANDE: 'Recommandé AR',
  LETTRE_SIMPLE: 'Lettre simple',
  AVIS_ELECTRONIQUE: 'Avis électronique',
  EMAIL: 'Email',
  REMISE_MAIN_PROPRE: 'Remise en main propre',
};

// ============================================================
// DISPATCH PRINCIPAL
// ============================================================

export async function dispatchConvocation(
  params: DispatchParams
): Promise<{ result: DispatchResult; postalEntry?: PostalEntry }> {
  const { blob, fileName, copro, method, agId, coproId, agDate } = params;
  const now = new Date().toISOString();

  // 1. Archiver dans la GED (fire-and-forget)
  let documentId: string | undefined;
  try {
    const gedResult = await autoFileToGED({
      blob,
      fileName,
      coproId,
      category: 'convocation',
      sourceModule: 'ag',
      entityId: agId,
      entityType: 'ag_meeting',
      linkType: 'related',
      subFolderName: `Convocations AG ${agDate}`,
      year: new Date().getFullYear(),
    });
    documentId = gedResult.documentId;
  } catch {
    // Non-bloquant : on continue même si la GED échoue
  }

  // 2. Dispatcher selon le canal
  try {
    switch (method) {
      case 'EMAIL':
        return await dispatchEmail(params, documentId, now);

      case 'AVIS_ELECTRONIQUE':
        return {
          result: {
            coproprietaireId: copro.id,
            method,
            status: 'queued',
            documentId,
            sentAt: now,
          },
        };

      case 'RECOMMANDE':
      case 'LETTRE_SIMPLE':
      case 'REMISE_MAIN_PROPRE':
        return {
          result: {
            coproprietaireId: copro.id,
            method,
            status: 'queued',
            documentId,
            sentAt: now,
          },
          postalEntry: { blob, fileName, method },
        };

      default:
        return {
          result: {
            coproprietaireId: copro.id,
            method,
            status: 'error',
            error: `Canal inconnu: ${method}`,
            sentAt: now,
          },
        };
    }
  } catch (err) {
    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur inconnue',
        documentId,
        sentAt: now,
      },
    };
  }
}

// ============================================================
// EMAIL DISPATCH
// ============================================================

async function dispatchEmail(
  params: DispatchParams,
  documentId: string | undefined,
  sentAt: string
): Promise<{ result: DispatchResult }> {
  const { copro, method, agId } = params;

  if (!copro.email) {
    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'error',
        error: 'Pas d\'adresse email',
        documentId,
        sentAt,
      },
    };
  }

  try {
    const supabase = createClient();

    // Convertir blob en base64
    const arrayBuffer = await params.blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const { data, error } = await supabase.functions.invoke('send-convocation-email', {
      body: {
        to: copro.email,
        subject: `Convocation Assemblée Générale — ${params.agDate}`,
        recipientName: copro.nom,
        pdfBase64: base64,
        fileName: params.fileName,
        agId,
      },
    });

    if (error) throw error;

    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'sent',
        trackingRef: data?.messageId,
        documentId,
        sentAt,
      },
    };
  } catch (err) {
    return {
      result: {
        coproprietaireId: copro.id,
        method,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur envoi email',
        documentId,
        sentAt,
      },
    };
  }
}

// ============================================================
// ZIP GENERATION
// ============================================================

export async function generatePostalZip(entries: PostalEntry[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const folders: Record<string, ReturnType<typeof zip.folder>> = {};

  for (const entry of entries) {
    const folderName = entry.method.toLowerCase();
    if (!folders[folderName]) {
      folders[folderName] = zip.folder(folderName);
    }
    folders[folderName]?.file(entry.fileName, entry.blob);
  }

  return zip.generateAsync({ type: 'blob' });
}

// ============================================================
// SAVE TRACKING TO DB
// ============================================================

export async function saveEnvoiTracking(
  agId: string,
  results: DispatchResult[]
): Promise<void> {
  if (results.length === 0) return;

  const supabase = createClient() as ReturnType<typeof createClient> & { rpc: Function };

  const entries = results.map(r => ({
    coproprietaireId: r.coproprietaireId,
    method: r.method,
    status: r.status,
    trackingRef: r.trackingRef || null,
    documentId: r.documentId || null,
    error: r.error || null,
    sentAt: r.sentAt,
  }));

  await (supabase as any).rpc('save_ag_envoi_tracking', {
    p_ag_id: agId,
    p_entries: entries,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/convocation-dispatch.service.ts
git commit -m "feat(ag): service dispatch convocations multi-canal"
```

---

## Chunk 4 : Modale de progression UI

### Task 5: Composant `SendProgressModal`

**Files:**
- Create: `src/features/ag/components/envoi/SendProgressModal.tsx`
- Create: `src/features/ag/components/envoi/SendProgressModal.module.css`

- [ ] **Step 1: Créer le CSS**

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  width: min(560px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border);
}

.title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.progressBar {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  margin-top: var(--space-md);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-primary-600);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.resultsList {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.resultItem {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.resultItem.success {
  color: var(--color-success);
}

.resultItem.error {
  color: var(--color-error);
}

.resultItem.pending {
  color: var(--text-muted);
}

.resultItem.active {
  color: var(--color-primary-600);
  background: var(--bg-secondary);
}

.footer {
  padding: var(--space-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
}

.recap {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
}

.recapItem {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-sm);
}

.recapItem.success {
  color: var(--color-success);
}

.recapItem.postal {
  color: var(--color-primary-600);
}

.recapItem.error {
  color: var(--color-error);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

- [ ] **Step 2: Créer le composant**

```typescript
'use client';

import { CheckCircle, XCircle, Circle, Loader2, Download, ArrowRight } from 'lucide-react';
import type { SendProgress, DispatchResult } from '@/features/ag/types/envoi-dispatch';
import { SENDING_METHOD_LABELS } from '@/lib/services/convocation-dispatch.service';
import styles from './SendProgressModal.module.css';

interface SendProgressModalProps {
  progress: SendProgress;
  onCancel: () => void;
  onDownloadZip: () => void;
  onContinue: () => void;
}

export function SendProgressModal({
  progress,
  onCancel,
  onDownloadZip,
  onContinue,
}: SendProgressModalProps) {
  if (!progress.isActive) return null;

  const isDone = progress.currentStep === 'done' || progress.currentStep === 'cancelled';
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const emailsSent = progress.results.filter(r => r.method === 'EMAIL' && r.status === 'sent').length;
  const postalQueued = progress.results.filter(r =>
    ['RECOMMANDE', 'LETTRE_SIMPLE', 'REMISE_MAIN_PROPRE'].includes(r.method) && r.status === 'queued'
  ).length;
  const errors = progress.results.filter(r => r.status === 'error').length;
  const totalArchived = progress.results.filter(r => r.status !== 'error').length;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isDone
              ? (progress.cancelled ? 'Envoi interrompu' : 'Envoi terminé !')
              : 'Envoi des convocations en cours...'}
          </h2>
          {!isDone && (
            <p className={styles.subtitle}>
              {progress.currentName} — {progress.current}/{progress.total}
            </p>
          )}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className={styles.body}>
          {isDone ? (
            <div className={styles.recap}>
              {emailsSent > 0 && (
                <div className={`${styles.recapItem} ${styles.success}`}>
                  <CheckCircle size={16} /> {emailsSent} email(s) envoyé(s)
                </div>
              )}
              {postalQueued > 0 && (
                <div className={`${styles.recapItem} ${styles.postal}`}>
                  <Download size={16} /> {postalQueued} courrier(s) prêt(s) à télécharger
                </div>
              )}
              {totalArchived > 0 && (
                <div className={`${styles.recapItem} ${styles.success}`}>
                  <CheckCircle size={16} /> {totalArchived} document(s) archivé(s) dans la GED
                </div>
              )}
              {errors > 0 && (
                <div className={`${styles.recapItem} ${styles.error}`}>
                  <XCircle size={16} /> {errors} erreur(s)
                </div>
              )}
            </div>
          ) : (
            <div className={styles.resultsList}>
              {progress.results.map((r, i) => (
                <ResultItem key={`${r.coproprietaireId}-${r.method}-${i}`} result={r} />
              ))}
              {!isDone && progress.currentName && (
                <div className={`${styles.resultItem} ${styles.active}`}>
                  <Loader2 size={14} className={styles.spinner} />
                  {progress.currentName}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {isDone ? (
            <>
              {postalQueued > 0 && progress.zipUrl && (
                <button className="btn btn-secondary" onClick={onDownloadZip}>
                  <Download size={16} /> Télécharger les courriers (ZIP)
                </button>
              )}
              <button className="btn btn-primary" onClick={onContinue}>
                Continuer <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onCancel}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultItem({ result }: { result: DispatchResult }) {
  const methodLabel = SENDING_METHOD_LABELS[result.method] || result.method;
  const icon = result.status === 'sent'
    ? <CheckCircle size={14} />
    : result.status === 'error'
      ? <XCircle size={14} />
      : <Circle size={14} />;
  const cls = result.status === 'sent' ? styles.success
    : result.status === 'error' ? styles.error
    : styles.pending;

  return (
    <div className={`${styles.resultItem} ${cls}`}>
      {icon}
      <span>{methodLabel}</span>
      {result.error && <span style={{ fontSize: '0.75rem' }}>— {result.error}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/ag/components/envoi/
git commit -m "feat(ag): modale progression envoi convocations"
```

---

## Chunk 5 : Pipeline handleSend + intégration page

### Task 6: Refacto `handleSend` dans `useAgEnvoiPage`

**Files:**
- Modify: `src/features/ag/hooks/useAgEnvoiPage.ts`

- [ ] **Step 1: Ajouter les imports et le state `progress`**

En haut du fichier, ajouter :

```typescript
import { generateConvocationPDF } from '@/lib/pdf/generateConvocationPDF';
import {
  dispatchConvocation,
  generatePostalZip,
  saveEnvoiTracking,
  SENDING_METHOD_LABELS,
} from '@/lib/services/convocation-dispatch.service';
import type {
  SendProgress,
  DispatchResult,
  PostalEntry,
  ConvocationBundle,
  ConvocationBundleCopro,
} from '@/features/ag/types/envoi-dispatch';
```

Dans le hook, ajouter le state :

```typescript
const [progress, setProgress] = useState<SendProgress>({
  isActive: false,
  current: 0,
  total: 0,
  currentName: '',
  currentStep: 'loading',
  results: [],
  cancelled: false,
});
const abortRef = useRef<AbortController | null>(null);
```

- [ ] **Step 2: Ajouter la fonction `loadConvocationBundle`**

```typescript
const loadConvocationBundle = useCallback(async (): Promise<ConvocationBundle | null> => {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('rpc_get_ag_convocation_bundle', {
    p_ag_id: agId,
  });
  if (error || !data) return null;
  return data as unknown as ConvocationBundle;
}, [agId]);
```

- [ ] **Step 3: Réécrire `handleSend` avec le pipeline**

Remplacer le `handleSend` existant par :

```typescript
const handleSend = useCallback(async () => {
  const hasEmptyChoices = sendingChoices.some(choice => choice.methods.length === 0);
  if (hasEmptyChoices) {
    alert('Veuillez sélectionner au moins une méthode d\'envoi pour chaque copropriétaire.');
    return;
  }

  // Init progression
  const totalOps = sendingChoices.reduce((sum, c) => sum + c.methods.length, 0);
  setProgress({
    isActive: true,
    current: 0,
    total: totalOps,
    currentName: 'Chargement des données...',
    currentStep: 'loading',
    results: [],
    cancelled: false,
  });
  abortRef.current = new AbortController();

  try {
    // 1. Charger le bundle AG
    const bundle = await loadConvocationBundle();
    if (!bundle) {
      throw new Error('Impossible de charger les données de l\'AG');
    }

    const allResults: DispatchResult[] = [];
    const postalEntries: PostalEntry[] = [];
    let opIndex = 0;

    // 2. Boucle séquentielle
    for (const choice of sendingChoices) {
      if (abortRef.current.signal.aborted) break;

      const coproData = bundle.coproprietaires.find(c => c.id === choice.coproprietaireId);
      if (!coproData) continue;

      for (const method of choice.methods) {
        if (abortRef.current.signal.aborted) break;
        opIndex++;

        const methodLabel = SENDING_METHOD_LABELS[method] || method;
        setProgress(prev => ({
          ...prev,
          current: opIndex,
          currentName: `${coproData.nom} — ${methodLabel}`,
          currentStep: 'generating',
        }));

        // a. Générer le PDF personnalisé
        const agDateFormatted = new Date(bundle.agData.meeting_date).toLocaleDateString('fr-FR');
        const agDateISO = bundle.agData.meeting_date.split('T')[0];

        const pdfResult = generateConvocationPDF({
          agData: {
            type: bundle.agData.type as 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'MIXTE',
            date: bundle.agData.meeting_date,
            heure: bundle.agData.meeting_time || '',
            lieu: bundle.agData.location || '',
            adresse: bundle.syndic.adresse || '',
          },
          resolutions: bundle.resolutions.map(r => ({
            id: r.id,
            numero: r.resolution_number,
            titre: r.title,
            texte: r.text,
            majorite: r.majority_type,
            variables: r.variables as Record<string, string>,
          })),
          copropriete: { nom: bundle.syndic.nom, adresse: bundle.syndic.adresse },
          syndic: {
            nom: bundle.syndic.nom,
            adresse: `${bundle.syndic.adresse}, ${bundle.syndic.code_postal} ${bundle.syndic.ville}`,
          },
          destinataire: {
            nom: coproData.nom,
            adresse: coproData.address_line1 || '',
            complement: coproData.address_line2 || undefined,
            codePostal: coproData.postal_code || '',
            ville: coproData.city || '',
            lot: coproData.lot_id || '',
            tantiemes: coproData.tantiemes || 0,
            totalTantiemes: bundle.totalTantiemes,
            sendingMethod: methodLabel,
          },
        });

        const blob = pdfResult.blob;
        const safeName = coproData.nom.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `Convocation_AG_${agDateISO}_${safeName}.pdf`;

        // b. Dispatcher
        setProgress(prev => ({ ...prev, currentStep: 'dispatching' }));

        const { result, postalEntry } = await dispatchConvocation({
          blob,
          fileName,
          copro: {
            id: coproData.id,
            nom: coproData.nom,
            email: coproData.email || undefined,
            adresse: coproData.address_line1 || undefined,
            codePostal: coproData.postal_code || undefined,
            ville: coproData.city || undefined,
          },
          method,
          agId,
          coproId: bundle.agData.copro_id,
          agDate: agDateISO,
        });

        allResults.push(result);
        if (postalEntry) {
          postalEntries.push(postalEntry);
        }

        setProgress(prev => ({
          ...prev,
          results: [...prev.results, result],
        }));
      }
    }

    // 3. Bulk insert tracking
    await saveEnvoiTracking(agId, allResults);

    // 4. ZIP si canaux postaux
    let zipUrl: string | undefined;
    if (postalEntries.length > 0) {
      const zipBlob = await generatePostalZip(postalEntries);
      zipUrl = URL.createObjectURL(zipBlob);
    }

    // 5. Marquer milestone si pas annulé
    if (!abortRef.current.signal.aborted) {
      const supabase = createUntypedClient();
      await supabase.rpc('save_ag_milestone', {
        p_ag_id: agId,
        p_milestone_key: 'sent',
        p_milestone_value: {
          value: true,
          sentAt: new Date().toISOString(),
          totalSent: allResults.filter(r => r.status === 'sent').length,
          totalQueued: allResults.filter(r => r.status === 'queued').length,
          totalErrors: allResults.filter(r => r.status === 'error').length,
        },
      });
      setIsSent(true);
      await updateAgCurrentStep(agId, 5);
    }

    setProgress(prev => ({
      ...prev,
      isActive: true,
      currentStep: abortRef.current?.signal.aborted ? 'cancelled' : 'done',
      cancelled: abortRef.current?.signal.aborted || false,
      zipUrl,
    }));

  } catch (err) {
    setProgress(prev => ({
      ...prev,
      currentStep: 'done',
      currentName: err instanceof Error ? err.message : 'Erreur',
    }));
    alert('Erreur lors de l\'envoi. Veuillez réessayer.');
  }
}, [sendingChoices, agId, loadConvocationBundle]);

const handleCancelSend = useCallback(() => {
  abortRef.current?.abort();
}, []);

const handleDownloadZip = useCallback(() => {
  if (progress.zipUrl) {
    const a = document.createElement('a');
    a.href = progress.zipUrl;
    a.download = `convocations_courriers_${agId}.zip`;
    a.click();
  }
}, [progress.zipUrl, agId]);

const handleCloseProgress = useCallback(() => {
  if (progress.zipUrl) URL.revokeObjectURL(progress.zipUrl);
  setProgress(prev => ({ ...prev, isActive: false }));
  if (!progress.cancelled) {
    router.push(`/ag/${agId}/votes-correspondance`);
  }
}, [progress.zipUrl, progress.cancelled, agId, router]);
```

- [ ] **Step 4: Exposer les nouveaux handlers dans le return**

Ajouter dans l'objet retourné :

```typescript
// Progression
progress,
handleCancelSend,
handleDownloadZip,
handleCloseProgress,
```

- [ ] **Step 5: Commit**

```bash
git add src/features/ag/hooks/useAgEnvoiPage.ts
git commit -m "feat(ag): pipeline envoi convocations avec progression"
```

---

### Task 7: Intégrer la modale dans la page envoi

**Files:**
- Modify: `src/app/(dashboard)/ag/[id]/envoi/page.tsx`

- [ ] **Step 1: Importer et brancher la modale**

Ajouter l'import :

```typescript
import { SendProgressModal } from '@/features/ag/components/envoi/SendProgressModal';
```

Ajouter avant le `</div>` final du return :

```typescript
<SendProgressModal
  progress={page.progress}
  onCancel={page.handleCancelSend}
  onDownloadZip={page.handleDownloadZip}
  onContinue={page.handleCloseProgress}
/>
```

- [ ] **Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__" | grep -v "test.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/ag/[id]/envoi/page.tsx
git commit -m "feat(ag): intégration modale progression dans page envoi"
```

---

## Chunk 6 : Edge Function email + dépendance JSZip

### Task 8: Installer JSZip

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer**

```bash
npm install jszip
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jszip dependency for postal ZIP generation"
```

---

### Task 9: Edge Function `send-convocation-email`

**Files:**
- Create: `supabase/functions/send-convocation-email/index.ts`

- [ ] **Step 1: Créer la Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'convocations@coproflex.fr';

interface RequestBody {
  to: string;
  subject: string;
  recipientName: string;
  pdfBase64: string;
  fileName: string;
  agId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { to, subject, recipientName, pdfBase64, fileName } = body;

    if (!to || !pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      // Mode stub : pas de clé API configurée
      console.log(`[STUB] Email convocation → ${to} (${fileName})`);
      return new Response(
        JSON.stringify({
          success: true,
          messageId: `stub-${Date.now()}`,
          stub: true,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Envoi réel via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: `
          <p>Madame, Monsieur ${recipientName},</p>
          <p>Veuillez trouver ci-joint la convocation à l'Assemblée Générale de votre copropriété.</p>
          <p>Nous vous prions de bien vouloir en prendre connaissance et de vous présenter à la date et l'heure indiquées, ou de vous faire représenter par un mandataire muni d'un pouvoir.</p>
          <p>Cordialement,<br/>Le Syndic</p>
          <hr/>
          <p style="font-size: 0.8em; color: #666;">Ce message a été envoyé automatiquement par CoProFlex.</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBase64,
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: result.message || 'Resend error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/send-convocation-email/
git commit -m "feat(ag): Edge Function envoi email convocation (Resend + stub)"
```

---

## Chunk 7 : Test E2E manuel + polish

### Task 10: Test E2E manuel

- [ ] **Step 1: Vérifier que la migration est appliquée**

```bash
npx supabase db push
```

- [ ] **Step 2: Ouvrir la page envoi d'une AG existante**

```
http://localhost:3000/ag/{ag_id}/envoi
```

- [ ] **Step 3: Sélectionner des méthodes pour chaque copro et cliquer "Envoyer"**

Vérifier :
- La modale de progression s'affiche
- Les PDFs sont générés avec la page de garde (nom, adresse du copro)
- Les emails partent (ou stub en log si pas de RESEND_API_KEY)
- Les courriers postaux génèrent un ZIP téléchargeable
- Les documents apparaissent dans la GED (sous-dossier "Convocations AG {date}")
- Les tracking entries sont en DB (`SELECT * FROM ag_envoi_tracking WHERE ag_id = '...'`)

- [ ] **Step 4: Tester l'annulation**

Cliquer "Annuler" pendant le pipeline. Vérifier que les résultats partiels sont sauvés en DB.

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(ag): pipeline envoi convocations complet — PDF personnalisé, dispatch, GED, tracking"
```

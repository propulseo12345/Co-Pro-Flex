# Design — Envoi des convocations AG avec PDF personnalisé

**Date :** 2026-03-14
**Statut :** Validé
**Scope :** Pipeline d'envoi des convocations AG : génération PDF personnalisé par copropriétaire, dispatch multi-canal, archivage GED, traçabilité DB.

---

## 1. Contexte

Aujourd'hui, `handleSend` dans `useAgEnvoiPage` marque un milestone "sent" sans générer ni envoyer de document. Chaque copropriétaire doit recevoir une convocation PDF personnalisée, envoyée par le canal choisi (email, recommandé, lettre simple, avis électronique, remise en main propre), archivée dans la GED, et tracée en DB.

### Existant utilisé

| Composant | Fichier | Rôle |
|-----------|---------|------|
| `generateConvocationPDF` | `src/lib/pdf/generateConvocationPDF.ts` | Génère le PDF convocation (générique, sans destinataire) |
| `autoFileToGED` | `src/lib/services/auto-file-ged.service.ts` | Archive un blob dans la GED avec folder resolution |
| `useAgEnvoiPage` | `src/features/ag/hooks/useAgEnvoiPage.ts` | Hook page envoi : copros, choix, milestones |
| `recommandeService` | `src/services/recommande/` | Stub pour recommandé électronique (AR24/Maileva) |
| `useDeliveryConfig` | `src/hooks/modules/useDeliveryConfig.ts` | Config delivery par copro (non branché page envoi) |

---

## 2. Architecture

### 2.1 Pipeline séquentiel avec progression UI

```
handleSend() click
    │
    ├─ 1. Charger données AG complètes via rpc_get_ag_convocation_bundle :
    │     → résolutions (titre, texte, majorité, variables)
    │     → copropriétaires avec adresses postales
    │     → annexes structurées
    │     → données comptables (si AG ordinaire)
    │     → totalTantiemes (SUM sur la copropriété)
    │     → syndic info (nom, adresse)
    │
    ├─ 2. Pour chaque copropriétaire (séquentiel, avec progression + AbortController) :
    │     a. Générer PDF personnalisé (page de garde + corps convocation)
    │     b. Archiver dans la GED (fire-and-forget)
    │     c. Dispatcher par canal(aux) choisi(s)
    │     d. Collecter le résultat (DispatchResult)
    │     e. Mettre à jour progression UI
    │     f. Vérifier signal d'annulation avant de continuer
    │     g. Libérer le blob si non-postal (éviter accumulation mémoire)
    │
    ├─ 3. Bulk insert tracking en DB (save_ag_envoi_tracking)
    │
    ├─ 4. Si canaux postaux → générer ZIP et proposer téléchargement
    │
    └─ 5. Marquer milestone "sent" + naviguer step 5
```

### 2.2 Choix de design

- **Pipeline séquentiel** (pas de queue/worker) — simplicité, suffisant pour <100 copros
- **État optimiste** — l'UI montre la progression, la DB est écrite en batch à la fin
- **Pas de fusion PDF** — le générateur existant est enrichi avec un param `destinataire?`
- **ZIP côté client** — via JSZip pour les canaux postaux (pas de serveur)
- **Annulation** — un `AbortController` est vérifié à chaque itération ; si annulé, les résultats partiels sont sauvegardés en DB
- **Mémoire** — les blobs non-postaux sont libérés après GED+dispatch ; les blobs postaux sont ajoutés au ZIP progressivement puis libérés

### 2.3 RPC bundle — `rpc_get_ag_convocation_bundle`

Nouvelle RPC qui charge toutes les données nécessaires à la génération PDF en un seul appel :

```sql
CREATE OR REPLACE FUNCTION rpc_get_ag_convocation_bundle(p_ag_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'agData', (SELECT row_to_json(m) FROM (
      SELECT id, type, meeting_date, meeting_time, location, copro_id,
             opening_notes, closing_notes
      FROM ag_meetings WHERE id = p_ag_id
    ) m),
    'resolutions', (SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.resolution_number), '[]')
      FROM (
        SELECT id, title, text, majority_type, resolution_number, status, variables
        FROM ag_resolutions WHERE ag_id = p_ag_id
      ) r),
    'coproprietaires', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]')
      FROM (
        SELECT cp.id, cp.prenom || ' ' || cp.nom AS nom,
               cp.email, cp.telephone,
               cp.adresse, cp.code_postal, cp.ville,
               l.numero AS lot, l.tantiemes
        FROM coproprietaires cp
        JOIN lots l ON l.owner_id = cp.id
        WHERE cp.copro_id = (SELECT copro_id FROM ag_meetings WHERE id = p_ag_id)
      ) c),
    'totalTantiemes', (SELECT COALESCE(SUM(l.tantiemes), 0)
      FROM lots l
      JOIN coproprietaires cp ON cp.id = l.owner_id
      WHERE cp.copro_id = (SELECT copro_id FROM ag_meetings WHERE id = p_ag_id)),
    'syndic', (SELECT row_to_json(s) FROM (
      SELECT name AS nom, address AS adresse, city AS ville, postal_code AS code_postal
      FROM copros WHERE id = (SELECT copro_id FROM ag_meetings WHERE id = p_ag_id)
    ) s)
  );
$$ LANGUAGE sql STABLE;
```

**Note :** Les noms de colonnes exacts (`adresse`, `code_postal`, `ville` sur `coproprietaires`) seront vérifiés lors de l'implémentation et adaptés au schéma réel.

### 2.4 Décision : `useDeliveryConfig` vs `useAgEnvoiPage`

`useDeliveryConfig` est **déprécié** au profit du modèle `SendingChoice[]` de `useAgEnvoiPage`. Les fonctionnalités utiles de `useDeliveryConfig` (postal address, cost estimates) sont absorbées dans le pipeline :
- Les adresses postales viennent du bundle RPC (pas de `useDeliveryConfig`)
- Le calcul de coût reste dans `useAgEnvoiPage` (`SENDING_COSTS`)
- Le tracking email/postal sera dans `ag_envoi_tracking` (pas dans `useDeliveryConfig`)

`useDeliveryConfig` ne sera pas supprimé immédiatement mais n'est pas utilisé par cette feature.

---

## 3. Page de garde personnalisée

### 3.1 Modification de `generateConvocationPDF`

Ajout d'un champ optionnel `destinataire` dans `ConvocationPDFParams` :

```typescript
interface ConvocationDestinataire {
  nom: string;           // "M. Jean DUPONT"
  adresse: string;       // "12 rue de la Paix"
  complement?: string;   // "Bât. A - Lot 42"
  codePostal: string;
  ville: string;
  lot: string;           // "Lot 42"
  tantiemes: number;     // 150
  totalTantiemes: number; // 10000
  sendingMethod: string; // "Recommandé AR", "Email", etc.
}

interface ConvocationPDFParams {
  // ... existant
  destinataire?: ConvocationDestinataire;
}
```

### 3.2 Contenu de la page de garde

Si `destinataire` est fourni, une page de garde est insérée en première page :

- **En-tête :** nom et adresse du syndic (expéditeur)
- **Date :** ville, le DD/MM/YYYY
- **Bloc destinataire :** nom, adresse complète, lot, tantièmes
- **Objet :** "Convocation à l'Assemblée Générale [type] du [date] à [heure]"
- **Formule d'introduction :** "Madame, Monsieur, nous avons l'honneur de vous convoquer..."
- **Mention mode d'envoi :** "Envoyé par [Recommandé AR / Lettre simple / ...]"
- **Design :** même charte que le reste du PDF (navy + gold, Times/Helvetica)

Le corps de la convocation (résolutions, annexes, etc.) suit à partir de la page 2.

---

## 4. Service de dispatch

### 4.1 Fichier : `src/lib/services/convocation-dispatch.service.ts`

```typescript
interface DispatchParams {
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
  coproId: string;  // copropriété ID (pour GED)
  agDate: string;
}

interface DispatchResult {
  coproprietaireId: string;
  method: SendingMethod;
  status: 'sent' | 'queued' | 'error';
  trackingRef?: string;
  documentId?: string;   // ID du doc GED archivé
  error?: string;
  sentAt: string;
}

async function dispatchConvocation(params: DispatchParams): Promise<DispatchResult>;
```

### 4.2 Comportement par canal

| Canal | Action | Statut | Tracking ref |
|-------|--------|--------|-------------|
| `EMAIL` | Edge Function Supabase (Resend) : email + PDF en PJ | `sent` | `message-id` |
| `AVIS_ELECTRONIQUE` | Stub : log en DB, marqué "à envoyer via AR24" | `queued` | — |
| `RECOMMANDE` | Collecté dans buffer postal pour ZIP | `queued` | — |
| `LETTRE_SIMPLE` | Collecté dans buffer postal pour ZIP | `queued` | — |
| `REMISE_MAIN_PROPRE` | Collecté dans buffer impression pour ZIP | `queued` | — |

### 4.3 Edge Function email

Nouvelle Edge Function `send-convocation-email` :

- **Input :** `{ to: string, subject: string, body: string, pdfBase64: string, fileName: string }`
- **Provider :** Resend (ou SendGrid, configurable via env var)
- **Output :** `{ success: boolean, messageId?: string, error?: string }`
- **Objet email :** "Convocation AG [type] du [date] — [nom copropriété]"
- **Corps :** template HTML simple avec formule de politesse + mention légale

### 4.4 Téléchargement ZIP

Après le pipeline, si des canaux postaux sont utilisés :

```typescript
import JSZip from 'jszip';

// Regroupe les PDFs par canal
const zip = new JSZip();
zip.folder('recommande');
zip.folder('lettre_simple');
zip.folder('remise_main_propre');
// Ajouter chaque PDF dans le bon dossier
// Générer + proposer téléchargement
```

**Dépendance ajoutée :** `jszip` (lightweight, client-side).

---

## 5. Traçabilité DB

### 5.1 Table `ag_envoi_tracking`

```sql
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

-- RLS : accès scopé via copro_id de l'AG
ALTER TABLE ag_envoi_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envoi_tracking_access" ON ag_envoi_tracking
  FOR ALL USING (
    ag_id IN (
      SELECT id FROM ag_meetings
      WHERE copro_id IN (
        SELECT copro_id FROM memberships WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
      )
    )
  );
```

### 5.2 RPCs

```sql
-- Bulk insert après le pipeline
CREATE OR REPLACE FUNCTION save_ag_envoi_tracking(
  p_ag_id UUID,
  p_entries JSONB  -- [{coproprietaireId, method, status, trackingRef?, documentId?, error?, sentAt}]
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ag_envoi_tracking (ag_id, coproprietaire_id, method, status, tracking_ref, document_id, error_message, sent_at)
  SELECT
    p_ag_id,
    (entry->>'coproprietaireId')::UUID,
    entry->>'method',
    entry->>'status',
    entry->>'trackingRef',
    (entry->>'documentId')::UUID,
    entry->>'error',
    (entry->>'sentAt')::TIMESTAMPTZ
  FROM jsonb_array_elements(p_entries) AS entry;
END;
$$ LANGUAGE plpgsql;

-- Lecture pour le récap
CREATE OR REPLACE FUNCTION get_ag_envoi_tracking(p_ag_id UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB)
  FROM ag_envoi_tracking t
  WHERE t.ag_id = p_ag_id;
$$ LANGUAGE sql STABLE;
```

### 5.3 Mise à jour future (prestataire postal)

Quand un prestataire sera branché, il appellera un webhook qui exécutera :

```sql
UPDATE ag_envoi_tracking
SET status = 'delivered', delivered_at = now(), tracking_ref = $tracking
WHERE ag_id = $ag_id AND coproprietaire_id = $copro_id AND method = $method;
```

---

## 6. Archivage GED

Chaque PDF personnalisé est archivé via `autoFileToGED` :

```typescript
autoFileToGED({
  blob,
  fileName: `Convocation_AG_${agDate}_${coproNom.replace(/\s+/g, '_')}.pdf`,
  coproId,
  category: 'convocation',
  sourceModule: 'ag',
  entityId: agId,
  entityType: 'ag_meeting',
  linkType: 'related',
  subFolderName: `Convocations AG ${agDate}`,
  year: new Date().getFullYear(),
});
```

**Structure GED résultante :**
```
Assemblées Générales/
  └── Convocations AG 2026-03-14/
      ├── Convocation_AG_2026-03-14_DUPONT.pdf
      ├── Convocation_AG_2026-03-14_MARTIN.pdf
      └── Convocation_AG_2026-03-14_RICHARD.pdf
```

---

## 7. UX — Modale de progression

### 7.1 State dans `useAgEnvoiPage`

```typescript
interface SendProgress {
  isActive: boolean;
  current: number;
  total: number;
  currentName: string;
  currentStep: 'generating' | 'sending' | 'archiving';
  results: DispatchResult[];
  cancelled: boolean;
}
```

**Note mémoire :** les blobs postaux ne sont PAS stockés dans le state React. Ils sont accumulés dans une variable locale du pipeline (`postalEntries: Array<{blob, fileName, method}>`) et passés à JSZip à la fin. Les blobs non-postaux sont libérés après dispatch+GED.

### 7.2 Annulation

Le pipeline utilise un `AbortController` :

```typescript
const abortRef = useRef<AbortController | null>(null);

// Dans handleSend :
abortRef.current = new AbortController();
for (const copro of coproprietaires) {
  if (abortRef.current.signal.aborted) break;
  // ... generate, dispatch, archive
}
// Après la boucle : bulk insert les résultats (même partiels)

// Bouton Annuler :
const handleCancel = () => abortRef.current?.abort();
```

### 7.3 Composant `SendProgressModal`

Nouveau composant `src/features/ag/components/envoi/SendProgressModal.tsx` :

- Barre de progression `current / total`
- Nom du copropriétaire en cours
- Liste scrollable des résultats (✓ succès, ✗ erreur, ⟳ en cours, ○ en attente)
- Bouton "Annuler" qui déclenche `abortRef.abort()` puis sauvegarde les résultats partiels

### 7.3 Écran de fin

Après le pipeline, la modale affiche un récap :

```
Envoi terminé !

✓ 8 emails envoyés
⬇ 3 courriers recommandés prêts
⬇ 1 lettre simple prête
✓ 12 documents archivés dans la GED

[Télécharger les courriers (ZIP)]   [Continuer →]
```

---

## 8. Fichiers impactés

### Nouveaux fichiers
| Fichier | Rôle |
|---------|------|
| `src/lib/services/convocation-dispatch.service.ts` | Orchestration dispatch par canal |
| `src/features/ag/components/envoi/SendProgressModal.tsx` | Modale progression |
| `src/features/ag/components/envoi/SendProgressModal.module.css` | Styles modale |
| `supabase/migrations/XXXXXXXX_ag_envoi_tracking.sql` | Table + RPCs tracking + RPC bundle |
| `supabase/functions/send-convocation-email/index.ts` | Edge Function email |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/lib/pdf/generateConvocationPDF.ts` | Ajout `destinataire?` + génération page de garde |
| `src/features/ag/hooks/useAgEnvoiPage.ts` | Refacto `handleSend` : pipeline + progression |
| `src/app/(dashboard)/ag/[id]/envoi/page.tsx` | Intégration `SendProgressModal` |
| `package.json` | Ajout `jszip` |

---

## 9. Extensibilité prestataire postal

L'interface `dispatchConvocation` est conçue pour brancher un prestataire sans refacto :

```typescript
// Aujourd'hui (stub)
case 'RECOMMANDE':
  return { status: 'queued', ... };

// Demain (prestataire)
case 'RECOMMANDE':
  const result = await mailevaService.envoyer({
    destinataire: params.copro,
    pdf: params.blob,
    type: 'LRAR',
  });
  return { status: 'sent', trackingRef: result.trackingId, ... };
```

Le webhook prestataire mettra à jour `ag_envoi_tracking.status` → `'delivered'` avec `delivered_at`.

---

## 10. Hors scope (à faire plus tard)

- Intégration réelle AR24/Maileva pour `AVIS_ELECTRONIQUE`
- Webhook prestataire postal pour mise à jour statut delivery
- Relance automatique en cas d'erreur email
- Template email HTML riche (pour l'instant : template simple)
- Signature électronique des accusés de réception

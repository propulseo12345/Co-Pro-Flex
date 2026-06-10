# Atlas Front — Zone 05 : Documents (GED) & Communication

> Périmètre : `src/app/(dashboard)/documents/**` (volet GED uniquement) + `src/app/(dashboard)/communication/**` (mail, messagerie, mur).
> Les sous-pages `documents/{ledger,balance,expenses,annexes,closing}` sont **comptables/finance** → hors zone (couvertes par l'atlas finance).
> Croisé avec `db-cible/OBJETS-ABANDONNES.md` et `db-cible/INVENTAIRE-FONCTIONS.md`. Objets live vérifiés sur `iyfesbjnkpynmwlsmxnp` (lecture seule).

## Tableau des écrans

| Écran | Rôle métier | Hooks | Données touchées (RPC / table / edge / api) | Statut |
|---|---|---|---|---|
| `documents/page.tsx` | Hub Documents : 5 cartes de navigation (GED + 4 vues compta) | — (statique) | aucune (liens `next/link`) | **actif** (routeur) |
| `documents/ged/page.tsx` | GED complète : arbo dossiers N-niveaux, upload, preview, favoris, liaison, droits d'accès | `useGedPageSupabase`, `useDocumentSearch`, `useDocumentPermissions`, `useCopro` | tables `documents`, `document_folders`, `document_links` ; vues `v_documents_with_folder`, `v_folders_with_counts`, `v_documents_stats` ; Storage bucket `ged` (`uploadDocument`/`getDocumentUrl`/`downloadDocument`) | **actif** (à problème — voir anomalies) |
| `communication/page.tsx` | Hub Communication : 3 KPI + 3 cartes (mail/messagerie/mur) | `useCommunicationKpis` (inline, dans la page) | tables `mails`, `conversations`, `wall_posts` (counts directs `.from()`) | **actif** |
| `communication/mail/page.tsx` | Boîte mail interne (Resend) : dossiers, liste, lecteur, composition | `useMailbox` | table `mails` (CRUD + realtime INSERT) ; route API `POST /api/mail/send` (→ Resend + insert `mails`) ; webhook `POST /api/mail/inbound` | **actif** (à problème) |
| `communication/messagerie/page.tsx` | Messagerie interne (conversations/messages) façon chat | `useMessagerie` | tables `conversations`, `conversation_members`, `messages` (CRUD + realtime) | **actif** (à problème) |
| `communication/mur/page.tsx` | Mur communautaire : posts, catégories, épingles, likes, commentaires | `useMur` | tables `wall_posts`, `wall_likes`, `wall_comments` (CRUD + optimistic) | **actif** |

### Composants features clés
- GED : `components/features/documents/ged/**` (Toolbar, FolderGrid, DocumentList/Grid, UploadDocumentModal, LinkModal, Checklist, AdvancedFilters…), `DocumentViewerModal`, `AccessRightsManager`, `AccessBadge`. Couche données = `lib/documents/api.ts`.
- Communication : `features/communication/{mail,messagerie,mur}/components/**` (MailSidebar/List/Reader/ComposeModal, ConversationList/ChatPanel, MurSidebar/PostFeed/PostEditor/PostComments). Données directement dans les hooks (pas de `*.api.ts` dédié, requêtes Supabase inline via client untyped).

## Chaîne page → données (résumé)
- **GED** : `page → useGedPageSupabase → lib/documents/api.ts → vues v_* + tables documents/document_folders/document_links + Storage`. Tri/recherche/pagination 100 % client. `is_starred` persiste via `updateDocument` (colonne live confirmée).
- **Mail** : `page → useMailbox → table mails` (lecture/maj) + `fetch('/api/mail/send')` (route serveur Resend). Inbound = webhook Resend → `mails`.
- **Messagerie** : `page → useMessagerie → conversations/conversation_members/messages`. Aucune RPC : compteurs `unread_count`/`last_message_preview` maintenus côté front par `UPDATE` direct.
- **Mur** : `page → useMur → wall_posts/wall_likes/wall_comments`. Compteurs `likes_count`/`comments_count` incrémentés à la main (pas de trigger côté hook).

## Anomalies de la zone

1. **`document_access` = objet ABANDONNÉ (A4, DROP séquencé)** mais encore branché.
   `AccessRightsManager` (4 niveaux : Public/CS/Syndic/Confidentiel + ACL utilisateurs) et `lib/documents/api.ts` (`grantDocumentAccess`/`revokeDocumentAccess`) ciblent `document_access`, que la DB-cible supprime au profit d'une **confidentialité GED simple à 3 niveaux** (`OBJETS-ABANDONNES.md` l.105/126/134). → **à problème / drift** : refonte UI confidentialité + réécriture `user_can_view_document` à prévoir.

2. **`useDocumentPermissions` = mock en mémoire, ne persiste rien.**
   `accessConfigsStore` / `accessLogsStore` sont des objets JS in-process. Les onglets « Utilisateurs autorisés » et « Historique » de `AccessRightsManager`, ainsi que `logAccessAction`, sont **fictifs** (perdus au refresh). `filterAccessibleDocuments` filtre donc sur un store vide → en pratique no-op. Seul le rôle (admin/syndic) est réel. → **à problème** (sécurité apparente sans backing).

3. **Identité hardcodée partout (auth absente).**
   `DEFAULT_OWNER_ID` / `CURRENT_USER_ID` = `f76855bb-…be9fb` figé dans `useMailbox`, `useMessagerie`, `useMur`, `/api/mail/send`, hub communication. Tous les mails/messages/posts sont attribués au même « syndic » quelle que soit la session. → **à problème** (à rebrancher sur `auth.uid()`).

4. **Webhook inbound pointe une copro en dur immuable.**
   `/api/mail/inbound` insère avec `DEFAULT_COPRO_ID = '11111111-…'` — la copro **gelée pour immutabilité GL** (cf. mémoire boucle d'or). Tout mail entrant atterrit dans une copro qui ne doit plus muter ; aucune résolution copro par adresse destinataire. → **à problème**.

5. **Pas de RPC : logique métier dupliquée côté client.**
   Mur et messagerie maintiennent `likes_count`, `comments_count`, `unread_count`, `last_message_preview` par `UPDATE` manuels successifs (non atomiques, dérive possible vs réalité). Idéalement triggers/RPC. → drift léger, risque de compteurs faux.

6. **Doublon de lecture KPI dans le hub communication.**
   `useCommunicationKpis` (défini *inline* dans `communication/page.tsx`) refait ses propres `.from('mails'/'conversations'/'wall_posts')` au lieu de réutiliser les hooks de feature → 3e source de vérité pour « non lus / actives / récents ». Pas un écran mort mais logique dupliquée à factoriser.

7. **Pas de doublon d'écran ni d'écran mort** dans la zone : chaque page est routée et montée. Aucune route `messagerie/` ou `mur/` hors `(dashboard)/communication/`. `documents/page.tsx` mélange GED + 4 liens compta (frontière de zone, pas une anomalie).

8. **Faux-mort assumé** : `mails`, `conversations`, `messages`, `wall_*` sont à **0 ligne** en base mais correctement câblés et GARDÉS (`OBJETS-ABANDONNES.md` l.109). Vues GED `v_documents_with_folder` / `v_folders_with_counts` / `v_documents_stats` + tables `documents`/`document_folders`/`document_links` confirmées présentes live.

-- ============================================================================
-- NIVEAU 5B: TESTS ET EXEMPLES
-- Tests pour les relances d'impayes automatisees
-- ============================================================================

-- ============================================================================
-- 1. VERIFICATION DES TABLES
-- ============================================================================

-- Verifier que les tables sont creees
SELECT 'payment_reminder_rules' AS table_name, COUNT(*) AS count FROM payment_reminder_rules
UNION ALL
SELECT 'payment_reminders', COUNT(*) FROM payment_reminders
UNION ALL
SELECT 'email_templates (payment_reminder)', COUNT(*) FROM email_templates WHERE code LIKE 'payment_reminder_%';

-- Verifier les templates de relance
SELECT code, name, category FROM email_templates WHERE category = 'payment_reminder' ORDER BY code;

-- ============================================================================
-- 2. VERIFICATION DES VUES
-- ============================================================================

-- Vue des impayes avec relances
SELECT
  lot_ref,
  owner_name,
  total_unpaid,
  days_overdue,
  last_reminder_level,
  last_reminder_status,
  total_reminders_sent
FROM v_unpaid_with_reminders
ORDER BY total_unpaid DESC
LIMIT 10;

-- Vue des relances
SELECT
  lot_ref,
  owner_name,
  unpaid_amount,
  delay_level,
  status,
  sent_at
FROM v_payment_reminders_overview
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. TESTS DES FONCTIONS
-- ============================================================================

-- Test: Obtenir les relances a envoyer
-- (Remplacer 'VOTRE_COPRO_ID' par un vrai UUID)
/*
SELECT * FROM get_pending_reminders_to_send('VOTRE_COPRO_ID');
*/

-- Test: Annuler les relances obsoletes
/*
SELECT cancel_stale_reminders('VOTRE_COPRO_ID');
*/

-- ============================================================================
-- 4. EXEMPLES CURL POUR LES EDGE FUNCTIONS
-- ============================================================================

/*
# Variables d'environnement a definir:
export SUPABASE_URL="https://votre-projet.supabase.co"
export SUPABASE_ANON_KEY="votre-anon-key"
export AUTH_TOKEN="Bearer votre-jwt-token"  # Obtenu apres connexion

# ============================================================================
# Edge Function: run_payment_reminders
# Execute les relances automatiques pour une copropriete
# ============================================================================

curl -X POST "${SUPABASE_URL}/functions/v1/run_payment_reminders" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "copro_id": "uuid-de-la-copropriete"
  }'

# Reponse attendue:
# {
#   "success": true,
#   "copro_id": "uuid-de-la-copropriete",
#   "summary": {
#     "processed": 5,
#     "sent": 3,
#     "failed": 0,
#     "skipped": 2,
#     "stale_cancelled": 1
#   },
#   "details": [
#     {
#       "lot_id": "uuid-du-lot",
#       "lot_ref": "A001",
#       "owner_email": "proprietaire@example.com",
#       "delay_level": 7,
#       "status": "sent",
#       "reminder_id": "uuid-de-la-relance"
#     }
#   ]
# }

# ============================================================================
# Edge Function: send_manual_payment_reminder
# Envoie une relance manuelle pour un lot specifique
# ============================================================================

curl -X POST "${SUPABASE_URL}/functions/v1/send_manual_payment_reminder" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "copro_id": "uuid-de-la-copropriete",
    "lot_id": "uuid-du-lot"
  }'

# Avec niveau de delai specifique:
curl -X POST "${SUPABASE_URL}/functions/v1/send_manual_payment_reminder" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "copro_id": "uuid-de-la-copropriete",
    "lot_id": "uuid-du-lot",
    "delay_level": 30
  }'

# Avec message personnalise:
curl -X POST "${SUPABASE_URL}/functions/v1/send_manual_payment_reminder" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "copro_id": "uuid-de-la-copropriete",
    "lot_id": "uuid-du-lot",
    "custom_message": "Nous restons a votre disposition pour toute question."
  }'

# Reponse attendue:
# {
#   "success": true,
#   "reminder_id": "uuid-de-la-relance",
#   "recipient_email": "proprietaire@example.com",
#   "delay_level": 30
# }

*/

-- ============================================================================
-- 5. CONFIGURATION CRON (pg_cron)
-- ============================================================================

/*
-- Pour executer les relances automatiquement chaque jour a 9h00:

-- 1. Activer l'extension pg_cron (dans le dashboard Supabase)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Creer le job CRON
SELECT cron.schedule(
  'daily-payment-reminders',
  '0 9 * * *',  -- Chaque jour a 9h00
  $$
    SELECT net.http_post(
      url := 'https://votre-projet.supabase.co/functions/v1/run_payment_reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer votre-service-role-key'
      ),
      body := jsonb_build_object('copro_id', 'uuid-de-la-copropriete')
    );
  $$
);

-- Pour plusieurs coproprietes, creer un job par copropriete ou boucler

-- Verifier les jobs planifies:
SELECT * FROM cron.job;

-- Supprimer un job:
SELECT cron.unschedule('daily-payment-reminders');
*/

-- ============================================================================
-- 6. REQUETES UTILES
-- ============================================================================

-- Nombre de relances par statut ce mois-ci
SELECT status, COUNT(*) AS count
FROM payment_reminders
WHERE created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY status;

-- Lots avec le plus de relances
SELECT
  lot_ref,
  owner_name,
  COUNT(*) AS total_relances,
  MAX(delay_level) AS dernier_niveau
FROM v_payment_reminders_overview
GROUP BY lot_ref, owner_name
HAVING COUNT(*) > 1
ORDER BY total_relances DESC;

-- Efficacite des relances (lots qui ont paye apres relance)
SELECT
  delay_level,
  COUNT(*) AS relances_envoyees,
  COUNT(*) FILTER (WHERE status = 'stale') AS payes_apres_relance,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'stale') / NULLIF(COUNT(*), 0), 1) AS taux_recouvrement
FROM payment_reminders
WHERE status IN ('sent', 'stale')
GROUP BY delay_level
ORDER BY delay_level;

-- ============================================================================
-- 7. NETTOYAGE (pour les tests)
-- ============================================================================

/*
-- Supprimer toutes les relances de test
DELETE FROM payment_reminders WHERE created_at > now() - interval '1 day';

-- Reinitialiser les compteurs de sequence si necessaire
-- (pas de sequences utilisees, les IDs sont des UUIDs)
*/

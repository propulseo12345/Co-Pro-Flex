-- ============================================================================
-- NIVEAU 5B: SEED DATA - Regles de relance par defaut
-- Configuration initiale des relances automatiques
-- ============================================================================

-- Insertion des regles de relance par defaut pour chaque copropriete existante
-- (A executer une seule fois apres la migration principale)

DO $$
DECLARE
  v_copro_id UUID;
  v_template_7 UUID;
  v_template_30 UUID;
  v_template_60 UUID;
BEGIN
  -- Recuperer les IDs des templates
  SELECT id INTO v_template_7 FROM email_templates WHERE code = 'payment_reminder_7' LIMIT 1;
  SELECT id INTO v_template_30 FROM email_templates WHERE code = 'payment_reminder_30' LIMIT 1;
  SELECT id INTO v_template_60 FROM email_templates WHERE code = 'payment_reminder_60' LIMIT 1;

  -- Pour chaque copropriete, creer les regles par defaut
  FOR v_copro_id IN SELECT id FROM copros
  LOOP
    -- Regle J+7 : 1ere relance amiable
    INSERT INTO payment_reminder_rules (copro_id, delay_days, channel, template_id, label, is_active)
    VALUES (v_copro_id, 7, 'email', v_template_7, '1ere relance amiable (J+7)', true)
    ON CONFLICT (copro_id, delay_days) DO NOTHING;

    -- Regle J+30 : 2eme relance
    INSERT INTO payment_reminder_rules (copro_id, delay_days, channel, template_id, label, is_active)
    VALUES (v_copro_id, 30, 'email', v_template_30, '2eme relance (J+30)', true)
    ON CONFLICT (copro_id, delay_days) DO NOTHING;

    -- Regle J+60 : Dernier rappel
    INSERT INTO payment_reminder_rules (copro_id, delay_days, channel, template_id, label, is_active)
    VALUES (v_copro_id, 60, 'email', v_template_60, 'Dernier rappel avant conseil syndical (J+60)', true)
    ON CONFLICT (copro_id, delay_days) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Regles de relance par defaut creees pour toutes les coproprietes';
END;
$$;

-- ============================================================================
-- FONCTION: Creer les regles pour une nouvelle copropriete
-- (Appelee automatiquement lors de la creation d'une copropriete)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_reminder_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_7 UUID;
  v_template_30 UUID;
  v_template_60 UUID;
BEGIN
  -- Recuperer les IDs des templates
  SELECT id INTO v_template_7 FROM email_templates WHERE code = 'payment_reminder_7' LIMIT 1;
  SELECT id INTO v_template_30 FROM email_templates WHERE code = 'payment_reminder_30' LIMIT 1;
  SELECT id INTO v_template_60 FROM email_templates WHERE code = 'payment_reminder_60' LIMIT 1;

  -- Creer les regles par defaut
  INSERT INTO payment_reminder_rules (copro_id, delay_days, channel, template_id, label, is_active)
  VALUES
    (NEW.id, 7, 'email', v_template_7, '1ere relance amiable (J+7)', true),
    (NEW.id, 30, 'email', v_template_30, '2eme relance (J+30)', true),
    (NEW.id, 60, 'email', v_template_60, 'Dernier rappel avant conseil syndical (J+60)', true)
  ON CONFLICT (copro_id, delay_days) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger pour creer automatiquement les regles lors de la creation d'une copropriete
DROP TRIGGER IF EXISTS tr_create_default_reminder_rules ON copros;
CREATE TRIGGER tr_create_default_reminder_rules
  AFTER INSERT ON copros
  FOR EACH ROW
  EXECUTE FUNCTION create_default_reminder_rules();

-- ============================================================================
-- DONNEES DE TEST (commenter en production)
-- ============================================================================

-- Pour tester, vous pouvez creer des relances manuellement :
/*
-- Exemple: Creer une relance de test
INSERT INTO payment_reminders (
  copro_id,
  lot_id,
  owner_id,
  unpaid_amount,
  oldest_due_date,
  days_overdue,
  delay_level,
  status,
  recipient_email,
  recipient_name
)
SELECT
  u.copro_id,
  u.lot_id,
  l.owner_id,
  u.total_unpaid,
  u.oldest_due_date,
  u.days_overdue,
  7,
  'sent',
  u.owner_email,
  u.owner_name
FROM v_unpaid_by_lot u
JOIN lots l ON l.id = u.lot_id
WHERE u.days_overdue > 7
LIMIT 3;
*/

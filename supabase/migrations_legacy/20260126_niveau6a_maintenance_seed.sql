-- ============================================================================
-- NIVEAU 6A : MAINTENANCE - Seed Data
-- CoProFlex - Données de test maintenance
-- Date: 2026-01-26
-- ============================================================================

-- Utiliser la copro de test existante
DO $$
DECLARE
  v_copro_id UUID;
  v_building_id UUID;
  v_period_id UUID;
  v_provider_plomberie UUID;
  v_provider_electricite UUID;
  v_provider_ascenseur UUID;
  v_provider_nettoyage UUID;
  v_provider_espaces_verts UUID;
  v_provider_assurance UUID;
  v_provider_coproflex_chauffage UUID;
  v_contract_ascenseur UUID;
  v_contract_nettoyage UUID;
  v_contract_assurance UUID;
  v_order_1 UUID;
  v_order_2 UUID;
  v_order_3 UUID;
BEGIN
  -- Récupérer la copro de test
  SELECT id INTO v_copro_id FROM copros WHERE name LIKE '%Résidence%' LIMIT 1;
  IF v_copro_id IS NULL THEN
    SELECT id INTO v_copro_id FROM copros LIMIT 1;
  END IF;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'No copro found, skipping seed';
    RETURN;
  END IF;

  -- Récupérer un bâtiment
  SELECT id INTO v_building_id FROM buildings WHERE copro_id = v_copro_id LIMIT 1;

  -- Récupérer une période comptable
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id AND is_current = true LIMIT 1;

  RAISE NOTICE 'Seeding maintenance data for copro_id: %', v_copro_id;

  -- ============================================================================
  -- PRESTATAIRES - Catégorie SYNDIC (prestataires de confiance)
  -- ============================================================================

  INSERT INTO providers (copro_id, name, category, domains, contact_name, contact_role, email, phone, phone_emergency, address, postal_code, city, siret, rating_avg, rating_count, internal_notes, is_active)
  VALUES
    (v_copro_id, 'PlombElite Services', 'syndic', ARRAY['plomberie']::provider_domain[], 'Marc Durand', 'Gérant', 'contact@plombelite.fr', '04 78 12 34 56', '06 12 34 56 78', '45 rue des Artisans', '69003', 'Lyon', '12345678901234', 4.5, 23, 'Prestataire de confiance depuis 2015. Intervention rapide.', true)
  RETURNING id INTO v_provider_plomberie;

  INSERT INTO providers (copro_id, name, category, domains, contact_name, contact_role, email, phone, phone_emergency, address, postal_code, city, siret, rating_avg, rating_count, internal_notes, is_active)
  VALUES
    (v_copro_id, 'ElecPro Lyon', 'syndic', ARRAY['electricite']::provider_domain[], 'Sophie Martin', 'Responsable technique', 'technique@elecpro-lyon.fr', '04 78 23 45 67', '06 23 45 67 89', '78 avenue Berthelot', '69007', 'Lyon', '23456789012345', 4.8, 45, 'Spécialiste copropriété. Certifié Qualifelec.', true)
  RETURNING id INTO v_provider_electricite;

  INSERT INTO providers (copro_id, name, category, domains, contact_name, contact_role, email, phone, address, postal_code, city, siret, rating_avg, rating_count, certifications, is_active)
  VALUES
    (v_copro_id, 'Schindler Ascenseurs', 'syndic', ARRAY['ascenseur']::provider_domain[], 'Jean Lefebvre', 'Chargé de compte', 'lyon@schindler.com', '04 78 34 56 78', '15 rue Garibaldi', '69006', 'Lyon', '34567890123456', 4.2, 67, ARRAY['ISO 9001', 'Qualibat'], true)
  RETURNING id INTO v_provider_ascenseur;

  INSERT INTO providers (copro_id, name, category, domains, contact_name, email, phone, address, postal_code, city, rating_avg, rating_count, is_active)
  VALUES
    (v_copro_id, 'NettoyePro Services', 'syndic', ARRAY['menage']::provider_domain[], 'Isabelle Petit', 'contact@nettoyepro.fr', '04 78 45 67 89', '23 rue de la République', '69002', 'Lyon', 4.6, 34, true)
  RETURNING id INTO v_provider_nettoyage;

  INSERT INTO providers (copro_id, name, category, domains, contact_name, email, phone, address, postal_code, city, is_active)
  VALUES
    (v_copro_id, 'Jardins & Espaces', 'syndic', ARRAY['espaces_verts']::provider_domain[], 'Pierre Duval', 'contact@jardins-espaces.fr', '04 78 56 78 90', '12 chemin des Platanes', '69008', 'Lyon', true)
  RETURNING id INTO v_provider_espaces_verts;

  -- ============================================================================
  -- PRESTATAIRES - Catégorie COPROPRIETE
  -- ============================================================================

  INSERT INTO providers (copro_id, name, category, domains, contact_name, email, phone, address, postal_code, city, siret, is_active)
  VALUES
    (v_copro_id, 'Assurances Habitat Plus', 'copropriete', ARRAY['assurance']::provider_domain[], 'Claire Renaud', 'claire.renaud@habitatplus.fr', '04 78 67 89 01', '5 place Bellecour', '69002', 'Lyon', '45678901234567', true)
  RETURNING id INTO v_provider_assurance;

  -- ============================================================================
  -- PRESTATAIRES - Catégorie COPROFLEX (marketplace)
  -- ============================================================================

  INSERT INTO providers (copro_id, name, category, domains, contact_name, email, phone, city, rating_avg, rating_count, coproflex_label, intervention_radius_km, indicative_rate, description, availability, avg_response_time, year_founded, employees_count, certifications, is_active)
  VALUES
    (v_copro_id, 'ChauffagePro Rhône', 'coproflex', ARRAY['chauffage', 'climatisation']::provider_domain[], 'François Lambert', 'contact@chauffagepro-rhone.fr', '04 78 78 90 12', 'Lyon', 4.7, 156, true, 50, '65€/h', 'Spécialiste chauffage collectif et climatisation. Intervention 24h/24 en urgence.', 'Lun-Ven 8h-18h, Urgences 24/7', '< 4h en urgence', 2010, 25, ARRAY['RGE', 'Qualibat', 'QualiPAC'], true)
  RETURNING id INTO v_provider_coproflex_chauffage;

  INSERT INTO providers (copro_id, name, category, domains, email, phone, city, rating_avg, rating_count, coproflex_label, intervention_radius_km, indicative_rate, description, is_active)
  VALUES
    (v_copro_id, 'ToiturExpert 69', 'coproflex', ARRAY['toiture']::provider_domain[], 'devis@toiturexpert69.fr', '04 78 89 01 23', 'Villeurbanne', 4.4, 89, false, 30, 'Sur devis', 'Rénovation et réparation de toitures. Expertise étanchéité.', true);

  -- ============================================================================
  -- CONTRATS MAINTENANCE
  -- ============================================================================

  -- Contrat ascenseur (réglementaire)
  INSERT INTO contracts (copro_id, provider_id, contract_number, contract_type, title, description, start_date, end_date, renewal_date, tacit_renewal, notice_months, annual_amount, billing_frequency, planned_frequency, auto_generate_orders, is_regulatory, status)
  VALUES
    (v_copro_id, v_provider_ascenseur, 'CTR-2024-001', 'ascenseur', 'Contrat maintenance ascenseur', 'Maintenance préventive et curative des 2 ascenseurs de la résidence. Visites mensuelles, astreinte 24h/24.', '2024-01-01', '2026-12-31', '2026-06-30', true, 6, 4800.00, 'quarterly', 'monthly', true, true, 'active')
  RETURNING id INTO v_contract_ascenseur;

  -- Contrat nettoyage
  INSERT INTO contracts (copro_id, provider_id, contract_number, contract_type, title, description, start_date, end_date, tacit_renewal, notice_months, annual_amount, billing_frequency, planned_frequency, status)
  VALUES
    (v_copro_id, v_provider_nettoyage, 'CTR-2024-002', 'nettoyage', 'Contrat nettoyage parties communes', 'Nettoyage bi-hebdomadaire des parties communes (halls, escaliers, caves, parkings).', '2024-03-01', '2027-02-28', true, 3, 7200.00, 'monthly', 'bimonthly', 'active')
  RETURNING id INTO v_contract_nettoyage;

  -- Contrat assurance (à renouveler bientôt)
  INSERT INTO contracts (copro_id, provider_id, contract_number, contract_type, title, description, start_date, end_date, tacit_renewal, notice_months, annual_amount, billing_frequency, is_regulatory, status)
  VALUES
    (v_copro_id, v_provider_assurance, 'CTR-2023-005', 'assurance', 'Assurance Multirisque Immeuble', 'Assurance MRI couvrant incendie, dégâts des eaux, responsabilité civile, vol, vandalisme.', '2023-07-01', '2026-06-30', false, 3, 8500.00, 'annual', true, 'to_renew')
  RETURNING id INTO v_contract_assurance;

  -- ============================================================================
  -- ORDRES DE SERVICE
  -- ============================================================================

  -- OS 1: Brouillon - Intervention plomberie
  INSERT INTO service_orders (copro_id, building_id, order_number, provider_id, order_type, origin, subject, description, urgency, estimated_amount, status)
  VALUES
    (v_copro_id, v_building_id, generate_service_order_number(v_copro_id), v_provider_plomberie, 'classique', 'syndic', 'Réparation fuite colonne EU - Bât A', 'Fuite détectée sur la colonne d''eaux usées au niveau du 3ème étage. Intervention nécessaire pour inspection et réparation.', 'high', 850.00, 'draft')
  RETURNING id INTO v_order_1;

  -- OS 2: Envoyé - Contractuel ascenseur
  INSERT INTO service_orders (copro_id, building_id, order_number, provider_id, order_type, origin, contract_id, subject, description, urgency, planned_intervention_date, status, sent_at)
  VALUES
    (v_copro_id, v_building_id, generate_service_order_number(v_copro_id), v_provider_ascenseur, 'contractuel', 'contrat', v_contract_ascenseur, 'Visite entretien mensuel - Janvier 2026', 'Visite d''entretien mensuel prévue dans le cadre du contrat de maintenance.', 'normal', '2026-01-28', 'sent', NOW() - INTERVAL '3 days')
  RETURNING id INTO v_order_2;

  -- OS 3: Clôturé - Intervention électricité urgente
  INSERT INTO service_orders (copro_id, building_id, order_number, provider_id, order_type, origin, subject, description, urgency, is_art18_emergency, estimated_amount, quoted_amount, actual_amount, status, created_at, sent_at, accepted_at, scheduled_at, started_at, completed_at, closed_at)
  VALUES
    (v_copro_id, v_building_id, 'OS-2026-0001', v_provider_electricite, 'classique', 'urgence', 'Panne tableau électrique général', 'Coupure électrique affectant tout le bâtiment A. Intervention urgente requise.', 'critical', true, 500.00, 650.00, 720.00, 'closed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days')
  RETURNING id INTO v_order_3;

  -- Événements audit pour OS 3
  INSERT INTO service_order_events (copro_id, service_order_id, event_type, from_status, to_status, comment, created_at)
  VALUES
    (v_copro_id, v_order_3, 'created', NULL, 'draft', 'Création ordre de service - Urgence signalée par gardien', NOW() - INTERVAL '15 days'),
    (v_copro_id, v_order_3, 'status_changed', 'draft', 'sent', 'Envoi immédiat au prestataire - Urgence Art. 18', NOW() - INTERVAL '15 days'),
    (v_copro_id, v_order_3, 'status_changed', 'sent', 'accepted', 'Acceptation par ElecPro Lyon', NOW() - INTERVAL '15 days'),
    (v_copro_id, v_order_3, 'status_changed', 'accepted', 'scheduled', 'Intervention programmée pour le jour même', NOW() - INTERVAL '14 days'),
    (v_copro_id, v_order_3, 'status_changed', 'scheduled', 'in_progress', 'Technicien sur site', NOW() - INTERVAL '14 days'),
    (v_copro_id, v_order_3, 'status_changed', 'in_progress', 'completed', 'Réparation effectuée - Remplacement disjoncteur principal', NOW() - INTERVAL '14 days'),
    (v_copro_id, v_order_3, 'status_changed', 'completed', 'closed', 'Clôture après vérification CS', NOW() - INTERVAL '10 days');

  -- ============================================================================
  -- CARNET D'ENTRETIEN (LOGBOOK)
  -- ============================================================================

  -- Entrée pour intervention électrique terminée
  INSERT INTO logbook_entries (copro_id, building_id, entry_type, category, title, description, provider_id, service_order_id, domain, happened_at, completed_at, cost, status)
  VALUES
    (v_copro_id, v_building_id, 'incident', 'travaux_importants', 'Réparation tableau électrique général', 'Remplacement du disjoncteur principal suite à panne. Intervention urgente Art. 18.', v_provider_electricite, v_order_3, 'electricite', CURRENT_DATE - 14, CURRENT_DATE - 14, 720.00, 'terminee');

  -- Entrées contrôles réglementaires
  INSERT INTO logbook_entries (copro_id, building_id, entry_type, category, title, description, provider_id, contract_id, domain, happened_at, completed_at, next_due_at, status)
  VALUES
    (v_copro_id, v_building_id, 'controle', 'courante', 'Visite maintenance ascenseur - Décembre 2025', 'Visite mensuelle de maintenance préventive. RAS.', v_provider_ascenseur, v_contract_ascenseur, 'ascenseur', '2025-12-15', '2025-12-15', '2026-01-15', 'terminee'),
    (v_copro_id, v_building_id, 'controle', 'courante', 'Visite maintenance ascenseur - Janvier 2026', 'Visite mensuelle de maintenance préventive prévue.', v_provider_ascenseur, v_contract_ascenseur, 'ascenseur', '2026-01-28', NULL, '2026-02-28', 'planifiee');

  -- Entrées entretien courant
  INSERT INTO logbook_entries (copro_id, building_id, entry_type, category, title, description, provider_id, domain, happened_at, completed_at, cost, status)
  VALUES
    (v_copro_id, v_building_id, 'entretien', 'courante', 'Débouchage colonne EU - Bât B', 'Débouchage préventif suite à signalement ralentissement évacuation.', v_provider_plomberie, 'plomberie', CURRENT_DATE - 45, CURRENT_DATE - 45, 180.00, 'terminee'),
    (v_copro_id, v_building_id, 'entretien', 'courante', 'Taille haies et arbustes', 'Taille d''automne des espaces verts.', v_provider_espaces_verts, 'espaces_verts', '2025-11-10', '2025-11-10', 350.00, 'terminee');

  -- Diagnostic à venir
  INSERT INTO logbook_entries (copro_id, building_id, entry_type, category, title, description, domain, next_due_at, status)
  VALUES
    (v_copro_id, v_building_id, 'diagnostic', 'courante', 'DPE collectif - Renouvellement', 'Diagnostic de Performance Énergétique à renouveler.', 'autre', '2026-06-30', 'planifiee');

  RAISE NOTICE 'Maintenance seed completed successfully';

END $$;

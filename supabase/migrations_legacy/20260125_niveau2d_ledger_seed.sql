-- ============================================
-- Seed Data: NIVEAU 2D - LEDGER
-- Date: 2026-01-25
-- Description: Données de test pour le ledger comptable
-- IMPORTANT: À exécuter APRÈS la migration principale et APRÈS avoir des copros/lots/accounts
-- ============================================

-- ============================================
-- ÉTAPE 1: Seed des comptes comptables (si pas déjà présents)
-- ============================================

DO $$
DECLARE
  v_copro RECORD;
  v_account_count INT;
BEGIN
  FOR v_copro IN SELECT id, name FROM copros LOOP
    -- Vérifier si des comptes existent déjà
    SELECT COUNT(*) INTO v_account_count FROM accounts WHERE copro_id = v_copro.id;

    IF v_account_count = 0 THEN
      RAISE NOTICE 'Creating accounts for copro: %', v_copro.name;

      -- Classe 1: Capitaux
      INSERT INTO accounts (copro_id, code, name, account_type, is_system) VALUES
        (v_copro.id, '102', 'Avances de trésorerie', 'equity', true),
        (v_copro.id, '103', 'Provisions pour travaux futurs', 'equity', true),
        (v_copro.id, '105', 'Fonds de travaux (ALUR)', 'equity', true);

      -- Classe 4: Tiers
      INSERT INTO accounts (copro_id, code, name, account_type, is_system) VALUES
        (v_copro.id, '401', 'Fournisseurs', 'liability', true),
        (v_copro.id, '410', 'Fournisseurs - Factures non parvenues', 'liability', true),
        (v_copro.id, '450', 'Copropriétaires - Charges courantes', 'asset', true),
        (v_copro.id, '459', 'Copropriétaires - Fonds travaux', 'asset', true),
        (v_copro.id, '461', 'Débiteurs divers', 'asset', true),
        (v_copro.id, '467', 'Créditeurs divers', 'liability', true);

      -- Classe 5: Financier
      INSERT INTO accounts (copro_id, code, name, account_type, is_system) VALUES
        (v_copro.id, '512', 'Banque - Compte courant', 'asset', true),
        (v_copro.id, '514', 'Banque - Compte épargne travaux', 'asset', true),
        (v_copro.id, '531', 'Caisse', 'asset', true);

      -- Classe 6: Charges
      INSERT INTO accounts (copro_id, code, name, account_type, is_system) VALUES
        (v_copro.id, '601', 'Achats de fournitures', 'expense', true),
        (v_copro.id, '606', 'Achats non stockés', 'expense', true),
        (v_copro.id, '611', 'Sous-traitance générale', 'expense', true),
        (v_copro.id, '614', 'Charges locatives récupérables', 'expense', true),
        (v_copro.id, '615', 'Entretien et réparations', 'expense', true),
        (v_copro.id, '616', 'Primes d''assurances', 'expense', true),
        (v_copro.id, '621', 'Personnel intérimaire', 'expense', true),
        (v_copro.id, '622', 'Honoraires syndic', 'expense', true),
        (v_copro.id, '623', 'Honoraires divers', 'expense', true),
        (v_copro.id, '627', 'Services bancaires', 'expense', true),
        (v_copro.id, '628', 'Frais divers de gestion', 'expense', true),
        (v_copro.id, '641', 'Rémunérations du personnel', 'expense', true),
        (v_copro.id, '645', 'Charges sociales', 'expense', true);

      -- Classe 7: Produits
      INSERT INTO accounts (copro_id, code, name, account_type, is_system) VALUES
        (v_copro.id, '701', 'Produits sur charges courantes', 'revenue', true),
        (v_copro.id, '702', 'Produits sur travaux', 'revenue', true),
        (v_copro.id, '703', 'Produits sur fonds ALUR', 'revenue', true),
        (v_copro.id, '708', 'Produits accessoires', 'revenue', true),
        (v_copro.id, '764', 'Revenus valeurs mobilières', 'revenue', true),
        (v_copro.id, '768', 'Autres produits financiers', 'revenue', true),
        (v_copro.id, '771', 'Produits exceptionnels', 'revenue', true);

      RAISE NOTICE '  Created % accounts for copro %', 36, v_copro.name;
    ELSE
      RAISE NOTICE 'Copro % already has % accounts, skipping', v_copro.name, v_account_count;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- ÉTAPE 2: Seed des transactions du ledger
-- ============================================

DO $$
DECLARE
  v_copro RECORD;
  v_period RECORD;
  v_lot RECORD;
  v_account_banque UUID;
  v_account_fournisseurs UUID;
  v_account_copros UUID;
  v_account_produits_charges UUID;
  v_account_charges_entretien UUID;
  v_account_fonds_alur UUID;
  v_tx_id UUID;
  v_lot_count INT := 0;
  v_tx_date DATE;
BEGIN
  -- Parcourir chaque copropriété
  FOR v_copro IN SELECT id, name FROM copros LOOP
    RAISE NOTICE 'Processing copro: % (%)', v_copro.name, v_copro.id;

    -- Trouver une période ouverte pour cette copro
    SELECT id INTO v_period
    FROM accounting_periods
    WHERE copro_id = v_copro.id AND status = 'open'
    LIMIT 1;

    IF v_period.id IS NULL THEN
      RAISE NOTICE '  No open period found for copro %, skipping', v_copro.name;
      CONTINUE;
    END IF;

    -- Récupérer les comptes nécessaires
    SELECT id INTO v_account_banque FROM accounts WHERE copro_id = v_copro.id AND code = '512' LIMIT 1;
    SELECT id INTO v_account_fournisseurs FROM accounts WHERE copro_id = v_copro.id AND code = '401' LIMIT 1;
    SELECT id INTO v_account_copros FROM accounts WHERE copro_id = v_copro.id AND code = '450' LIMIT 1;
    SELECT id INTO v_account_produits_charges FROM accounts WHERE copro_id = v_copro.id AND code = '701' LIMIT 1;
    SELECT id INTO v_account_charges_entretien FROM accounts WHERE copro_id = v_copro.id AND code = '615' LIMIT 1;
    SELECT id INTO v_account_fonds_alur FROM accounts WHERE copro_id = v_copro.id AND code = '105' LIMIT 1;

    -- Vérifier qu'on a les comptes de base
    IF v_account_banque IS NULL OR v_account_copros IS NULL THEN
      RAISE NOTICE '  Missing required accounts for copro %, skipping', v_copro.name;
      CONTINUE;
    END IF;

    -- Si pas de compte produits, utiliser le premier compte de classe 7
    IF v_account_produits_charges IS NULL THEN
      SELECT id INTO v_account_produits_charges FROM accounts
      WHERE copro_id = v_copro.id AND code LIKE '7%' LIMIT 1;
    END IF;

    -- Si pas de compte charges, utiliser le premier compte de classe 6
    IF v_account_charges_entretien IS NULL THEN
      SELECT id INTO v_account_charges_entretien FROM accounts
      WHERE copro_id = v_copro.id AND code LIKE '6%' LIMIT 1;
    END IF;

    -- Si pas de compte fonds ALUR, utiliser le premier compte de classe 1
    IF v_account_fonds_alur IS NULL THEN
      SELECT id INTO v_account_fonds_alur FROM accounts
      WHERE copro_id = v_copro.id AND code LIKE '1%' LIMIT 1;
    END IF;

    -- Date de base pour les transactions
    v_tx_date := CURRENT_DATE - INTERVAL '30 days';

    -- ==========================================
    -- TRANSACTION 1: Appel de fonds T1
    -- ==========================================
    v_lot_count := 0;

    INSERT INTO ledger_transactions (
      copro_id, period_id, tx_date, label, source_type, status, posted_at
    ) VALUES (
      v_copro.id, v_period.id, v_tx_date, 'Appel de fonds T1 2026', 'call_for_funds', 'posted', NOW()
    ) RETURNING id INTO v_tx_id;

    -- Débiter chaque lot (compte copropriétaires 450)
    FOR v_lot IN SELECT id, ref, tantiemes_generaux FROM lots WHERE copro_id = v_copro.id LIMIT 5 LOOP
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_copros, v_lot.id, 'debit',
              ROUND(1500.00 * v_lot.tantiemes_generaux / 10000, 2),
              'Appel T1 - ' || v_lot.ref);
      v_lot_count := v_lot_count + 1;
    END LOOP;

    -- Créditer le compte produits (701)
    IF v_account_produits_charges IS NOT NULL AND v_lot_count > 0 THEN
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      SELECT v_tx_id, v_copro.id, v_period.id, v_account_produits_charges, 'credit',
             SUM(amount), 'Produits charges T1'
      FROM ledger_entries WHERE tx_id = v_tx_id AND direction = 'debit';
    END IF;

    RAISE NOTICE '  Created TX1: Appel de fonds T1 with % lots', v_lot_count;


    -- ==========================================
    -- TRANSACTION 2: Paiement copropriétaire 1
    -- ==========================================
    v_tx_date := v_tx_date + INTERVAL '7 days';

    SELECT id, ref INTO v_lot FROM lots WHERE copro_id = v_copro.id LIMIT 1;

    IF v_lot.id IS NOT NULL THEN
      INSERT INTO ledger_transactions (
        copro_id, period_id, tx_date, label, source_type, status, posted_at
      ) VALUES (
        v_copro.id, v_period.id, v_tx_date, 'Paiement ' || v_lot.ref, 'payment', 'posted', NOW()
      ) RETURNING id INTO v_tx_id;

      -- Débiter la banque (512)
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_banque, 'debit', 450.00, 'Encaissement virement');

      -- Créditer le compte copropriétaire (450) avec le lot
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_copros, v_lot.id, 'credit', 450.00, 'Règlement ' || v_lot.ref);

      RAISE NOTICE '  Created TX2: Paiement lot %', v_lot.ref;
    END IF;


    -- ==========================================
    -- TRANSACTION 3: Paiement copropriétaire 2
    -- ==========================================
    v_tx_date := v_tx_date + INTERVAL '3 days';

    SELECT id, ref INTO v_lot FROM lots WHERE copro_id = v_copro.id OFFSET 1 LIMIT 1;

    IF v_lot.id IS NOT NULL THEN
      INSERT INTO ledger_transactions (
        copro_id, period_id, tx_date, label, source_type, status, posted_at
      ) VALUES (
        v_copro.id, v_period.id, v_tx_date, 'Paiement ' || v_lot.ref, 'payment', 'posted', NOW()
      ) RETURNING id INTO v_tx_id;

      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_banque, 'debit', 320.00, 'Encaissement chèque');

      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_copros, v_lot.id, 'credit', 320.00, 'Règlement ' || v_lot.ref);

      RAISE NOTICE '  Created TX3: Paiement lot %', v_lot.ref;
    END IF;


    -- ==========================================
    -- TRANSACTION 4: Facture fournisseur entretien
    -- ==========================================
    v_tx_date := v_tx_date + INTERVAL '5 days';

    IF v_account_fournisseurs IS NOT NULL AND v_account_charges_entretien IS NOT NULL THEN
      INSERT INTO ledger_transactions (
        copro_id, period_id, tx_date, label, source_type, status, posted_at
      ) VALUES (
        v_copro.id, v_period.id, v_tx_date, 'Facture ENGIE - Entretien chaudière', 'supplier_invoice', 'posted', NOW()
      ) RETURNING id INTO v_tx_id;

      -- Débiter le compte de charges (6xx)
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_charges_entretien, 'debit', 890.00, 'Entretien annuel chaudière');

      -- Créditer le compte fournisseur (401)
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_fournisseurs, 'credit', 890.00, 'ENGIE Facture #2026-001');

      RAISE NOTICE '  Created TX4: Facture fournisseur 890.00';
    END IF;


    -- ==========================================
    -- TRANSACTION 5: Paiement fournisseur
    -- ==========================================
    v_tx_date := v_tx_date + INTERVAL '15 days';

    IF v_account_fournisseurs IS NOT NULL THEN
      INSERT INTO ledger_transactions (
        copro_id, period_id, tx_date, label, source_type, status, posted_at
      ) VALUES (
        v_copro.id, v_period.id, v_tx_date, 'Règlement ENGIE', 'payment', 'posted', NOW()
      ) RETURNING id INTO v_tx_id;

      -- Débiter le compte fournisseur (401)
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_fournisseurs, 'debit', 890.00, 'Règlement facture #2026-001');

      -- Créditer la banque (512)
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_banque, 'credit', 890.00, 'Virement ENGIE');

      RAISE NOTICE '  Created TX5: Paiement fournisseur 890.00';
    END IF;


    -- ==========================================
    -- TRANSACTION 6: Appel fonds ALUR
    -- ==========================================
    v_tx_date := v_tx_date + INTERVAL '2 days';
    v_lot_count := 0;

    IF v_account_fonds_alur IS NOT NULL THEN
      INSERT INTO ledger_transactions (
        copro_id, period_id, tx_date, label, source_type, status, posted_at
      ) VALUES (
        v_copro.id, v_period.id, v_tx_date, 'Appel fonds travaux ALUR 2026', 'call_for_funds', 'posted', NOW()
      ) RETURNING id INTO v_tx_id;

      -- Débiter chaque lot pour le fonds ALUR
      FOR v_lot IN SELECT id, ref, tantiemes_generaux FROM lots WHERE copro_id = v_copro.id LIMIT 5 LOOP
        INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label)
        VALUES (v_tx_id, v_copro.id, v_period.id, v_account_copros, v_lot.id, 'debit',
                ROUND(200.00 * v_lot.tantiemes_generaux / 10000, 2),
                'Fonds ALUR - ' || v_lot.ref);
        v_lot_count := v_lot_count + 1;
      END LOOP;

      -- Créditer le compte fonds ALUR (105)
      IF v_lot_count > 0 THEN
        INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
        SELECT v_tx_id, v_copro.id, v_period.id, v_account_fonds_alur, 'credit',
               SUM(amount), 'Dotation fonds travaux'
        FROM ledger_entries WHERE tx_id = v_tx_id AND direction = 'debit';
      END IF;

      RAISE NOTICE '  Created TX6: Appel fonds ALUR with % lots', v_lot_count;
    END IF;


    -- ==========================================
    -- TRANSACTION 7: Facture nettoyage
    -- ==========================================
    v_tx_date := v_tx_date + INTERVAL '10 days';

    IF v_account_fournisseurs IS NOT NULL AND v_account_charges_entretien IS NOT NULL THEN
      INSERT INTO ledger_transactions (
        copro_id, period_id, tx_date, label, source_type, status, posted_at
      ) VALUES (
        v_copro.id, v_period.id, v_tx_date, 'Facture PROP NET - Nettoyage mensuel', 'supplier_invoice', 'posted', NOW()
      ) RETURNING id INTO v_tx_id;

      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_charges_entretien, 'debit', 450.00, 'Nettoyage parties communes');

      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_fournisseurs, 'credit', 450.00, 'PROP NET Facture #2026-123');

      RAISE NOTICE '  Created TX7: Facture nettoyage 450.00';
    END IF;


    -- ==========================================
    -- TRANSACTION 8: Paiement copropriétaire 3 (partiel)
    -- ==========================================
    v_tx_date := v_tx_date + INTERVAL '4 days';

    SELECT id, ref INTO v_lot FROM lots WHERE copro_id = v_copro.id OFFSET 2 LIMIT 1;

    IF v_lot.id IS NOT NULL THEN
      INSERT INTO ledger_transactions (
        copro_id, period_id, tx_date, label, source_type, status, posted_at
      ) VALUES (
        v_copro.id, v_period.id, v_tx_date, 'Paiement partiel ' || v_lot.ref, 'payment', 'posted', NOW()
      ) RETURNING id INTO v_tx_id;

      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_banque, 'debit', 200.00, 'Encaissement virement');

      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_copros, v_lot.id, 'credit', 200.00, 'Acompte ' || v_lot.ref);

      RAISE NOTICE '  Created TX8: Paiement partiel lot %', v_lot.ref;
    END IF;


    -- ==========================================
    -- TRANSACTION 9: Transaction draft (non posted) pour tests
    -- ==========================================
    INSERT INTO ledger_transactions (
      copro_id, period_id, tx_date, label, source_type, status
    ) VALUES (
      v_copro.id, v_period.id, CURRENT_DATE, 'Régularisation charges (BROUILLON)', 'manual', 'draft'
    ) RETURNING id INTO v_tx_id;

    -- Entrées pour la transaction draft
    INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
    VALUES (v_tx_id, v_copro.id, v_period.id, v_account_copros, 'debit', 150.00, 'Régul charges lot test');

    IF v_account_produits_charges IS NOT NULL THEN
      INSERT INTO ledger_entries (tx_id, copro_id, period_id, account_id, direction, amount, entry_label)
      VALUES (v_tx_id, v_copro.id, v_period.id, v_account_produits_charges, 'credit', 150.00, 'Produit régularisation');
    END IF;

    RAISE NOTICE '  Created TX9: Draft transaction for testing';

    RAISE NOTICE 'Completed copro: %', v_copro.name;
  END LOOP;

  RAISE NOTICE 'Seed completed successfully';
END $$;


-- ============================================
-- Vérification du seed
-- ============================================

-- Afficher un résumé des transactions créées
SELECT
  c.name AS copro,
  COUNT(DISTINCT t.id) AS tx_count,
  SUM(CASE WHEN t.status = 'posted' THEN 1 ELSE 0 END) AS posted_count,
  SUM(CASE WHEN t.status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
  COUNT(e.id) AS entry_count,
  SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE 0 END) AS total_debit,
  SUM(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS total_credit
FROM copros c
LEFT JOIN ledger_transactions t ON t.copro_id = c.id
LEFT JOIN ledger_entries e ON e.tx_id = t.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- =====================================================================
-- V1.5-A — Routine CANONIQUE de provisionnement du plan comptable copropriété
-- Décret 2005-240. Source unique : aligne accounts sur src/lib/constants/plan-comptable.ts
-- et sur le mapping resolve_lot_tiers_account (current=450-1 … alur=450-5).
--
-- Objectif : que TOUTE copro (onboarding prod, bootstrap, harnais de test) naisse
-- avec son plan tiers 450-1..5 (+459) — aujourd'hui aucune routine ne les crée
-- (l'onboarding ne pose qu'un chapeau '450' nu → resolve_lot_tiers_account RAISE).
--
-- Idempotente : ON CONFLICT (copro_id, code) DO NOTHING → ne touche jamais l'existant.
-- Le chapeau 450 = agrégateur : is_postable=false (on impute 450-1..5, jamais 450 nu).
-- Le trigger d'enforcement de is_postable est posé séparément en 1.4 (après backfill, cf. G5).
-- =====================================================================

-- 1) Colonne is_postable (DEFAULT true ; pas d'enforcement ici, juste la métadonnée)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS is_postable boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.accounts.is_postable IS
  'false = compte agrégateur/chapeau non imputable (ex. 450). On impute sur les sous-comptes (450-1..5). Enforcement par trigger (V1.4).';

-- 2) Routine canonique
CREATE OR REPLACE FUNCTION public.provision_copro_chart(p_copro_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM copros WHERE id = p_copro_id) THEN
    RAISE EXCEPTION 'provision_copro_chart: copropriété % introuvable', p_copro_id;
  END IF;

  WITH chart(code, name, atype) AS (
    VALUES
      -- CLASSE 1 — Provisions, avances, subventions, emprunts
      ('102','Provisions pour travaux décidés','equity'),
      ('103','Avances','equity'),
      ('1031','Avance de trésorerie','equity'),
      ('1032','Avance travaux (art. 18)','equity'),
      ('1033','Autres avances','equity'),
      ('105','Fonds de travaux ALUR (art. 14-2 II)','equity'),
      ('110','Solde en attente sur travaux et opérations exceptionnelles','equity'),
      ('120','Solde en attente sur opérations courantes','equity'),
      ('131','Subventions accordées, en instance de versement','equity'),
      ('132','Subventions encaissées','equity'),
      ('164','Emprunts collectifs','liability'),
      -- CLASSE 4 — Tiers
      ('401','Fournisseurs - Factures parvenues','liability'),
      ('408','Fournisseurs - Factures non parvenues','liability'),
      ('409','Fournisseurs débiteurs','asset'),
      ('420','Personnel - Avances et acomptes','asset'),
      ('421','Personnel - Rémunérations dues','liability'),
      ('431','Sécurité sociale','liability'),
      ('432','Autres organismes sociaux','liability'),
      ('442','État - Impôts et taxes','liability'),
      ('450','Copropriétaires - Comptes individualisés','asset'),
      ('450-1','Copropriétaires - Budget prévisionnel','asset'),
      ('450-2','Copropriétaires - Travaux art. 14-2','asset'),
      ('450-3','Copropriétaires - Avances','asset'),
      ('450-4','Copropriétaires - Emprunts','asset'),
      ('450-5','Copropriétaires - Fonds de travaux ALUR','asset'),
      ('459','Copropriétaires - Créances douteuses','asset'),
      ('461','Débiteurs divers','asset'),
      ('462','Créditeurs divers','liability'),
      ('471','Attente d''imputation débiteur','asset'),
      ('472','Attente d''imputation créditeur','liability'),
      ('486','Charges constatées d''avance','asset'),
      ('487','Produits encaissés d''avance','liability'),
      ('491','Dépréciation - Copropriétaires','liability'),
      ('492','Dépréciation - Autres tiers','liability'),
      -- CLASSE 5 — Financiers
      ('501','Compte à terme','asset'),
      ('502','Livret A (fonds travaux)','asset'),
      ('512','Banque','asset'),
      ('514','Chèques postaux','asset'),
      ('531','Caisse','asset'),
      -- CLASSE 6 — Charges
      ('601','Eau','expense'),
      ('602','Électricité','expense'),
      ('603','Chauffage, énergie et combustibles','expense'),
      ('604','Achats produits d''entretien et petits équipements','expense'),
      ('611','Nettoyage des locaux','expense'),
      ('612','Locations immobilières','expense'),
      ('613','Locations mobilières','expense'),
      ('614','Contrats de maintenance','expense'),
      ('615','Entretien et petites réparations','expense'),
      ('616','Primes d''assurances','expense'),
      ('617','Frais de personnel','expense'),
      ('621','Rémunération du syndic - gestion copropriété','expense'),
      ('6211','Rémunération forfaitaire du syndic','expense'),
      ('6212','Débours','expense'),
      ('6213','Frais postaux','expense'),
      ('622','Autres honoraires du syndic','expense'),
      ('6221','Honoraires travaux','expense'),
      ('6222','Prestations particulières','expense'),
      ('623','Rémunérations de tiers intervenants','expense'),
      ('624','Frais du conseil syndical','expense'),
      ('625','Honoraires','expense'),
      ('627','Frais d''assemblées générales','expense'),
      ('628','Frais divers de gestion','expense'),
      ('632','Taxe de balayage','expense'),
      ('633','Taxe foncière','expense'),
      ('634','Autres impôts et taxes','expense'),
      ('661','Remboursement annuités d''emprunt','expense'),
      ('662','Autres charges financières et agios','expense'),
      ('671','Travaux décidés par l''AG','expense'),
      ('672','Travaux urgents (art. 18)','expense'),
      ('673','Études techniques, diagnostics, consultations','expense'),
      ('674','Travaux délégués au conseil syndical','expense'),
      ('678','Autres opérations exceptionnelles','expense'),
      -- CLASSE 7 — Produits
      ('701','Provisions sur opérations courantes','income'),
      ('702','Provisions sur travaux et opérations exceptionnelles','income'),
      ('703','Avances','income'),
      ('704','Remboursements d''annuités d''emprunts','income'),
      ('705','Affectation du fonds de travaux','income'),
      ('706','Provisions délégation de pouvoirs au CS','income'),
      ('711','Subventions','income'),
      ('713','Indemnités d''assurances','income'),
      ('714','Produits divers','income'),
      ('716','Produits financiers','income')
  )
  INSERT INTO public.accounts (copro_id, code, name, account_type, is_system, is_postable)
  SELECT p_copro_id, c.code, c.name, c.atype::public.account_type,
         (c.code = '450'),          -- is_system : chapeau uniquement (cohérent avec la référence)
         (c.code <> '450')          -- is_postable : false sur le chapeau, true sur tout le reste
  FROM chart c
  ON CONFLICT (copro_id, code) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;

COMMENT ON FUNCTION public.provision_copro_chart(uuid) IS
  'Provisionne le plan comptable normalisé (décret 2005-240) d''une copro, dont les tiers 450-1..5 + 459. Idempotente. À appeler à la création de toute copro (onboarding, bootstrap, harnais).';

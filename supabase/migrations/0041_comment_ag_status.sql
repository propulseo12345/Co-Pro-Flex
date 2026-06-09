-- 0041 — Documentation de l'enum ag_status (cycle canonique)
comment on type public.ag_status is
  'Cycle AG : draft -> convoked -> session_active -> closed (close_ag) -> pv_generated -> pv_signed -> finalized (finalize_ag) -> archived (archive_ag). '
  'in_progress = repli annulation de séance. Aucune valeur retirée (retrait jugé risqué/inutile). pv_* posés par UPDATE front (transitions de gestion).';

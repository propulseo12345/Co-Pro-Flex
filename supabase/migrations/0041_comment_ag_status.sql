-- 0041 — Documentation de l'enum ag_status (cycle canonique)
comment on type public.ag_status is
  'Cycle AG : draft -> convoked -> session_active -> closed (close_ag PUIS prepare_ag_decisions) -> pv_generated -> pv_signed -> pv_sent -> finalized (finalize_ag) -> archived (archive_ag). '
  'archive_ag accepte closed/pv_generated/pv_signed/pv_sent/finalized. finalize_ag ouvert dès pv_signed. in_progress = repli annulation de séance. Aucune valeur retirée. pv_* posés par UPDATE front.';

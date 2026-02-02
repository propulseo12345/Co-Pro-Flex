export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      _rls_state_snapshot: {
        Row: {
          had_force_rls: boolean
          had_rls_enabled: boolean
          snapshot_at: string | null
          table_name: string
        }
        Insert: {
          had_force_rls: boolean
          had_rls_enabled: boolean
          snapshot_at?: string | null
          table_name: string
        }
        Update: {
          had_force_rls?: boolean
          had_rls_enabled?: boolean
          snapshot_at?: string | null
          table_name?: string
        }
        Relationships: []
      }
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          copro_id: string
          created_at: string
          end_date: string
          id: string
          locked_at: string | null
          locked_by: string | null
          name: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["period_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          copro_id: string
          created_at?: string
          end_date: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          copro_id?: string
          created_at?: string
          end_date?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "accounting_periods_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "accounting_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          copro_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          copro_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          copro_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
        ]
      }
      ag_attendance: {
        Row: {
          ag_id: string
          arrived_at: string | null
          copro_id: string
          coproprietaire_id: string
          created_at: string
          id: string
          left_at: string | null
          lot_ids: string[]
          presence_type: Database["public"]["Enums"]["attendance_type"]
          proxy_document_id: string | null
          represented_by_id: string | null
          represented_by_name: string | null
          signature_data: string | null
          signed: boolean
          signed_at: string | null
          tantiemes: number
          updated_at: string
        }
        Insert: {
          ag_id: string
          arrived_at?: string | null
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          id?: string
          left_at?: string | null
          lot_ids?: string[]
          presence_type?: Database["public"]["Enums"]["attendance_type"]
          proxy_document_id?: string | null
          represented_by_id?: string | null
          represented_by_name?: string | null
          signature_data?: string | null
          signed?: boolean
          signed_at?: string | null
          tantiemes?: number
          updated_at?: string
        }
        Update: {
          ag_id?: string
          arrived_at?: string | null
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          id?: string
          left_at?: string | null
          lot_ids?: string[]
          presence_type?: Database["public"]["Enums"]["attendance_type"]
          proxy_document_id?: string | null
          represented_by_id?: string | null
          represented_by_name?: string | null
          signature_data?: string | null
          signed?: boolean
          signed_at?: string | null
          tantiemes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_attendance_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_attendance_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_attendance_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_attendance_proxy_document_id_fkey"
            columns: ["proxy_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_proxy_document_id_fkey"
            columns: ["proxy_document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_proxy_document_id_fkey"
            columns: ["proxy_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_proxy_document_id_fkey"
            columns: ["proxy_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_proxy_document_id_fkey"
            columns: ["proxy_document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_represented_by_id_fkey"
            columns: ["represented_by_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_represented_by_id_fkey"
            columns: ["represented_by_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_represented_by_id_fkey"
            columns: ["represented_by_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      ag_correspondence_vote_details: {
        Row: {
          copro_id: string
          coproprietaire_id: string
          correspondence_form_id: string
          created_at: string
          id: string
          integrated_at: string | null
          integrated_vote_id: string | null
          recorded_at: string
          recorded_by: string | null
          resolution_id: string
          vote: Database["public"]["Enums"]["vote_direction"]
        }
        Insert: {
          copro_id: string
          coproprietaire_id: string
          correspondence_form_id: string
          created_at?: string
          id?: string
          integrated_at?: string | null
          integrated_vote_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          resolution_id: string
          vote: Database["public"]["Enums"]["vote_direction"]
        }
        Update: {
          copro_id?: string
          coproprietaire_id?: string
          correspondence_form_id?: string
          created_at?: string
          id?: string
          integrated_at?: string | null
          integrated_vote_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          resolution_id?: string
          vote?: Database["public"]["Enums"]["vote_direction"]
        }
        Relationships: [
          {
            foreignKeyName: "ag_correspondence_vote_details_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_correspondence_form_id_fkey"
            columns: ["correspondence_form_id"]
            isOneToOne: false
            referencedRelation: "ag_correspondence_votes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_integrated_vote_id_fkey"
            columns: ["integrated_vote_id"]
            isOneToOne: false
            referencedRelation: "ag_votes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_integrated_vote_id_fkey"
            columns: ["integrated_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["vote_id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolution_vote_summary"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
        ]
      }
      ag_correspondence_votes: {
        Row: {
          ag_id: string
          copro_id: string
          coproprietaire_id: string
          created_at: string
          form_document_id: string | null
          id: string
          integrated_at: string | null
          integration_status: string | null
          mode_reception: string | null
          notes: string | null
          received_at: string | null
          reception_validated: boolean | null
          status: string | null
          total_tantiemes: number | null
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          ag_id: string
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          form_document_id?: string | null
          id?: string
          integrated_at?: string | null
          integration_status?: string | null
          mode_reception?: string | null
          notes?: string | null
          received_at?: string | null
          reception_validated?: boolean | null
          status?: string | null
          total_tantiemes?: number | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          ag_id?: string
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          form_document_id?: string | null
          id?: string
          integrated_at?: string | null
          integration_status?: string | null
          mode_reception?: string | null
          notes?: string | null
          received_at?: string | null
          reception_validated?: boolean | null
          status?: string | null
          total_tantiemes?: number | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_correspondence_votes_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_form_document_id_fkey"
            columns: ["form_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_form_document_id_fkey"
            columns: ["form_document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_form_document_id_fkey"
            columns: ["form_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_form_document_id_fkey"
            columns: ["form_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_form_document_id_fkey"
            columns: ["form_document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_meetings: {
        Row: {
          closed_at: string | null
          closing_notes: string | null
          convocation_date: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          current_step: number | null
          id: string
          incidents: string | null
          location: string | null
          max_step_reached: number | null
          meeting_date: string
          meeting_type: Database["public"]["Enums"]["ag_meeting_type"]
          opening_notes: string | null
          president_id: string | null
          president_name: string | null
          pv_document_id: string | null
          quorum_required: boolean
          remote_meeting_provider: string | null
          remote_meeting_url: string | null
          scrutineer1_id: string | null
          scrutineer1_name: string | null
          scrutineer2_id: string | null
          scrutineer2_name: string | null
          secretary_id: string | null
          secretary_name: string | null
          session_ended_at: string | null
          session_started_at: string | null
          status: Database["public"]["Enums"]["ag_status"]
          step_data: Json | null
          title: string
          updated_at: string
          wizard_mode: string | null
        }
        Insert: {
          closed_at?: string | null
          closing_notes?: string | null
          convocation_date?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          id?: string
          incidents?: string | null
          location?: string | null
          max_step_reached?: number | null
          meeting_date: string
          meeting_type?: Database["public"]["Enums"]["ag_meeting_type"]
          opening_notes?: string | null
          president_id?: string | null
          president_name?: string | null
          pv_document_id?: string | null
          quorum_required?: boolean
          remote_meeting_provider?: string | null
          remote_meeting_url?: string | null
          scrutineer1_id?: string | null
          scrutineer1_name?: string | null
          scrutineer2_id?: string | null
          scrutineer2_name?: string | null
          secretary_id?: string | null
          secretary_name?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          status?: Database["public"]["Enums"]["ag_status"]
          step_data?: Json | null
          title: string
          updated_at?: string
          wizard_mode?: string | null
        }
        Update: {
          closed_at?: string | null
          closing_notes?: string | null
          convocation_date?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          id?: string
          incidents?: string | null
          location?: string | null
          max_step_reached?: number | null
          meeting_date?: string
          meeting_type?: Database["public"]["Enums"]["ag_meeting_type"]
          opening_notes?: string | null
          president_id?: string | null
          president_name?: string | null
          pv_document_id?: string | null
          quorum_required?: boolean
          remote_meeting_provider?: string | null
          remote_meeting_url?: string | null
          scrutineer1_id?: string | null
          scrutineer1_name?: string | null
          scrutineer2_id?: string | null
          scrutineer2_name?: string | null
          secretary_id?: string | null
          secretary_name?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          status?: Database["public"]["Enums"]["ag_status"]
          step_data?: Json | null
          title?: string
          updated_at?: string
          wizard_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_president_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_president_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_president_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_meetings_pv_document_id_fkey"
            columns: ["pv_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_pv_document_id_fkey"
            columns: ["pv_document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_pv_document_id_fkey"
            columns: ["pv_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_pv_document_id_fkey"
            columns: ["pv_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_pv_document_id_fkey"
            columns: ["pv_document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer1_id_fkey"
            columns: ["scrutineer1_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer1_id_fkey"
            columns: ["scrutineer1_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer1_id_fkey"
            columns: ["scrutineer1_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer2_id_fkey"
            columns: ["scrutineer2_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer2_id_fkey"
            columns: ["scrutineer2_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer2_id_fkey"
            columns: ["scrutineer2_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_meetings_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_milestones: {
        Row: {
          ag_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          milestone_type: string
        }
        Insert: {
          ag_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          milestone_type: string
        }
        Update: {
          ag_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          milestone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ag_milestones_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_milestones_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_milestones_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_milestones_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_milestones_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
        ]
      }
      ag_notification_events: {
        Row: {
          created_at: string
          event_timestamp: string
          event_type: string
          id: string
          ip_address: string | null
          notification_id: string
          raw_data: Json | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_timestamp?: string
          event_type: string
          id?: string
          ip_address?: string | null
          notification_id: string
          raw_data?: Json | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_timestamp?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          notification_id?: string
          raw_data?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_notification_events_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "ag_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_notifications: {
        Row: {
          ag_id: string
          channel: Database["public"]["Enums"]["notification_channel"]
          copro_id: string
          coproprietaire_id: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          document_id: string | null
          document_storage_path: string | null
          email_provider: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["ag_notification_type"]
          opened_at: string | null
          provider_message_id: string | null
          recipient_email: string
          recipient_name: string
          scheduled_at: string | null
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          ag_id: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          document_id?: string | null
          document_storage_path?: string | null
          email_provider?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["ag_notification_type"]
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_name: string
          scheduled_at?: string | null
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          ag_id?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          document_id?: string | null
          document_storage_path?: string | null
          email_provider?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["ag_notification_type"]
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ag_notifications_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_notifications_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_notifications_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_notifications_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_notifications_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_notifications_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_pouvoirs: {
        Row: {
          ag_id: string
          copro_id: string
          created_at: string
          id: string
          justificatif_filename: string | null
          justificatif_path: string | null
          justificatif_size: number | null
          justificatif_uploaded_at: string | null
          mandant_id: string
          mandataire_id: string
          signed_at: string | null
          updated_at: string
        }
        Insert: {
          ag_id: string
          copro_id: string
          created_at?: string
          id?: string
          justificatif_filename?: string | null
          justificatif_path?: string | null
          justificatif_size?: number | null
          justificatif_uploaded_at?: string | null
          mandant_id: string
          mandataire_id: string
          signed_at?: string | null
          updated_at?: string
        }
        Update: {
          ag_id?: string
          copro_id?: string
          created_at?: string
          id?: string
          justificatif_filename?: string | null
          justificatif_path?: string | null
          justificatif_size?: number | null
          justificatif_uploaded_at?: string | null
          mandant_id?: string
          mandataire_id?: string
          signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ag_pouvoirs_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_mandant_id_fkey"
            columns: ["mandant_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_mandant_id_fkey"
            columns: ["mandant_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_mandant_id_fkey"
            columns: ["mandant_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_mandataire_id_fkey"
            columns: ["mandataire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_mandataire_id_fkey"
            columns: ["mandataire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pouvoirs_mandataire_id_fkey"
            columns: ["mandataire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      ag_resolutions: {
        Row: {
          ag_id: string
          bridge_vote_id: string | null
          copro_id: string
          created_at: string
          description: string | null
          id: string
          is_approved: boolean | null
          is_bridgeable: boolean | null
          is_customized: boolean | null
          linked_budget_id: string | null
          linked_work_budget_id: string | null
          majority_type: Database["public"]["Enums"]["majority_type"]
          resolution_number: number
          resolution_type: Database["public"]["Enums"]["resolution_type"]
          status: Database["public"]["Enums"]["resolution_status"]
          tantiemes_abstention: number | null
          tantiemes_against: number | null
          tantiemes_for: number | null
          threshold_tantiemes: number | null
          threshold_voters: number | null
          title: string
          updated_at: string
          variables: Json | null
          vote_details: Json | null
          voted_at: string | null
          voters_abstention: number | null
          voters_against: number | null
          voters_for: number | null
        }
        Insert: {
          ag_id: string
          bridge_vote_id?: string | null
          copro_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_approved?: boolean | null
          is_bridgeable?: boolean | null
          is_customized?: boolean | null
          linked_budget_id?: string | null
          linked_work_budget_id?: string | null
          majority_type?: Database["public"]["Enums"]["majority_type"]
          resolution_number: number
          resolution_type?: Database["public"]["Enums"]["resolution_type"]
          status?: Database["public"]["Enums"]["resolution_status"]
          tantiemes_abstention?: number | null
          tantiemes_against?: number | null
          tantiemes_for?: number | null
          threshold_tantiemes?: number | null
          threshold_voters?: number | null
          title: string
          updated_at?: string
          variables?: Json | null
          vote_details?: Json | null
          voted_at?: string | null
          voters_abstention?: number | null
          voters_against?: number | null
          voters_for?: number | null
        }
        Update: {
          ag_id?: string
          bridge_vote_id?: string | null
          copro_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_approved?: boolean | null
          is_bridgeable?: boolean | null
          is_customized?: boolean | null
          linked_budget_id?: string | null
          linked_work_budget_id?: string | null
          majority_type?: Database["public"]["Enums"]["majority_type"]
          resolution_number?: number
          resolution_type?: Database["public"]["Enums"]["resolution_type"]
          status?: Database["public"]["Enums"]["resolution_status"]
          tantiemes_abstention?: number | null
          tantiemes_against?: number | null
          tantiemes_for?: number | null
          threshold_tantiemes?: number | null
          threshold_voters?: number | null
          title?: string
          updated_at?: string
          variables?: Json | null
          vote_details?: Json | null
          voted_at?: string | null
          voters_abstention?: number | null
          voters_against?: number | null
          voters_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolution_vote_summary"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_budget_id_fkey"
            columns: ["linked_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_budget_id_fkey"
            columns: ["linked_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_budget_id_fkey"
            columns: ["linked_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_budget_id_fkey"
            columns: ["linked_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_budget_id_fkey"
            columns: ["linked_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_work_budget_id_fkey"
            columns: ["linked_work_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_work_budget_id_fkey"
            columns: ["linked_work_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_work_budget_id_fkey"
            columns: ["linked_work_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_work_budget_id_fkey"
            columns: ["linked_work_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_linked_work_budget_id_fkey"
            columns: ["linked_work_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
        ]
      }
      ag_session_drafts: {
        Row: {
          ag_id: string
          copro_id: string
          created_at: string
          draft_data: Json
          draft_type: Database["public"]["Enums"]["ag_draft_type"]
          id: string
          last_modified_at: string
          user_id: string
          version: number
        }
        Insert: {
          ag_id: string
          copro_id: string
          created_at?: string
          draft_data?: Json
          draft_type: Database["public"]["Enums"]["ag_draft_type"]
          id?: string
          last_modified_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ag_id?: string
          copro_id?: string
          created_at?: string
          draft_data?: Json
          draft_type?: Database["public"]["Enums"]["ag_draft_type"]
          id?: string
          last_modified_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ag_session_drafts_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_session_drafts_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_session_drafts_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_session_drafts_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_session_drafts_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_session_drafts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_session_drafts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_session_drafts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_session_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_votes: {
        Row: {
          copro_id: string
          coproprietaire_id: string
          created_at: string
          exclusion_reason: string | null
          id: string
          is_excluded: boolean | null
          resolution_id: string
          tantiemes: number
          updated_at: string
          vote: Database["public"]["Enums"]["vote_direction"]
          vote_source: Database["public"]["Enums"]["vote_source"]
        }
        Insert: {
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          exclusion_reason?: string | null
          id?: string
          is_excluded?: boolean | null
          resolution_id: string
          tantiemes: number
          updated_at?: string
          vote: Database["public"]["Enums"]["vote_direction"]
          vote_source?: Database["public"]["Enums"]["vote_source"]
        }
        Update: {
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          exclusion_reason?: string | null
          id?: string
          is_excluded?: boolean | null
          resolution_id?: string
          tantiemes?: number
          updated_at?: string
          vote?: Database["public"]["Enums"]["vote_direction"]
          vote_source?: Database["public"]["Enums"]["vote_source"]
        }
        Relationships: [
          {
            foreignKeyName: "ag_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolution_vote_summary"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
        ]
      }
      alur_transfers: {
        Row: {
          alur_budget_id: string
          amount: number
          copro_id: string
          created_at: string
          created_by: string | null
          description: string
          destination: Database["public"]["Enums"]["transfer_destination"]
          destination_budget_id: string | null
          id: string
          resolution_ag_id: string | null
          transfer_date: string
        }
        Insert: {
          alur_budget_id: string
          amount: number
          copro_id: string
          created_at?: string
          created_by?: string | null
          description: string
          destination: Database["public"]["Enums"]["transfer_destination"]
          destination_budget_id?: string | null
          id?: string
          resolution_ag_id?: string | null
          transfer_date?: string
        }
        Update: {
          alur_budget_id?: string
          amount?: number
          copro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          destination?: Database["public"]["Enums"]["transfer_destination"]
          destination_budget_id?: string | null
          id?: string
          resolution_ag_id?: string | null
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "alur_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
        ]
      }
      bank_matches: {
        Row: {
          amount_matched: number
          bank_movement_id: string
          copro_id: string
          id: string
          matched_at: string
          matched_by: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["bank_match_target_type"]
        }
        Insert: {
          amount_matched: number
          bank_movement_id: string
          copro_id: string
          id?: string
          matched_at?: string
          matched_by?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["bank_match_target_type"]
        }
        Update: {
          amount_matched?: number
          bank_movement_id?: string
          copro_id?: string
          id?: string
          matched_at?: string
          matched_by?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["bank_match_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bank_matches_bank_movement_id_fkey"
            columns: ["bank_movement_id"]
            isOneToOne: false
            referencedRelation: "bank_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_matches_bank_movement_id_fkey"
            columns: ["bank_movement_id"]
            isOneToOne: false
            referencedRelation: "v_bank_movements_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_matches_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_matches_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "bank_matches_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "bank_matches_matched_by_fkey"
            columns: ["matched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_movements: {
        Row: {
          amount_signed: number
          bank_date: string
          bank_ref: string | null
          copro_id: string
          created_at: string
          id: string
          label: string
          period_id: string
          status: Database["public"]["Enums"]["bank_movement_status"]
          value_date: string | null
        }
        Insert: {
          amount_signed: number
          bank_date: string
          bank_ref?: string | null
          copro_id: string
          created_at?: string
          id?: string
          label: string
          period_id: string
          status?: Database["public"]["Enums"]["bank_movement_status"]
          value_date?: string | null
        }
        Update: {
          amount_signed?: number
          bank_date?: string
          bank_ref?: string | null
          copro_id?: string
          created_at?: string
          id?: string
          label?: string
          period_id?: string
          status?: Database["public"]["Enums"]["bank_movement_status"]
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_movements_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "bank_movements_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "bank_movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_expenses: {
        Row: {
          amount: number
          budget_id: string
          budget_line_id: string
          copro_id: string
          created_at: string
          fournisseur: string | null
          id: string
          label: string
          montant_ht: number | null
          piece_jointe: string | null
          rejection_comment: string | null
          status: Database["public"]["Enums"]["expense_status"]
          taux_tva: number | null
          tx_date: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          amount: number
          budget_id: string
          budget_line_id: string
          copro_id: string
          created_at?: string
          fournisseur?: string | null
          id?: string
          label: string
          montant_ht?: number | null
          piece_jointe?: string | null
          rejection_comment?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          taux_tva?: number | null
          tx_date: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string
          budget_line_id?: string
          copro_id?: string
          created_at?: string
          fournisseur?: string | null
          id?: string
          label?: string
          montant_ht?: number | null
          piece_jointe?: string | null
          rejection_comment?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          taux_tva?: number | null
          tx_date?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines_detailed"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_expenses_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_expenses_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          account_id: string
          amount: number
          budget_id: string
          code: string | null
          copro_id: string
          created_at: string
          id: string
          label: string
          repartition_key_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          amount: number
          budget_id: string
          code?: string | null
          copro_id: string
          created_at?: string
          id?: string
          label: string
          repartition_key_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          budget_id?: string
          code?: string | null
          copro_id?: string
          created_at?: string
          id?: string
          label?: string
          repartition_key_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_type: Database["public"]["Enums"]["budget_type"]
          copro_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          notes: string | null
          period_id: string
          status: Database["public"]["Enums"]["budget_status"]
          validated_at: string | null
          validated_by: string | null
          version: number
        }
        Insert: {
          budget_type: Database["public"]["Enums"]["budget_type"]
          copro_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          period_id: string
          status?: Database["public"]["Enums"]["budget_status"]
          validated_at?: string | null
          validated_by?: string | null
          version?: number
        }
        Update: {
          budget_type?: Database["public"]["Enums"]["budget_type"]
          copro_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          period_id?: string
          status?: Database["public"]["Enums"]["budget_status"]
          validated_at?: string | null
          validated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          construction_year: number | null
          copro_id: string
          created_at: string
          floors_count: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          construction_year?: number | null
          copro_id: string
          created_at?: string
          floors_count?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          construction_year?: number | null
          copro_id?: string
          created_at?: string
          floors_count?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "buildings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      call_for_funds: {
        Row: {
          budget_id: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          issue_date: string
          issued_at: string | null
          label: string
          ledger_tx_id: string | null
          period_id: string
          repartition_key_id: string
          status: Database["public"]["Enums"]["call_for_funds_status"]
          total_amount: number
          trimester: number | null
        }
        Insert: {
          budget_id?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          issue_date: string
          issued_at?: string | null
          label: string
          ledger_tx_id?: string | null
          period_id: string
          repartition_key_id: string
          status?: Database["public"]["Enums"]["call_for_funds_status"]
          total_amount: number
          trimester?: number | null
        }
        Update: {
          budget_id?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          issue_date?: string
          issued_at?: string | null
          label?: string
          ledger_tx_id?: string | null
          period_id?: string
          repartition_key_id?: string
          status?: Database["public"]["Enums"]["call_for_funds_status"]
          total_amount?: number
          trimester?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
        ]
      }
      call_for_funds_lines: {
        Row: {
          amount_due: number
          amount_paid: number
          call_id: string
          copro_id: string
          created_at: string
          id: string
          lot_id: string
          status: Database["public"]["Enums"]["call_line_status"]
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          call_id: string
          copro_id: string
          created_at?: string
          id?: string
          lot_id: string
          status?: Database["public"]["Enums"]["call_line_status"]
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          call_id?: string
          copro_id?: string
          created_at?: string
          id?: string
          lot_id?: string
          status?: Database["public"]["Enums"]["call_line_status"]
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_for_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "v_call_total_mismatch"
            referencedColumns: ["call_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "v_calls_collection_stats"
            referencedColumns: ["call_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "v_calls_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          annual_amount: number | null
          auto_generate_orders: boolean
          billing_frequency:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          contract_number: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          copro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_regulatory: boolean
          next_planned_intervention: string | null
          notes: string | null
          notice_months: number | null
          planned_day_of_month: number | null
          planned_frequency:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          provider_id: string
          renewal_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tacit_renewal: boolean
          terminated_at: string | null
          termination_reason: string | null
          title: string
          updated_at: string
        }
        Insert: {
          annual_amount?: number | null
          auto_generate_orders?: boolean
          billing_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          contract_number?: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          copro_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_regulatory?: boolean
          next_planned_intervention?: string | null
          notes?: string | null
          notice_months?: number | null
          planned_day_of_month?: number | null
          planned_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          provider_id: string
          renewal_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          tacit_renewal?: boolean
          terminated_at?: string | null
          termination_reason?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          annual_amount?: number | null
          auto_generate_orders?: boolean
          billing_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          contract_number?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          copro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_regulatory?: boolean
          next_planned_intervention?: string | null
          notes?: string | null
          notice_months?: number | null
          planned_day_of_month?: number | null
          planned_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          provider_id?: string
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          tacit_renewal?: boolean
          terminated_at?: string | null
          termination_reason?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          copro_id: string
          id: string
          is_admin: boolean
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          copro_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          copro_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_conversations_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "conversation_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          copro_id: string
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          last_message_at: string | null
          last_message_preview: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "conversations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coproprietaires: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          civility: string | null
          company_name: string | null
          copro_id: string
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_company: boolean | null
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          prefers_email: boolean | null
          prefers_paper: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          civility?: string | null
          company_name?: string | null
          copro_id: string
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_company?: boolean | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          prefers_email?: boolean | null
          prefers_paper?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          civility?: string | null
          company_name?: string | null
          copro_id?: string
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_company?: boolean | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          prefers_email?: boolean | null
          prefers_paper?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coproprietaires_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coproprietaires_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "coproprietaires_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "coproprietaires_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copros: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_reglement: string | null
          id: string
          name: string
          num_immatriculation: string | null
          postal_code: string | null
          siret: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_reglement?: string | null
          id?: string
          name: string
          num_immatriculation?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_reglement?: string | null
          id?: string
          name?: string
          num_immatriculation?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      council_decisions: {
        Row: {
          copro_id: string
          created_at: string
          created_by: string
          decided_at: string | null
          decided_by: string | null
          description: string | null
          id: string
          linked_ag_id: string | null
          linked_resolution_id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["council_decision_status"]
          submitted_at: string | null
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          created_by: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          linked_ag_id?: string | null
          linked_resolution_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["council_decision_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          created_by?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          linked_ag_id?: string | null
          linked_resolution_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["council_decision_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_decisions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_decisions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_decisions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_decisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_decisions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      council_documents: {
        Row: {
          copro_id: string
          created_at: string
          created_by: string
          document_id: string
          id: string
          label: string | null
          linked_id: string | null
          linked_type:
            | Database["public"]["Enums"]["council_doc_link_type"]
            | null
          notes: string | null
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          copro_id: string
          created_at?: string
          created_by: string
          document_id: string
          id?: string
          label?: string | null
          linked_id?: string | null
          linked_type?:
            | Database["public"]["Enums"]["council_doc_link_type"]
            | null
          notes?: string | null
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          copro_id?: string
          created_at?: string
          created_by?: string
          document_id?: string
          id?: string
          label?: string | null
          linked_id?: string | null
          linked_type?:
            | Database["public"]["Enums"]["council_doc_link_type"]
            | null
          notes?: string | null
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "council_documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      council_members: {
        Row: {
          copro_id: string
          coproprietaire_id: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["council_role"]
          start_date: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          copro_id: string
          coproprietaire_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["council_role"]
          start_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          copro_id?: string
          coproprietaire_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["council_role"]
          start_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_members_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_members_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_members_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "council_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      council_votes: {
        Row: {
          comment: string | null
          copro_id: string
          council_member_id: string
          decision_id: string
          id: string
          vote: Database["public"]["Enums"]["council_vote_choice"]
          voted_at: string
        }
        Insert: {
          comment?: string | null
          copro_id: string
          council_member_id: string
          decision_id: string
          id?: string
          vote: Database["public"]["Enums"]["council_vote_choice"]
          voted_at?: string
        }
        Update: {
          comment?: string | null
          copro_id?: string
          council_member_id?: string
          decision_id?: string
          id?: string
          vote?: Database["public"]["Enums"]["council_vote_choice"]
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_votes_council_member_id_fkey"
            columns: ["council_member_id"]
            isOneToOne: false
            referencedRelation: "council_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_votes_council_member_id_fkey"
            columns: ["council_member_id"]
            isOneToOne: false
            referencedRelation: "v_council_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_votes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "council_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_votes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "v_council_decisions_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access: {
        Row: {
          can_download: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          coproprietaire_id: string | null
          document_id: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          lot_id: string | null
          user_id: string | null
        }
        Insert: {
          can_download?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          coproprietaire_id?: string | null
          document_id: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          lot_id?: string | null
          user_id?: string | null
        }
        Update: {
          can_download?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          coproprietaire_id?: string | null
          document_id?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          lot_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "document_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "document_access_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          category_default:
            | Database["public"]["Enums"]["document_category"]
            | null
          color: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_default?:
            | Database["public"]["Enums"]["document_category"]
            | null
          color?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_default?:
            | Database["public"]["Enums"]["document_category"]
            | null
          color?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "document_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_folders_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_links: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          entity_id: string
          entity_type: string
          id: string
          link_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          entity_id: string
          entity_type: string
          id?: string
          link_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          link_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          document_id: string
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ag_id: string | null
          archived_at: string | null
          category: Database["public"]["Enums"]["document_category"] | null
          confidentiality:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          contract_id: string | null
          copro_id: string
          coproprietaire_id: string | null
          created_at: string
          created_by: string | null
          deletion_blocked: boolean | null
          description: string | null
          document_date: string | null
          dossier_id: string | null
          expiration_date: string | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          invoice_id: string | null
          is_archived: boolean | null
          is_current_version: boolean | null
          lot_id: string | null
          mime_type: string | null
          mutation_id: string | null
          parent_document_id: string | null
          resolution_id: string | null
          retention_years: number | null
          search_text: unknown
          service_order_id: string | null
          source_module: Database["public"]["Enums"]["document_source"] | null
          status: Database["public"]["Enums"]["document_status"] | null
          tags: string[] | null
          title: string | null
          updated_at: string
          version: number | null
          year: number | null
        }
        Insert: {
          ag_id?: string | null
          archived_at?: string | null
          category?: Database["public"]["Enums"]["document_category"] | null
          confidentiality?:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          contract_id?: string | null
          copro_id: string
          coproprietaire_id?: string | null
          created_at?: string
          created_by?: string | null
          deletion_blocked?: boolean | null
          description?: string | null
          document_date?: string | null
          dossier_id?: string | null
          expiration_date?: string | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          invoice_id?: string | null
          is_archived?: boolean | null
          is_current_version?: boolean | null
          lot_id?: string | null
          mime_type?: string | null
          mutation_id?: string | null
          parent_document_id?: string | null
          resolution_id?: string | null
          retention_years?: number | null
          search_text?: unknown
          service_order_id?: string | null
          source_module?: Database["public"]["Enums"]["document_source"] | null
          status?: Database["public"]["Enums"]["document_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          version?: number | null
          year?: number | null
        }
        Update: {
          ag_id?: string | null
          archived_at?: string | null
          category?: Database["public"]["Enums"]["document_category"] | null
          confidentiality?:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          contract_id?: string | null
          copro_id?: string
          coproprietaire_id?: string | null
          created_at?: string
          created_by?: string | null
          deletion_blocked?: boolean | null
          description?: string | null
          document_date?: string | null
          dossier_id?: string | null
          expiration_date?: string | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          invoice_id?: string | null
          is_archived?: boolean | null
          is_current_version?: boolean | null
          lot_id?: string | null
          mime_type?: string | null
          mutation_id?: string | null
          parent_document_id?: string | null
          resolution_id?: string | null
          retention_years?: number | null
          search_text?: unknown
          service_order_id?: string | null
          source_module?: Database["public"]["Enums"]["document_source"] | null
          status?: Database["public"]["Enums"]["document_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          version?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "v_folders_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          categorie: string
          copro_id: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          priorite: string
          statut: string
          titre: string
          updated_at: string
        }
        Insert: {
          categorie: string
          copro_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          priorite?: string
          statut?: string
          titre: string
          updated_at?: string
        }
        Update: {
          categorie?: string
          copro_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          priorite?: string
          statut?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "dossiers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      email_templates: {
        Row: {
          available_variables: Json | null
          body_html: string
          body_text: string | null
          code: string
          copro_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          available_variables?: Json | null
          body_html: string
          body_text?: string | null
          code: string
          copro_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          available_variables?: Json | null
          body_html?: string
          body_text?: string | null
          code?: string
          copro_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "email_templates_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      etat_date_snapshots: {
        Row: {
          copro_id: string
          created_at: string
          document_id: string | null
          generated_at: string
          generated_by: string | null
          id: string
          mutation_id: string
          payload: Json
          snapshot_type: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          document_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          mutation_id: string
          payload: Json
          snapshot_type: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          document_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          mutation_id?: string
          payload?: Json
          snapshot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "etat_date_snapshots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "mutations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "v_mutation_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "v_mutations_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          copro_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          linked_ag_id: string | null
          linked_service_order_id: string | null
          location: string | null
          starts_at: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          all_day?: boolean
          copro_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          linked_ag_id?: string | null
          linked_service_order_id?: string | null
          location?: string | null
          starts_at: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          all_day?: boolean
          copro_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          linked_ag_id?: string | null
          linked_service_order_id?: string | null
          location?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount: number
          copro_id: string
          created_at: string
          direction: string
          entry_label: string | null
          id: string
          lot_id: string | null
          period_id: string
          tx_id: string
        }
        Insert: {
          account_id: string
          amount: number
          copro_id: string
          created_at?: string
          direction: string
          entry_label?: string | null
          id?: string
          lot_id?: string | null
          period_id: string
          tx_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          copro_id?: string
          created_at?: string
          direction?: string
          entry_label?: string | null
          id?: string
          lot_id?: string | null
          period_id?: string
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_locks: {
        Row: {
          copro_id: string
          id: string
          locked_at: string
          locked_by: string
          period_id: string
          reason: string | null
        }
        Insert: {
          copro_id: string
          id?: string
          locked_at?: string
          locked_by: string
          period_id: string
          reason?: string | null
        }
        Update: {
          copro_id?: string
          id?: string
          locked_at?: string
          locked_by?: string
          period_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_locks_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_locks_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_locks_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_locks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_locks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_locks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          copro_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          metadata: Json
          period_id: string
          posted_at: string | null
          posted_by: string | null
          source_id: string | null
          source_type: string | null
          status: string
          tx_date: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          metadata?: Json
          period_id: string
          posted_at?: string | null
          posted_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tx_date?: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          metadata?: Json
          period_id?: string
          posted_at?: string | null
          posted_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tx_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logbook_entries: {
        Row: {
          budget_category: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["intervention_category"]
          comments: string | null
          completed_at: string | null
          contract_id: string | null
          copro_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          document_id: string | null
          domain: Database["public"]["Enums"]["provider_domain"] | null
          entry_type: Database["public"]["Enums"]["logbook_entry_type"]
          equipment_concerned: string | null
          happened_at: string
          id: string
          next_due_at: string | null
          provider_id: string | null
          provider_name_snapshot: string | null
          service_order_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_category?: string | null
          building_id?: string | null
          category?: Database["public"]["Enums"]["intervention_category"]
          comments?: string | null
          completed_at?: string | null
          contract_id?: string | null
          copro_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          domain?: Database["public"]["Enums"]["provider_domain"] | null
          entry_type: Database["public"]["Enums"]["logbook_entry_type"]
          equipment_concerned?: string | null
          happened_at: string
          id?: string
          next_due_at?: string | null
          provider_id?: string | null
          provider_name_snapshot?: string | null
          service_order_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_category?: string | null
          building_id?: string | null
          category?: Database["public"]["Enums"]["intervention_category"]
          comments?: string | null
          completed_at?: string | null
          contract_id?: string | null
          copro_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          domain?: Database["public"]["Enums"]["provider_domain"] | null
          entry_type?: Database["public"]["Enums"]["logbook_entry_type"]
          equipment_concerned?: string | null
          happened_at?: string
          id?: string
          next_due_at?: string | null
          provider_id?: string | null
          provider_name_snapshot?: string | null
          service_order_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_logbook_service_order"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_logbook_service_order"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "v_service_orders_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "logbook_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_accounts: {
        Row: {
          account_id: string
          copro_id: string
          created_at: string
          id: string
          lot_id: string
        }
        Insert: {
          account_id: string
          copro_id: string
          created_at?: string
          id?: string
          lot_id: string
        }
        Update: {
          account_id?: string
          copro_id?: string
          created_at?: string
          id?: string
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "lot_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "lot_accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lot_accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lot_accounts_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: true
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_accounts_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: true
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "lot_accounts_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: true
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_owners: {
        Row: {
          copro_id: string
          coproprietaire_id: string
          created_at: string
          end_date: string | null
          id: string
          is_primary: boolean | null
          lot_id: string
          share_percent: number | null
          start_date: string
        }
        Insert: {
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          lot_id: string
          share_percent?: number | null
          start_date?: string
        }
        Update: {
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          lot_id?: string
          share_percent?: number | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_owners_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lot_owners_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "lot_owners_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "lot_owners_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          building_id: string | null
          copro_id: string
          created_at: string
          description: string | null
          floor: number | null
          id: string
          ref: string
          surface: number | null
          tantiemes_ascenseur: number | null
          tantiemes_chauffage: number | null
          tantiemes_escalier: number | null
          tantiemes_generaux: number
          type: Database["public"]["Enums"]["lot_type"] | null
          updated_at: string
        }
        Insert: {
          building_id?: string | null
          copro_id: string
          created_at?: string
          description?: string | null
          floor?: number | null
          id?: string
          ref: string
          surface?: number | null
          tantiemes_ascenseur?: number | null
          tantiemes_chauffage?: number | null
          tantiemes_escalier?: number | null
          tantiemes_generaux?: number
          type?: Database["public"]["Enums"]["lot_type"] | null
          updated_at?: string
        }
        Update: {
          building_id?: string | null
          copro_id?: string
          created_at?: string
          description?: string | null
          floor?: number | null
          id?: string
          ref?: string
          surface?: number | null
          tantiemes_ascenseur?: number | null
          tantiemes_chauffage?: number | null
          tantiemes_escalier?: number | null
          tantiemes_generaux?: number
          type?: Database["public"]["Enums"]["lot_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      mail_campaigns: {
        Row: {
          attachment_ids: string[] | null
          body: string
          bounced_count: number
          clicked_count: number
          copro_id: string
          created_at: string
          created_by: string
          delivered_count: number
          failed_count: number
          folder_id: string | null
          id: string
          opened_count: number
          preview_text: string | null
          recipient_filter: Json | null
          recipient_type: Database["public"]["Enums"]["mail_recipient_type"]
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: Database["public"]["Enums"]["mail_campaign_status"]
          subject: string
          template_id: string | null
          total_recipients: number
          updated_at: string
        }
        Insert: {
          attachment_ids?: string[] | null
          body: string
          bounced_count?: number
          clicked_count?: number
          copro_id: string
          created_at?: string
          created_by: string
          delivered_count?: number
          failed_count?: number
          folder_id?: string | null
          id?: string
          opened_count?: number
          preview_text?: string | null
          recipient_filter?: Json | null
          recipient_type?: Database["public"]["Enums"]["mail_recipient_type"]
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["mail_campaign_status"]
          subject: string
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          attachment_ids?: string[] | null
          body?: string
          bounced_count?: number
          clicked_count?: number
          copro_id?: string
          created_at?: string
          created_by?: string
          delivered_count?: number
          failed_count?: number
          folder_id?: string | null
          id?: string
          opened_count?: number
          preview_text?: string | null
          recipient_filter?: Json | null
          recipient_type?: Database["public"]["Enums"]["mail_recipient_type"]
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["mail_campaign_status"]
          subject?: string
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_campaigns_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_campaigns_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_campaigns_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_campaigns_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "mail_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_folders: {
        Row: {
          color: string | null
          copro_id: string
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          sort_order: number
          system_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          copro_id: string
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          sort_order?: number
          system_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          copro_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          sort_order?: number
          system_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_inbox: {
        Row: {
          attachment_ids: string[] | null
          body: string
          body_html: string | null
          copro_id: string
          created_at: string
          folder_id: string | null
          from_email: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          is_archived: boolean
          is_deleted: boolean
          is_read: boolean
          is_starred: boolean
          message_id: string | null
          original_campaign_id: string | null
          original_recipient_id: string | null
          owner_id: string
          received_at: string
          subject: string
          updated_at: string
        }
        Insert: {
          attachment_ids?: string[] | null
          body: string
          body_html?: string | null
          copro_id: string
          created_at?: string
          folder_id?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_deleted?: boolean
          is_read?: boolean
          is_starred?: boolean
          message_id?: string | null
          original_campaign_id?: string | null
          original_recipient_id?: string | null
          owner_id: string
          received_at?: string
          subject: string
          updated_at?: string
        }
        Update: {
          attachment_ids?: string[] | null
          body?: string
          body_html?: string | null
          copro_id?: string
          created_at?: string
          folder_id?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_deleted?: boolean
          is_read?: boolean
          is_starred?: boolean
          message_id?: string | null
          original_campaign_id?: string | null
          original_recipient_id?: string | null
          owner_id?: string
          received_at?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_inbox_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_inbox_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_inbox_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "mail_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_original_campaign_id_fkey"
            columns: ["original_campaign_id"]
            isOneToOne: false
            referencedRelation: "mail_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_original_campaign_id_fkey"
            columns: ["original_campaign_id"]
            isOneToOne: false
            referencedRelation: "v_mail_campaigns_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_original_recipient_id_fkey"
            columns: ["original_recipient_id"]
            isOneToOne: false
            referencedRelation: "mail_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          copro_id: string
          coproprietaire_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: Database["public"]["Enums"]["mail_delivery_status"]
          email: string
          error_message: string | null
          failed_at: string | null
          id: string
          message_id: string | null
          name: string | null
          opened_at: string | null
          sent_at: string | null
          variables: Json | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          copro_id: string
          coproprietaire_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["mail_delivery_status"]
          email: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          variables?: Json | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          copro_id?: string
          coproprietaire_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["mail_delivery_status"]
          email?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mail_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_mail_campaigns_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_recipients_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_recipients_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_recipients_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_recipients_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_recipients_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_recipients_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      mail_templates: {
        Row: {
          body: string
          category: string | null
          copro_id: string
          created_at: string
          created_by: string
          id: string
          is_system: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string | null
          copro_id: string
          created_at?: string
          created_by: string
          id?: string
          is_system?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_system?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_templates_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_templates_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_templates_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          copro_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "memberships_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_id: string | null
          author_id: string
          content: string
          conversation_id: string
          copro_id: string
          created_at: string
          edited_at: string | null
          id: string
          read_by: string[]
        }
        Insert: {
          attachment_id?: string | null
          author_id: string
          content: string
          conversation_id: string
          copro_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          read_by?: string[]
        }
        Update: {
          attachment_id?: string | null
          author_id?: string
          content?: string
          conversation_id?: string
          copro_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          read_by?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_conversations_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "messages_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      mutation_steps: {
        Row: {
          completed_at: string | null
          copro_id: string
          created_at: string
          id: string
          mutation_id: string
          payload: Json | null
          status: string
          step_key: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          copro_id: string
          created_at?: string
          id?: string
          mutation_id: string
          payload?: Json | null
          status?: string
          step_key: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          copro_id?: string
          created_at?: string
          id?: string
          mutation_id?: string
          payload?: Json | null
          status?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutation_steps_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_steps_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutation_steps_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutation_steps_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "mutations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_steps_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "v_mutation_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_steps_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "v_mutations_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      mutations: {
        Row: {
          buyer_email: string | null
          buyer_is_company: boolean | null
          buyer_name: string | null
          buyer_owner_id: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          lot_id: string
          mutation_type: string
          notary_email: string | null
          notary_name: string | null
          notary_reference: string | null
          notes: string | null
          requested_at: string
          seller_owner_id: string
          signature_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_is_company?: boolean | null
          buyer_name?: string | null
          buyer_owner_id?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          lot_id: string
          mutation_type?: string
          notary_email?: string | null
          notary_name?: string | null
          notary_reference?: string | null
          notes?: string | null
          requested_at?: string
          seller_owner_id: string
          signature_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_is_company?: boolean | null
          buyer_name?: string | null
          buyer_owner_id?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          lot_id?: string
          mutation_type?: string
          notary_email?: string | null
          notary_name?: string | null
          notary_reference?: string | null
          notes?: string | null
          requested_at?: string
          seller_owner_id?: string
          signature_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount_allocated: number
          call_line_id: string
          copro_id: string
          created_at: string
          id: string
          payment_id: string
        }
        Insert: {
          amount_allocated: number
          call_line_id: string
          copro_id: string
          created_at?: string
          id?: string
          payment_id: string
        }
        Update: {
          amount_allocated?: number
          call_line_id?: string
          copro_id?: string
          created_at?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_call_line_id_fkey"
            columns: ["call_line_id"]
            isOneToOne: false
            referencedRelation: "call_for_funds_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_call_line_id_fkey"
            columns: ["call_line_id"]
            isOneToOne: false
            referencedRelation: "v_call_lines_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_allocations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "v_payment_allocation_issues"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "v_payments_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminder_rules: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          copro_id: string
          created_at: string
          created_by: string | null
          delay_days: number
          id: string
          is_active: boolean
          label: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          copro_id: string
          created_at?: string
          created_by?: string | null
          delay_days: number
          id?: string
          is_active?: boolean
          label: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          copro_id?: string
          created_at?: string
          created_by?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean
          label?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_rules_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminder_rules_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_reminder_rules_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_reminder_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          days_overdue: number
          delay_level: number
          delivery_status: Database["public"]["Enums"]["delivery_status"] | null
          id: string
          lot_id: string
          oldest_due_date: string
          owner_id: string | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          reminder_rule_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          unpaid_amount: number
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          days_overdue: number
          delay_level: number
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          id?: string
          lot_id: string
          oldest_due_date: string
          owner_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reminder_rule_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          unpaid_amount: number
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          days_overdue?: number
          delay_level?: number
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          id?: string
          lot_id?: string
          oldest_due_date?: string
          owner_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reminder_rule_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          unpaid_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_reminders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_reminders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "payment_reminders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "payment_reminders_reminder_rule_id_fkey"
            columns: ["reminder_rule_id"]
            isOneToOne: false
            referencedRelation: "payment_reminder_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          copro_id: string
          created_at: string
          created_by: string | null
          id: string
          ledger_tx_id: string | null
          lot_id: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_date: string
          period_id: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          copro_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_tx_id?: string | null
          lot_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          payment_date: string
          period_id: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          copro_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_tx_id?: string | null
          lot_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          payment_date?: string
          period_id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          address: string | null
          availability: string | null
          avg_response_time: string | null
          bic: string | null
          category: Database["public"]["Enums"]["provider_category"]
          certifications: string[] | null
          city: string | null
          conformity_docs: Json
          contact_name: string | null
          contact_role: string | null
          copro_id: string
          coproflex_label: boolean
          created_at: string
          description: string | null
          domains: Database["public"]["Enums"]["provider_domain"][]
          email: string | null
          employees_count: number | null
          iban: string | null
          id: string
          indicative_rate: string | null
          internal_notes: string | null
          intervention_radius_km: number | null
          interventions_count: number
          is_active: boolean
          last_intervention_at: string | null
          name: string
          phone: string | null
          phone_emergency: string | null
          postal_code: string | null
          rating_avg: number | null
          rating_count: number
          siret: string | null
          updated_at: string
          website: string | null
          year_founded: number | null
        }
        Insert: {
          address?: string | null
          availability?: string | null
          avg_response_time?: string | null
          bic?: string | null
          category?: Database["public"]["Enums"]["provider_category"]
          certifications?: string[] | null
          city?: string | null
          conformity_docs?: Json
          contact_name?: string | null
          contact_role?: string | null
          copro_id: string
          coproflex_label?: boolean
          created_at?: string
          description?: string | null
          domains?: Database["public"]["Enums"]["provider_domain"][]
          email?: string | null
          employees_count?: number | null
          iban?: string | null
          id?: string
          indicative_rate?: string | null
          internal_notes?: string | null
          intervention_radius_km?: number | null
          interventions_count?: number
          is_active?: boolean
          last_intervention_at?: string | null
          name: string
          phone?: string | null
          phone_emergency?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number
          siret?: string | null
          updated_at?: string
          website?: string | null
          year_founded?: number | null
        }
        Update: {
          address?: string | null
          availability?: string | null
          avg_response_time?: string | null
          bic?: string | null
          category?: Database["public"]["Enums"]["provider_category"]
          certifications?: string[] | null
          city?: string | null
          conformity_docs?: Json
          contact_name?: string | null
          contact_role?: string | null
          copro_id?: string
          coproflex_label?: boolean
          created_at?: string
          description?: string | null
          domains?: Database["public"]["Enums"]["provider_domain"][]
          email?: string | null
          employees_count?: number | null
          iban?: string | null
          id?: string
          indicative_rate?: string | null
          internal_notes?: string | null
          intervention_radius_km?: number | null
          interventions_count?: number
          is_active?: boolean
          last_intervention_at?: string | null
          name?: string
          phone?: string | null
          phone_emergency?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number
          siret?: string | null
          updated_at?: string
          website?: string | null
          year_founded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "providers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          copro_id: string
          created_at: string
          is_paused: boolean
          pause_reason: string | null
          paused_until: string | null
          updated_at: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          is_paused?: boolean
          pause_reason?: string | null
          paused_until?: string | null
          updated_at?: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          is_paused?: boolean
          pause_reason?: string | null
          paused_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: true
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_settings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "reminder_settings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: true
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      repartition_key_lines: {
        Row: {
          copro_id: string
          created_at: string
          id: string
          key_id: string
          lot_id: string
          weight: number
        }
        Insert: {
          copro_id: string
          created_at?: string
          id?: string
          key_id: string
          lot_id: string
          weight: number
        }
        Update: {
          copro_id?: string
          created_at?: string
          id?: string
          key_id?: string
          lot_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "repartition_key_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_key_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_key_lines_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_key_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      repartition_keys: {
        Row: {
          basis: Database["public"]["Enums"]["repartition_basis"]
          copro_id: string
          coverage_mode: Database["public"]["Enums"]["coverage_mode"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          basis: Database["public"]["Enums"]["repartition_basis"]
          copro_id: string
          coverage_mode?: Database["public"]["Enums"]["coverage_mode"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          basis?: Database["public"]["Enums"]["repartition_basis"]
          copro_id?: string
          coverage_mode?: Database["public"]["Enums"]["coverage_mode"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "repartition_keys_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_keys_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "repartition_keys_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      service_order_events: {
        Row: {
          comment: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          event_type: Database["public"]["Enums"]["service_order_event_type"]
          from_status:
            | Database["public"]["Enums"]["service_order_status"]
            | null
          id: string
          payload: Json | null
          service_order_id: string
          to_status: Database["public"]["Enums"]["service_order_status"] | null
        }
        Insert: {
          comment?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          event_type: Database["public"]["Enums"]["service_order_event_type"]
          from_status?:
            | Database["public"]["Enums"]["service_order_status"]
            | null
          id?: string
          payload?: Json | null
          service_order_id: string
          to_status?: Database["public"]["Enums"]["service_order_status"] | null
        }
        Update: {
          comment?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: Database["public"]["Enums"]["service_order_event_type"]
          from_status?:
            | Database["public"]["Enums"]["service_order_status"]
            | null
          id?: string
          payload?: Json | null
          service_order_id?: string
          to_status?: Database["public"]["Enums"]["service_order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "service_order_events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "service_order_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_events_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_events_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "v_service_orders_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          accepted_at: string | null
          actual_amount: number | null
          building_id: string | null
          cancelled_at: string | null
          closed_at: string | null
          completed_at: string | null
          contract_id: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          emergency_ceiling: number | null
          estimated_amount: number | null
          id: string
          invoiced_at: string | null
          is_art18_emergency: boolean
          logbook_entry_id: string | null
          lot_id: string | null
          notes: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["service_order_type"]
          origin: Database["public"]["Enums"]["service_order_origin"]
          paid_at: string | null
          planned_intervention_date: string | null
          provider_id: string
          quoted_amount: number | null
          refusal_reason: string | null
          scheduled_at: string | null
          sent_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          subject: string
          supplier_invoice_id: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          accepted_at?: string | null
          actual_amount?: number | null
          building_id?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          completed_at?: string | null
          contract_id?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          emergency_ceiling?: number | null
          estimated_amount?: number | null
          id?: string
          invoiced_at?: string | null
          is_art18_emergency?: boolean
          logbook_entry_id?: string | null
          lot_id?: string | null
          notes?: string | null
          order_number: string
          order_type?: Database["public"]["Enums"]["service_order_type"]
          origin?: Database["public"]["Enums"]["service_order_origin"]
          paid_at?: string | null
          planned_intervention_date?: string | null
          provider_id: string
          quoted_amount?: number | null
          refusal_reason?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          subject: string
          supplier_invoice_id?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          accepted_at?: string | null
          actual_amount?: number | null
          building_id?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          completed_at?: string | null
          contract_id?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          emergency_ceiling?: number | null
          estimated_amount?: number | null
          id?: string
          invoiced_at?: string | null
          is_art18_emergency?: boolean
          logbook_entry_id?: string | null
          lot_id?: string | null
          notes?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["service_order_type"]
          origin?: Database["public"]["Enums"]["service_order_origin"]
          paid_at?: string | null
          planned_intervention_date?: string | null
          provider_id?: string
          quoted_amount?: number | null
          refusal_reason?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          subject?: string
          supplier_invoice_id?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_service_order_logbook"
            columns: ["logbook_entry_id"]
            isOneToOne: false
            referencedRelation: "logbook_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_service_order_logbook"
            columns: ["logbook_entry_id"]
            isOneToOne: false
            referencedRelation: "v_logbook_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_service_order_logbook"
            columns: ["logbook_entry_id"]
            isOneToOne: false
            referencedRelation: "v_logbook_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "service_orders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "service_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "service_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoice_lines: {
        Row: {
          account_id: string
          amount: number
          budget_line_id: string | null
          copro_id: string
          id: string
          invoice_id: string
          label: string
          repartition_key_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          budget_line_id?: string | null
          copro_id: string
          id?: string
          invoice_id: string
          label: string
          repartition_key_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          budget_line_id?: string | null
          copro_id?: string
          id?: string
          invoice_id?: string
          label?: string
          repartition_key_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines_detailed"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_total_mismatch"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_invoices_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_payment_issues"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          copro_id: string
          created_at: string
          created_by: string | null
          document_id: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          label: string
          ledger_tx_id: string | null
          period_id: string
          related_service_order_id: string | null
          status: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number?: string | null
          label: string
          ledger_tx_id?: string | null
          period_id: string
          related_service_order_id?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          label?: string
          ledger_tx_id?: string | null
          period_id?: string
          related_service_order_id?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          copro_id: string
          created_at: string
          created_by: string | null
          id: string
          ledger_tx_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          payment_date: string
          period_id: string
          reference: string | null
          supplier_invoice_id: string
        }
        Insert: {
          amount: number
          copro_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_tx_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          payment_date: string
          period_id: string
          reference?: string | null
          supplier_invoice_id: string
        }
        Update: {
          amount?: number
          copro_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_tx_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          payment_date?: string
          period_id?: string
          reference?: string | null
          supplier_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_total_mismatch"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_invoices_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_payment_issues"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: Json
          copro_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          siret: string | null
          updated_at: string
        }
        Insert: {
          contact?: Json
          copro_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          siret?: string | null
          updated_at?: string
        }
        Update: {
          contact?: Json
          copro_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          siret?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "suppliers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      wall_comments: {
        Row: {
          author_id: string
          content: string
          copro_id: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          copro_id: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          copro_id?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wall_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_comments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_comments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "wall_comments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "wall_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "wall_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "v_wall_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "wall_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      wall_likes: {
        Row: {
          copro_id: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          copro_id: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          copro_id?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wall_likes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_likes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "wall_likes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "wall_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "v_wall_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "wall_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wall_posts: {
        Row: {
          attachment_id: string | null
          author_id: string
          category: Database["public"]["Enums"]["wall_post_category"]
          comments_count: number
          content: string
          copro_id: string
          created_at: string
          id: string
          is_pinned: boolean
          likes_count: number
          pinned_at: string | null
          pinned_by: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          attachment_id?: string | null
          author_id: string
          category?: Database["public"]["Enums"]["wall_post_category"]
          comments_count?: number
          content: string
          copro_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          likes_count?: number
          pinned_at?: string | null
          pinned_by?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          attachment_id?: string | null
          author_id?: string
          category?: Database["public"]["Enums"]["wall_post_category"]
          comments_count?: number
          content?: string
          copro_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          likes_count?: number
          pinned_at?: string | null
          pinned_by?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "wall_posts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "wall_posts_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_accessible_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"] | null
          confidentiality:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          copro_id: string | null
          coproprietaire_id: string | null
          created_at: string | null
          created_by: string | null
          file_name: string | null
          id: string | null
          lot_id: string | null
          title: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"] | null
          confidentiality?:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          copro_id?: string | null
          coproprietaire_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          id?: string | null
          lot_id?: string | null
          title?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"] | null
          confidentiality?:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          copro_id?: string | null
          coproprietaire_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          id?: string | null
          lot_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_account_movements: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          amount: number | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          credit: number | null
          debit: number | null
          direction: string | null
          entry_id: string | null
          entry_label: string | null
          lot_id: string | null
          lot_ref: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          posted_by_name: string | null
          running_balance: number | null
          source_id: string | null
          source_type: string | null
          status: string | null
          tx_date: string | null
          tx_id: string | null
          tx_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          copro_id: string | null
          copro_name: string | null
          created_at: string | null
          duration_days: number | null
          end_date: string | null
          id: string | null
          is_overdue: boolean | null
          locked_at: string | null
          locked_by: string | null
          name: string | null
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["period_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "accounting_periods_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "accounting_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ag_attendance_summary: {
        Row: {
          ag_date: string | null
          ag_id: string | null
          ag_title: string | null
          arrived_at: string | null
          copro_id: string | null
          coproprietaire_id: string | null
          created_at: string | null
          id: string | null
          left_at: string | null
          lot_ids: string[] | null
          lot_refs: string[] | null
          owner_email: string | null
          owner_name: string | null
          presence_type: Database["public"]["Enums"]["attendance_type"] | null
          represented_by_name: string | null
          signed: boolean | null
          signed_at: string | null
          tantiemes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_attendance_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_attendance_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_attendance_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_attendance_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      v_ag_correspondence_status: {
        Row: {
          ag_id: string | null
          ag_status: Database["public"]["Enums"]["ag_status"] | null
          ag_title: string | null
          copro_id: string | null
          correspondence_ratio: number | null
          correspondence_tantiemes: number | null
          forms_integrated: number | null
          forms_received: number | null
          forms_validated: number | null
          meeting_date: string | null
          total_tantiemes: number | null
          vote_details_count: number | null
          votes_integrated: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_ag_drafts_progress: {
        Row: {
          ag_id: string | null
          attendance_count: number | null
          completion_ratio: number | null
          copro_id: string | null
          created_at: string | null
          current_step: number | null
          has_attendance: boolean | null
          has_resolutions: boolean | null
          has_votes: boolean | null
          last_activity_at: string | null
          location: string | null
          meeting_date: string | null
          meeting_type: Database["public"]["Enums"]["ag_meeting_type"] | null
          resolutions_count: number | null
          status: Database["public"]["Enums"]["ag_status"] | null
          step_data: Json | null
          title: string | null
          updated_at: string | null
          votes_count: number | null
          wizard_mode: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_ag_overview: {
        Row: {
          approved_count: number | null
          attendees_count: number | null
          convocation_date: string | null
          convocation_deadline: string | null
          copro_id: string | null
          copro_name: string | null
          correspondence_count: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string | null
          location: string | null
          meeting_date: string | null
          meeting_type: Database["public"]["Enums"]["ag_meeting_type"] | null
          present_count: number | null
          present_tantiemes: number | null
          president_name: string | null
          proxy_count: number | null
          quorum_ratio: number | null
          rejected_count: number | null
          resolutions_count: number | null
          secretary_name: string | null
          status: Database["public"]["Enums"]["ag_status"] | null
          title: string | null
          total_tantiemes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_meetings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ag_resolution_vote_summary: {
        Row: {
          ag_id: string | null
          correspondence_abstention: number | null
          correspondence_against: number | null
          correspondence_for: number | null
          correspondence_voters: number | null
          is_approved: boolean | null
          live_abstention: number | null
          live_against: number | null
          live_for: number | null
          live_voters: number | null
          majority_type: Database["public"]["Enums"]["majority_type"] | null
          percent_for: number | null
          resolution_id: string | null
          resolution_number: number | null
          status: Database["public"]["Enums"]["resolution_status"] | null
          tantiemes_abstention: number | null
          tantiemes_against: number | null
          tantiemes_for: number | null
          threshold_tantiemes: number | null
          title: string | null
          voted_at: string | null
          voters_abstention: number | null
          voters_against: number | null
          voters_for: number | null
        }
        Insert: {
          ag_id?: string | null
          correspondence_abstention?: never
          correspondence_against?: never
          correspondence_for?: never
          correspondence_voters?: never
          is_approved?: boolean | null
          live_abstention?: never
          live_against?: never
          live_for?: never
          live_voters?: never
          majority_type?: Database["public"]["Enums"]["majority_type"] | null
          percent_for?: never
          resolution_id?: string | null
          resolution_number?: number | null
          status?: Database["public"]["Enums"]["resolution_status"] | null
          tantiemes_abstention?: number | null
          tantiemes_against?: number | null
          tantiemes_for?: number | null
          threshold_tantiemes?: number | null
          title?: string | null
          voted_at?: string | null
          voters_abstention?: number | null
          voters_against?: number | null
          voters_for?: number | null
        }
        Update: {
          ag_id?: string | null
          correspondence_abstention?: never
          correspondence_against?: never
          correspondence_for?: never
          correspondence_voters?: never
          is_approved?: boolean | null
          live_abstention?: never
          live_against?: never
          live_for?: never
          live_voters?: never
          majority_type?: Database["public"]["Enums"]["majority_type"] | null
          percent_for?: never
          resolution_id?: string | null
          resolution_number?: number | null
          status?: Database["public"]["Enums"]["resolution_status"] | null
          tantiemes_abstention?: number | null
          tantiemes_against?: number | null
          tantiemes_for?: number | null
          threshold_tantiemes?: number | null
          title?: string | null
          voted_at?: string | null
          voters_abstention?: number | null
          voters_against?: number | null
          voters_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
        ]
      }
      v_ag_resolutions_results: {
        Row: {
          ag_date: string | null
          ag_id: string | null
          ag_title: string | null
          bridge_vote_id: string | null
          copro_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_approved: boolean | null
          is_bridgeable: boolean | null
          is_customized: boolean | null
          majority_type: Database["public"]["Enums"]["majority_type"] | null
          percent_for: number | null
          resolution_number: number | null
          resolution_type: Database["public"]["Enums"]["resolution_type"] | null
          status: Database["public"]["Enums"]["resolution_status"] | null
          tantiemes_abstention: number | null
          tantiemes_against: number | null
          tantiemes_for: number | null
          threshold_tantiemes: number | null
          threshold_voters: number | null
          title: string | null
          variables: Json | null
          vote_details: Json | null
          voted_at: string | null
          voters_abstention: number | null
          voters_against: number | null
          voters_for: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolution_vote_summary"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_ag_vote_stats_by_resolution: {
        Row: {
          ag_id: string | null
          bridge_vote_id: string | null
          copro_id: string | null
          is_approved: boolean | null
          is_bridgeable: boolean | null
          majority_type: Database["public"]["Enums"]["majority_type"] | null
          percent_for_expressed: number | null
          percent_of_threshold: number | null
          resolution_id: string | null
          resolution_number: number | null
          resolution_status:
            | Database["public"]["Enums"]["resolution_status"]
            | null
          resolution_type: Database["public"]["Enums"]["resolution_type"] | null
          tantiemes_abstention: number | null
          tantiemes_against: number | null
          tantiemes_expressed: number | null
          tantiemes_for: number | null
          tantiemes_margin: number | null
          threshold_tantiemes: number | null
          threshold_voters: number | null
          title: string | null
          total_individual_votes: number | null
          total_voters: number | null
          vote_outcome: string | null
          voted_at: string | null
          voters_abstention: number | null
          voters_against: number | null
          voters_for: number | null
          votes_correspondence: number | null
          votes_excluded: number | null
          votes_live: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_correspondence_status"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_drafts_progress"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_ag_votes_detailed"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolution_vote_summary"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_bridge_vote_id_fkey"
            columns: ["bridge_vote_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_ag_votes_detailed: {
        Row: {
          ag_id: string | null
          ag_title: string | null
          copro_id: string | null
          coproprietaire_id: string | null
          created_at: string | null
          exclusion_reason: string | null
          is_excluded: boolean | null
          majority_type: Database["public"]["Enums"]["majority_type"] | null
          meeting_date: string | null
          resolution_id: string | null
          resolution_number: number | null
          resolution_title: string | null
          tantiemes: number | null
          vote: Database["public"]["Enums"]["vote_direction"] | null
          vote_id: string | null
          vote_source: Database["public"]["Enums"]["vote_source"] | null
          voter_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ag_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_votes_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ag_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolution_vote_summary"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
        ]
      }
      v_alur_fund_summary: {
        Row: {
          budget_fonctionnement: number | null
          budget_id: string | null
          copro_id: string | null
          cotisation_annuelle: number | null
          name: string | null
          period_end: string | null
          period_id: string | null
          period_start: string | null
          period_year: number | null
          pourcentage_budget: number | null
          solde_actuel: number | null
          total_transferred: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_alur_lot_contributions: {
        Row: {
          alur_budget_id: string | null
          copro_id: string | null
          fonds_total: number | null
          lot_cotisation_annuelle: number | null
          lot_id: string | null
          lot_ref: string | null
          lot_solde_alur: number | null
          owner_id: string | null
          owner_name: string | null
          period_year: number | null
          share_percent: number | null
          tantiemes_generaux: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_alur_transfers_history: {
        Row: {
          alur_budget_id: string | null
          amount: number | null
          copro_id: string | null
          created_at: string | null
          description: string | null
          destination:
            | Database["public"]["Enums"]["transfer_destination"]
            | null
          destination_budget_id: string | null
          destination_budget_name: string | null
          id: string | null
          period_name: string | null
          period_year: number | null
          resolution_ag_id: string | null
          transfer_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_alur_budget_id_fkey"
            columns: ["alur_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_destination_budget_id_fkey"
            columns: ["destination_budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
        ]
      }
      v_bank_movements_overview: {
        Row: {
          amount_abs: number | null
          amount_signed: number | null
          bank_date: string | null
          bank_ref: string | null
          copro_id: string | null
          created_at: string | null
          direction: string | null
          id: string | null
          label: string | null
          matches_count: number | null
          period_id: string | null
          remaining_to_match: number | null
          status: Database["public"]["Enums"]["bank_movement_status"] | null
          total_matched: number | null
          value_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_movements_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "bank_movements_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "bank_movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_consumption_by_account: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          budget_id: string | null
          budget_line_label: string | null
          budgeted_amount: number | null
          consumption_rate_percent: number | null
          consumption_status: string | null
          copro_id: string | null
          period_end: string | null
          period_id: string | null
          period_name: string | null
          period_start: string | null
          realized_amount: number | null
          variance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_expenses_detail: {
        Row: {
          amount: number | null
          budget_id: string | null
          budget_line_id: string | null
          budget_name: string | null
          budget_type: Database["public"]["Enums"]["budget_type"] | null
          copro_id: string | null
          created_at: string | null
          fournisseur: string | null
          id: string | null
          label: string | null
          line_code: string | null
          line_label: string | null
          montant_ht: number | null
          piece_jointe: string | null
          rejection_comment: string | null
          status: Database["public"]["Enums"]["expense_status"] | null
          taux_tva: number | null
          tx_date: string | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines_detailed"
            referencedColumns: ["line_id"]
          },
          {
            foreignKeyName: "budget_expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_expenses_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_expenses_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_lines_detailed: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          amount: number | null
          budget_id: string | null
          budget_status: Database["public"]["Enums"]["budget_status"] | null
          budget_type: Database["public"]["Enums"]["budget_type"] | null
          copro_id: string | null
          created_at: string | null
          label: string | null
          line_id: string | null
          lots_count: number | null
          lots_with_weight_count: number | null
          period_id: string | null
          repartition_basis:
            | Database["public"]["Enums"]["repartition_basis"]
            | null
          repartition_coverage_mode:
            | Database["public"]["Enums"]["coverage_mode"]
            | null
          repartition_key_complete: boolean | null
          repartition_key_id: string | null
          repartition_key_name: string | null
          total_weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_lines_overview: {
        Row: {
          account_id: string | null
          budget_id: string | null
          code: string | null
          consumption_pct: number | null
          copro_id: string | null
          created_at: string | null
          expenses_count: number | null
          id: string | null
          label: string | null
          pending_count: number | null
          planned_amount: number | null
          remaining: number | null
          repartition_key_id: string | null
          sort_order: number | null
          total_spent: number | null
          validated_spent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budget_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
        ]
      }
      v_budgets_overview: {
        Row: {
          budget_type: Database["public"]["Enums"]["budget_type"] | null
          copro_id: string | null
          created_at: string | null
          id: string | null
          lines_count: number | null
          name: string | null
          notes: string | null
          period_end: string | null
          period_id: string | null
          period_name: string | null
          period_start: string | null
          period_year: number | null
          remaining: number | null
          status: Database["public"]["Enums"]["budget_status"] | null
          total_planned: number | null
          total_spent: number | null
          validated_at: string | null
          validated_spent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budgets_summary: {
        Row: {
          budget_id: string | null
          budget_type: Database["public"]["Enums"]["budget_type"] | null
          copro_id: string | null
          count_lines: number | null
          created_at: string | null
          created_by: string | null
          name: string | null
          notes: string | null
          period_end: string | null
          period_id: string | null
          period_name: string | null
          period_start: string | null
          period_status: Database["public"]["Enums"]["period_status"] | null
          status: Database["public"]["Enums"]["budget_status"] | null
          total_amount: number | null
          validated_at: string | null
          validated_by: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_call_lines_detailed: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          amount_remaining: number | null
          call_id: string | null
          call_label: string | null
          call_status:
            | Database["public"]["Enums"]["call_for_funds_status"]
            | null
          copro_id: string | null
          created_at: string | null
          days_overdue: number | null
          due_date: string | null
          id: string | null
          issue_date: string | null
          ledger_tx_id: string | null
          lot_id: string | null
          lot_ref: string | null
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          period_id: string | null
          repartition_key_id: string | null
          repartition_key_name: string | null
          status: Database["public"]["Enums"]["call_line_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_for_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "v_call_total_mismatch"
            referencedColumns: ["call_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "v_calls_collection_stats"
            referencedColumns: ["call_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "v_calls_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
        ]
      }
      v_call_total_mismatch: {
        Row: {
          actual_lines_total: number | null
          call_id: string | null
          copro_id: string | null
          created_at: string | null
          difference: number | null
          expected_total: number | null
          label: string | null
          status: Database["public"]["Enums"]["call_for_funds_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_calls_collection_stats: {
        Row: {
          amount_called: number | null
          amount_collected: number | null
          amount_outstanding: number | null
          call_id: string | null
          call_label: string | null
          call_status:
            | Database["public"]["Enums"]["call_for_funds_status"]
            | null
          collection_rate_percent: number | null
          collection_status: string | null
          copro_id: string | null
          days_since_due: number | null
          due_date: string | null
          issue_date: string | null
          lot_count: number | null
          lots_fully_paid: number | null
          payment_count: number | null
          period_id: string | null
          trimester: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_calls_overview: {
        Row: {
          budget_id: string | null
          copro_id: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          issue_date: string | null
          issued_at: string | null
          label: string | null
          ledger_tx_id: string | null
          lines_count: number | null
          lines_paid_count: number | null
          lines_unpaid_count: number | null
          period_id: string | null
          repartition_key_id: string | null
          repartition_key_name: string | null
          status: Database["public"]["Enums"]["call_for_funds_status"] | null
          total_amount: number | null
          total_paid: number | null
          total_unpaid: number | null
          trimester: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["alur_budget_id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
        ]
      }
      v_contracts_alerts: {
        Row: {
          alert_level: string | null
          annual_amount: number | null
          contract_number: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          copro_id: string | null
          created_at: string | null
          days_remaining: number | null
          description: string | null
          end_date: string | null
          id: string | null
          interventions_count: number | null
          is_regulatory: boolean | null
          notice_months: number | null
          orders_count: number | null
          provider_id: string | null
          provider_name: string | null
          renewal_alert: boolean | null
          renewal_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          tacit_renewal: boolean | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      v_contracts_overview: {
        Row: {
          annual_amount: number | null
          contract_number: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          copro_id: string | null
          created_at: string | null
          days_remaining: number | null
          description: string | null
          end_date: string | null
          id: string | null
          interventions_count: number | null
          is_regulatory: boolean | null
          notice_months: number | null
          orders_count: number | null
          provider_id: string | null
          provider_name: string | null
          renewal_alert: boolean | null
          renewal_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          tacit_renewal: boolean | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "contracts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      v_conversation_messages: {
        Row: {
          attachment_id: string | null
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          content: string | null
          conversation_id: string | null
          copro_id: string | null
          created_at: string | null
          edited_at: string | null
          id: string | null
          is_mine: boolean | null
          read_by: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_conversations_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "messages_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_conversations_overview: {
        Row: {
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          is_group: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          my_last_read_at: string | null
          my_unread_count: number | null
          other_members: Json[] | null
          subject: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "conversations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_copro_tantiemes: {
        Row: {
          copro_id: string | null
          lots_count: number | null
          total_tantiemes_ascenseur: number | null
          total_tantiemes_escalier: number | null
          total_tantiemes_generaux: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_coproprietaires_overview: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          civility: string | null
          company_name: string | null
          copro_id: string | null
          council_role: Database["public"]["Enums"]["council_role"] | null
          country: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_company: boolean | null
          last_name: string | null
          lots_count: number | null
          mobile: string | null
          notes: string | null
          owner_type: string | null
          phone: string | null
          postal_code: string | null
          prefers_email: boolean | null
          prefers_paper: boolean | null
          solde: number | null
          total_tantiemes: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coproprietaires_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coproprietaires_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "coproprietaires_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "coproprietaires_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_council_decisions_overview: {
        Row: {
          active_members_count: number | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          creator_name: string | null
          decided_at: string | null
          description: string | null
          id: string | null
          is_passed: boolean | null
          linked_ag_id: string | null
          linked_resolution_id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["council_decision_status"] | null
          submitted_at: string | null
          title: string | null
          total_votes: number | null
          votes_abstention: number | null
          votes_against: number | null
          votes_for: number | null
        }
        Relationships: [
          {
            foreignKeyName: "council_decisions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_decisions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_decisions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_decisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_council_members: {
        Row: {
          copro_id: string | null
          coproprietaire_email: string | null
          coproprietaire_id: string | null
          coproprietaire_nom: string | null
          coproprietaire_prenom: string | null
          created_at: string | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          role: Database["public"]["Enums"]["council_role"] | null
          start_date: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "council_members_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_members_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_members_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "council_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dashboard_kpis: {
        Row: {
          copro_id: string | null
          critical_unpaid_count: number | null
          current_balance: number | null
          next_ag_date: string | null
          next_ag_id: string | null
          next_ag_title: string | null
          unpaid_total: number | null
        }
        Insert: {
          copro_id?: string | null
          critical_unpaid_count?: never
          current_balance?: never
          next_ag_date?: never
          next_ag_id?: never
          next_ag_title?: never
          unpaid_total?: never
        }
        Update: {
          copro_id?: string | null
          critical_unpaid_count?: never
          current_balance?: never
          next_ag_date?: never
          next_ag_id?: never
          next_ag_title?: never
          unpaid_total?: never
        }
        Relationships: []
      }
      v_dashboard_recent_activity: {
        Row: {
          activity_type: string | null
          copro_id: string | null
          deep_link: string | null
          event_date: string | null
          label: string | null
        }
        Relationships: []
      }
      v_dashboard_todos: {
        Row: {
          copro_id: string | null
          deep_link: string | null
          due_date: string | null
          label: string | null
          priority: number | null
          todo_type: string | null
        }
        Relationships: []
      }
      v_document_versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          document_category:
            | Database["public"]["Enums"]["document_category"]
            | null
          document_id: string | null
          document_title: string | null
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      v_documents_by_category: {
        Row: {
          category: Database["public"]["Enums"]["document_category"] | null
          copro_id: string | null
          count: number | null
          last_added: string | null
          total_size: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_documents_expiring: {
        Row: {
          ag_id: string | null
          archived_at: string | null
          category: Database["public"]["Enums"]["document_category"] | null
          confidentiality:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          contract_id: string | null
          copro_id: string | null
          coproprietaire_id: string | null
          created_at: string | null
          created_by: string | null
          days_until_expiration: number | null
          deletion_blocked: boolean | null
          description: string | null
          document_date: string | null
          dossier_id: string | null
          expiration_date: string | null
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          folder_id: string | null
          folder_name: string | null
          id: string | null
          invoice_id: string | null
          is_archived: boolean | null
          is_current_version: boolean | null
          lot_id: string | null
          mime_type: string | null
          mutation_id: string | null
          parent_document_id: string | null
          resolution_id: string | null
          retention_years: number | null
          search_text: unknown
          service_order_id: string | null
          source_module: Database["public"]["Enums"]["document_source"] | null
          status: Database["public"]["Enums"]["document_status"] | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          version: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "v_folders_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      v_documents_stats: {
        Row: {
          active_count: number | null
          archived_count: number | null
          contrat_count: number | null
          copro_id: string | null
          diagnostic_count: number | null
          expiring_soon_count: number | null
          facture_count: number | null
          last_document_date: string | null
          pv_ag_count: number | null
          total_documents: number | null
          total_size_bytes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_documents_with_folder: {
        Row: {
          ag_id: string | null
          archived_at: string | null
          category: Database["public"]["Enums"]["document_category"] | null
          confidentiality:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          contract_id: string | null
          copro_id: string | null
          copro_name: string | null
          coproprietaire_id: string | null
          created_at: string | null
          created_by: string | null
          deletion_blocked: boolean | null
          description: string | null
          document_date: string | null
          dossier_id: string | null
          expiration_date: string | null
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          folder_color: string | null
          folder_icon: string | null
          folder_id: string | null
          folder_name: string | null
          id: string | null
          invoice_id: string | null
          is_archived: boolean | null
          is_current_version: boolean | null
          lot_id: string | null
          mime_type: string | null
          mutation_id: string | null
          parent_document_id: string | null
          parent_folder_name: string | null
          resolution_id: string | null
          retention_years: number | null
          search_text: unknown
          service_order_id: string | null
          source_module: Database["public"]["Enums"]["document_source"] | null
          status: Database["public"]["Enums"]["document_status"] | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          version: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "v_folders_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      v_etat_date_latest: {
        Row: {
          copro_id: string | null
          document_id: string | null
          generated_at: string | null
          generated_by: string | null
          id: string | null
          lot_id: string | null
          lot_ref: string | null
          mutation_id: string | null
          mutation_status: string | null
          payload: Json | null
          snapshot_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etat_date_snapshots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "mutations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "v_mutation_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: false
            referencedRelation: "v_mutations_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_events_overview: {
        Row: {
          all_day: boolean | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          creator_name: string | null
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string | null
          is_past: boolean | null
          is_today: boolean | null
          linked_ag_id: string | null
          linked_service_order_id: string | null
          location: string | null
          starts_at: string | null
          title: string | null
          visibility: Database["public"]["Enums"]["content_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "events_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_finance_integrity_issues: {
        Row: {
          actual_amount: number | null
          copro_id: string | null
          created_at: string | null
          description: string | null
          difference: number | null
          entity_id: string | null
          entity_type: string | null
          expected_amount: number | null
          issue_type: string | null
        }
        Relationships: []
      }
      v_folders_with_counts: {
        Row: {
          category_default:
            | Database["public"]["Enums"]["document_category"]
            | null
          color: string | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_count: number | null
          icon: string | null
          id: string | null
          is_system: boolean | null
          name: string | null
          parent_id: string | null
          parent_name: string | null
          sort_order: number | null
          subfolder_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "document_folders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_folders_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_general_ledger: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          amount: number | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          credit: number | null
          debit: number | null
          direction: string | null
          entry_id: string | null
          entry_label: string | null
          lot_id: string | null
          lot_ref: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          posted_by_name: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
          tx_date: string | null
          tx_id: string | null
          tx_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_general_ledger_by_account_class: {
        Row: {
          account_class: string | null
          account_count: number | null
          balance: number | null
          class_label: string | null
          copro_id: string | null
          entry_count: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_invoice_total_mismatch: {
        Row: {
          actual_lines_total: number | null
          copro_id: string | null
          created_at: string | null
          difference: number | null
          expected_total: number | null
          invoice_id: string | null
          invoice_number: string | null
          status: Database["public"]["Enums"]["supplier_invoice_status"] | null
          supplier_id: string | null
          supplier_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_logbook_alerts: {
        Row: {
          building_id: string | null
          building_name: string | null
          category: Database["public"]["Enums"]["intervention_category"] | null
          completed_at: string | null
          contract_id: string | null
          contract_title: string | null
          copro_id: string | null
          cost: number | null
          created_at: string | null
          days_to_next_due: number | null
          description: string | null
          domain: Database["public"]["Enums"]["provider_domain"] | null
          due_alert: boolean | null
          entry_type: Database["public"]["Enums"]["logbook_entry_type"] | null
          happened_at: string | null
          id: string | null
          is_overdue: boolean | null
          next_due_at: string | null
          order_number: string | null
          provider_id: string | null
          provider_name: string | null
          service_order_id: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_logbook_service_order"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_logbook_service_order"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "v_service_orders_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "logbook_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      v_logbook_overview: {
        Row: {
          building_id: string | null
          building_name: string | null
          category: Database["public"]["Enums"]["intervention_category"] | null
          completed_at: string | null
          contract_id: string | null
          contract_title: string | null
          copro_id: string | null
          cost: number | null
          created_at: string | null
          days_to_next_due: number | null
          description: string | null
          domain: Database["public"]["Enums"]["provider_domain"] | null
          due_alert: boolean | null
          entry_type: Database["public"]["Enums"]["logbook_entry_type"] | null
          happened_at: string | null
          id: string | null
          is_overdue: boolean | null
          next_due_at: string | null
          order_number: string | null
          provider_id: string | null
          provider_name: string | null
          service_order_id: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_logbook_service_order"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_logbook_service_order"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "v_service_orders_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "logbook_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      v_lot_balance: {
        Row: {
          balance: number | null
          copro_id: string | null
          coproprietaire_id: string | null
          entry_count: number | null
          last_movement_date: string | null
          lot_id: string | null
          lot_ref: string | null
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          owner_email: string | null
          owner_name: string | null
          tantiemes_generaux: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      v_lots_with_owners: {
        Row: {
          building_id: string | null
          building_name: string | null
          copro_id: string | null
          coproprietaire_id: string | null
          created_at: string | null
          description: string | null
          floor: number | null
          id: string | null
          owner_display_name: string | null
          owner_email: string | null
          owner_first_name: string | null
          owner_last_name: string | null
          ref: string | null
          share_percent: number | null
          surface: number | null
          tantiemes_ascenseur: number | null
          tantiemes_chauffage: number | null
          tantiemes_escalier: number | null
          tantiemes_generaux: number | null
          type: Database["public"]["Enums"]["lot_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_mail_campaigns_overview: {
        Row: {
          bounced_count: number | null
          click_rate: number | null
          clicked_count: number | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          delivered_count: number | null
          failed_count: number | null
          folder_id: string | null
          folder_name: string | null
          id: string | null
          open_rate: number | null
          opened_count: number | null
          preview: string | null
          recipient_type:
            | Database["public"]["Enums"]["mail_recipient_type"]
            | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: Database["public"]["Enums"]["mail_campaign_status"] | null
          subject: string | null
          template_id: string | null
          template_name: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_campaigns_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_campaigns_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_campaigns_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_campaigns_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "mail_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      v_mail_inbox_overview: {
        Row: {
          copro_id: string | null
          created_at: string | null
          folder_id: string | null
          folder_name: string | null
          from_email: string | null
          from_name: string | null
          id: string | null
          is_archived: boolean | null
          is_deleted: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          original_campaign_id: string | null
          original_campaign_subject: string | null
          owner_id: string | null
          preview: string | null
          received_at: string | null
          subject: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_inbox_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_inbox_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mail_inbox_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "mail_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_original_campaign_id_fkey"
            columns: ["original_campaign_id"]
            isOneToOne: false
            referencedRelation: "mail_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_original_campaign_id_fkey"
            columns: ["original_campaign_id"]
            isOneToOne: false
            referencedRelation: "v_mail_campaigns_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_inbox_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_maintenance_stats: {
        Row: {
          active_contracts_count: number | null
          active_providers_count: number | null
          contracts_annual_total: number | null
          contracts_to_renew_count: number | null
          copro_id: string | null
          copro_name: string | null
          logbook_entries_count: number | null
          maintenance_cost_ytd: number | null
          pending_orders_count: number | null
          urgent_orders_count: number | null
        }
        Insert: {
          active_contracts_count?: never
          active_providers_count?: never
          contracts_annual_total?: never
          contracts_to_renew_count?: never
          copro_id?: string | null
          copro_name?: string | null
          logbook_entries_count?: never
          maintenance_cost_ytd?: never
          pending_orders_count?: never
          urgent_orders_count?: never
        }
        Update: {
          active_contracts_count?: never
          active_providers_count?: never
          contracts_annual_total?: never
          contracts_to_renew_count?: never
          copro_id?: string | null
          copro_name?: string | null
          logbook_entries_count?: never
          maintenance_cost_ytd?: never
          pending_orders_count?: never
          urgent_orders_count?: never
        }
        Relationships: []
      }
      v_mutation_detail: {
        Row: {
          building_id: string | null
          buyer_email: string | null
          buyer_is_company: boolean | null
          buyer_name: string | null
          buyer_owner_id: string | null
          completed_steps_count: number | null
          copro_id: string | null
          created_at: string | null
          effective_date: string | null
          etat_date_snapshots: Json | null
          floor: number | null
          has_final_etat: boolean | null
          has_pre_etat: boolean | null
          id: string | null
          lot_id: string | null
          lot_ref: string | null
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          mutation_type: string | null
          notary_email: string | null
          notary_name: string | null
          notary_reference: string | null
          notes: string | null
          requested_at: string | null
          seller_email: string | null
          seller_name: string | null
          seller_owner_id: string | null
          signature_date: string | null
          status: string | null
          steps: Json | null
          tantiemes_generaux: number | null
          total_steps_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      v_mutations_overview: {
        Row: {
          building_id: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_owner_id: string | null
          copro_id: string | null
          created_at: string | null
          days_until_pre_etat_deadline: number | null
          effective_date: string | null
          floor: number | null
          has_final_etat: boolean | null
          has_pre_etat: boolean | null
          id: string | null
          lot_id: string | null
          lot_ref: string | null
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          mutation_type: string | null
          notary_email: string | null
          notary_name: string | null
          notes: string | null
          requested_at: string | null
          seller_email: string | null
          seller_name: string | null
          seller_owner_id: string | null
          signature_date: string | null
          status: string | null
          tantiemes_generaux: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "mutations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      v_owner_balance: {
        Row: {
          balance: number | null
          copro_id: string | null
          coproprietaire_id: string | null
          entry_count: number | null
          last_movement_date: string | null
          lots_count: number | null
          owner_email: string | null
          owner_name: string | null
          total_credit: number | null
          total_debit: number | null
          total_tantiemes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      v_owner_financial_summary: {
        Row: {
          balance_due: number | null
          copro_id: string | null
          coproprietaire_id: string | null
          lot_id: string | null
          lot_ref: string | null
          oldest_unpaid_due_date: string | null
          owner_name: string | null
          total_due: number | null
          total_paid: number | null
          unpaid_calls_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_owners_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lot_owners_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lot_owners_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "lot_owners_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_owner_statement_lines: {
        Row: {
          amount_remaining: number | null
          copro_id: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          due_date: string | null
          label: string | null
          line_date: string | null
          line_status: string | null
          line_type: string | null
          lot_id: string | null
          lot_ref: string | null
          owner_id: string | null
          period_id: string | null
          related_id: string | null
          running_balance: number | null
        }
        Relationships: []
      }
      v_owner_statement_lines_by_period: {
        Row: {
          amount_remaining: number | null
          copro_id: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          due_date: string | null
          label: string | null
          line_date: string | null
          line_status: string | null
          line_type: string | null
          lot_id: string | null
          lot_ref: string | null
          owner_id: string | null
          period_end: string | null
          period_id: string | null
          period_name: string | null
          period_start: string | null
          period_status: Database["public"]["Enums"]["period_status"] | null
          related_id: string | null
          running_balance: number | null
        }
        Relationships: []
      }
      v_owner_statement_summary: {
        Row: {
          balance_end: number | null
          copro_id: string | null
          days_overdue: number | null
          lots_count: number | null
          oldest_due_date: string | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          total_credit_payments: number | null
          total_debit_calls: number | null
          total_tantiemes: number | null
          unpaid_amount: number | null
          unpaid_lines_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_payment_allocation_issues: {
        Row: {
          copro_id: string | null
          created_at: string | null
          lot_id: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_id: string | null
          status: string | null
          total_allocated: number | null
          unallocated: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_payment_reminders_overview: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          channel: Database["public"]["Enums"]["notification_channel"] | null
          copro_id: string | null
          created_at: string | null
          days_overdue: number | null
          delay_level: number | null
          delivery_status: Database["public"]["Enums"]["delivery_status"] | null
          id: string | null
          lot_id: string | null
          lot_ref: string | null
          oldest_due_date: string | null
          owner_id: string | null
          owner_name: string | null
          recipient_email: string | null
          rule_label: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"] | null
          unpaid_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_reminders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payment_reminders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "payment_reminders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      v_payments_overview: {
        Row: {
          allocation_status: string | null
          allocations_count: number | null
          amount: number | null
          bank_match_status: string | null
          copro_id: string | null
          created_at: string | null
          id: string | null
          ledger_tx_id: string | null
          lot_id: string | null
          lot_ref: string | null
          matched_bank_amount: number | null
          method: Database["public"]["Enums"]["payment_method"] | null
          owner_name: string | null
          payment_date: string | null
          period_id: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          total_allocated: number | null
          unallocated: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payments_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_providers_overview: {
        Row: {
          active_contracts_count: number | null
          address: string | null
          category: Database["public"]["Enums"]["provider_category"] | null
          city: string | null
          contact_name: string | null
          contact_role: string | null
          copro_id: string | null
          coproflex_label: boolean | null
          created_at: string | null
          domains: Database["public"]["Enums"]["provider_domain"][] | null
          email: string | null
          id: string | null
          interventions_count: number | null
          is_active: boolean | null
          last_intervention_at: string | null
          name: string | null
          pending_orders_count: number | null
          phone: string | null
          phone_emergency: string | null
          postal_code: string | null
          rating_avg: number | null
          rating_count: number | null
          siret: string | null
        }
        Insert: {
          active_contracts_count?: never
          address?: string | null
          category?: Database["public"]["Enums"]["provider_category"] | null
          city?: string | null
          contact_name?: string | null
          contact_role?: string | null
          copro_id?: string | null
          coproflex_label?: boolean | null
          created_at?: string | null
          domains?: Database["public"]["Enums"]["provider_domain"][] | null
          email?: string | null
          id?: string | null
          interventions_count?: number | null
          is_active?: boolean | null
          last_intervention_at?: string | null
          name?: string | null
          pending_orders_count?: never
          phone?: string | null
          phone_emergency?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          siret?: string | null
        }
        Update: {
          active_contracts_count?: never
          address?: string | null
          category?: Database["public"]["Enums"]["provider_category"] | null
          city?: string | null
          contact_name?: string | null
          contact_role?: string | null
          copro_id?: string | null
          coproflex_label?: boolean | null
          created_at?: string | null
          domains?: Database["public"]["Enums"]["provider_domain"][] | null
          email?: string | null
          id?: string | null
          interventions_count?: number | null
          is_active?: boolean | null
          last_intervention_at?: string | null
          name?: string | null
          pending_orders_count?: never
          phone?: string | null
          phone_emergency?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          siret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "providers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_recent_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"] | null
          confidentiality:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          file_name: string | null
          file_size: number | null
          folder_id: string | null
          folder_name: string | null
          id: string | null
          mime_type: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "v_folders_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_repartition_key_lines_detailed: {
        Row: {
          basis: Database["public"]["Enums"]["repartition_basis"] | null
          copro_id: string | null
          coverage_mode: Database["public"]["Enums"]["coverage_mode"] | null
          key_id: string | null
          key_name: string | null
          line_id: string | null
          lot_id: string | null
          lot_ref: string | null
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          share_pct: number | null
          surface: number | null
          tantiemes_generaux: number | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repartition_key_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_key_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_key_lines_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_key_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "repartition_key_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_repartition_key_totals: {
        Row: {
          basis: Database["public"]["Enums"]["repartition_basis"] | null
          copro_id: string | null
          coverage_mode: Database["public"]["Enums"]["coverage_mode"] | null
          description: string | null
          is_active: boolean | null
          is_complete: boolean | null
          key_id: string | null
          lots_count: number | null
          lots_with_weight_count: number | null
          name: string | null
          total_weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repartition_keys_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartition_keys_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "repartition_keys_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
      v_service_orders_overview: {
        Row: {
          accepted_at: string | null
          actual_amount: number | null
          building_id: string | null
          building_name: string | null
          closed_at: string | null
          completed_at: string | null
          contract_id: string | null
          contract_title: string | null
          copro_id: string | null
          created_at: string | null
          created_by: string | null
          days_since_creation: number | null
          description: string | null
          documents_count: number | null
          estimated_amount: number | null
          events_count: number | null
          id: string | null
          is_art18_emergency: boolean | null
          lot_id: string | null
          lot_ref: string | null
          order_number: string | null
          order_type: Database["public"]["Enums"]["service_order_type"] | null
          origin: Database["public"]["Enums"]["service_order_origin"] | null
          planned_intervention_date: string | null
          provider_email: string | null
          provider_id: string | null
          provider_name: string | null
          provider_phone: string | null
          quoted_amount: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["service_order_status"] | null
          subject: string | null
          supplier_invoice_id: string | null
          urgency: Database["public"]["Enums"]["urgency_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "v_contracts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "service_orders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "service_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "service_orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_providers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      v_supplier_invoices_overview: {
        Row: {
          copro_id: string | null
          created_at: string | null
          document_id: string | null
          due_date: string | null
          id: string | null
          invoice_date: string | null
          invoice_number: string | null
          label: string | null
          ledger_tx_id: string | null
          payments_count: number | null
          period_id: string | null
          remaining_to_pay: number | null
          status: Database["public"]["Enums"]["supplier_invoice_status"] | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_supplier_payment_issues: {
        Row: {
          copro_id: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_status:
            | Database["public"]["Enums"]["supplier_invoice_status"]
            | null
          issue_status: string | null
          remaining: number | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trial_balance: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_parent_id: string | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          balance: number | null
          copro_id: string | null
          entry_count: number | null
          period_id: string | null
          period_name: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["account_parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["account_parent_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["account_parent_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_movements"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_unpaid_by_lot: {
        Row: {
          copro_id: string | null
          days_overdue: number | null
          lot_id: string | null
          lot_ref: string | null
          oldest_due_date: string | null
          owner_email: string | null
          owner_name: string | null
          total_unpaid: number | null
          unpaid_lines_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_unpaid_lots: {
        Row: {
          balance: number | null
          copro_id: string | null
          coproprietaire_id: string | null
          days_since_last_movement: number | null
          entry_count: number | null
          last_movement_date: string | null
          lot_id: string | null
          lot_ref: string | null
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          owner_email: string | null
          owner_name: string | null
          severity: string | null
          tantiemes_generaux: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "ledger_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_owner_financial_summary"
            referencedColumns: ["coproprietaire_id"]
          },
        ]
      }
      v_unpaid_with_reminders: {
        Row: {
          copro_id: string | null
          days_overdue: number | null
          last_reminder_id: string | null
          last_reminder_level: number | null
          last_reminder_sent_at: string | null
          last_reminder_status:
            | Database["public"]["Enums"]["reminder_status"]
            | null
          lot_id: string | null
          lot_ref: string | null
          oldest_due_date: string | null
          owner_email: string | null
          owner_name: string | null
          total_reminders_sent: number | null
          total_unpaid: number | null
          unpaid_lines_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wall_feed: {
        Row: {
          attachment_id: string | null
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          author_role: string | null
          category: Database["public"]["Enums"]["wall_post_category"] | null
          comments_count: number | null
          content: string | null
          copro_id: string | null
          created_at: string | null
          id: string | null
          is_liked_by_me: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          pinned_at: string | null
          title: string | null
          updated_at: string | null
          visibility: Database["public"]["Enums"]["content_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_accessible_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_expiring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_documents_with_folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_kpis"
            referencedColumns: ["copro_id"]
          },
          {
            foreignKeyName: "wall_posts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_stats"
            referencedColumns: ["copro_id"]
          },
        ]
      }
    }
    Functions: {
      allocate_payment: {
        Args: { p_call_line_ids?: string[]; p_payment_id: string }
        Returns: {
          amount_allocated: number
          call_line_id: string
        }[]
      }
      archive_ag: { Args: { p_ag_id: string }; Returns: Json }
      audit_finance_integrity: {
        Args: { p_copro_id?: string; p_fix_issues?: boolean }
        Returns: {
          actual_amount: number
          entity_id: string
          entity_type: string
          expected_amount: number
          fixed: boolean
          issue_type: string
        }[]
      }
      calculate_budget_projection: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          budgeted_amount: number
          days_elapsed: number
          days_total: number
          projected_annual: number
          projected_variance: number
          projection_status: string
          realized_to_date: number
        }[]
      }
      calculate_resolution_result: {
        Args: { p_resolution_id: string }
        Returns: Json
      }
      can_access_document: {
        Args: { p_document_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_content: {
        Args: {
          p_copro_id: string
          p_user_id?: string
          p_visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Returns: boolean
      }
      cancel_stale_reminders: { Args: { p_copro_id: string }; Returns: number }
      cast_vote: {
        Args: {
          p_coproprietaire_id: string
          p_resolution_id: string
          p_vote: Database["public"]["Enums"]["vote_direction"]
          p_vote_source?: Database["public"]["Enums"]["vote_source"]
        }
        Returns: Json
      }
      check_call_total_integrity: {
        Args: { p_call_id: string }
        Returns: boolean
      }
      check_convocation_delay: {
        Args: { p_ag_id: string }
        Returns: {
          days_remaining: number
          is_valid: boolean
          meeting_date: string
          minimum_delay: number
          warning_message: string
        }[]
      }
      check_invoice_total_integrity: {
        Args: { p_invoice_id: string }
        Returns: boolean
      }
      check_payment_allocation_integrity: {
        Args: { p_payment_id: string }
        Returns: {
          is_valid: boolean
          payment_amount: number
          payment_id: string
          total_allocated: number
          unallocated: number
        }[]
      }
      check_transaction_balance: {
        Args: { p_tx_id: string }
        Returns: {
          difference: number
          entry_count: number
          is_balanced: boolean
          total_credit: number
          total_debit: number
        }[]
      }
      clear_ag_session_drafts: { Args: { p_ag_id: string }; Returns: Json }
      close_ag: {
        Args: { p_ag_id: string; p_closing_notes?: string }
        Returns: Json
      }
      close_period: { Args: { p_period_id: string }; Returns: boolean }
      complete_ag_wizard_step: {
        Args: { p_ag_id: string; p_next_step?: number; p_step: number }
        Returns: Json
      }
      compute_ag_quorum: {
        Args: { p_ag_id: string }
        Returns: {
          attendees_count: number
          correspondence_count: number
          is_quorum_reached: boolean
          present_count: number
          present_tantiemes: number
          proxy_count: number
          quorum_ratio: number
          total_tantiemes: number
        }[]
      }
      compute_decision_result: {
        Args: { p_decision_id: string }
        Returns: {
          is_passed: boolean
          quorum_reached: boolean
          total_votes: number
          votes_abstention: number
          votes_against: number
          votes_for: number
        }[]
      }
      compute_majority_threshold: {
        Args: {
          p_majority_type: Database["public"]["Enums"]["majority_type"]
          p_present_owners?: number
          p_present_tantiemes: number
          p_total_owners: number
          p_total_tantiemes: number
        }
        Returns: {
          description: string
          threshold_owners: number
          threshold_tantiemes: number
        }[]
      }
      compute_repartition_shares: {
        Args: { p_key_id: string }
        Returns: {
          lot_id: string
          share_pct: number
          weight: number
        }[]
      }
      create_ag_notification: {
        Args: {
          p_ag_id: string
          p_channel?: Database["public"]["Enums"]["notification_channel"]
          p_copro_id: string
          p_coproprietaire_id: string
          p_document_id?: string
          p_notification_type: Database["public"]["Enums"]["ag_notification_type"]
        }
        Returns: string
      }
      create_ag_with_standard_resolutions: {
        Args: {
          p_copro_id: string
          p_location?: string
          p_meeting_date: string
          p_meeting_type?: Database["public"]["Enums"]["ag_meeting_type"]
          p_title: string
        }
        Returns: string
      }
      create_document_system_folders: {
        Args: { p_copro_id: string; p_user_id?: string }
        Returns: undefined
      }
      create_document_version: {
        Args: {
          p_change_summary?: string
          p_document_id: string
          p_new_file_hash: string
          p_new_file_name: string
          p_new_file_path: string
          p_new_file_size: number
          p_user_id?: string
        }
        Returns: string
      }
      create_etat_date_snapshot: {
        Args: {
          p_copro_id: string
          p_mutation_id: string
          p_snapshot_type: string
        }
        Returns: Json
      }
      create_ledger_transaction: {
        Args: {
          p_auto_post?: boolean
          p_copro_id: string
          p_entries?: Json
          p_label: string
          p_period_id: string
          p_source_id?: string
          p_source_type?: string
          p_tx_date: string
        }
        Returns: Json
      }
      create_logbook_from_service_order: {
        Args: { p_order_id: string }
        Returns: string
      }
      create_mail_system_folders: {
        Args: { p_copro_id: string; p_user_id: string }
        Returns: undefined
      }
      create_payment_reminder: {
        Args: {
          p_copro_id: string
          p_days_overdue: number
          p_delay_level: number
          p_lot_id: string
          p_oldest_due_date: string
          p_owner_id: string
          p_recipient_email: string
          p_recipient_name: string
          p_rule_id: string
          p_unpaid_amount: number
        }
        Returns: string
      }
      delete_ag_draft: { Args: { p_ag_id: string }; Returns: Json }
      delete_ag_pouvoir: { Args: { p_pouvoir_id: string }; Returns: Json }
      ensure_dev_membership: { Args: { p_copro_id?: string }; Returns: string }
      generate_campaign_recipients: {
        Args: { p_campaign_id: string }
        Returns: number
      }
      generate_document_path:
        | {
            Args: {
              p_category: Database["public"]["Enums"]["document_category"]
              p_copro_id: string
              p_filename: string
            }
            Returns: string
          }
        | {
            Args: {
              p_category: Database["public"]["Enums"]["document_category"]
              p_copro_id: string
              p_file_name?: string
              p_year?: number
            }
            Returns: string
          }
      generate_etat_date_payload: {
        Args: {
          p_copro_id: string
          p_mutation_id: string
          p_snapshot_type: string
        }
        Returns: Json
      }
      generate_service_order_number: {
        Args: { p_copro_id: string }
        Returns: string
      }
      get_ag_all_session_drafts: {
        Args: { p_ag_id: string }
        Returns: {
          draft_data: Json
          draft_type: Database["public"]["Enums"]["ag_draft_type"]
          id: string
          last_modified_at: string
          user_id: string
          version: number
        }[]
      }
      get_ag_envoi_choices: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_live_results: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_milestones: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_pouvoirs: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_recipients: {
        Args: {
          p_ag_id: string
          p_notification_type?: Database["public"]["Enums"]["ag_notification_type"]
          p_only_missing?: boolean
        }
        Returns: {
          already_notified: boolean
          civilite: string
          email: string
          id: string
          lot_principal: string
          nom: string
          notification_status: Database["public"]["Enums"]["delivery_status"]
          prenom: string
          total_tantiemes: number
        }[]
      }
      get_ag_sending_stats: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_session_draft: {
        Args: {
          p_ag_id: string
          p_draft_type: Database["public"]["Enums"]["ag_draft_type"]
        }
        Returns: Json
      }
      get_ag_wizard_state: { Args: { p_ag_id: string }; Returns: Json }
      get_correspondence_eligible_owners: {
        Args: { p_ag_id: string }
        Returns: Json
      }
      get_default_copro_id: { Args: never; Returns: string }
      get_owner_statement: {
        Args: {
          p_copro_id: string
          p_date_from?: string
          p_date_to?: string
          p_owner_id: string
          p_period_id?: string
        }
        Returns: Json
      }
      get_pending_reminders_to_send: {
        Args: { p_copro_id: string }
        Returns: {
          days_overdue: number
          delay_level: number
          lot_id: string
          lot_ref: string
          oldest_due_date: string
          owner_email: string
          owner_id: string
          owner_name: string
          rule_id: string
          template_id: string
          unpaid_amount: number
        }[]
      }
      get_period_for_date: {
        Args: { p_copro_id: string; p_date?: string }
        Returns: string
      }
      get_supplier_invoice_paid_amount: {
        Args: { p_invoice_id: string }
        Returns: number
      }
      get_user_lot_ids: { Args: { p_copro_id: string }; Returns: string[] }
      get_votes_correspondance: { Args: { p_ag_id: string }; Returns: Json }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_council_member: {
        Args: { p_copro_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_council_president: {
        Args: { p_copro_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_reminders_paused: {
        Args: { p_copro_id: string }
        Returns: {
          is_paused: boolean
          pause_reason: string
          paused_until: string
        }[]
      }
      is_valid_service_order_transition: {
        Args: {
          p_from_status: Database["public"]["Enums"]["service_order_status"]
          p_to_status: Database["public"]["Enums"]["service_order_status"]
        }
        Returns: boolean
      }
      lock_period: { Args: { p_period_id: string }; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_notification_failed: {
        Args: {
          p_error_code?: string
          p_error_message?: string
          p_notification_id: string
        }
        Returns: boolean
      }
      mark_notification_sent: {
        Args: { p_notification_id: string; p_provider_message_id?: string }
        Returns: boolean
      }
      mark_reminder_failed: {
        Args: { p_error_message?: string; p_reminder_id: string }
        Returns: undefined
      }
      mark_reminder_sent: {
        Args: { p_provider_message_id?: string; p_reminder_id: string }
        Returns: undefined
      }
      post_ledger_transaction: { Args: { p_tx_id: string }; Returns: Json }
      recalculate_all_call_statuses: {
        Args: { p_copro_id?: string }
        Returns: {
          call_id: string
          new_status: Database["public"]["Enums"]["call_for_funds_status"]
          old_status: Database["public"]["Enums"]["call_for_funds_status"]
        }[]
      }
      refresh_bank_movement_status: {
        Args: { p_movement_id: string }
        Returns: Database["public"]["Enums"]["bank_movement_status"]
      }
      register_correspondence_form_votes: {
        Args: {
          p_ag_id: string
          p_coproprietaire_id: string
          p_mode_reception?: string
          p_votes: Json
        }
        Returns: Json
      }
      register_correspondence_vote: {
        Args: {
          p_ag_id: string
          p_coproprietaire_id: string
          p_form_id?: string
          p_resolution_id: string
          p_vote: Database["public"]["Enums"]["vote_direction"]
        }
        Returns: Json
      }
      rpc_finalize_ag_session: {
        Args: { p_ag_id: string; p_closing_notes?: string }
        Returns: Json
      }
      rpc_get_ag_coproprietaires: {
        Args: { p_ag_id: string }
        Returns: {
          address_line1: string
          city: string
          display_name: string
          email: string
          id: string
          lots_count: number
          mobile: string
          phone: string
          postal_code: string
          total_tantiemes: number
        }[]
      }
      rpc_get_ag_pv_bundle: { Args: { p_ag_id: string }; Returns: Json }
      save_ag_envoi_choices: {
        Args: { p_ag_id: string; p_choices: Json }
        Returns: Json
      }
      save_ag_milestone: {
        Args: {
          p_ag_id: string
          p_milestone_key: string
          p_milestone_value: Json
        }
        Returns: Json
      }
      save_ag_pouvoir: {
        Args: {
          p_ag_id: string
          p_mandant_id: string
          p_mandataire_id: string
          p_signed_at?: string
        }
        Returns: Json
      }
      save_ag_session_draft: {
        Args: {
          p_ag_id: string
          p_draft_data: Json
          p_draft_type: Database["public"]["Enums"]["ag_draft_type"]
        }
        Returns: string
      }
      save_ag_wizard_state:
        | {
            Args: {
              p_ag_id: string
              p_current_step?: number
              p_step_data?: Json
              p_wizard_mode?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_ag_id: string
              p_current_step: number
              p_step_data?: Json
              p_wizard_mode?: string
            }
            Returns: Json
          }
      save_votes_correspondance: {
        Args: {
          p_ag_id: string
          p_coproprietaire_id: string
          p_status?: string
          p_votes: Json
        }
        Returns: Json
      }
      start_ag: {
        Args: { p_ag_id: string; p_opening_notes?: string }
        Returns: Json
      }
      submit_budget: { Args: { p_budget_id: string }; Returns: Json }
      update_ag_pouvoir_justificatif: {
        Args: {
          p_filename: string
          p_path: string
          p_pouvoir_id: string
          p_size?: number
        }
        Returns: Json
      }
      update_call_status: { Args: { p_call_id: string }; Returns: undefined }
      update_service_order_status: {
        Args: {
          p_comment?: string
          p_new_status: Database["public"]["Enums"]["service_order_status"]
          p_order_id: string
          p_user_id?: string
        }
        Returns: {
          accepted_at: string | null
          actual_amount: number | null
          building_id: string | null
          cancelled_at: string | null
          closed_at: string | null
          completed_at: string | null
          contract_id: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          emergency_ceiling: number | null
          estimated_amount: number | null
          id: string
          invoiced_at: string | null
          is_art18_emergency: boolean
          logbook_entry_id: string | null
          lot_id: string | null
          notes: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["service_order_type"]
          origin: Database["public"]["Enums"]["service_order_origin"]
          paid_at: string | null
          planned_intervention_date: string | null
          provider_id: string
          quoted_amount: number | null
          refusal_reason: string | null
          scheduled_at: string | null
          sent_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          subject: string
          supplier_invoice_id: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_mutation_step: {
        Args: {
          p_mutation_id: string
          p_payload?: Json
          p_status?: string
          p_step_key: string
        }
        Returns: {
          completed_at: string | null
          copro_id: string
          created_at: string
          id: string
          mutation_id: string
          payload: Json | null
          status: string
          step_key: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mutation_steps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_can_view_document: {
        Args: { p_document_id: string }
        Returns: boolean
      }
      user_has_copro_access: { Args: { p_copro_id: string }; Returns: boolean }
      user_is_copro_manager: { Args: { p_copro_id: string }; Returns: boolean }
      user_is_council_member: { Args: { p_copro_id: string }; Returns: boolean }
      user_is_lot_owner: { Args: { p_lot_id: string }; Returns: boolean }
      user_is_lot_owner_in_copro: {
        Args: { p_copro_id: string; p_lot_id: string }
        Returns: boolean
      }
      user_is_lot_owner_or_manager: {
        Args: { p_copro_id: string; p_lot_id: string }
        Returns: boolean
      }
      user_owns_any_lot_in_copro: {
        Args: { p_copro_id: string }
        Returns: boolean
      }
      validate_budget: { Args: { p_budget_id: string }; Returns: Json }
      validate_mutation: {
        Args: {
          p_buyer_company_name?: string
          p_buyer_email?: string
          p_buyer_first_name?: string
          p_buyer_is_company?: boolean
          p_buyer_last_name?: string
          p_buyer_owner_id?: string
          p_mutation_id: string
          p_signature_date: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "income" | "expense" | "equity"
      ag_draft_type:
        | "attendance"
        | "votes"
        | "roles"
        | "resolutions"
        | "session"
        | "variables"
        | "milestones"
        | "signataires"
        | "envoi"
      ag_meeting_type: "ordinary" | "extraordinary" | "mixed"
      ag_notification_type: "convocation" | "relance" | "pv" | "reminder"
      ag_status:
        | "draft"
        | "convoked"
        | "in_progress"
        | "closed"
        | "pv_generated"
      attendance_type: "present" | "proxy" | "correspondence"
      bank_match_target_type: "payment" | "supplier_payment" | "other"
      bank_movement_status: "unmatched" | "matched" | "ignored"
      budget_status:
        | "draft"
        | "pending_approval"
        | "submitted"
        | "validated"
        | "rejected"
        | "closed"
      budget_type: "current" | "works" | "alur"
      call_for_funds_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "cancelled"
      call_line_status: "unpaid" | "partial" | "paid"
      content_visibility: "all_members" | "council_only" | "managers_only"
      contract_status:
        | "draft"
        | "active"
        | "to_renew"
        | "expired"
        | "terminated"
        | "archived"
      contract_type:
        | "ascenseur"
        | "chauffage"
        | "nettoyage"
        | "menage"
        | "espaces_verts"
        | "securite"
        | "assurance"
        | "syndic"
        | "eau"
        | "electricite"
        | "toiture"
        | "facade"
        | "interphone"
        | "portail"
        | "juridique"
        | "maintenance"
        | "autre"
      council_decision_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "archived"
      council_doc_link_type:
        | "contract"
        | "service_order"
        | "ag"
        | "invoice"
        | "budget"
        | "other"
      council_role:
        | "president"
        | "secretary"
        | "treasurer"
        | "member"
        | "observer"
      council_vote_choice: "for" | "against" | "abstention"
      coverage_mode: "all_lots" | "subset"
      delivery_status:
        | "pending"
        | "queued"
        | "sent"
        | "delivered"
        | "opened"
        | "bounced"
        | "failed"
        | "cancelled"
      document_category:
        | "pv_ag"
        | "convocation"
        | "reglement"
        | "contrat"
        | "facture"
        | "devis"
        | "diagnostic"
        | "assurance"
        | "budget"
        | "appel_fonds"
        | "releve_charges"
        | "etat_date"
        | "courrier"
        | "photo"
        | "plan"
        | "autre"
        | "ordre_service"
        | "correspondance"
        | "carnet_entretien"
        | "fiche_synthetique"
      document_confidentiality: "public" | "council" | "manager" | "restricted"
      document_source:
        | "ag"
        | "finance"
        | "maintenance"
        | "communication"
        | "legal"
        | "manual"
      document_status: "draft" | "active" | "archived" | "expired"
      event_type:
        | "ag"
        | "reunion_cs"
        | "travaux"
        | "intervention"
        | "fete"
        | "autre"
      expense_status: "draft" | "pending_validation" | "validated" | "rejected"
      intervention_category: "courante" | "travaux_importants"
      intervention_frequency:
        | "unique"
        | "monthly"
        | "bimonthly"
        | "quarterly"
        | "biannual"
        | "annual"
      logbook_entry_type:
        | "controle"
        | "entretien"
        | "incident"
        | "visite"
        | "travaux"
        | "diagnostic"
      lot_type:
        | "appartement"
        | "studio"
        | "commerce"
        | "bureau"
        | "cave"
        | "parking"
        | "garage"
        | "local_technique"
        | "autre"
      mail_campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "failed"
        | "cancelled"
      mail_delivery_status:
        | "pending"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "failed"
      mail_recipient_type:
        | "all"
        | "council"
        | "by_building"
        | "by_floor"
        | "custom"
      majority_type:
        | "art24"
        | "art25"
        | "art25_1"
        | "art26"
        | "art26_1"
        | "unanimity"
      membership_role:
        | "admin"
        | "gestionnaire"
        | "membre_cs"
        | "coproprietaire"
        | "prestataire"
      notification_channel:
        | "email"
        | "registered_email"
        | "postal"
        | "registered_postal"
        | "hand_delivery"
      payment_method: "bank_transfer" | "card" | "check" | "cash" | "other"
      payment_status: "recorded" | "reconciled" | "reversed"
      period_status: "open" | "locked" | "closed"
      provider_category: "syndic" | "copropriete" | "coproflex"
      provider_domain:
        | "plomberie"
        | "electricite"
        | "chauffage"
        | "ascenseur"
        | "menage"
        | "espaces_verts"
        | "serrurerie"
        | "peinture"
        | "assurance"
        | "juridique"
        | "architecture"
        | "toiture"
        | "facade"
        | "climatisation"
        | "interphone"
        | "portail"
        | "securite"
        | "autre"
      reminder_status: "pending" | "sent" | "failed" | "stale" | "skipped"
      repartition_basis: "tantiemes" | "surface" | "custom"
      resolution_status:
        | "draft"
        | "pending"
        | "voting"
        | "voted"
        | "approved"
        | "rejected"
        | "adjourned"
        | "withdrawn"
      resolution_type:
        | "budget"
        | "accounts"
        | "works"
        | "appointment"
        | "contract"
        | "rules"
        | "other"
      service_order_event_type:
        | "created"
        | "sent"
        | "status_changed"
        | "note_added"
        | "document_added"
        | "invoice_linked"
        | "email_sent"
        | "reminder_sent"
      service_order_origin: "ag" | "syndic" | "cs" | "urgence" | "contrat"
      service_order_status:
        | "draft"
        | "to_send"
        | "sent"
        | "accepted"
        | "refused"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "invoiced"
        | "paid"
        | "closed"
        | "cancelled"
      service_order_type: "classique" | "contractuel"
      supplier_invoice_status:
        | "draft"
        | "approved"
        | "posted"
        | "paid"
        | "cancelled"
      transfer_destination: "compte_courant" | "budget_travaux"
      urgency_level: "low" | "normal" | "medium" | "high" | "critical"
      vote_direction: "for" | "against" | "abstention"
      vote_source: "live" | "correspondence"
      wall_post_category:
        | "information"
        | "urgent"
        | "question"
        | "event"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "income", "expense", "equity"],
      ag_draft_type: [
        "attendance",
        "votes",
        "roles",
        "resolutions",
        "session",
        "variables",
        "milestones",
        "signataires",
        "envoi",
      ],
      ag_meeting_type: ["ordinary", "extraordinary", "mixed"],
      ag_notification_type: ["convocation", "relance", "pv", "reminder"],
      ag_status: ["draft", "convoked", "in_progress", "closed", "pv_generated"],
      attendance_type: ["present", "proxy", "correspondence"],
      bank_match_target_type: ["payment", "supplier_payment", "other"],
      bank_movement_status: ["unmatched", "matched", "ignored"],
      budget_status: [
        "draft",
        "pending_approval",
        "submitted",
        "validated",
        "rejected",
        "closed",
      ],
      budget_type: ["current", "works", "alur"],
      call_for_funds_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "cancelled",
      ],
      call_line_status: ["unpaid", "partial", "paid"],
      content_visibility: ["all_members", "council_only", "managers_only"],
      contract_status: [
        "draft",
        "active",
        "to_renew",
        "expired",
        "terminated",
        "archived",
      ],
      contract_type: [
        "ascenseur",
        "chauffage",
        "nettoyage",
        "menage",
        "espaces_verts",
        "securite",
        "assurance",
        "syndic",
        "eau",
        "electricite",
        "toiture",
        "facade",
        "interphone",
        "portail",
        "juridique",
        "maintenance",
        "autre",
      ],
      council_decision_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "archived",
      ],
      council_doc_link_type: [
        "contract",
        "service_order",
        "ag",
        "invoice",
        "budget",
        "other",
      ],
      council_role: [
        "president",
        "secretary",
        "treasurer",
        "member",
        "observer",
      ],
      council_vote_choice: ["for", "against", "abstention"],
      coverage_mode: ["all_lots", "subset"],
      delivery_status: [
        "pending",
        "queued",
        "sent",
        "delivered",
        "opened",
        "bounced",
        "failed",
        "cancelled",
      ],
      document_category: [
        "pv_ag",
        "convocation",
        "reglement",
        "contrat",
        "facture",
        "devis",
        "diagnostic",
        "assurance",
        "budget",
        "appel_fonds",
        "releve_charges",
        "etat_date",
        "courrier",
        "photo",
        "plan",
        "autre",
        "ordre_service",
        "correspondance",
        "carnet_entretien",
        "fiche_synthetique",
      ],
      document_confidentiality: ["public", "council", "manager", "restricted"],
      document_source: [
        "ag",
        "finance",
        "maintenance",
        "communication",
        "legal",
        "manual",
      ],
      document_status: ["draft", "active", "archived", "expired"],
      event_type: [
        "ag",
        "reunion_cs",
        "travaux",
        "intervention",
        "fete",
        "autre",
      ],
      expense_status: ["draft", "pending_validation", "validated", "rejected"],
      intervention_category: ["courante", "travaux_importants"],
      intervention_frequency: [
        "unique",
        "monthly",
        "bimonthly",
        "quarterly",
        "biannual",
        "annual",
      ],
      logbook_entry_type: [
        "controle",
        "entretien",
        "incident",
        "visite",
        "travaux",
        "diagnostic",
      ],
      lot_type: [
        "appartement",
        "studio",
        "commerce",
        "bureau",
        "cave",
        "parking",
        "garage",
        "local_technique",
        "autre",
      ],
      mail_campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "failed",
        "cancelled",
      ],
      mail_delivery_status: [
        "pending",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "failed",
      ],
      mail_recipient_type: [
        "all",
        "council",
        "by_building",
        "by_floor",
        "custom",
      ],
      majority_type: [
        "art24",
        "art25",
        "art25_1",
        "art26",
        "art26_1",
        "unanimity",
      ],
      membership_role: [
        "admin",
        "gestionnaire",
        "membre_cs",
        "coproprietaire",
        "prestataire",
      ],
      notification_channel: [
        "email",
        "registered_email",
        "postal",
        "registered_postal",
        "hand_delivery",
      ],
      payment_method: ["bank_transfer", "card", "check", "cash", "other"],
      payment_status: ["recorded", "reconciled", "reversed"],
      period_status: ["open", "locked", "closed"],
      provider_category: ["syndic", "copropriete", "coproflex"],
      provider_domain: [
        "plomberie",
        "electricite",
        "chauffage",
        "ascenseur",
        "menage",
        "espaces_verts",
        "serrurerie",
        "peinture",
        "assurance",
        "juridique",
        "architecture",
        "toiture",
        "facade",
        "climatisation",
        "interphone",
        "portail",
        "securite",
        "autre",
      ],
      reminder_status: ["pending", "sent", "failed", "stale", "skipped"],
      repartition_basis: ["tantiemes", "surface", "custom"],
      resolution_status: [
        "draft",
        "pending",
        "voting",
        "voted",
        "approved",
        "rejected",
        "adjourned",
        "withdrawn",
      ],
      resolution_type: [
        "budget",
        "accounts",
        "works",
        "appointment",
        "contract",
        "rules",
        "other",
      ],
      service_order_event_type: [
        "created",
        "sent",
        "status_changed",
        "note_added",
        "document_added",
        "invoice_linked",
        "email_sent",
        "reminder_sent",
      ],
      service_order_origin: ["ag", "syndic", "cs", "urgence", "contrat"],
      service_order_status: [
        "draft",
        "to_send",
        "sent",
        "accepted",
        "refused",
        "scheduled",
        "in_progress",
        "completed",
        "invoiced",
        "paid",
        "closed",
        "cancelled",
      ],
      service_order_type: ["classique", "contractuel"],
      supplier_invoice_status: [
        "draft",
        "approved",
        "posted",
        "paid",
        "cancelled",
      ],
      transfer_destination: ["compte_courant", "budget_travaux"],
      urgency_level: ["low", "normal", "medium", "high", "critical"],
      vote_direction: ["for", "against", "abstention"],
      vote_source: ["live", "correspondence"],
      wall_post_category: [
        "information",
        "urgent",
        "question",
        "event",
        "other",
      ],
    },
  },
} as const


// ============================================================================
// Convenience Type Exports for backwards compatibility
// ============================================================================

// Tables
export type Provider = Database["public"]["Tables"]["providers"]["Row"]
export type ProviderInsert = Database["public"]["Tables"]["providers"]["Insert"]
export type Contract = Database["public"]["Tables"]["contracts"]["Row"]
export type ContractInsert = Database["public"]["Tables"]["contracts"]["Insert"]
export type ServiceOrder = Database["public"]["Tables"]["service_orders"]["Row"]
export type ServiceOrderInsert = Database["public"]["Tables"]["service_orders"]["Insert"]
export type ServiceOrderEvent = Database["public"]["Tables"]["service_order_events"]["Row"]
export type ServiceOrderEventInsert = Database["public"]["Tables"]["service_order_events"]["Insert"]
export type LogbookEntry = Database["public"]["Tables"]["logbook_entries"]["Row"]
export type LogbookEntryInsert = Database["public"]["Tables"]["logbook_entries"]["Insert"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"]

// Views
export type ProviderOverview = Database["public"]["Views"]["v_providers_overview"]["Row"]
export type ContractOverview = Database["public"]["Views"]["v_contracts_overview"]["Row"]
export type ContractAlert = Database["public"]["Views"]["v_contracts_alerts"]["Row"]
export type LogbookOverview = Database["public"]["Views"]["v_logbook_overview"]["Row"]
export type LogbookAlert = Database["public"]["Views"]["v_logbook_alerts"]["Row"]
export type ServiceOrderOverview = Database["public"]["Views"]["v_service_orders_overview"]["Row"]
export type MaintenanceStats = Database["public"]["Views"]["v_maintenance_stats"]["Row"]

// Enums (aliased for convenience)
export type ContractType = Database["public"]["Enums"]["contract_type"]
export type ContractStatus = Database["public"]["Enums"]["contract_status"]
export type ProviderCategory = Database["public"]["Enums"]["provider_category"]
export type ProviderDomain = Database["public"]["Enums"]["provider_domain"]
export type ServiceOrderStatus = Database["public"]["Enums"]["service_order_status"]
export type ServiceOrderType = Database["public"]["Enums"]["service_order_type"]
export type UrgencyLevel = Database["public"]["Enums"]["urgency_level"]
export type AgDraftType = Database["public"]["Enums"]["ag_draft_type"]
export type InterventionCategory = Database["public"]["Enums"]["intervention_category"]
export type LogbookEntryType = Database["public"]["Enums"]["logbook_entry_type"]

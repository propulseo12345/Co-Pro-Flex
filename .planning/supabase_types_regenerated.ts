export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          closed_at: string | null
          closed_by: string | null
          copro_id: string
          created_at: string
          end_date: string
          id: string
          name: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["period_status"]
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          copro_id: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          copro_id?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
        ]
      }
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          bank_name: string | null
          bic: string | null
          code: string
          copro_id: string
          created_at: string
          description: string | null
          iban: string | null
          id: string
          initial_balance: number
          is_active: boolean
          is_postable: boolean
          is_system: boolean
          name: string
          nature:
            | Database["public"]["Enums"]["account_receivable_nature"]
            | null
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          bank_name?: string | null
          bic?: string | null
          code: string
          copro_id: string
          created_at?: string
          description?: string | null
          iban?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_postable?: boolean
          is_system?: boolean
          name: string
          nature?:
            | Database["public"]["Enums"]["account_receivable_nature"]
            | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          bank_name?: string | null
          bic?: string | null
          code?: string
          copro_id?: string
          created_at?: string
          description?: string | null
          iban?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_postable?: boolean
          is_system?: boolean
          name?: string
          nature?:
            | Database["public"]["Enums"]["account_receivable_nature"]
            | null
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
          proxy_signed_at: string | null
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
          proxy_signed_at?: string | null
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
          proxy_signed_at?: string | null
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
            referencedRelation: "v_call_campaigns"
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_attendance_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_attendance_represented_by_id_fkey"
            columns: ["represented_by_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "fk_ag_att_proxy"
            columns: ["proxy_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_correspondence_vote_details: {
        Row: {
          copro_id: string
          coproprietaire_id: string
          correspondence_form_id: string
          id: string
          integrated_at: string | null
          integrated_vote_id: string | null
          recorded_at: string
          recorded_by: string | null
          resolution_id: string
          vote: Database["public"]["Enums"]["vote_choice"]
        }
        Insert: {
          copro_id: string
          coproprietaire_id: string
          correspondence_form_id: string
          id?: string
          integrated_at?: string | null
          integrated_vote_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          resolution_id: string
          vote: Database["public"]["Enums"]["vote_choice"]
        }
        Update: {
          copro_id?: string
          coproprietaire_id?: string
          correspondence_form_id?: string
          id?: string
          integrated_at?: string | null
          integrated_vote_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          resolution_id?: string
          vote?: Database["public"]["Enums"]["vote_choice"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_correspondence_vote_details_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["resolution_id"]
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
          notes: string | null
          received_at: string | null
          reception_method: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["correspondence_form_status"]
          updated_at: string
        }
        Insert: {
          ag_id: string
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          form_document_id?: string | null
          id?: string
          integrated_at?: string | null
          notes?: string | null
          received_at?: string | null
          reception_method?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["correspondence_form_status"]
          updated_at?: string
        }
        Update: {
          ag_id?: string
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          form_document_id?: string | null
          id?: string
          integrated_at?: string | null
          notes?: string | null
          received_at?: string | null
          reception_method?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["correspondence_form_status"]
          updated_at?: string
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
            referencedRelation: "v_call_campaigns"
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "ag_correspondence_votes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ag_corr_form"
            columns: ["form_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_envoi_tracking: {
        Row: {
          ag_id: string
          coproprietaire_id: string | null
          created_at: string
          delivered_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          method: Database["public"]["Enums"]["notification_channel"]
          sent_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          tracking_ref: string | null
          updated_at: string
        }
        Insert: {
          ag_id: string
          coproprietaire_id?: string | null
          created_at?: string
          delivered_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          method: Database["public"]["Enums"]["notification_channel"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_ref?: string | null
          updated_at?: string
        }
        Update: {
          ag_id?: string
          coproprietaire_id?: string | null
          created_at?: string
          delivered_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          method?: Database["public"]["Enums"]["notification_channel"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ag_envoi_tracking_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_envoi_tracking_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_envoi_tracking_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_envoi_tracking_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_envoi_tracking_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_envoi_tracking_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "fk_ag_envoi_doc"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
          pv_generated_at: string | null
          pv_sent_at: string | null
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
          pv_generated_at?: string | null
          pv_sent_at?: string | null
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
          pv_generated_at?: string | null
          pv_sent_at?: string | null
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_meetings_president_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer1_id_fkey"
            columns: ["scrutineer1_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_meetings_scrutineer2_id_fkey"
            columns: ["scrutineer2_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "ag_meetings_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ag_pv_doc"
            columns: ["pv_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_milestones: {
        Row: {
          ag_id: string
          copro_id: string
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          milestone_key: string | null
          updated_at: string
        }
        Insert: {
          ag_id: string
          copro_id: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          milestone_key?: string | null
          updated_at?: string
        }
        Update: {
          ag_id?: string
          copro_id?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          milestone_key?: string | null
          updated_at?: string
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
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_milestones_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
        ]
      }
      ag_notification_events: {
        Row: {
          copro_id: string | null
          created_at: string
          event_type: string | null
          id: string
          notification_id: string
          occurred_at: string | null
          payload: Json
        }
        Insert: {
          copro_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          notification_id: string
          occurred_at?: string | null
          payload?: Json
        }
        Update: {
          copro_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          notification_id?: string
          occurred_at?: string | null
          payload?: Json
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
          channel: Database["public"]["Enums"]["notification_channel"] | null
          copro_id: string
          coproprietaire_id: string | null
          created_at: string
          error_message: string | null
          id: string
          provider_ref: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
        }
        Insert: {
          ag_id: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          copro_id: string
          coproprietaire_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider_ref?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Update: {
          ag_id?: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          copro_id?: string
          coproprietaire_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider_ref?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
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
            referencedRelation: "v_call_campaigns"
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_notifications_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      ag_pending_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["ag_action_type"]
          activated_at: string | null
          ag_id: string
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          resolution_id: string
          result_data: Json | null
          status: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["ag_action_type"]
          activated_at?: string | null
          ag_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          resolution_id: string
          result_data?: Json | null
          status?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["ag_action_type"]
          activated_at?: string | null
          ag_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          resolution_id?: string
          result_data?: Json | null
          status?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "ag_pending_actions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pending_actions_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_pending_actions_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ag_pending_actions_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "ag_pending_actions_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
        ]
      }
      ag_resolutions: {
        Row: {
          action_type: Database["public"]["Enums"]["ag_action_type"] | null
          ag_id: string
          bridge_vote_id: string | null
          copro_id: string
          created_at: string
          description: string | null
          id: string
          is_bridgeable: boolean | null
          is_customized: boolean | null
          linked_budget_id: string | null
          linked_work_budget_id: string | null
          majority_type: Database["public"]["Enums"]["majority_type"]
          resolution_number: number
          resolution_type: Database["public"]["Enums"]["resolution_type"]
          status: Database["public"]["Enums"]["resolution_status"]
          threshold_tantiemes: number | null
          threshold_voters: number | null
          title: string
          updated_at: string
          variables: Json | null
          voted_at: string | null
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["ag_action_type"] | null
          ag_id: string
          bridge_vote_id?: string | null
          copro_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_bridgeable?: boolean | null
          is_customized?: boolean | null
          linked_budget_id?: string | null
          linked_work_budget_id?: string | null
          majority_type?: Database["public"]["Enums"]["majority_type"]
          resolution_number: number
          resolution_type?: Database["public"]["Enums"]["resolution_type"]
          status?: Database["public"]["Enums"]["resolution_status"]
          threshold_tantiemes?: number | null
          threshold_voters?: number | null
          title: string
          updated_at?: string
          variables?: Json | null
          voted_at?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["ag_action_type"] | null
          ag_id?: string
          bridge_vote_id?: string | null
          copro_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_bridgeable?: boolean | null
          is_customized?: boolean | null
          linked_budget_id?: string | null
          linked_work_budget_id?: string | null
          majority_type?: Database["public"]["Enums"]["majority_type"]
          resolution_number?: number
          resolution_type?: Database["public"]["Enums"]["resolution_type"]
          status?: Database["public"]["Enums"]["resolution_status"]
          threshold_tantiemes?: number | null
          threshold_voters?: number | null
          title?: string
          updated_at?: string
          variables?: Json | null
          voted_at?: string | null
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
            referencedRelation: "v_call_campaigns"
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
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["resolution_id"]
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
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
            referencedRelation: "v_call_campaigns"
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
          vote: Database["public"]["Enums"]["vote_choice"]
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
          vote: Database["public"]["Enums"]["vote_choice"]
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
          vote?: Database["public"]["Enums"]["vote_choice"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "ag_votes_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["resolution_id"]
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
          amount: number
          budget_id: string | null
          copro_id: string
          created_at: string
          destination: Database["public"]["Enums"]["transfer_destination"]
          id: string
          ledger_tx_id: string | null
          notes: string | null
          transfer_date: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          budget_id?: string | null
          copro_id: string
          created_at?: string
          destination: Database["public"]["Enums"]["transfer_destination"]
          id?: string
          ledger_tx_id?: string | null
          notes?: string | null
          transfer_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_id?: string | null
          copro_id?: string
          created_at?: string
          destination?: Database["public"]["Enums"]["transfer_destination"]
          id?: string
          ledger_tx_id?: string | null
          notes?: string | null
          transfer_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alur_transfers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "alur_transfers_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
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
          target_id: string | null
          target_type: Database["public"]["Enums"]["bank_match_target_type"]
        }
        Insert: {
          amount_matched: number
          bank_movement_id: string
          copro_id: string
          id?: string
          matched_at?: string
          matched_by?: string | null
          target_id?: string | null
          target_type: Database["public"]["Enums"]["bank_match_target_type"]
        }
        Update: {
          amount_matched?: number
          bank_movement_id?: string
          copro_id?: string
          id?: string
          matched_at?: string
          matched_by?: string | null
          target_id?: string | null
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
          account_id: string
          amount_signed: number
          bank_date: string
          bank_ref: string | null
          copro_id: string
          id: string
          label: string | null
          period_id: string | null
          status: Database["public"]["Enums"]["bank_movement_status"]
          value_date: string | null
        }
        Insert: {
          account_id: string
          amount_signed: number
          bank_date: string
          bank_ref?: string | null
          copro_id: string
          id?: string
          label?: string | null
          period_id?: string | null
          status?: Database["public"]["Enums"]["bank_movement_status"]
          value_date?: string | null
        }
        Update: {
          account_id?: string
          amount_signed?: number
          bank_date?: string
          bank_ref?: string | null
          copro_id?: string
          id?: string
          label?: string | null
          period_id?: string | null
          status?: Database["public"]["Enums"]["bank_movement_status"]
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bank_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bank_movements_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
          id: string
          label: string
          ledger_tx_id: string | null
          montant_ht: number | null
          piece_jointe: string | null
          rejection_comment: string | null
          status: Database["public"]["Enums"]["expense_status"]
          taux_tva: number | null
          tiers_id: string | null
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
          id?: string
          label: string
          ledger_tx_id?: string | null
          montant_ht?: number | null
          piece_jointe?: string | null
          rejection_comment?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          taux_tva?: number | null
          tiers_id?: string | null
          tx_date?: string
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
          id?: string
          label?: string
          ledger_tx_id?: string | null
          montant_ht?: number | null
          piece_jointe?: string | null
          rejection_comment?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          taux_tva?: number | null
          tiers_id?: string | null
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
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
            foreignKeyName: "budget_expenses_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "budget_expenses_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "budget_expenses_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_be_piece"
            columns: ["piece_jointe"]
            isOneToOne: false
            referencedRelation: "documents"
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
            referencedRelation: "v_account_balances"
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
      budget_payment_schedules: {
        Row: {
          amount: number | null
          budget_id: string | null
          copro_id: string
          created_at: string
          due_date: string | null
          id: string
          phase_label: string | null
          service_order_id: string | null
          status: Database["public"]["Enums"]["payment_phase_status"]
          updated_at: string
        }
        Insert: {
          amount?: number | null
          budget_id?: string | null
          copro_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          phase_label?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["payment_phase_status"]
          updated_at?: string
        }
        Update: {
          amount?: number | null
          budget_id?: string | null
          copro_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          phase_label?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["payment_phase_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_payment_schedules_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_payment_schedules_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_payment_schedules_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_payment_schedules_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bps_service_order"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
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
          source_ag_id: string | null
          status: Database["public"]["Enums"]["budget_status"]
          updated_at: string
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
          source_ag_id?: string | null
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
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
          source_ag_id?: string | null
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
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
            foreignKeyName: "budgets_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_budgets_source_ag"
            columns: ["source_ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_budgets_source_ag"
            columns: ["source_ag_id"]
            isOneToOne: false
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
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
        ]
      }
      cabinets: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          postal_code: string | null
          siret: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      call_for_funds: {
        Row: {
          budget_id: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          issue_date: string
          issued_at: string | null
          label: string
          ledger_tx_id: string | null
          period_id: string
          repartition_key_id: string | null
          status: Database["public"]["Enums"]["call_for_funds_status"]
          total_amount: number
          trimester: number | null
          updated_at: string
        }
        Insert: {
          budget_id?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          issue_date: string
          issued_at?: string | null
          label: string
          ledger_tx_id?: string | null
          period_id: string
          repartition_key_id?: string | null
          status?: Database["public"]["Enums"]["call_for_funds_status"]
          total_amount: number
          trimester?: number | null
          updated_at?: string
        }
        Update: {
          budget_id?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          issue_date?: string
          issued_at?: string | null
          label?: string
          ledger_tx_id?: string | null
          period_id?: string
          repartition_key_id?: string | null
          status?: Database["public"]["Enums"]["call_for_funds_status"]
          total_amount?: number
          trimester?: number | null
          updated_at?: string
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
            foreignKeyName: "call_for_funds_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "call_for_funds_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
          id: string
          lot_id: string
          repartition_key_id: string | null
          status: Database["public"]["Enums"]["call_line_status"]
          weight_snapshot: number | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          call_id: string
          copro_id: string
          id?: string
          lot_id: string
          repartition_key_id?: string | null
          status?: Database["public"]["Enums"]["call_line_status"]
          weight_snapshot?: number | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          call_id?: string
          copro_id?: string
          id?: string
          lot_id?: string
          repartition_key_id?: string | null
          status?: Database["public"]["Enums"]["call_line_status"]
          weight_snapshot?: number | null
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
            foreignKeyName: "call_for_funds_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
          },
        ]
      }
      collective_loan_shares: {
        Row: {
          id: string
          last_payment_date: string | null
          loan_id: string
          lot_id: string
          remaining_amount: number | null
          share_amount: number | null
        }
        Insert: {
          id?: string
          last_payment_date?: string | null
          loan_id: string
          lot_id: string
          remaining_amount?: number | null
          share_amount?: number | null
        }
        Update: {
          id?: string
          last_payment_date?: string | null
          loan_id?: string
          lot_id?: string
          remaining_amount?: number | null
          share_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collective_loan_shares_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collective_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collective_loan_shares_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collective_loan_shares_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "collective_loan_shares_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      collective_loans: {
        Row: {
          annual_payment: number | null
          copro_id: string
          end_date: string | null
          id: string
          interest_rate: number | null
          label: string | null
          ledger_tx_id: string | null
          lender: string | null
          remaining_amount: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["collective_loan_status"]
          total_amount: number | null
        }
        Insert: {
          annual_payment?: number | null
          copro_id: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          label?: string | null
          ledger_tx_id?: string | null
          lender?: string | null
          remaining_amount?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["collective_loan_status"]
          total_amount?: number | null
        }
        Update: {
          annual_payment?: number | null
          copro_id?: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          label?: string | null
          ledger_tx_id?: string | null
          lender?: string | null
          remaining_amount?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["collective_loan_status"]
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collective_loans_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collective_loans_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collective_loans_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "collective_loans_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
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
          copro_id: string
          created_at: string
          created_by: string | null
          domain_id: string
          end_date: string | null
          id: string
          is_regulatory: boolean
          label: string
          next_planned_intervention: string | null
          notice_months: number
          observations: string | null
          planned_day_of_month: number | null
          planned_frequency:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          reference: string | null
          renewal_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tacit_renewal: boolean
          terminated_at: string | null
          termination_reason: string | null
          tiers_id: string
          updated_at: string
        }
        Insert: {
          annual_amount?: number | null
          auto_generate_orders?: boolean
          billing_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          domain_id: string
          end_date?: string | null
          id?: string
          is_regulatory?: boolean
          label: string
          next_planned_intervention?: string | null
          notice_months?: number
          observations?: string | null
          planned_day_of_month?: number | null
          planned_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          reference?: string | null
          renewal_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          tacit_renewal?: boolean
          terminated_at?: string | null
          termination_reason?: string | null
          tiers_id: string
          updated_at?: string
        }
        Update: {
          annual_amount?: number | null
          auto_generate_orders?: boolean
          billing_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          domain_id?: string
          end_date?: string | null
          id?: string
          is_regulatory?: boolean
          label?: string
          next_planned_intervention?: string | null
          notice_months?: number
          observations?: string | null
          planned_day_of_month?: number | null
          planned_frequency?:
            | Database["public"]["Enums"]["intervention_frequency"]
            | null
          reference?: string | null
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          tacit_renewal?: boolean
          terminated_at?: string | null
          termination_reason?: string | null
          tiers_id?: string
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
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "work_domain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
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
          is_muted: boolean
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
          is_muted?: boolean
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
          is_muted?: boolean
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
            foreignKeyName: "conversation_members_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
          is_archived: boolean
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
          is_archived?: boolean
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
          is_archived?: boolean
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
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copro_invitations: {
        Row: {
          accepted_at: string | null
          copro_id: string
          coproprietaire_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "copro_invitations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copro_invitations_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copro_invitations_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copro_invitations_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "copro_invitations_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "copro_invitations_created_by_fkey"
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
          country: string
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_company: boolean
          is_resident: boolean
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          prefers_email: boolean
          prefers_paper: boolean
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
          country?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_company?: boolean
          is_resident?: boolean
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          prefers_email?: boolean
          prefers_paper?: boolean
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
          country?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_company?: boolean
          is_resident?: boolean
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          prefers_email?: boolean
          prefers_paper?: boolean
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
            foreignKeyName: "fk_coproprietaires_user"
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
          annee_construction: number | null
          cabinet_id: string
          city: string | null
          created_at: string
          date_reglement: string | null
          exercice_debut: number
          id: string
          name: string
          num_immatriculation: string | null
          onboarding_max_step: number | null
          onboarding_step: number | null
          postal_code: string | null
          siret: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          annee_construction?: number | null
          cabinet_id: string
          city?: string | null
          created_at?: string
          date_reglement?: string | null
          exercice_debut?: number
          id?: string
          name: string
          num_immatriculation?: string | null
          onboarding_max_step?: number | null
          onboarding_step?: number | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          annee_construction?: number | null
          cabinet_id?: string
          city?: string | null
          created_at?: string
          date_reglement?: string | null
          exercice_debut?: number
          id?: string
          name?: string
          num_immatriculation?: string | null
          onboarding_max_step?: number | null
          onboarding_step?: number | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copros_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "council_decisions_linked_ag_id_fkey"
            columns: ["linked_ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_decisions_linked_ag_id_fkey"
            columns: ["linked_ag_id"]
            isOneToOne: false
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "council_decisions_linked_resolution_id_fkey"
            columns: ["linked_resolution_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_decisions_linked_resolution_id_fkey"
            columns: ["linked_resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "council_decisions_linked_resolution_id_fkey"
            columns: ["linked_resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
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
            foreignKeyName: "council_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_council_doc"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "council_members_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
          vote: Database["public"]["Enums"]["vote_choice"]
          voted_at: string
        }
        Insert: {
          comment?: string | null
          copro_id: string
          council_member_id: string
          decision_id: string
          id?: string
          vote: Database["public"]["Enums"]["vote_choice"]
          voted_at?: string
        }
        Update: {
          comment?: string | null
          copro_id?: string
          council_member_id?: string
          decision_id?: string
          id?: string
          vote?: Database["public"]["Enums"]["vote_choice"]
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
            foreignKeyName: "council_votes_council_member_id_fkey"
            columns: ["council_member_id"]
            isOneToOne: false
            referencedRelation: "council_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_votes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "council_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          category_default:
            | Database["public"]["Enums"]["document_category"]
            | null
          color: string
          copro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_default?:
            | Database["public"]["Enums"]["document_category"]
            | null
          color?: string
          copro_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_default?:
            | Database["public"]["Enums"]["document_category"]
            | null
          color?: string
          copro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
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
        ]
      }
      document_relations: {
        Row: {
          copro_id: string
          created_at: string
          created_by: string | null
          document_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["document_entity_type"]
          id: string
          label: string | null
          relation_kind: Database["public"]["Enums"]["document_relation_kind"]
        }
        Insert: {
          copro_id: string
          created_at?: string
          created_by?: string | null
          document_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["document_entity_type"]
          id?: string
          label?: string | null
          relation_kind?: Database["public"]["Enums"]["document_relation_kind"]
        }
        Update: {
          copro_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["document_entity_type"]
          id?: string
          label?: string | null
          relation_kind?: Database["public"]["Enums"]["document_relation_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "document_relations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_relations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_relations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          category: Database["public"]["Enums"]["document_category"]
          copro_id: string
          coproprietaire_id: string | null
          created_at: string
          created_by: string | null
          current_version_no: number
          deletion_blocked: boolean
          description: string | null
          document_date: string | null
          expiration_date: string | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          is_archived: boolean
          is_starred: boolean
          lot_id: string | null
          mime_type: string | null
          retention_years: number | null
          search_text: unknown
          source_module: Database["public"]["Enums"]["document_source"]
          status: Database["public"]["Enums"]["document_status"]
          tags: string[] | null
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["document_visibility"]
          year: number | null
        }
        Insert: {
          archived_at?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          copro_id: string
          coproprietaire_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_no?: number
          deletion_blocked?: boolean
          description?: string | null
          document_date?: string | null
          expiration_date?: string | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_starred?: boolean
          lot_id?: string | null
          mime_type?: string | null
          retention_years?: number | null
          search_text?: unknown
          source_module?: Database["public"]["Enums"]["document_source"]
          status?: Database["public"]["Enums"]["document_status"]
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["document_visibility"]
          year?: number | null
        }
        Update: {
          archived_at?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          copro_id?: string
          coproprietaire_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_no?: number
          deletion_blocked?: boolean
          description?: string | null
          document_date?: string | null
          expiration_date?: string | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_starred?: boolean
          lot_id?: string | null
          mime_type?: string | null
          retention_years?: number | null
          search_text?: unknown
          source_module?: Database["public"]["Enums"]["document_source"]
          status?: Database["public"]["Enums"]["document_status"]
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["document_visibility"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "documents_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
      email_templates: {
        Row: {
          available_variables: Json
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
          available_variables?: Json
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
          available_variables?: Json
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
        ]
      }
      etat_date_snapshots: {
        Row: {
          copro_id: string
          created_at: string
          document_id: string | null
          effective_date: string
          generated_at: string
          generated_by: string | null
          id: string
          lot_id: string
          mutation_id: string
          payload: Json
          snapshot_type: Database["public"]["Enums"]["etat_date_type"]
        }
        Insert: {
          copro_id: string
          created_at?: string
          document_id?: string | null
          effective_date: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          lot_id: string
          mutation_id: string
          payload: Json
          snapshot_type: Database["public"]["Enums"]["etat_date_type"]
        }
        Update: {
          copro_id?: string
          created_at?: string
          document_id?: string | null
          effective_date?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          lot_id?: string
          mutation_id?: string
          payload?: Json
          snapshot_type?: Database["public"]["Enums"]["etat_date_type"]
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
            foreignKeyName: "etat_date_snapshots_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "etat_date_snapshots_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
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
            foreignKeyName: "fk_etatdate_doc"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_linked_ag_id_fkey"
            columns: ["linked_ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_linked_ag_id_fkey"
            columns: ["linked_ag_id"]
            isOneToOne: false
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "events_linked_service_order_id_fkey"
            columns: ["linked_service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          annual_premium: number | null
          contract_id: string
          copro_id: string
          created_at: string
          deductible: number | null
          guarantees: string[]
          id: string
          insurer_name: string | null
          observations: string | null
          policy_number: string | null
          related_works: string | null
          sub_type: Database["public"]["Enums"]["insurance_sub_type"]
          updated_at: string
          works_reception_date: string | null
        }
        Insert: {
          annual_premium?: number | null
          contract_id: string
          copro_id: string
          created_at?: string
          deductible?: number | null
          guarantees?: string[]
          id?: string
          insurer_name?: string | null
          observations?: string | null
          policy_number?: string | null
          related_works?: string | null
          sub_type: Database["public"]["Enums"]["insurance_sub_type"]
          updated_at?: string
          works_reception_date?: string | null
        }
        Update: {
          annual_premium?: number | null
          contract_id?: string
          copro_id?: string
          created_at?: string
          deductible?: number | null
          guarantees?: string[]
          id?: string
          insurer_name?: string | null
          observations?: string | null
          policy_number?: string | null
          related_works?: string | null
          sub_type?: Database["public"]["Enums"]["insurance_sub_type"]
          updated_at?: string
          works_reception_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount: number
          copro_id: string
          direction: Database["public"]["Enums"]["ledger_direction"]
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
          direction: Database["public"]["Enums"]["ledger_direction"]
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
          direction?: Database["public"]["Enums"]["ledger_direction"]
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
            referencedRelation: "v_account_balances"
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
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          copro_id: string
          created_by: string | null
          id: string
          label: string
          metadata: Json
          period_id: string
          posted_at: string | null
          posted_by: string | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["ledger_source_type"]
          status: Database["public"]["Enums"]["ledger_tx_status"]
          tx_date: string
        }
        Insert: {
          copro_id: string
          created_by?: string | null
          id?: string
          label: string
          metadata?: Json
          period_id: string
          posted_at?: string | null
          posted_by?: string | null
          source_id?: string | null
          source_type: Database["public"]["Enums"]["ledger_source_type"]
          status?: Database["public"]["Enums"]["ledger_tx_status"]
          tx_date?: string
        }
        Update: {
          copro_id?: string
          created_by?: string | null
          id?: string
          label?: string
          metadata?: Json
          period_id?: string
          posted_at?: string | null
          posted_by?: string | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["ledger_source_type"]
          status?: Database["public"]["Enums"]["ledger_tx_status"]
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
            foreignKeyName: "ledger_transactions_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_proceedings: {
        Row: {
          amount_at_stake: number | null
          copro_id: string
          court: string | null
          created_at: string
          debtor_owner_id: string | null
          end_date: string | null
          id: string
          lawyer: string | null
          lot_id: string | null
          nature: Database["public"]["Enums"]["legal_proceeding_nature"]
          nature_filter:
            | Database["public"]["Enums"]["repartition_category"]
            | null
          notes: string | null
          opposing_party: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["legal_proceeding_status"]
          title: string
          updated_at: string
        }
        Insert: {
          amount_at_stake?: number | null
          copro_id: string
          court?: string | null
          created_at?: string
          debtor_owner_id?: string | null
          end_date?: string | null
          id?: string
          lawyer?: string | null
          lot_id?: string | null
          nature: Database["public"]["Enums"]["legal_proceeding_nature"]
          nature_filter?:
            | Database["public"]["Enums"]["repartition_category"]
            | null
          notes?: string | null
          opposing_party?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["legal_proceeding_status"]
          title: string
          updated_at?: string
        }
        Update: {
          amount_at_stake?: number | null
          copro_id?: string
          court?: string | null
          created_at?: string
          debtor_owner_id?: string | null
          end_date?: string | null
          id?: string
          lawyer?: string | null
          lot_id?: string | null
          nature?: Database["public"]["Enums"]["legal_proceeding_nature"]
          nature_filter?:
            | Database["public"]["Enums"]["repartition_category"]
            | null
          notes?: string | null
          opposing_party?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["legal_proceeding_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_proceedings_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_proceedings_debtor_owner_id_fkey"
            columns: ["debtor_owner_id"]
            isOneToOne: false
            referencedRelation: "coproprietaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_proceedings_debtor_owner_id_fkey"
            columns: ["debtor_owner_id"]
            isOneToOne: false
            referencedRelation: "v_coproprietaires_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_proceedings_debtor_owner_id_fkey"
            columns: ["debtor_owner_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "legal_proceedings_debtor_owner_id_fkey"
            columns: ["debtor_owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "legal_proceedings_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_proceedings_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "legal_proceedings_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
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
          domain_id: string | null
          entry_type: Database["public"]["Enums"]["logbook_entry_type"]
          equipment_concerned: string | null
          happened_at: string
          id: string
          next_due_at: string | null
          provider_name_snapshot: string | null
          service_order_id: string | null
          status: Database["public"]["Enums"]["logbook_status"]
          tiers_id: string | null
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
          domain_id?: string | null
          entry_type: Database["public"]["Enums"]["logbook_entry_type"]
          equipment_concerned?: string | null
          happened_at: string
          id?: string
          next_due_at?: string | null
          provider_name_snapshot?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["logbook_status"]
          tiers_id?: string | null
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
          domain_id?: string | null
          entry_type?: Database["public"]["Enums"]["logbook_entry_type"]
          equipment_concerned?: string | null
          happened_at?: string
          id?: string
          next_due_at?: string | null
          provider_name_snapshot?: string | null
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["logbook_status"]
          tiers_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "logbook_entries_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
            foreignKeyName: "logbook_entries_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "work_domain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
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
          is_primary: boolean
          lot_id: string
          share_percent: number
          start_date: string
        }
        Insert: {
          copro_id: string
          coproprietaire_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          lot_id: string
          share_percent?: number
          start_date?: string
        }
        Update: {
          copro_id?: string
          coproprietaire_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          lot_id?: string
          share_percent?: number
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["coproprietaire_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
          type: Database["public"]["Enums"]["lot_type"]
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
          type?: Database["public"]["Enums"]["lot_type"]
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
          type?: Database["public"]["Enums"]["lot_type"]
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
        ]
      }
      mails: {
        Row: {
          attachments: Json | null
          body: string
          body_html: string | null
          cc_emails: Json | null
          copro_id: string
          created_at: string
          deleted_at: string | null
          from_email: string
          from_name: string
          id: string
          in_reply_to: string | null
          is_archived: boolean
          is_deleted: boolean
          is_read: boolean
          is_starred: boolean
          label_ids: string[] | null
          owner_id: string
          received_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          thread_id: string | null
          to_emails: Json
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          body_html?: string | null
          cc_emails?: Json | null
          copro_id: string
          created_at?: string
          deleted_at?: string | null
          from_email: string
          from_name: string
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_deleted?: boolean
          is_read?: boolean
          is_starred?: boolean
          label_ids?: string[] | null
          owner_id: string
          received_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status: string
          subject: string
          thread_id?: string | null
          to_emails: Json
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          body_html?: string | null
          cc_emails?: Json | null
          copro_id?: string
          created_at?: string
          deleted_at?: string | null
          from_email?: string
          from_name?: string
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_deleted?: boolean
          is_read?: boolean
          is_starred?: boolean
          label_ids?: string[] | null
          owner_id?: string
          received_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          thread_id?: string | null
          to_emails?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mails_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mails_in_reply_to_fkey"
            columns: ["in_reply_to"]
            isOneToOne: false
            referencedRelation: "mails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mails_owner_id_fkey"
            columns: ["owner_id"]
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
          message_type: Database["public"]["Enums"]["message_type"]
          read_by: string[]
          reply_to_id: string | null
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
          message_type?: Database["public"]["Enums"]["message_type"]
          read_by?: string[]
          reply_to_id?: string | null
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
          message_type?: Database["public"]["Enums"]["message_type"]
          read_by?: string[]
          reply_to_id?: string | null
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
            foreignKeyName: "messages_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mutation_oppositions: {
        Row: {
          amount_opposed: number
          avis_mutation_date: string
          causes: Json
          copro_id: string
          created_at: string
          id: string
          ledger_transaction_id: string | null
          lot_id: string
          mutation_id: string
          notaire_id: string | null
          notaire_payment_date: string | null
          notes: string | null
          opposition_date: string | null
          opposition_deadline: string
          paid_amount: number | null
          status: Database["public"]["Enums"]["opposition_status"]
          updated_at: string
        }
        Insert: {
          amount_opposed?: number
          avis_mutation_date: string
          causes?: Json
          copro_id: string
          created_at?: string
          id?: string
          ledger_transaction_id?: string | null
          lot_id: string
          mutation_id: string
          notaire_id?: string | null
          notaire_payment_date?: string | null
          notes?: string | null
          opposition_date?: string | null
          opposition_deadline: string
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["opposition_status"]
          updated_at?: string
        }
        Update: {
          amount_opposed?: number
          avis_mutation_date?: string
          causes?: Json
          copro_id?: string
          created_at?: string
          id?: string
          ledger_transaction_id?: string | null
          lot_id?: string
          mutation_id?: string
          notaire_id?: string | null
          notaire_payment_date?: string | null
          notes?: string | null
          opposition_date?: string | null
          opposition_deadline?: string
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["opposition_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutation_oppositions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_oppositions_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_oppositions_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "mutation_oppositions_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "mutation_oppositions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_oppositions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "mutation_oppositions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_oppositions_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: true
            referencedRelation: "mutations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_oppositions_mutation_id_fkey"
            columns: ["mutation_id"]
            isOneToOne: true
            referencedRelation: "v_mutation_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_oppositions_notaire_id_fkey"
            columns: ["notaire_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_oppositions_notaire_id_fkey"
            columns: ["notaire_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      mutation_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          copro_id: string
          created_at: string
          id: string
          mutation_id: string
          payload: Json | null
          status: Database["public"]["Enums"]["mutation_step_status"]
          step_key: Database["public"]["Enums"]["mutation_step_key"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          copro_id: string
          created_at?: string
          id?: string
          mutation_id: string
          payload?: Json | null
          status?: Database["public"]["Enums"]["mutation_step_status"]
          step_key: Database["public"]["Enums"]["mutation_step_key"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          copro_id?: string
          created_at?: string
          id?: string
          mutation_id?: string
          payload?: Json | null
          status?: Database["public"]["Enums"]["mutation_step_status"]
          step_key?: Database["public"]["Enums"]["mutation_step_key"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutation_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutation_steps_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
        ]
      }
      mutations: {
        Row: {
          buyer_owner_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          lot_id: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          notaire_id: string | null
          notes: string | null
          period_id: string | null
          requested_at: string
          seller_owner_id: string
          signature_date: string | null
          status: Database["public"]["Enums"]["mutation_status"]
          updated_at: string
        }
        Insert: {
          buyer_owner_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          lot_id: string
          mutation_type?: Database["public"]["Enums"]["mutation_type"]
          notaire_id?: string | null
          notes?: string | null
          period_id?: string | null
          requested_at?: string
          seller_owner_id: string
          signature_date?: string | null
          status?: Database["public"]["Enums"]["mutation_status"]
          updated_at?: string
        }
        Update: {
          buyer_owner_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          lot_id?: string
          mutation_type?: Database["public"]["Enums"]["mutation_type"]
          notaire_id?: string | null
          notes?: string | null
          period_id?: string | null
          requested_at?: string
          seller_owner_id?: string
          signature_date?: string | null
          status?: Database["public"]["Enums"]["mutation_status"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
            foreignKeyName: "mutations_notaire_id_fkey"
            columns: ["notaire_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_notaire_id_fkey"
            columns: ["notaire_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount_allocated: number
          call_line_id: string
          copro_id: string
          id: string
          payment_id: string
        }
        Insert: {
          amount_allocated: number
          call_line_id: string
          copro_id: string
          id?: string
          payment_id: string
        }
        Update: {
          amount_allocated?: number
          call_line_id?: string
          copro_id?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_alloc_call_line"
            columns: ["call_line_id"]
            isOneToOne: false
            referencedRelation: "call_for_funds_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_alloc_call_line"
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
          label: string | null
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
          label?: string | null
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
          label?: string | null
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
            foreignKeyName: "payment_reminder_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          call_id: string | null
          call_line_id: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          content: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          days_overdue: number | null
          delay_level: number | null
          delivery_status: Database["public"]["Enums"]["delivery_status"] | null
          id: string
          lot_id: string
          oldest_due_date: string | null
          owner_id: string | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          reminder_rule_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          unpaid_amount: number
          updated_at: string
        }
        Insert: {
          call_id?: string | null
          call_line_id?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          content?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          days_overdue?: number | null
          delay_level?: number | null
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          id?: string
          lot_id: string
          oldest_due_date?: string | null
          owner_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reminder_rule_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          unpaid_amount: number
          updated_at?: string
        }
        Update: {
          call_id?: string | null
          call_line_id?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          content?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          days_overdue?: number | null
          delay_level?: number | null
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          id?: string
          lot_id?: string
          oldest_due_date?: string | null
          owner_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reminder_rule_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          unpaid_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_for_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "v_calls_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_call_line_id_fkey"
            columns: ["call_line_id"]
            isOneToOne: false
            referencedRelation: "call_for_funds_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_call_line_id_fkey"
            columns: ["call_line_id"]
            isOneToOne: false
            referencedRelation: "v_call_lines_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
          created_by: string | null
          id: string
          idempotency_key: string | null
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
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          ledger_tx_id?: string | null
          lot_id: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_date?: string
          period_id: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          copro_id?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
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
            foreignKeyName: "payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
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
        ]
      }
      period_cutoff_items: {
        Row: {
          account_id: string
          amount: number
          auto_reverse: boolean
          copro_id: string
          counterpart_account_id: string
          id: string
          kind: Database["public"]["Enums"]["cutoff_kind"]
          label: string | null
          period_id: string
          posting_tx_id: string | null
          reversal_tx_id: string | null
          tiers_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          auto_reverse?: boolean
          copro_id: string
          counterpart_account_id: string
          id?: string
          kind: Database["public"]["Enums"]["cutoff_kind"]
          label?: string | null
          period_id: string
          posting_tx_id?: string | null
          reversal_tx_id?: string | null
          tiers_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          auto_reverse?: boolean
          copro_id?: string
          counterpart_account_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["cutoff_kind"]
          label?: string | null
          period_id?: string
          posting_tx_id?: string | null
          reversal_tx_id?: string | null
          tiers_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cutoff_tiers"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cutoff_tiers"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_cutoff_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_cutoff_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "period_cutoff_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "period_cutoff_items_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_cutoff_items_counterpart_account_id_fkey"
            columns: ["counterpart_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_cutoff_items_counterpart_account_id_fkey"
            columns: ["counterpart_account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "period_cutoff_items_counterpart_account_id_fkey"
            columns: ["counterpart_account_id"]
            isOneToOne: false
            referencedRelation: "v_general_ledger"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "period_cutoff_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_cutoff_items_posting_tx_id_fkey"
            columns: ["posting_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_cutoff_items_posting_tx_id_fkey"
            columns: ["posting_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "period_cutoff_items_posting_tx_id_fkey"
            columns: ["posting_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "period_cutoff_items_reversal_tx_id_fkey"
            columns: ["reversal_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_cutoff_items_reversal_tx_id_fkey"
            columns: ["reversal_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "period_cutoff_items_reversal_tx_id_fkey"
            columns: ["reversal_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
        ]
      }
      planned_works: {
        Row: {
          actual_amount: number | null
          ag_id: string | null
          budget_line_id: string | null
          completion_date: string | null
          copro_id: string
          created_at: string
          created_by: string | null
          description: string | null
          domain_id: string
          estimated_amount: number | null
          from_ppt: boolean
          id: string
          label: string
          observations: string | null
          planned_date: string | null
          ppt_year: number | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          resolution_id: string | null
          status: Database["public"]["Enums"]["planned_work_status"]
          updated_at: string
          vote_date: string | null
          voted_amount: number | null
        }
        Insert: {
          actual_amount?: number | null
          ag_id?: string | null
          budget_line_id?: string | null
          completion_date?: string | null
          copro_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id: string
          estimated_amount?: number | null
          from_ppt?: boolean
          id?: string
          label: string
          observations?: string | null
          planned_date?: string | null
          ppt_year?: number | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          resolution_id?: string | null
          status?: Database["public"]["Enums"]["planned_work_status"]
          updated_at?: string
          vote_date?: string | null
          voted_amount?: number | null
        }
        Update: {
          actual_amount?: number | null
          ag_id?: string | null
          budget_line_id?: string | null
          completion_date?: string | null
          copro_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id?: string
          estimated_amount?: number | null
          from_ppt?: boolean
          id?: string
          label?: string
          observations?: string | null
          planned_date?: string | null
          ppt_year?: number | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          resolution_id?: string | null
          status?: Database["public"]["Enums"]["planned_work_status"]
          updated_at?: string
          vote_date?: string | null
          voted_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_works_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "ag_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_works_ag_id_fkey"
            columns: ["ag_id"]
            isOneToOne: false
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "planned_works_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_works_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "v_budget_lines_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_works_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_works_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_works_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "work_domain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_works_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "ag_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_works_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "planned_works_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "v_ag_vote_stats_by_resolution"
            referencedColumns: ["resolution_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cabinet_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cabinet_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cabinet_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          copro_id: string
          is_paused: boolean
          pause_reason: string | null
          paused_until: string | null
          updated_at: string
        }
        Insert: {
          copro_id: string
          is_paused?: boolean
          pause_reason?: string | null
          paused_until?: string | null
          updated_at?: string
        }
        Update: {
          copro_id?: string
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
          category: Database["public"]["Enums"]["repartition_category"]
          copro_id: string
          coverage_mode: Database["public"]["Enums"]["coverage_mode"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          basis: Database["public"]["Enums"]["repartition_basis"]
          category?: Database["public"]["Enums"]["repartition_category"]
          copro_id: string
          coverage_mode?: Database["public"]["Enums"]["coverage_mode"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          basis?: Database["public"]["Enums"]["repartition_basis"]
          category?: Database["public"]["Enums"]["repartition_category"]
          copro_id?: string
          coverage_mode?: Database["public"]["Enums"]["coverage_mode"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repartition_keys_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
        ]
      }
      service_orders: {
        Row: {
          acknowledged_at: string | null
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
          is_art18_emergency: boolean
          logbook_entry_id: string | null
          lot_id: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["service_order_type"]
          origin: Database["public"]["Enums"]["service_order_origin"]
          quoted_amount: number | null
          quoted_at: string | null
          refusal_reason: string | null
          refused_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          tiers_id: string
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["priority_level"]
          validated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
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
          is_art18_emergency?: boolean
          logbook_entry_id?: string | null
          lot_id?: string | null
          order_number: string
          order_type?: Database["public"]["Enums"]["service_order_type"]
          origin?: Database["public"]["Enums"]["service_order_origin"]
          quoted_amount?: number | null
          quoted_at?: string | null
          refusal_reason?: string | null
          refused_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          tiers_id: string
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["priority_level"]
          validated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
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
          is_art18_emergency?: boolean
          logbook_entry_id?: string | null
          lot_id?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["service_order_type"]
          origin?: Database["public"]["Enums"]["service_order_origin"]
          quoted_amount?: number | null
          quoted_at?: string | null
          refusal_reason?: string | null
          refused_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          tiers_id?: string
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["priority_level"]
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_so_logbook"
            columns: ["logbook_entry_id"]
            isOneToOne: false
            referencedRelation: "logbook_entries"
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
            foreignKeyName: "service_orders_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
            foreignKeyName: "service_orders_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoice_lines: {
        Row: {
          account_id: string
          amount: number
          amount_ht: number | null
          amount_tva: number | null
          budget_line_id: string | null
          copro_id: string
          created_at: string
          id: string
          invoice_id: string
          label: string
          repartition_key_id: string | null
          taux_pct: number | null
        }
        Insert: {
          account_id: string
          amount: number
          amount_ht?: number | null
          amount_tva?: number | null
          budget_line_id?: string | null
          copro_id: string
          created_at?: string
          id?: string
          invoice_id: string
          label: string
          repartition_key_id?: string | null
          taux_pct?: number | null
        }
        Update: {
          account_id?: string
          amount?: number
          amount_ht?: number | null
          amount_tva?: number | null
          budget_line_id?: string | null
          copro_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          label?: string
          repartition_key_id?: string | null
          taux_pct?: number | null
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
            referencedRelation: "v_account_balances"
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
            referencedRelation: "v_supplier_invoices_overview"
            referencedColumns: ["id"]
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
          invoice_number: string
          label: string
          ledger_tx_id: string | null
          montant_ht: number | null
          montant_tva: number | null
          period_id: string
          service_order_id: string | null
          status: Database["public"]["Enums"]["supplier_invoice_status"]
          taux_tva: number | null
          tiers_id: string
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
          invoice_number: string
          label: string
          ledger_tx_id?: string | null
          montant_ht?: number | null
          montant_tva?: number | null
          period_id: string
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          taux_tva?: number | null
          tiers_id: string
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
          invoice_number?: string
          label?: string
          ledger_tx_id?: string | null
          montant_ht?: number | null
          montant_tva?: number | null
          period_id?: string
          service_order_id?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          taux_tva?: number | null
          tiers_id?: string
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
            foreignKeyName: "supplier_invoices_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "supplier_invoices_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "supplier_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
          ledger_tx_id?: string | null
          method: Database["public"]["Enums"]["payment_method"]
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
          idempotency_key?: string | null
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
            foreignKeyName: "supplier_payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "supplier_payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "supplier_payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
            referencedRelation: "v_supplier_invoices_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_documents: {
        Row: {
          added_date: string
          copro_id: string
          created_at: string
          created_by: string | null
          doc_type: Database["public"]["Enums"]["technical_doc_type"]
          document_id: string
          id: string
          name: string
          observations: string | null
          updated_at: string
          validity_date: string | null
        }
        Insert: {
          added_date?: string
          copro_id: string
          created_at?: string
          created_by?: string | null
          doc_type: Database["public"]["Enums"]["technical_doc_type"]
          document_id: string
          id?: string
          name: string
          observations?: string | null
          updated_at?: string
          validity_date?: string | null
        }
        Update: {
          added_date?: string
          copro_id?: string
          created_at?: string
          created_by?: string | null
          doc_type?: Database["public"]["Enums"]["technical_doc_type"]
          document_id?: string
          id?: string
          name?: string
          observations?: string | null
          updated_at?: string
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_documents_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          address: string | null
          availability: string | null
          bic: string | null
          category: Database["public"]["Enums"]["tiers_category"]
          certifications: string[]
          city: string | null
          contact_name: string | null
          contact_role: string | null
          copro_id: string
          created_at: string
          description: string | null
          domain_ids: string[]
          email: string | null
          iban: string | null
          id: string
          internal_notes: string | null
          intervention_radius_km: number | null
          interventions_count: number
          is_active: boolean
          is_notary: boolean
          is_provider: boolean
          is_supplier: boolean
          last_intervention_at: string | null
          name: string
          notary_reference: string | null
          office_name: string | null
          phone: string | null
          phone_emergency: string | null
          postal_code: string | null
          rating_avg: number | null
          rating_count: number
          siret: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          availability?: string | null
          bic?: string | null
          category?: Database["public"]["Enums"]["tiers_category"]
          certifications?: string[]
          city?: string | null
          contact_name?: string | null
          contact_role?: string | null
          copro_id: string
          created_at?: string
          description?: string | null
          domain_ids?: string[]
          email?: string | null
          iban?: string | null
          id?: string
          internal_notes?: string | null
          intervention_radius_km?: number | null
          interventions_count?: number
          is_active?: boolean
          is_notary?: boolean
          is_provider?: boolean
          is_supplier?: boolean
          last_intervention_at?: string | null
          name: string
          notary_reference?: string | null
          office_name?: string | null
          phone?: string | null
          phone_emergency?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number
          siret?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          availability?: string | null
          bic?: string | null
          category?: Database["public"]["Enums"]["tiers_category"]
          certifications?: string[]
          city?: string | null
          contact_name?: string | null
          contact_role?: string | null
          copro_id?: string
          created_at?: string
          description?: string | null
          domain_ids?: string[]
          email?: string | null
          iban?: string | null
          id?: string
          internal_notes?: string | null
          intervention_radius_km?: number | null
          interventions_count?: number
          is_active?: boolean
          is_notary?: boolean
          is_provider?: boolean
          is_supplier?: boolean
          last_intervention_at?: string | null
          name?: string
          notary_reference?: string | null
          office_name?: string | null
          phone?: string | null
          phone_emergency?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number
          siret?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_advances: {
        Row: {
          advance_type: Database["public"]["Enums"]["treasury_advance_type"]
          amount_due: number
          amount_paid: number
          copro_id: string
          id: string
          label: string | null
          lot_id: string
        }
        Insert: {
          advance_type: Database["public"]["Enums"]["treasury_advance_type"]
          amount_due?: number
          amount_paid?: number
          copro_id: string
          id?: string
          label?: string | null
          lot_id: string
        }
        Update: {
          advance_type?: Database["public"]["Enums"]["treasury_advance_type"]
          amount_due?: number
          amount_paid?: number
          copro_id?: string
          id?: string
          label?: string | null
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_advances_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_advances_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_advances_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_alur_lot_contributions"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "treasury_advances_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["id"]
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
          is_locked: boolean
          is_pinned: boolean
          likes_count: number
          pinned_at: string | null
          pinned_by: string | null
          tags: string[]
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
          is_locked?: boolean
          is_pinned?: boolean
          likes_count?: number
          pinned_at?: string | null
          pinned_by?: string | null
          tags?: string[]
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
          is_locked?: boolean
          is_pinned?: boolean
          likes_count?: number
          pinned_at?: string | null
          pinned_by?: string | null
          tags?: string[]
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
            foreignKeyName: "wall_posts_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_domain: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      tiers_directory: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["tiers_category"] | null
          certifications: string[] | null
          city: string | null
          contact_name: string | null
          contact_role: string | null
          copro_id: string | null
          description: string | null
          domain_ids: string[] | null
          email: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          phone: string | null
          postal_code: string | null
          rating_avg: number | null
          rating_count: number | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["tiers_category"] | null
          certifications?: string[] | null
          city?: string | null
          contact_name?: string | null
          contact_role?: string | null
          copro_id?: string | null
          description?: string | null
          domain_ids?: string[] | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["tiers_category"] | null
          certifications?: string[] | null
          city?: string | null
          contact_name?: string | null
          contact_role?: string | null
          copro_id?: string | null
          description?: string | null
          domain_ids?: string[] | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
        ]
      }
      v_account_balances: {
        Row: {
          account_id: string | null
          banque: string | null
          code: string | null
          computed_balance: number | null
          copro_id: string | null
          iban: string | null
          initial_balance: number | null
          movements_total: number | null
          name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ag_resolution_vote_summary: {
        Row: {
          resolution_id: string | null
          tantiemes_abstention: number | null
          tantiemes_against: number | null
          tantiemes_for: number | null
          total_expressed: number | null
          votes_abstention: number | null
          votes_against: number | null
          votes_for: number | null
        }
        Relationships: [
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
            referencedRelation: "v_ag_resolutions_results"
            referencedColumns: ["resolution_id"]
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
      v_ag_resolutions_results: {
        Row: {
          action_type: Database["public"]["Enums"]["ag_action_type"] | null
          ag_id: string | null
          copro_id: string | null
          is_bridgeable: boolean | null
          majority_type: Database["public"]["Enums"]["majority_type"] | null
          resolution_id: string | null
          resolution_number: number | null
          resolution_type: Database["public"]["Enums"]["resolution_type"] | null
          status: Database["public"]["Enums"]["resolution_status"] | null
          tantiemes_abstention: number | null
          tantiemes_against: number | null
          tantiemes_for: number | null
          threshold_tantiemes: number | null
          threshold_voters: number | null
          title: string | null
          total_expressed: number | null
          voted_at: string | null
          votes_abstention: number | null
          votes_against: number | null
          votes_for: number | null
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
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ag_vote_stats_by_resolution: {
        Row: {
          ag_id: string | null
          copro_id: string | null
          pct_abstention_expressed: number | null
          pct_abstention_total: number | null
          pct_against_expressed: number | null
          pct_against_total: number | null
          pct_for_expressed: number | null
          pct_for_total: number | null
          resolution_id: string | null
          tantiemes_abstention: number | null
          tantiemes_against: number | null
          tantiemes_for: number | null
          total_expressed: number | null
          total_tantiemes: number | null
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
            referencedRelation: "v_call_campaigns"
            referencedColumns: ["ag_id"]
          },
          {
            foreignKeyName: "ag_resolutions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_alur_lot_contributions: {
        Row: {
          copro_id: string | null
          lot_cotisation_appelee: number | null
          lot_cotisation_versee: number | null
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "lots_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
        ]
      }
      v_alur_transfers_history: {
        Row: {
          amount: number | null
          budget_id: string | null
          copro_id: string | null
          created_at: string | null
          destination:
            | Database["public"]["Enums"]["transfer_destination"]
            | null
          id: string | null
          ledger_tx_id: string | null
          notes: string | null
          period_name: string | null
          period_year: number | null
          transfer_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alur_transfers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_alur_fund_summary"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "alur_transfers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alur_transfers_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "alur_transfers_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
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
            foreignKeyName: "bank_movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
          tiers_id: string | null
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
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
            foreignKeyName: "budget_expenses_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_be_piece"
            columns: ["piece_jointe"]
            isOneToOne: false
            referencedRelation: "documents"
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
            referencedRelation: "v_account_balances"
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
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
            foreignKeyName: "budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_call_campaigns: {
        Row: {
          ag_id: string | null
          ag_meeting_date: string | null
          ag_title: string | null
          copro_id: string | null
          global_status:
            | Database["public"]["Enums"]["call_for_funds_status"]
            | null
          period_end: string | null
          period_id: string | null
          period_name: string | null
          period_start: string | null
          total_amount: number | null
          total_calls: number | null
          total_keys: number | null
          total_paid: number | null
          total_trimesters: number | null
          trimesters_issued: number | null
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
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
          due_date: string | null
          id: string | null
          issue_date: string | null
          key_total_weight: number | null
          lot_id: string | null
          lot_ref: string | null
          lot_tantiemes: number | null
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          lot_weight: number | null
          owner_name: string | null
          repartition_key_id: string | null
          repartition_key_name: string | null
          status: Database["public"]["Enums"]["call_line_status"] | null
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
            foreignKeyName: "call_for_funds_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "repartition_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_lines_repartition_key_id_fkey"
            columns: ["repartition_key_id"]
            isOneToOne: false
            referencedRelation: "v_repartition_key_totals"
            referencedColumns: ["key_id"]
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
            referencedRelation: "v_budgets_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_for_funds_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
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
            foreignKeyName: "call_for_funds_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "call_for_funds_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "call_for_funds_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          civility?: string | null
          company_name?: string | null
          copro_id?: string | null
          council_role?: never
          country?: string | null
          created_at?: string | null
          display_name?: never
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_company?: boolean | null
          last_name?: string | null
          lots_count?: never
          mobile?: string | null
          notes?: string | null
          owner_type?: never
          phone?: string | null
          postal_code?: string | null
          prefers_email?: boolean | null
          prefers_paper?: boolean | null
          solde?: never
          total_tantiemes?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          civility?: string | null
          company_name?: string | null
          copro_id?: string | null
          council_role?: never
          country?: string | null
          created_at?: string | null
          display_name?: never
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_company?: boolean | null
          last_name?: string | null
          lots_count?: never
          mobile?: string | null
          notes?: string | null
          owner_type?: never
          phone?: string | null
          postal_code?: string | null
          prefers_email?: boolean | null
          prefers_paper?: boolean | null
          solde?: never
          total_tantiemes?: never
          updated_at?: string | null
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
            foreignKeyName: "fk_coproprietaires_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_document_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_id: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          version_number: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          version_number?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          version_number?: number | null
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
          credit: number | null
          debit: number | null
          direction: Database["public"]["Enums"]["ledger_direction"] | null
          entry_id: string | null
          entry_label: string | null
          lot_id: string | null
          lot_ref: string | null
          period_id: string | null
          posted_at: string | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["ledger_source_type"] | null
          status: Database["public"]["Enums"]["ledger_tx_status"] | null
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
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "ledger_entries_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "ledger_transactions_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      v_lot_vs_gl_mismatch: {
        Row: {
          copro_id: string | null
          difference: number | null
          gl_call_payment_balance: number | null
          lot_id: string | null
          lot_ref: string | null
          owner_name: string | null
          statement_balance: number | null
        }
        Relationships: []
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
        ]
      }
      v_mutation_detail: {
        Row: {
          buyer_owner_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          copro_id: string | null
          created_at: string | null
          effective_date: string | null
          id: string | null
          lot_id: string | null
          mutation_type: Database["public"]["Enums"]["mutation_type"] | null
          notaire_id: string | null
          notes: string | null
          opposition: Json | null
          period_id: string | null
          requested_at: string | null
          seller_owner_id: string | null
          signature_date: string | null
          status: Database["public"]["Enums"]["mutation_status"] | null
          steps: Json | null
          updated_at: string | null
        }
        Insert: {
          buyer_owner_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          copro_id?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string | null
          lot_id?: string | null
          mutation_type?: Database["public"]["Enums"]["mutation_type"] | null
          notaire_id?: string | null
          notes?: string | null
          opposition?: never
          period_id?: string | null
          requested_at?: string | null
          seller_owner_id?: string | null
          signature_date?: string | null
          status?: Database["public"]["Enums"]["mutation_status"] | null
          steps?: never
          updated_at?: string | null
        }
        Update: {
          buyer_owner_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          copro_id?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string | null
          lot_id?: string | null
          mutation_type?: Database["public"]["Enums"]["mutation_type"] | null
          notaire_id?: string | null
          notes?: string | null
          opposition?: never
          period_id?: string | null
          requested_at?: string | null
          seller_owner_id?: string | null
          signature_date?: string | null
          status?: Database["public"]["Enums"]["mutation_status"] | null
          steps?: never
          updated_at?: string | null
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "mutations_buyer_owner_id_fkey"
            columns: ["buyer_owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "mutations_copro_id_fkey"
            columns: ["copro_id"]
            isOneToOne: false
            referencedRelation: "copros"
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
            foreignKeyName: "mutations_notaire_id_fkey"
            columns: ["notaire_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_notaire_id_fkey"
            columns: ["notaire_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "mutations_seller_owner_id_fkey"
            columns: ["seller_owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      v_owner_statement_by_lot: {
        Row: {
          balance: number | null
          copro_id: string | null
          lot_id: string | null
          lot_ref: string | null
          owner_email: string | null
          owner_name: string | null
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
        ]
      }
      v_owner_statement_by_lot_detail: {
        Row: {
          account_code: string | null
          copro_id: string | null
          credit: number | null
          debit: number | null
          label: string | null
          lot_id: string | null
          lot_ref: string | null
          movement: number | null
          period_id: string | null
          period_name: string | null
          running_balance: number | null
          source_type: Database["public"]["Enums"]["ledger_source_type"] | null
          tx_date: string | null
          tx_id: string | null
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
        ]
      }
      v_owner_statement_by_person: {
        Row: {
          balance: number | null
          copro_id: string | null
          lots_count: number | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "lot_owners_coproprietaire_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
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
            referencedRelation: "v_lots_with_owners"
            referencedColumns: ["coproprietaire_id"]
          },
          {
            foreignKeyName: "payment_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_unpaid_with_reminders"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      v_payments_overview: {
        Row: {
          allocations_count: number | null
          amount: number | null
          copro_id: string | null
          id: string | null
          ledger_tx_id: string | null
          lot_id: string | null
          lot_ref: string | null
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
            foreignKeyName: "payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "payments_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
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
        ]
      }
      v_result_allocation_split: {
        Row: {
          copro_id: string | null
          mv_110: number | null
          mv_120: number | null
          mv_450_1: number | null
          mv_450_2: number | null
          period_id: string | null
          result_net: number | null
          source_period_id: string | null
          tx_id: string | null
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
            foreignKeyName: "ledger_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
          supplier_name: string | null
          tiers_id: string | null
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
            foreignKeyName: "supplier_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
            foreignKeyName: "supplier_invoices_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_owner_statement_by_lot_detail"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "supplier_invoices_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "v_result_allocation_split"
            referencedColumns: ["tx_id"]
          },
          {
            foreignKeyName: "supplier_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_tiers_id_fkey"
            columns: ["tiers_id"]
            isOneToOne: false
            referencedRelation: "tiers_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trial_balance: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
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
            referencedRelation: "v_account_balances"
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
            foreignKeyName: "ledger_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
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
      v_unpaid_lot_owner: {
        Row: {
          copro_id: string | null
          days_overdue: number | null
          lot_id: string | null
          lot_ref: string | null
          oldest_due_date: string | null
          owner_email: string | null
          owner_id: string | null
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
          lot_type: Database["public"]["Enums"]["lot_type"] | null
          oldest_due_date: string | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          owner_phone: string | null
          severity: string | null
          total_due: number | null
          total_paid: number | null
          total_reminders_sent: number | null
          total_unpaid: number | null
          unpaid_amount: number | null
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
    }
    Functions: {
      activate_ag_decisions: { Args: { p_ag_id: string }; Returns: Json }
      allocate_payment: {
        Args: {
          p_call_line_ids?: string[]
          p_nature_filter?: string
          p_payment_id: string
        }
        Returns: {
          amount_allocated: number
          call_line_id: string
        }[]
      }
      approve_period: { Args: { p_period_id: string }; Returns: Json }
      archive_ag: { Args: { p_ag_id: string }; Returns: Json }
      assert_result_allocation_split: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: undefined
      }
      audit_finance_integrity: {
        Args: { p_copro_id?: string }
        Returns: {
          actual_amount: number
          copro_id: string
          description: string
          difference: number
          entity_id: string
          entity_type: string
          expected_amount: number
          issue_type: string
        }[]
      }
      calculate_budget_projection: {
        Args: {
          p_budget_type?: Database["public"]["Enums"]["budget_type"]
          p_copro_id: string
          p_period_id: string
        }
        Returns: Json
      }
      calculate_resolution_result: {
        Args: { p_resolution_id: string }
        Returns: Json
      }
      can_view_content: {
        Args: {
          p_copro_id: string
          p_user_id: string
          p_visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Returns: boolean
      }
      cancel_stale_reminders: { Args: { p_copro_id: string }; Returns: number }
      cast_vote: {
        Args: {
          p_coproprietaire_id: string
          p_resolution_id: string
          p_vote: Database["public"]["Enums"]["vote_choice"]
          p_vote_source?: Database["public"]["Enums"]["vote_source"]
        }
        Returns: Json
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
      clear_ag_session_drafts: { Args: { p_ag_id: string }; Returns: Json }
      close_ag: {
        Args: { p_ag_id: string; p_closing_notes?: string }
        Returns: Json
      }
      close_period: { Args: { p_period_id: string }; Returns: Json }
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
          p_majority: Database["public"]["Enums"]["majority_type"]
          p_present_owners: number
          p_present_tantiemes: number
          p_total_owners: number
          p_total_tantiemes: number
        }
        Returns: Json
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
          p_coproprietaire_id?: string
          p_provider_ref?: string
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
      create_clean_test_copro: { Args: { p_name?: string }; Returns: string }
      create_clean_test_copro_seeded: {
        Args: { p_name?: string }
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
          p_snapshot_type: Database["public"]["Enums"]["etat_date_type"]
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
      create_test_copro: { Args: { p_name?: string }; Returns: string }
      create_test_copro_seeded: { Args: { p_name?: string }; Returns: string }
      cutoff_entry_pair: {
        Args: {
          p_account_id: string
          p_amount: number
          p_counterpart_id: string
          p_kind: string
          p_label: string
          p_reverse: boolean
        }
        Returns: Json
      }
      delete_ag_session_draft: {
        Args: {
          p_ag_id: string
          p_draft_type: Database["public"]["Enums"]["ag_draft_type"]
        }
        Returns: Json
      }
      delete_service_order: { Args: { p_order_id: string }; Returns: Json }
      finalize_and_activate_ag: {
        Args: { p_activate?: boolean; p_ag_id: string }
        Returns: Json
      }
      fn_annexe_1: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      fn_annexe_1_detail_copros: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      fn_annexe_2: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      fn_annexe_3: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      fn_annexe_4: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      fn_annexe_5: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      fn_dashboard_kpis: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      generate_calls_from_ag_payload: {
        Args: {
          p_ag_id: string
          p_copro_id: string
          p_payload: Json
          p_resolution_id: string
        }
        Returns: Json
      }
      generate_document_path: {
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
          p_snapshot_type: Database["public"]["Enums"]["etat_date_type"]
        }
        Returns: Json
      }
      generate_service_order_number: {
        Args: { p_copro_id: string }
        Returns: string
      }
      get_ag_all_session_drafts: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_envoi_tracking: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_live_results: { Args: { p_ag_id: string }; Returns: Json }
      get_ag_recipients: {
        Args: {
          p_ag_id: string
          p_notification_type?: string
          p_only_missing?: boolean
        }
        Returns: {
          already_notified: boolean
          copro_id: string
          coproprietaire_id: string
          email: string
          full_name: string
          is_company: boolean
        }[]
      }
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
      get_opening_balance: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      get_owner_statement: {
        Args: {
          p_copro_id: string
          p_lot_id?: string
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
        Args: { p_copro_id: string; p_date: string }
        Returns: string
      }
      get_supplier_invoice_paid_amount: {
        Args: { p_invoice_id: string }
        Returns: number
      }
      get_user_lot_ids: { Args: { p_copro_id: string }; Returns: string[] }
      get_votes_correspondance: { Args: { p_ag_id: string }; Returns: Json }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_council_member: {
        Args: { p_copro_id: string; p_user_id: string }
        Returns: boolean
      }
      is_council_president: {
        Args: { p_copro_id: string; p_user_id: string }
        Returns: boolean
      }
      is_ledger_regen_exempt: {
        Args: {
          p_posting_period_id: string
          p_source_id: string
          p_source_type: string
        }
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
      is_service_call: { Args: never; Returns: boolean }
      is_valid_service_order_transition: {
        Args: {
          p_from: Database["public"]["Enums"]["service_order_status"]
          p_to: Database["public"]["Enums"]["service_order_status"]
        }
        Returns: boolean
      }
      link_coproprietaire_account: {
        Args: { p_invite_token: string }
        Returns: string
      }
      loan_copro_id: { Args: { p_loan_id: string }; Returns: string }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_notification_failed: {
        Args: {
          p_error_message?: string
          p_event_payload?: Json
          p_notification_id: string
        }
        Returns: undefined
      }
      mark_notification_sent: {
        Args: {
          p_event_payload?: Json
          p_notification_id: string
          p_provider_ref?: string
        }
        Returns: undefined
      }
      mark_reminder_failed: {
        Args: { p_error_message?: string; p_reminder_id: string }
        Returns: undefined
      }
      mark_reminder_sent: {
        Args: { p_provider_message_id?: string; p_reminder_id: string }
        Returns: undefined
      }
      open_next_period: {
        Args: {
          p_closing_period_id: string
          p_copro_id: string
          p_new_end?: string
          p_new_name?: string
          p_new_start?: string
        }
        Returns: Json
      }
      post_budget_call_for_funds: {
        Args: {
          p_budget_id: string
          p_copro_id: string
          p_due_date: string
          p_fraction?: number
          p_installment_count?: number
          p_installment_index?: number
          p_issue_date: string
          p_label: string
          p_period_id: string
          p_trimester: number
        }
        Returns: Json
      }
      post_ledger_transaction: { Args: { p_tx_id: string }; Returns: Json }
      post_owner_payment: {
        Args: {
          p_amount: number
          p_call_line_ids?: string[]
          p_copro_id: string
          p_idempotency_key?: string
          p_lot_id: string
          p_method?: string
          p_nature_filter?: string
          p_payment_date: string
          p_period_id: string
          p_reference?: string
        }
        Returns: Json
      }
      post_period_cutoff: {
        Args: { p_copro_id: string; p_items: Json; p_period_id: string }
        Returns: Json
      }
      post_supplier_invoice: {
        Args: {
          p_copro_id: string
          p_document_id?: string
          p_due_date: string
          p_invoice_date: string
          p_invoice_number: string
          p_label: string
          p_lines: Json
          p_montant_ht?: number
          p_montant_tva?: number
          p_period_id: string
          p_post_immediately?: boolean
          p_service_order_id?: string
          p_taux_tva?: number
          p_tiers_id: string
        }
        Returns: Json
      }
      post_supplier_payment: {
        Args: {
          p_amount: number
          p_copro_id: string
          p_idempotency_key?: string
          p_method?: string
          p_payment_date: string
          p_period_id: string
          p_reference?: string
          p_supplier_invoice_id: string
        }
        Returns: Json
      }
      prepare_ag_decisions: { Args: { p_ag_id: string }; Returns: Json }
      provision_copro_chart: { Args: { p_copro_id: string }; Returns: number }
      provision_demo_tenant: { Args: never; Returns: Json }
      recalculate_all_call_statuses: {
        Args: { p_copro_id: string }
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
      regularize_period: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      reopen_period: { Args: { p_period_id: string }; Returns: Json }
      repartition_key_is_complete: {
        Args: { p_key_id: string }
        Returns: boolean
      }
      resolve_lot_tiers_account: {
        Args: { p_copro_id: string; p_nature: string }
        Returns: string
      }
      reverse_period_cutoff: {
        Args: { p_copro_id: string; p_period_id: string }
        Returns: Json
      }
      rpc_finalize_ag_session: {
        Args: { p_ag_id: string; p_closing_notes?: string }
        Returns: Json
      }
      rpc_get_ag_convocation_bundle: {
        Args: { p_ag_id: string }
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
      save_ag_envoi_tracking: {
        Args: { p_ag_id: string; p_entries: Json }
        Returns: Json
      }
      save_ag_session_draft: {
        Args: {
          p_ag_id: string
          p_draft_data: Json
          p_draft_type: Database["public"]["Enums"]["ag_draft_type"]
        }
        Returns: Json
      }
      save_ag_wizard_state: {
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
      seed_golden_loop: { Args: { p_copro_id: string }; Returns: Json }
      set_opening_balance: {
        Args: {
          p_as_of_date: string
          p_copro_id: string
          p_lines: Json
          p_period_id: string
        }
        Returns: Json
      }
      start_ag: {
        Args: { p_ag_id: string; p_opening_notes?: string }
        Returns: Json
      }
      submit_budget: { Args: { p_budget_id: string }; Returns: Json }
      update_call_status: { Args: { p_call_id: string }; Returns: undefined }
      update_service_order_status: {
        Args: {
          p_comment?: string
          p_new_status: Database["public"]["Enums"]["service_order_status"]
          p_order_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      upsert_mutation_step: {
        Args: {
          p_mutation_id: string
          p_payload?: Json
          p_status?: Database["public"]["Enums"]["mutation_step_status"]
          p_step_key: Database["public"]["Enums"]["mutation_step_key"]
        }
        Returns: {
          completed_at: string | null
          completed_by: string | null
          copro_id: string
          created_at: string
          id: string
          mutation_id: string
          payload: Json | null
          status: Database["public"]["Enums"]["mutation_step_status"]
          step_key: Database["public"]["Enums"]["mutation_step_key"]
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
      user_is_lot_owner: { Args: { p_lot_id: string }; Returns: boolean }
      user_is_lot_owner_in_copro: {
        Args: { p_copro_id: string; p_lot_id: string }
        Returns: boolean
      }
      user_is_lot_owner_or_manager: {
        Args: { p_copro_id: string; p_lot_id: string }
        Returns: boolean
      }
      user_is_platform_admin: { Args: never; Returns: boolean }
      user_owns_any_lot_in_copro: {
        Args: { p_copro_id: string }
        Returns: boolean
      }
      user_owns_share_in_loan: { Args: { p_loan_id: string }; Returns: boolean }
      validate_ag_variables: { Args: { p_ag_id: string }; Returns: Json }
      validate_budget: { Args: { p_budget_id: string }; Returns: Json }
      validate_budget_expense: { Args: { p_expense_id: string }; Returns: Json }
      validate_mutation: {
        Args: {
          p_buyer_company_name?: string
          p_buyer_email?: string
          p_buyer_first_name?: string
          p_buyer_is_company?: boolean
          p_buyer_last_name?: string
          p_buyer_owner_id?: string
          p_effective_date?: string
          p_mutation_id: string
          p_signature_date: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_receivable_nature:
        | "current"
        | "works"
        | "alur"
        | "loan"
        | "advance"
        | "doubtful"
      account_type: "asset" | "liability" | "income" | "expense" | "equity"
      ag_action_type:
        | "CREATE_BUDGET"
        | "APPROVE_ACCOUNTS"
        | "SCHEDULE_BUDGET_PAYMENTS"
        | "CREATE_ALUR_FUND"
        | "SCHEDULE_ALUR_PAYMENTS"
        | "CREATE_WORK_BUDGET"
        | "CREATE_EXCEPTIONAL_CALL"
        | "ELECT_COUNCIL"
        | "APPOINT_SYNDIC"
        | "MANAGE_CONTRACT"
        | "GRANT_QUITUS"
        | "DESIGNATE_BUREAU"
      ag_draft_type:
        | "attendance"
        | "resolutions"
        | "votes"
        | "pv"
        | "envoi"
        | "milestones"
        | "other"
      ag_meeting_type: "ordinary" | "extraordinary" | "mixed"
      ag_status:
        | "draft"
        | "convoked"
        | "in_progress"
        | "session_active"
        | "closed"
        | "pv_generated"
        | "pv_signed"
        | "pv_sent"
        | "finalized"
        | "archived"
      attendance_type: "present" | "proxy" | "correspondence"
      bank_match_target_type: "payment" | "supplier_payment" | "other"
      bank_movement_status: "unmatched" | "matched" | "ignored"
      budget_status: "draft" | "submitted" | "validated" | "rejected" | "closed"
      budget_type: "current" | "works" | "alur"
      call_for_funds_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "cancelled"
      call_line_status: "unpaid" | "partial" | "paid"
      collective_loan_status: "active" | "repaid" | "cancelled"
      content_visibility: "all_members" | "council_only" | "managers_only"
      contract_status:
        | "draft"
        | "active"
        | "to_renew"
        | "expired"
        | "terminated"
      correspondence_form_status: "pending" | "validated" | "integrated"
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
      coverage_mode: "all_lots" | "subset"
      cutoff_kind: "CAP" | "CCA" | "PCA" | "PAR"
      delivery_status:
        | "pending"
        | "queued"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
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
        | "ordre_service"
        | "autre"
      document_entity_type:
        | "ag"
        | "resolution"
        | "service_order"
        | "contract"
        | "supplier_invoice"
        | "mutation"
        | "budget"
        | "lot"
        | "coproprietaire"
        | "council"
        | "event"
        | "other"
      document_relation_kind: "related" | "annexe" | "source" | "justificatif"
      document_source:
        | "manual"
        | "ag"
        | "finance"
        | "maintenance"
        | "mutation"
        | "system"
      document_status: "active" | "archived" | "deleted"
      document_visibility:
        | "gestionnaire_seul"
        | "conseil"
        | "tous_coproprietaires"
      etat_date_type: "pre" | "final"
      event_type:
        | "ag"
        | "reunion_cs"
        | "travaux"
        | "intervention"
        | "fete"
        | "autre"
      expense_status: "draft" | "pending_validation" | "validated" | "rejected"
      insurance_sub_type:
        | "multirisque"
        | "dommages_ouvrage"
        | "rc"
        | "protection_juridique"
        | "autre"
      intervention_category:
        | "courante"
        | "urgente"
        | "reglementaire"
        | "travaux"
      intervention_frequency:
        | "once"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "biannual"
        | "annual"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      ledger_direction: "debit" | "credit"
      ledger_source_type:
        | "budget"
        | "call_for_funds"
        | "payment"
        | "supplier_invoice"
        | "supplier_payment"
        | "bank_movement"
        | "transfer"
        | "od"
        | "opening"
        | "closing"
        | "manual"
        | "opening_balance"
        | "opening_onboarding"
        | "reclassification"
        | "result_allocation"
        | "budget_expense"
        | "mutation"
        | "collective_loan"
      ledger_tx_status: "draft" | "posted"
      legal_proceeding_nature: "litigation" | "recovery" | "other"
      legal_proceeding_status:
        | "pending"
        | "in_progress"
        | "closed"
        | "won"
        | "lost"
      logbook_entry_type:
        | "intervention"
        | "controle"
        | "incident"
        | "maintenance"
        | "autre"
      logbook_status: "planifiee" | "en_cours" | "terminee"
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
      majority_type:
        | "art24"
        | "art25"
        | "art25_1"
        | "art26"
        | "art26_1"
        | "unanimity"
      membership_role: "gestionnaire" | "coproprietaire" | "platform_admin"
      message_type: "text" | "file" | "system"
      mutation_status:
        | "draft"
        | "pre_etat_generated"
        | "etat_generated"
        | "signed"
        | "validated"
        | "cancelled"
      mutation_step_key:
        | "demande"
        | "pre_etat_date"
        | "etat_date"
        | "envoi_notaire"
        | "signature_acte"
        | "cloture_compte"
      mutation_step_status: "pending" | "in_progress" | "completed" | "skipped"
      mutation_type: "sale" | "donation" | "succession" | "other"
      notification_channel:
        | "email"
        | "registered_email"
        | "postal"
        | "registered_postal"
        | "hand_delivery"
      opposition_status:
        | "pending"
        | "opposed"
        | "paid"
        | "released"
        | "contested"
      payment_method:
        | "cash"
        | "check"
        | "transfer"
        | "card"
        | "direct_debit"
        | "other"
      payment_phase_status: "pending" | "called" | "paid" | "overdue"
      payment_status: "recorded" | "reconciled" | "reversed"
      period_status: "open" | "closed" | "approved"
      planned_work_status:
        | "identified"
        | "voted"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      priority_level: "low" | "normal" | "medium" | "high" | "critical"
      reminder_status: "pending" | "sent" | "failed" | "stale" | "skipped"
      repartition_basis: "tantiemes" | "surface" | "custom"
      repartition_category: "general" | "special" | "alur"
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
        | "contract"
        | "council"
        | "syndic"
        | "other"
      service_order_event_type:
        | "created"
        | "sent"
        | "status_change"
        | "comment"
        | "document"
        | "cancelled"
      service_order_origin:
        | "syndic"
        | "conseil"
        | "coproprietaire"
        | "contrat"
        | "autre"
      service_order_status:
        | "draft"
        | "sent"
        | "awaiting_provider"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "closed"
        | "cancelled"
        | "refused"
      service_order_type: "classique" | "urgent" | "contrat" | "art18"
      supplier_invoice_status: "draft" | "posted" | "paid" | "cancelled"
      technical_doc_type:
        | "dta"
        | "dpe_collectif"
        | "diagnostic_plomb"
        | "diagnostic_electricite"
        | "diagnostic_gaz"
        | "carnet_entretien"
        | "controle_ascenseur"
        | "controle_chaufferie"
        | "controle_incendie"
        | "controle_jeux"
        | "garantie_decennale"
        | "garantie_biennale"
        | "plan_copropriete"
        | "reglement_copropriete"
        | "etat_descriptif"
        | "ppt"
        | "dtg"
        | "audit_energetique"
        | "autre"
      tiers_category: "syndic" | "copropriete" | "externe"
      transfer_destination: "works" | "reserve" | "operating" | "other"
      treasury_advance_type: "permanent" | "special" | "work_fund"
      vote_choice: "for" | "against" | "abstention"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_receivable_nature: [
        "current",
        "works",
        "alur",
        "loan",
        "advance",
        "doubtful",
      ],
      account_type: ["asset", "liability", "income", "expense", "equity"],
      ag_action_type: [
        "CREATE_BUDGET",
        "APPROVE_ACCOUNTS",
        "SCHEDULE_BUDGET_PAYMENTS",
        "CREATE_ALUR_FUND",
        "SCHEDULE_ALUR_PAYMENTS",
        "CREATE_WORK_BUDGET",
        "CREATE_EXCEPTIONAL_CALL",
        "ELECT_COUNCIL",
        "APPOINT_SYNDIC",
        "MANAGE_CONTRACT",
        "GRANT_QUITUS",
        "DESIGNATE_BUREAU",
      ],
      ag_draft_type: [
        "attendance",
        "resolutions",
        "votes",
        "pv",
        "envoi",
        "milestones",
        "other",
      ],
      ag_meeting_type: ["ordinary", "extraordinary", "mixed"],
      ag_status: [
        "draft",
        "convoked",
        "in_progress",
        "session_active",
        "closed",
        "pv_generated",
        "pv_signed",
        "pv_sent",
        "finalized",
        "archived",
      ],
      attendance_type: ["present", "proxy", "correspondence"],
      bank_match_target_type: ["payment", "supplier_payment", "other"],
      bank_movement_status: ["unmatched", "matched", "ignored"],
      budget_status: ["draft", "submitted", "validated", "rejected", "closed"],
      budget_type: ["current", "works", "alur"],
      call_for_funds_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "cancelled",
      ],
      call_line_status: ["unpaid", "partial", "paid"],
      collective_loan_status: ["active", "repaid", "cancelled"],
      content_visibility: ["all_members", "council_only", "managers_only"],
      contract_status: ["draft", "active", "to_renew", "expired", "terminated"],
      correspondence_form_status: ["pending", "validated", "integrated"],
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
      coverage_mode: ["all_lots", "subset"],
      cutoff_kind: ["CAP", "CCA", "PCA", "PAR"],
      delivery_status: [
        "pending",
        "queued",
        "sent",
        "delivered",
        "opened",
        "clicked",
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
        "ordre_service",
        "autre",
      ],
      document_entity_type: [
        "ag",
        "resolution",
        "service_order",
        "contract",
        "supplier_invoice",
        "mutation",
        "budget",
        "lot",
        "coproprietaire",
        "council",
        "event",
        "other",
      ],
      document_relation_kind: ["related", "annexe", "source", "justificatif"],
      document_source: [
        "manual",
        "ag",
        "finance",
        "maintenance",
        "mutation",
        "system",
      ],
      document_status: ["active", "archived", "deleted"],
      document_visibility: [
        "gestionnaire_seul",
        "conseil",
        "tous_coproprietaires",
      ],
      etat_date_type: ["pre", "final"],
      event_type: [
        "ag",
        "reunion_cs",
        "travaux",
        "intervention",
        "fete",
        "autre",
      ],
      expense_status: ["draft", "pending_validation", "validated", "rejected"],
      insurance_sub_type: [
        "multirisque",
        "dommages_ouvrage",
        "rc",
        "protection_juridique",
        "autre",
      ],
      intervention_category: [
        "courante",
        "urgente",
        "reglementaire",
        "travaux",
      ],
      intervention_frequency: [
        "once",
        "weekly",
        "monthly",
        "quarterly",
        "biannual",
        "annual",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      ledger_direction: ["debit", "credit"],
      ledger_source_type: [
        "budget",
        "call_for_funds",
        "payment",
        "supplier_invoice",
        "supplier_payment",
        "bank_movement",
        "transfer",
        "od",
        "opening",
        "closing",
        "manual",
        "opening_balance",
        "opening_onboarding",
        "reclassification",
        "result_allocation",
        "budget_expense",
        "mutation",
        "collective_loan",
      ],
      ledger_tx_status: ["draft", "posted"],
      legal_proceeding_nature: ["litigation", "recovery", "other"],
      legal_proceeding_status: [
        "pending",
        "in_progress",
        "closed",
        "won",
        "lost",
      ],
      logbook_entry_type: [
        "intervention",
        "controle",
        "incident",
        "maintenance",
        "autre",
      ],
      logbook_status: ["planifiee", "en_cours", "terminee"],
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
      majority_type: [
        "art24",
        "art25",
        "art25_1",
        "art26",
        "art26_1",
        "unanimity",
      ],
      membership_role: ["gestionnaire", "coproprietaire", "platform_admin"],
      message_type: ["text", "file", "system"],
      mutation_status: [
        "draft",
        "pre_etat_generated",
        "etat_generated",
        "signed",
        "validated",
        "cancelled",
      ],
      mutation_step_key: [
        "demande",
        "pre_etat_date",
        "etat_date",
        "envoi_notaire",
        "signature_acte",
        "cloture_compte",
      ],
      mutation_step_status: ["pending", "in_progress", "completed", "skipped"],
      mutation_type: ["sale", "donation", "succession", "other"],
      notification_channel: [
        "email",
        "registered_email",
        "postal",
        "registered_postal",
        "hand_delivery",
      ],
      opposition_status: [
        "pending",
        "opposed",
        "paid",
        "released",
        "contested",
      ],
      payment_method: [
        "cash",
        "check",
        "transfer",
        "card",
        "direct_debit",
        "other",
      ],
      payment_phase_status: ["pending", "called", "paid", "overdue"],
      payment_status: ["recorded", "reconciled", "reversed"],
      period_status: ["open", "closed", "approved"],
      planned_work_status: [
        "identified",
        "voted",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      priority_level: ["low", "normal", "medium", "high", "critical"],
      reminder_status: ["pending", "sent", "failed", "stale", "skipped"],
      repartition_basis: ["tantiemes", "surface", "custom"],
      repartition_category: ["general", "special", "alur"],
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
        "contract",
        "council",
        "syndic",
        "other",
      ],
      service_order_event_type: [
        "created",
        "sent",
        "status_change",
        "comment",
        "document",
        "cancelled",
      ],
      service_order_origin: [
        "syndic",
        "conseil",
        "coproprietaire",
        "contrat",
        "autre",
      ],
      service_order_status: [
        "draft",
        "sent",
        "awaiting_provider",
        "scheduled",
        "in_progress",
        "completed",
        "closed",
        "cancelled",
        "refused",
      ],
      service_order_type: ["classique", "urgent", "contrat", "art18"],
      supplier_invoice_status: ["draft", "posted", "paid", "cancelled"],
      technical_doc_type: [
        "dta",
        "dpe_collectif",
        "diagnostic_plomb",
        "diagnostic_electricite",
        "diagnostic_gaz",
        "carnet_entretien",
        "controle_ascenseur",
        "controle_chaufferie",
        "controle_incendie",
        "controle_jeux",
        "garantie_decennale",
        "garantie_biennale",
        "plan_copropriete",
        "reglement_copropriete",
        "etat_descriptif",
        "ppt",
        "dtg",
        "audit_energetique",
        "autre",
      ],
      tiers_category: ["syndic", "copropriete", "externe"],
      transfer_destination: ["works", "reserve", "operating", "other"],
      treasury_advance_type: ["permanent", "special", "work_fund"],
      vote_choice: ["for", "against", "abstention"],
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


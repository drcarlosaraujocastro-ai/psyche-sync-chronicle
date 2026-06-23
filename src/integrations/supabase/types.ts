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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          owner_id: string
          preferences: Json | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          owner_id: string
          preferences?: Json | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          owner_id?: string
          preferences?: Json | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          owner_id: string
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          owner_id: string
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      axis_audits: {
        Row: {
          findings: Json
          generated_at: string
          id: string
          owner_id: string
          patient_id: string
          score: number
          session_id: string | null
        }
        Insert: {
          findings?: Json
          generated_at?: string
          id?: string
          owner_id: string
          patient_id: string
          score?: number
          session_id?: string | null
        }
        Update: {
          findings?: Json
          generated_at?: string
          id?: string
          owner_id?: string
          patient_id?: string
          score?: number
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "axis_audits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "axis_audits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_ai_analyses: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          patient_id: string
          payload: Json
          session_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          patient_id: string
          payload: Json
          session_id?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          patient_id?: string
          payload?: Json
          session_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_ai_analyses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_interactions: {
        Row: {
          action: string | null
          category: string
          confidence: string | null
          created_at: string
          detail: string | null
          id: string
          involved_substances: string[] | null
          mechanism: string | null
          monitor: string[] | null
          owner_id: string
          patient_id: string
          payload: Json | null
          relevance: string
          session_id: string | null
          summary: string
        }
        Insert: {
          action?: string | null
          category: string
          confidence?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          involved_substances?: string[] | null
          mechanism?: string | null
          monitor?: string[] | null
          owner_id: string
          patient_id: string
          payload?: Json | null
          relevance: string
          session_id?: string | null
          summary: string
        }
        Update: {
          action?: string | null
          category?: string
          confidence?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          involved_substances?: string[] | null
          mechanism?: string | null
          monitor?: string[] | null
          owner_id?: string
          patient_id?: string
          payload?: Json | null
          relevance?: string
          session_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_interactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_reports: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          patient_id: string
          payload: Json
          period_end: string | null
          period_start: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          patient_id: string
          payload: Json
          period_end?: string | null
          period_start?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          patient_id?: string
          payload?: Json
          period_end?: string | null
          period_start?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_sessions: {
        Row: {
          alcohol_use_today: boolean | null
          awakenings_count: number | null
          basal_state_text: string | null
          baseline_anxiety_0_10: number | null
          baseline_craving_0_10: number | null
          baseline_focus_0_10: number | null
          baseline_impulsivity_0_10: number | null
          baseline_irritability_0_10: number | null
          baseline_mood_0_10: number | null
          baseline_state: string | null
          caffeine: string | null
          caffeine_total_mg: number | null
          clinical_summary: string | null
          cognitive_overload_0_10: number | null
          complaint: string | null
          conduct: string | null
          created_at: string
          exercise_context: string | null
          food_context: string | null
          id: string
          ideas_of_reference_0_10: number | null
          mania_activation_0_10: number | null
          med_induced_sleep: boolean | null
          name: string
          next_review: string | null
          night_awakenings: number | null
          nightmares: boolean | null
          nightmares_0_10: number | null
          notes: string | null
          owner_id: string
          paranoia_0_10: number | null
          patient_id: string
          patient_narrative: string | null
          physician_observation: string | null
          predominant_symptoms: string[] | null
          psychosis_warning_signs: boolean | null
          recent_stressors: string | null
          residual_sedation: boolean | null
          restorative_sleep: string | null
          restorative_sleep_bool: boolean | null
          session_at: string
          session_type: string
          sleep_deprivation_level_0_10: number | null
          sleep_hours: number | null
          sleep_notes: string | null
          sleep_quality: number | null
          sleep_quality_0_10: number | null
          status: string
          stress_0_10: number | null
          substance_use_today: boolean | null
          therapeutic_goal: string | null
          updated_at: string
        }
        Insert: {
          alcohol_use_today?: boolean | null
          awakenings_count?: number | null
          basal_state_text?: string | null
          baseline_anxiety_0_10?: number | null
          baseline_craving_0_10?: number | null
          baseline_focus_0_10?: number | null
          baseline_impulsivity_0_10?: number | null
          baseline_irritability_0_10?: number | null
          baseline_mood_0_10?: number | null
          baseline_state?: string | null
          caffeine?: string | null
          caffeine_total_mg?: number | null
          clinical_summary?: string | null
          cognitive_overload_0_10?: number | null
          complaint?: string | null
          conduct?: string | null
          created_at?: string
          exercise_context?: string | null
          food_context?: string | null
          id?: string
          ideas_of_reference_0_10?: number | null
          mania_activation_0_10?: number | null
          med_induced_sleep?: boolean | null
          name: string
          next_review?: string | null
          night_awakenings?: number | null
          nightmares?: boolean | null
          nightmares_0_10?: number | null
          notes?: string | null
          owner_id: string
          paranoia_0_10?: number | null
          patient_id: string
          patient_narrative?: string | null
          physician_observation?: string | null
          predominant_symptoms?: string[] | null
          psychosis_warning_signs?: boolean | null
          recent_stressors?: string | null
          residual_sedation?: boolean | null
          restorative_sleep?: string | null
          restorative_sleep_bool?: boolean | null
          session_at?: string
          session_type?: string
          sleep_deprivation_level_0_10?: number | null
          sleep_hours?: number | null
          sleep_notes?: string | null
          sleep_quality?: number | null
          sleep_quality_0_10?: number | null
          status?: string
          stress_0_10?: number | null
          substance_use_today?: boolean | null
          therapeutic_goal?: string | null
          updated_at?: string
        }
        Update: {
          alcohol_use_today?: boolean | null
          awakenings_count?: number | null
          basal_state_text?: string | null
          baseline_anxiety_0_10?: number | null
          baseline_craving_0_10?: number | null
          baseline_focus_0_10?: number | null
          baseline_impulsivity_0_10?: number | null
          baseline_irritability_0_10?: number | null
          baseline_mood_0_10?: number | null
          baseline_state?: string | null
          caffeine?: string | null
          caffeine_total_mg?: number | null
          clinical_summary?: string | null
          cognitive_overload_0_10?: number | null
          complaint?: string | null
          conduct?: string | null
          created_at?: string
          exercise_context?: string | null
          food_context?: string | null
          id?: string
          ideas_of_reference_0_10?: number | null
          mania_activation_0_10?: number | null
          med_induced_sleep?: boolean | null
          name?: string
          next_review?: string | null
          night_awakenings?: number | null
          nightmares?: boolean | null
          nightmares_0_10?: number | null
          notes?: string | null
          owner_id?: string
          paranoia_0_10?: number | null
          patient_id?: string
          patient_narrative?: string | null
          physician_observation?: string | null
          predominant_symptoms?: string[] | null
          psychosis_warning_signs?: boolean | null
          recent_stressors?: string | null
          residual_sedation?: boolean | null
          restorative_sleep?: string | null
          restorative_sleep_bool?: boolean | null
          session_at?: string
          session_type?: string
          sleep_deprivation_level_0_10?: number | null
          sleep_hours?: number | null
          sleep_notes?: string | null
          sleep_quality?: number | null
          sleep_quality_0_10?: number | null
          status?: string
          stress_0_10?: number | null
          substance_use_today?: boolean | null
          therapeutic_goal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      curve_results: {
        Row: {
          generated_at: string
          id: string
          owner_id: string
          patient_id: string
          payload: Json
          session_id: string | null
        }
        Insert: {
          generated_at?: string
          id?: string
          owner_id: string
          patient_id: string
          payload: Json
          session_id?: string | null
        }
        Update: {
          generated_at?: string
          id?: string
          owner_id?: string
          patient_id?: string
          payload?: Json
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curve_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curve_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          owner_id: string
          patient_id: string | null
          provider: string
          request_summary: Json
          response_summary: Json
          status: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id: string
          patient_id?: string | null
          provider: string
          request_summary?: Json
          response_summary?: Json
          status?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id?: string
          patient_id?: string | null
          provider?: string
          request_summary?: Json
          response_summary?: Json
          status?: string | null
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          last_success_at: string | null
          owner_id: string
          provider: string
          public_config: Json
          secret_config_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          owner_id: string
          provider: string
          public_config?: Json
          secret_config_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          owner_id?: string
          provider?: string
          public_config?: Json
          secret_config_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      medication_dose_logs: {
        Row: {
          actual_time: string
          adverse_0_100: number | null
          adverse_effects: string | null
          anxiety_0_100: number | null
          benefit_0_100: number | null
          caffeine_amount: number | null
          caffeine_near_dose_mg: number | null
          caffeine_timing: string | null
          clinical_reason: string | null
          craving_0_100: number | null
          created_at: string
          dose_amount: number | null
          dose_goal: string | null
          dose_text: string | null
          dose_unit: string | null
          expected_effect: string | null
          expected_effect_text: string | null
          focus_0_100: number | null
          food_impact: string | null
          formulation: string | null
          formulation_id: string | null
          formulation_name: string | null
          id: string
          impulsivity_0_100: number | null
          last_meal_time: string | null
          log_type: string
          meal_fat_level_0_10: number | null
          meal_size: string | null
          meal_type: string | null
          minutes_since_last_meal: number | null
          notes_clinician: string | null
          notes_patient: string | null
          owner_id: string
          patient_id: string
          patient_medication_id: string | null
          patient_notes: string | null
          perceived_effect: string | null
          perceived_effect_text: string | null
          physician_notes: string | null
          planned_time: string | null
          route: string | null
          sedation_0_100: number | null
          session_id: string | null
          sleep_deprivation_at_dose_0_10: number | null
          stimulation_0_100: number | null
          stomach: string | null
          stomach_fullness_0_10: number | null
          substance_id: string | null
          substance_name: string
          taken_with_food: boolean | null
          time_since_meal_min: number | null
          updated_at: string
        }
        Insert: {
          actual_time?: string
          adverse_0_100?: number | null
          adverse_effects?: string | null
          anxiety_0_100?: number | null
          benefit_0_100?: number | null
          caffeine_amount?: number | null
          caffeine_near_dose_mg?: number | null
          caffeine_timing?: string | null
          clinical_reason?: string | null
          craving_0_100?: number | null
          created_at?: string
          dose_amount?: number | null
          dose_goal?: string | null
          dose_text?: string | null
          dose_unit?: string | null
          expected_effect?: string | null
          expected_effect_text?: string | null
          focus_0_100?: number | null
          food_impact?: string | null
          formulation?: string | null
          formulation_id?: string | null
          formulation_name?: string | null
          id?: string
          impulsivity_0_100?: number | null
          last_meal_time?: string | null
          log_type?: string
          meal_fat_level_0_10?: number | null
          meal_size?: string | null
          meal_type?: string | null
          minutes_since_last_meal?: number | null
          notes_clinician?: string | null
          notes_patient?: string | null
          owner_id: string
          patient_id: string
          patient_medication_id?: string | null
          patient_notes?: string | null
          perceived_effect?: string | null
          perceived_effect_text?: string | null
          physician_notes?: string | null
          planned_time?: string | null
          route?: string | null
          sedation_0_100?: number | null
          session_id?: string | null
          sleep_deprivation_at_dose_0_10?: number | null
          stimulation_0_100?: number | null
          stomach?: string | null
          stomach_fullness_0_10?: number | null
          substance_id?: string | null
          substance_name: string
          taken_with_food?: boolean | null
          time_since_meal_min?: number | null
          updated_at?: string
        }
        Update: {
          actual_time?: string
          adverse_0_100?: number | null
          adverse_effects?: string | null
          anxiety_0_100?: number | null
          benefit_0_100?: number | null
          caffeine_amount?: number | null
          caffeine_near_dose_mg?: number | null
          caffeine_timing?: string | null
          clinical_reason?: string | null
          craving_0_100?: number | null
          created_at?: string
          dose_amount?: number | null
          dose_goal?: string | null
          dose_text?: string | null
          dose_unit?: string | null
          expected_effect?: string | null
          expected_effect_text?: string | null
          focus_0_100?: number | null
          food_impact?: string | null
          formulation?: string | null
          formulation_id?: string | null
          formulation_name?: string | null
          id?: string
          impulsivity_0_100?: number | null
          last_meal_time?: string | null
          log_type?: string
          meal_fat_level_0_10?: number | null
          meal_size?: string | null
          meal_type?: string | null
          minutes_since_last_meal?: number | null
          notes_clinician?: string | null
          notes_patient?: string | null
          owner_id?: string
          patient_id?: string
          patient_medication_id?: string | null
          patient_notes?: string | null
          perceived_effect?: string | null
          perceived_effect_text?: string | null
          physician_notes?: string | null
          planned_time?: string | null
          route?: string | null
          sedation_0_100?: number | null
          session_id?: string | null
          sleep_deprivation_at_dose_0_10?: number | null
          stimulation_0_100?: number | null
          stomach?: string | null
          stomach_fullness_0_10?: number | null
          substance_id?: string | null
          substance_name?: string
          taken_with_food?: boolean | null
          time_since_meal_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_dose_logs_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "substance_formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_dose_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_dose_logs_patient_medication_id_fkey"
            columns: ["patient_medication_id"]
            isOneToOne: false
            referencedRelation: "patient_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_dose_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_dose_logs_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "substances"
            referencedColumns: ["id"]
          },
        ]
      }
      medx_patient_links: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          last_sent_at: string | null
          last_synced_at: string | null
          medx_patient_id: string | null
          medx_precadastro_url: string | null
          medx_status: string
          owner_id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_sent_at?: string | null
          last_synced_at?: string | null
          medx_patient_id?: string | null
          medx_precadastro_url?: string | null
          medx_status?: string
          owner_id: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_sent_at?: string | null
          last_synced_at?: string | null
          medx_patient_id?: string | null
          medx_precadastro_url?: string | null
          medx_status?: string
          owner_id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_medications: {
        Row: {
          brand_name: string | null
          created_at: string
          current_dose: number | null
          diagnostic_target: string | null
          discontinuation_reason: string | null
          dose_unit: string | null
          end_date: string | null
          expected_improvements: string[] | null
          free_text_name: string | null
          frequency: string | null
          id: string
          indication: string | null
          individual_benefit: number | null
          individual_carry_over: number | null
          individual_cost: number | null
          individual_sensitivity: string | null
          individual_tolerance: string | null
          owner_id: string
          patient_id: string
          patient_notes: string | null
          physician_notes: string | null
          potential_worsening: string[] | null
          response_history: Json | null
          start_date: string | null
          status: string
          substance_id: string | null
          target_symptoms: string[] | null
          updated_at: string
          usual_time: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          current_dose?: number | null
          diagnostic_target?: string | null
          discontinuation_reason?: string | null
          dose_unit?: string | null
          end_date?: string | null
          expected_improvements?: string[] | null
          free_text_name?: string | null
          frequency?: string | null
          id?: string
          indication?: string | null
          individual_benefit?: number | null
          individual_carry_over?: number | null
          individual_cost?: number | null
          individual_sensitivity?: string | null
          individual_tolerance?: string | null
          owner_id: string
          patient_id: string
          patient_notes?: string | null
          physician_notes?: string | null
          potential_worsening?: string[] | null
          response_history?: Json | null
          start_date?: string | null
          status?: string
          substance_id?: string | null
          target_symptoms?: string[] | null
          updated_at?: string
          usual_time?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          current_dose?: number | null
          diagnostic_target?: string | null
          discontinuation_reason?: string | null
          dose_unit?: string | null
          end_date?: string | null
          expected_improvements?: string[] | null
          free_text_name?: string | null
          frequency?: string | null
          id?: string
          indication?: string | null
          individual_benefit?: number | null
          individual_carry_over?: number | null
          individual_cost?: number | null
          individual_sensitivity?: string | null
          individual_tolerance?: string | null
          owner_id?: string
          patient_id?: string
          patient_notes?: string | null
          physician_notes?: string | null
          potential_worsening?: string[] | null
          response_history?: Json | null
          start_date?: string | null
          status?: string
          substance_id?: string | null
          target_symptoms?: string[] | null
          updated_at?: string
          usual_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medications_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "substances"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_substance_response_profiles: {
        Row: {
          average_adverse_0_100: number | null
          average_anxiety_0_100: number | null
          average_benefit_0_100: number | null
          average_craving_change_0_100: number | null
          average_focus_0_100: number | null
          average_impulsivity_change_0_100: number | null
          average_sedation_0_100: number | null
          average_stimulation_0_100: number | null
          axis_deltas: Json | null
          caffeine_sensitivity_0_100: number | null
          confidence: string | null
          created_at: string
          food_sensitivity_0_100: number | null
          id: string
          notes: string | null
          owner_id: string
          patient_id: string
          psychosis_activation_risk_0_100: number | null
          redose_risk_0_100: number | null
          sample_count: number
          sleep_deprivation_sensitivity_0_100: number | null
          substance_id: string | null
          substance_name: string
          typical_duration_shift_minutes: number | null
          typical_onset_shift_minutes: number | null
          updated_at: string
        }
        Insert: {
          average_adverse_0_100?: number | null
          average_anxiety_0_100?: number | null
          average_benefit_0_100?: number | null
          average_craving_change_0_100?: number | null
          average_focus_0_100?: number | null
          average_impulsivity_change_0_100?: number | null
          average_sedation_0_100?: number | null
          average_stimulation_0_100?: number | null
          axis_deltas?: Json | null
          caffeine_sensitivity_0_100?: number | null
          confidence?: string | null
          created_at?: string
          food_sensitivity_0_100?: number | null
          id?: string
          notes?: string | null
          owner_id: string
          patient_id: string
          psychosis_activation_risk_0_100?: number | null
          redose_risk_0_100?: number | null
          sample_count?: number
          sleep_deprivation_sensitivity_0_100?: number | null
          substance_id?: string | null
          substance_name: string
          typical_duration_shift_minutes?: number | null
          typical_onset_shift_minutes?: number | null
          updated_at?: string
        }
        Update: {
          average_adverse_0_100?: number | null
          average_anxiety_0_100?: number | null
          average_benefit_0_100?: number | null
          average_craving_change_0_100?: number | null
          average_focus_0_100?: number | null
          average_impulsivity_change_0_100?: number | null
          average_sedation_0_100?: number | null
          average_stimulation_0_100?: number | null
          axis_deltas?: Json | null
          caffeine_sensitivity_0_100?: number | null
          confidence?: string | null
          created_at?: string
          food_sensitivity_0_100?: number | null
          id?: string
          notes?: string | null
          owner_id?: string
          patient_id?: string
          psychosis_activation_risk_0_100?: number | null
          redose_risk_0_100?: number | null
          sample_count?: number
          sleep_deprivation_sensitivity_0_100?: number | null
          substance_id?: string | null
          substance_name?: string
          typical_duration_shift_minutes?: number | null
          typical_onset_shift_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_target_symptoms: {
        Row: {
          baseline: number | null
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          patient_id: string
          priority: number | null
          related_diagnosis: string | null
          status: string
          symptom_name: string
          therapeutic_goal: number | null
          updated_at: string
        }
        Insert: {
          baseline?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          patient_id: string
          priority?: number | null
          related_diagnosis?: string | null
          status?: string
          symptom_name: string
          therapeutic_goal?: number | null
          updated_at?: string
        }
        Update: {
          baseline?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          patient_id?: string
          priority?: number | null
          related_diagnosis?: string | null
          status?: string
          symptom_name?: string
          therapeutic_goal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_target_symptoms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string[] | null
          biological_sex: string | null
          birth_date: string | null
          cardiovascular_history: string | null
          cid11_codes: string[] | null
          clinical_comorbidities: string[] | null
          clinical_history: string | null
          created_at: string
          current_complaint: string | null
          diagnostic_hypotheses: string | null
          dimensional_axes: Json | null
          dsm5_codes: string[] | null
          full_name: string
          gender: string | null
          height_cm: number | null
          id: string
          mania_history: string | null
          medication_sensitivity: string | null
          owner_id: string
          primary_diagnoses: string[] | null
          psychiatric_comorbidities: string[] | null
          responsible_physician: string | null
          safety_notes: string | null
          seizure_history: string | null
          social_name: string | null
          status: string
          substance_use_history: string | null
          suicide_risk: string | null
          tags: string[] | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string[] | null
          biological_sex?: string | null
          birth_date?: string | null
          cardiovascular_history?: string | null
          cid11_codes?: string[] | null
          clinical_comorbidities?: string[] | null
          clinical_history?: string | null
          created_at?: string
          current_complaint?: string | null
          diagnostic_hypotheses?: string | null
          dimensional_axes?: Json | null
          dsm5_codes?: string[] | null
          full_name: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          mania_history?: string | null
          medication_sensitivity?: string | null
          owner_id: string
          primary_diagnoses?: string[] | null
          psychiatric_comorbidities?: string[] | null
          responsible_physician?: string | null
          safety_notes?: string | null
          seizure_history?: string | null
          social_name?: string | null
          status?: string
          substance_use_history?: string | null
          suicide_risk?: string | null
          tags?: string[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string[] | null
          biological_sex?: string | null
          birth_date?: string | null
          cardiovascular_history?: string | null
          cid11_codes?: string[] | null
          clinical_comorbidities?: string[] | null
          clinical_history?: string | null
          created_at?: string
          current_complaint?: string | null
          diagnostic_hypotheses?: string | null
          dimensional_axes?: Json | null
          dsm5_codes?: string[] | null
          full_name?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          mania_history?: string | null
          medication_sensitivity?: string | null
          owner_id?: string
          primary_diagnoses?: string[] | null
          psychiatric_comorbidities?: string[] | null
          responsible_physician?: string | null
          safety_notes?: string | null
          seizure_history?: string | null
          social_name?: string | null
          status?: string
          substance_use_history?: string | null
          suicide_risk?: string | null
          tags?: string[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          council_id: string | null
          created_at: string
          display_name: string | null
          id: string
          professional_title: string | null
          updated_at: string
        }
        Insert: {
          council_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          professional_title?: string | null
          updated_at?: string
        }
        Update: {
          council_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          professional_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_checkins: {
        Row: {
          adverse_event: string | null
          anhedonia_0_10: number | null
          anxiety_0_10: number | null
          appetite_0_10: number | null
          cardiovascular_0_10: number | null
          checkin_at: string
          cognitive_overload_0_10: number | null
          context_text: string | null
          craving_0_10: number | null
          created_at: string
          energy_0_10: number | null
          focus_0_10: number | null
          id: string
          ideas_of_reference_0_10: number | null
          impulsivity_0_10: number | null
          insomnia_0_10: number | null
          irritability_0_10: number | null
          mood_0_10: number | null
          motivation_0_10: number | null
          owner_id: string
          paranoia_0_10: number | null
          patient_id: string
          patient_report: string | null
          physician_observation: string | null
          rumination_0_10: number | null
          sedation_0_10: number | null
          session_id: string | null
          sleep_quality_0_10: number | null
          trigger_text: string | null
          updated_at: string
          withdrawal_0_10: number | null
        }
        Insert: {
          adverse_event?: string | null
          anhedonia_0_10?: number | null
          anxiety_0_10?: number | null
          appetite_0_10?: number | null
          cardiovascular_0_10?: number | null
          checkin_at?: string
          cognitive_overload_0_10?: number | null
          context_text?: string | null
          craving_0_10?: number | null
          created_at?: string
          energy_0_10?: number | null
          focus_0_10?: number | null
          id?: string
          ideas_of_reference_0_10?: number | null
          impulsivity_0_10?: number | null
          insomnia_0_10?: number | null
          irritability_0_10?: number | null
          mood_0_10?: number | null
          motivation_0_10?: number | null
          owner_id: string
          paranoia_0_10?: number | null
          patient_id: string
          patient_report?: string | null
          physician_observation?: string | null
          rumination_0_10?: number | null
          sedation_0_10?: number | null
          session_id?: string | null
          sleep_quality_0_10?: number | null
          trigger_text?: string | null
          updated_at?: string
          withdrawal_0_10?: number | null
        }
        Update: {
          adverse_event?: string | null
          anhedonia_0_10?: number | null
          anxiety_0_10?: number | null
          appetite_0_10?: number | null
          cardiovascular_0_10?: number | null
          checkin_at?: string
          cognitive_overload_0_10?: number | null
          context_text?: string | null
          craving_0_10?: number | null
          created_at?: string
          energy_0_10?: number | null
          focus_0_10?: number | null
          id?: string
          ideas_of_reference_0_10?: number | null
          impulsivity_0_10?: number | null
          insomnia_0_10?: number | null
          irritability_0_10?: number | null
          mood_0_10?: number | null
          motivation_0_10?: number | null
          owner_id?: string
          paranoia_0_10?: number | null
          patient_id?: string
          patient_report?: string | null
          physician_observation?: string | null
          rumination_0_10?: number | null
          sedation_0_10?: number | null
          session_id?: string | null
          sleep_quality_0_10?: number | null
          trigger_text?: string | null
          updated_at?: string
          withdrawal_0_10?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      substance_formulations: {
        Row: {
          comeup_max_value: number | null
          comeup_min_value: number | null
          comeup_unit: string | null
          created_at: string
          curve_model: string | null
          duration_max_value: number | null
          duration_min_value: number | null
          duration_unit: string | null
          food_effect_profile: Json | null
          formulation_name: string
          formulation_type: string | null
          half_life_max_value: number | null
          half_life_min_value: number | null
          half_life_unit: string | null
          has_steady_state: boolean | null
          has_tail: boolean | null
          id: string
          is_default: boolean | null
          notes: string | null
          offset_max_value: number | null
          offset_min_value: number | null
          offset_unit: string | null
          onset_max_value: number | null
          onset_min_value: number | null
          onset_unit: string | null
          owner_id: string
          peak_max_value: number | null
          peak_min_value: number | null
          peak_unit: string | null
          plateau_max_value: number | null
          plateau_min_value: number | null
          plateau_unit: string | null
          route: string | null
          steady_state_max_value: number | null
          steady_state_min_value: number | null
          steady_state_unit: string | null
          substance_id: string
          tail_max_value: number | null
          tail_min_value: number | null
          tail_unit: string | null
          updated_at: string
        }
        Insert: {
          comeup_max_value?: number | null
          comeup_min_value?: number | null
          comeup_unit?: string | null
          created_at?: string
          curve_model?: string | null
          duration_max_value?: number | null
          duration_min_value?: number | null
          duration_unit?: string | null
          food_effect_profile?: Json | null
          formulation_name: string
          formulation_type?: string | null
          half_life_max_value?: number | null
          half_life_min_value?: number | null
          half_life_unit?: string | null
          has_steady_state?: boolean | null
          has_tail?: boolean | null
          id?: string
          is_default?: boolean | null
          notes?: string | null
          offset_max_value?: number | null
          offset_min_value?: number | null
          offset_unit?: string | null
          onset_max_value?: number | null
          onset_min_value?: number | null
          onset_unit?: string | null
          owner_id: string
          peak_max_value?: number | null
          peak_min_value?: number | null
          peak_unit?: string | null
          plateau_max_value?: number | null
          plateau_min_value?: number | null
          plateau_unit?: string | null
          route?: string | null
          steady_state_max_value?: number | null
          steady_state_min_value?: number | null
          steady_state_unit?: string | null
          substance_id: string
          tail_max_value?: number | null
          tail_min_value?: number | null
          tail_unit?: string | null
          updated_at?: string
        }
        Update: {
          comeup_max_value?: number | null
          comeup_min_value?: number | null
          comeup_unit?: string | null
          created_at?: string
          curve_model?: string | null
          duration_max_value?: number | null
          duration_min_value?: number | null
          duration_unit?: string | null
          food_effect_profile?: Json | null
          formulation_name?: string
          formulation_type?: string | null
          half_life_max_value?: number | null
          half_life_min_value?: number | null
          half_life_unit?: string | null
          has_steady_state?: boolean | null
          has_tail?: boolean | null
          id?: string
          is_default?: boolean | null
          notes?: string | null
          offset_max_value?: number | null
          offset_min_value?: number | null
          offset_unit?: string | null
          onset_max_value?: number | null
          onset_min_value?: number | null
          onset_unit?: string | null
          owner_id?: string
          peak_max_value?: number | null
          peak_min_value?: number | null
          peak_unit?: string | null
          plateau_max_value?: number | null
          plateau_min_value?: number | null
          plateau_unit?: string | null
          route?: string | null
          steady_state_max_value?: number | null
          steady_state_min_value?: number | null
          steady_state_unit?: string | null
          substance_id?: string
          tail_max_value?: number | null
          tail_min_value?: number | null
          tail_unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "substance_formulations_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "substances"
            referencedColumns: ["id"]
          },
        ]
      }
      substance_use_logs: {
        Row: {
          amount: number | null
          associated_medications: string[] | null
          compulsion: number | null
          consequence: string | null
          context: string | null
          craving_after: number | null
          craving_before: number | null
          created_at: string
          fissure: number | null
          id: string
          intent: string | null
          owner_id: string
          patient_id: string
          patient_notes: string | null
          physician_notes: string | null
          reinforcement: number | null
          route: string | null
          session_id: string | null
          substance_id: string | null
          substance_name: string
          trigger: string | null
          unit: string | null
          updated_at: string
          used_at: string
          withdrawal: number | null
        }
        Insert: {
          amount?: number | null
          associated_medications?: string[] | null
          compulsion?: number | null
          consequence?: string | null
          context?: string | null
          craving_after?: number | null
          craving_before?: number | null
          created_at?: string
          fissure?: number | null
          id?: string
          intent?: string | null
          owner_id: string
          patient_id: string
          patient_notes?: string | null
          physician_notes?: string | null
          reinforcement?: number | null
          route?: string | null
          session_id?: string | null
          substance_id?: string | null
          substance_name: string
          trigger?: string | null
          unit?: string | null
          updated_at?: string
          used_at?: string
          withdrawal?: number | null
        }
        Update: {
          amount?: number | null
          associated_medications?: string[] | null
          compulsion?: number | null
          consequence?: string | null
          context?: string | null
          craving_after?: number | null
          craving_before?: number | null
          created_at?: string
          fissure?: number | null
          id?: string
          intent?: string | null
          owner_id?: string
          patient_id?: string
          patient_notes?: string | null
          physician_notes?: string | null
          reinforcement?: number | null
          route?: string | null
          session_id?: string | null
          substance_id?: string | null
          substance_name?: string
          trigger?: string | null
          unit?: string | null
          updated_at?: string
          used_at?: string
          withdrawal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "substance_use_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substance_use_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substance_use_logs_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "substances"
            referencedColumns: ["id"]
          },
        ]
      }
      substances: {
        Row: {
          absorption_notes: string | null
          abuse_liability_profile: Json | null
          abuse_risk_level: string | null
          active_metabolites: string[] | null
          adverse_effect_profile: Json | null
          alcohol_interaction_notes: string | null
          available_formulations: string[] | null
          available_routes: string[] | null
          bioavailability_max: number | null
          bioavailability_min: number | null
          black_box_warnings: string[] | null
          brand_names: string[] | null
          brands: string[] | null
          caffeine_interaction_notes: string | null
          cardiovascular_risk_level: string | null
          carry_over_d1: number | null
          circuit_effects: Json | null
          clinical_category: string | null
          clinical_effect_profile: Json | null
          cognitive_impairment_risk_level: string | null
          comeup_max_value: number | null
          comeup_min_value: number | null
          comeup_unit: string | null
          common_adverse_effects: string[] | null
          common_misspellings: string[] | null
          contraindication_rules: Json | null
          controlled_substance: boolean | null
          created_at: string
          cyp_inducer: string[] | null
          cyp_inhibitor: string[] | null
          cyp_substrate: string[] | null
          default_curve_model: string | null
          default_dose_unit: string | null
          default_formulation: string | null
          default_route: string | null
          dependence_profile: Json | null
          distribution_notes: string | null
          dose_default: number | null
          dose_high: number | null
          dose_high_max: number | null
          dose_high_min: number | null
          dose_low: number | null
          dose_low_max: number | null
          dose_low_min: number | null
          dose_max_recommended: number | null
          dose_notes: string | null
          dose_unit_default: string | null
          dose_usual: number | null
          dose_usual_max: number | null
          dose_usual_min: number | null
          elimination_notes: string | null
          empty_stomach_effect: string | null
          enzyme_profile: Json | null
          evidence_level: string | null
          food_delay_onset_minutes_max: number | null
          food_delay_onset_minutes_min: number | null
          food_effect_notes: string | null
          food_influence: string | null
          food_interaction_profile: Json | null
          generic_name: string | null
          half_life_max_value: number | null
          half_life_min_value: number | null
          half_life_unit: string | null
          has_steady_state: boolean | null
          has_tail: boolean | null
          hepatic_adjustment_notes: string | null
          high_fat_meal_effect: string | null
          id: string
          insomnia_risk_level: string | null
          interaction_rules: Json | null
          is_global: boolean
          last_reviewed_at: string | null
          legal_status: string | null
          major_warnings: string[] | null
          mechanism_expanded: string | null
          mechanism_summary: string | null
          metabolic_risk_level: string | null
          metabolic_role: string | null
          metabolism: string | null
          metabolism_notes: string | null
          monitoring_rules: Json | null
          name: string
          neurotransmitter_effects: Json | null
          offset_max_value: number | null
          offset_min_value: number | null
          offset_unit: string | null
          onset_max_value: number | null
          onset_min_value: number | null
          onset_unit: string | null
          owner_id: string | null
          peak_max_value: number | null
          peak_min_value: number | null
          peak_unit: string | null
          pharmacological_class: string | null
          pharmacological_subclass: string | null
          pk: Json | null
          pk_profile: Json | null
          plateau_max_value: number | null
          plateau_min_value: number | null
          plateau_unit: string | null
          potentials: Json | null
          presentations: Json | null
          primary_targets: Json | null
          protein_binding_percent: number | null
          psychosis_mania_risk_level: string | null
          qt_risk_level: string | null
          receptor_profile: Json | null
          reference_names: string[] | null
          references: string[] | null
          release_curve_type: string | null
          relevant_enzymes: string[] | null
          renal_adjustment_notes: string | null
          requires_clinical_review: boolean
          requires_prescription: boolean | null
          residual_max_value: number | null
          residual_min_value: number | null
          residual_unit: string | null
          respiratory_depression_risk_level: string | null
          review_status: string | null
          reviewed_by: string | null
          safety_notes: string | null
          secondary_targets: Json | null
          sedation_risk_level: string | null
          seizure_risk_level: string | null
          serious_adverse_effects: string[] | null
          serotonin_syndrome_risk_level: string | null
          short_description: string | null
          sleep_deprivation_risk_notes: string | null
          source_notes: string | null
          source_references: Json | null
          steady_state_max_value: number | null
          steady_state_min_value: number | null
          steady_state_unit: string | null
          substance_type: string | null
          synonyms: string[] | null
          tail_max_value: number | null
          tail_min_value: number | null
          tail_unit: string | null
          targets_receptors: string[] | null
          therapeutic_areas: string[] | null
          titration_notes: string | null
          tolerance_model: string | null
          tolerance_profile: Json | null
          total_duration_max_value: number | null
          total_duration_min_value: number | null
          total_duration_unit: string | null
          transporter_inhibitor: string[] | null
          transporter_profile: Json | null
          transporter_substrate: string[] | null
          ugt_inducer: string[] | null
          ugt_inhibitor: string[] | null
          ugt_substrate: string[] | null
          updated_at: string
          withdrawal_profile: Json | null
        }
        Insert: {
          absorption_notes?: string | null
          abuse_liability_profile?: Json | null
          abuse_risk_level?: string | null
          active_metabolites?: string[] | null
          adverse_effect_profile?: Json | null
          alcohol_interaction_notes?: string | null
          available_formulations?: string[] | null
          available_routes?: string[] | null
          bioavailability_max?: number | null
          bioavailability_min?: number | null
          black_box_warnings?: string[] | null
          brand_names?: string[] | null
          brands?: string[] | null
          caffeine_interaction_notes?: string | null
          cardiovascular_risk_level?: string | null
          carry_over_d1?: number | null
          circuit_effects?: Json | null
          clinical_category?: string | null
          clinical_effect_profile?: Json | null
          cognitive_impairment_risk_level?: string | null
          comeup_max_value?: number | null
          comeup_min_value?: number | null
          comeup_unit?: string | null
          common_adverse_effects?: string[] | null
          common_misspellings?: string[] | null
          contraindication_rules?: Json | null
          controlled_substance?: boolean | null
          created_at?: string
          cyp_inducer?: string[] | null
          cyp_inhibitor?: string[] | null
          cyp_substrate?: string[] | null
          default_curve_model?: string | null
          default_dose_unit?: string | null
          default_formulation?: string | null
          default_route?: string | null
          dependence_profile?: Json | null
          distribution_notes?: string | null
          dose_default?: number | null
          dose_high?: number | null
          dose_high_max?: number | null
          dose_high_min?: number | null
          dose_low?: number | null
          dose_low_max?: number | null
          dose_low_min?: number | null
          dose_max_recommended?: number | null
          dose_notes?: string | null
          dose_unit_default?: string | null
          dose_usual?: number | null
          dose_usual_max?: number | null
          dose_usual_min?: number | null
          elimination_notes?: string | null
          empty_stomach_effect?: string | null
          enzyme_profile?: Json | null
          evidence_level?: string | null
          food_delay_onset_minutes_max?: number | null
          food_delay_onset_minutes_min?: number | null
          food_effect_notes?: string | null
          food_influence?: string | null
          food_interaction_profile?: Json | null
          generic_name?: string | null
          half_life_max_value?: number | null
          half_life_min_value?: number | null
          half_life_unit?: string | null
          has_steady_state?: boolean | null
          has_tail?: boolean | null
          hepatic_adjustment_notes?: string | null
          high_fat_meal_effect?: string | null
          id?: string
          insomnia_risk_level?: string | null
          interaction_rules?: Json | null
          is_global?: boolean
          last_reviewed_at?: string | null
          legal_status?: string | null
          major_warnings?: string[] | null
          mechanism_expanded?: string | null
          mechanism_summary?: string | null
          metabolic_risk_level?: string | null
          metabolic_role?: string | null
          metabolism?: string | null
          metabolism_notes?: string | null
          monitoring_rules?: Json | null
          name: string
          neurotransmitter_effects?: Json | null
          offset_max_value?: number | null
          offset_min_value?: number | null
          offset_unit?: string | null
          onset_max_value?: number | null
          onset_min_value?: number | null
          onset_unit?: string | null
          owner_id?: string | null
          peak_max_value?: number | null
          peak_min_value?: number | null
          peak_unit?: string | null
          pharmacological_class?: string | null
          pharmacological_subclass?: string | null
          pk?: Json | null
          pk_profile?: Json | null
          plateau_max_value?: number | null
          plateau_min_value?: number | null
          plateau_unit?: string | null
          potentials?: Json | null
          presentations?: Json | null
          primary_targets?: Json | null
          protein_binding_percent?: number | null
          psychosis_mania_risk_level?: string | null
          qt_risk_level?: string | null
          receptor_profile?: Json | null
          reference_names?: string[] | null
          references?: string[] | null
          release_curve_type?: string | null
          relevant_enzymes?: string[] | null
          renal_adjustment_notes?: string | null
          requires_clinical_review?: boolean
          requires_prescription?: boolean | null
          residual_max_value?: number | null
          residual_min_value?: number | null
          residual_unit?: string | null
          respiratory_depression_risk_level?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          safety_notes?: string | null
          secondary_targets?: Json | null
          sedation_risk_level?: string | null
          seizure_risk_level?: string | null
          serious_adverse_effects?: string[] | null
          serotonin_syndrome_risk_level?: string | null
          short_description?: string | null
          sleep_deprivation_risk_notes?: string | null
          source_notes?: string | null
          source_references?: Json | null
          steady_state_max_value?: number | null
          steady_state_min_value?: number | null
          steady_state_unit?: string | null
          substance_type?: string | null
          synonyms?: string[] | null
          tail_max_value?: number | null
          tail_min_value?: number | null
          tail_unit?: string | null
          targets_receptors?: string[] | null
          therapeutic_areas?: string[] | null
          titration_notes?: string | null
          tolerance_model?: string | null
          tolerance_profile?: Json | null
          total_duration_max_value?: number | null
          total_duration_min_value?: number | null
          total_duration_unit?: string | null
          transporter_inhibitor?: string[] | null
          transporter_profile?: Json | null
          transporter_substrate?: string[] | null
          ugt_inducer?: string[] | null
          ugt_inhibitor?: string[] | null
          ugt_substrate?: string[] | null
          updated_at?: string
          withdrawal_profile?: Json | null
        }
        Update: {
          absorption_notes?: string | null
          abuse_liability_profile?: Json | null
          abuse_risk_level?: string | null
          active_metabolites?: string[] | null
          adverse_effect_profile?: Json | null
          alcohol_interaction_notes?: string | null
          available_formulations?: string[] | null
          available_routes?: string[] | null
          bioavailability_max?: number | null
          bioavailability_min?: number | null
          black_box_warnings?: string[] | null
          brand_names?: string[] | null
          brands?: string[] | null
          caffeine_interaction_notes?: string | null
          cardiovascular_risk_level?: string | null
          carry_over_d1?: number | null
          circuit_effects?: Json | null
          clinical_category?: string | null
          clinical_effect_profile?: Json | null
          cognitive_impairment_risk_level?: string | null
          comeup_max_value?: number | null
          comeup_min_value?: number | null
          comeup_unit?: string | null
          common_adverse_effects?: string[] | null
          common_misspellings?: string[] | null
          contraindication_rules?: Json | null
          controlled_substance?: boolean | null
          created_at?: string
          cyp_inducer?: string[] | null
          cyp_inhibitor?: string[] | null
          cyp_substrate?: string[] | null
          default_curve_model?: string | null
          default_dose_unit?: string | null
          default_formulation?: string | null
          default_route?: string | null
          dependence_profile?: Json | null
          distribution_notes?: string | null
          dose_default?: number | null
          dose_high?: number | null
          dose_high_max?: number | null
          dose_high_min?: number | null
          dose_low?: number | null
          dose_low_max?: number | null
          dose_low_min?: number | null
          dose_max_recommended?: number | null
          dose_notes?: string | null
          dose_unit_default?: string | null
          dose_usual?: number | null
          dose_usual_max?: number | null
          dose_usual_min?: number | null
          elimination_notes?: string | null
          empty_stomach_effect?: string | null
          enzyme_profile?: Json | null
          evidence_level?: string | null
          food_delay_onset_minutes_max?: number | null
          food_delay_onset_minutes_min?: number | null
          food_effect_notes?: string | null
          food_influence?: string | null
          food_interaction_profile?: Json | null
          generic_name?: string | null
          half_life_max_value?: number | null
          half_life_min_value?: number | null
          half_life_unit?: string | null
          has_steady_state?: boolean | null
          has_tail?: boolean | null
          hepatic_adjustment_notes?: string | null
          high_fat_meal_effect?: string | null
          id?: string
          insomnia_risk_level?: string | null
          interaction_rules?: Json | null
          is_global?: boolean
          last_reviewed_at?: string | null
          legal_status?: string | null
          major_warnings?: string[] | null
          mechanism_expanded?: string | null
          mechanism_summary?: string | null
          metabolic_risk_level?: string | null
          metabolic_role?: string | null
          metabolism?: string | null
          metabolism_notes?: string | null
          monitoring_rules?: Json | null
          name?: string
          neurotransmitter_effects?: Json | null
          offset_max_value?: number | null
          offset_min_value?: number | null
          offset_unit?: string | null
          onset_max_value?: number | null
          onset_min_value?: number | null
          onset_unit?: string | null
          owner_id?: string | null
          peak_max_value?: number | null
          peak_min_value?: number | null
          peak_unit?: string | null
          pharmacological_class?: string | null
          pharmacological_subclass?: string | null
          pk?: Json | null
          pk_profile?: Json | null
          plateau_max_value?: number | null
          plateau_min_value?: number | null
          plateau_unit?: string | null
          potentials?: Json | null
          presentations?: Json | null
          primary_targets?: Json | null
          protein_binding_percent?: number | null
          psychosis_mania_risk_level?: string | null
          qt_risk_level?: string | null
          receptor_profile?: Json | null
          reference_names?: string[] | null
          references?: string[] | null
          release_curve_type?: string | null
          relevant_enzymes?: string[] | null
          renal_adjustment_notes?: string | null
          requires_clinical_review?: boolean
          requires_prescription?: boolean | null
          residual_max_value?: number | null
          residual_min_value?: number | null
          residual_unit?: string | null
          respiratory_depression_risk_level?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          safety_notes?: string | null
          secondary_targets?: Json | null
          sedation_risk_level?: string | null
          seizure_risk_level?: string | null
          serious_adverse_effects?: string[] | null
          serotonin_syndrome_risk_level?: string | null
          short_description?: string | null
          sleep_deprivation_risk_notes?: string | null
          source_notes?: string | null
          source_references?: Json | null
          steady_state_max_value?: number | null
          steady_state_min_value?: number | null
          steady_state_unit?: string | null
          substance_type?: string | null
          synonyms?: string[] | null
          tail_max_value?: number | null
          tail_min_value?: number | null
          tail_unit?: string | null
          targets_receptors?: string[] | null
          therapeutic_areas?: string[] | null
          titration_notes?: string | null
          tolerance_model?: string | null
          tolerance_profile?: Json | null
          total_duration_max_value?: number | null
          total_duration_min_value?: number | null
          total_duration_unit?: string | null
          transporter_inhibitor?: string[] | null
          transporter_profile?: Json | null
          transporter_substrate?: string[] | null
          ugt_inducer?: string[] | null
          ugt_inhibitor?: string[] | null
          ugt_substrate?: string[] | null
          updated_at?: string
          withdrawal_profile?: Json | null
        }
        Relationships: []
      }
      symptom_measurements: {
        Row: {
          active_medications: string[] | null
          context: string | null
          created_at: string
          duration_min: number | null
          id: string
          intensity_0_10: number | null
          intensity_0_100: number | null
          measured_at: string
          notes: string | null
          owner_id: string
          patient_id: string
          session_id: string | null
          symptom_name: string
          target_symptom_id: string | null
        }
        Insert: {
          active_medications?: string[] | null
          context?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          intensity_0_10?: number | null
          intensity_0_100?: number | null
          measured_at?: string
          notes?: string | null
          owner_id: string
          patient_id: string
          session_id?: string | null
          symptom_name: string
          target_symptom_id?: string | null
        }
        Update: {
          active_medications?: string[] | null
          context?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          intensity_0_10?: number | null
          intensity_0_100?: number | null
          measured_at?: string
          notes?: string | null
          owner_id?: string
          patient_id?: string
          session_id?: string | null
          symptom_name?: string
          target_symptom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_measurements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_measurements_target_symptom_id_fkey"
            columns: ["target_symptom_id"]
            isOneToOne: false
            referencedRelation: "patient_target_symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

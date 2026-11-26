
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alerts": {
                  Row: {
                    "athlete_id": string,"created_at": string,"id": string,"kind": string,"message": string,"org_id": string,"read_at": string | null,"scheduled_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"created_at"?: string,"id"?: string,"kind": string,"message": string,"org_id": string,"read_at"?: string | null,"scheduled_id"?: string | null
                  }
                  Update: {
                    "athlete_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"message"?: string,"org_id"?: string,"read_at"?: string | null,"scheduled_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_scheduled_id_fkey"
      columns: ["scheduled_id"]
isOneToOne: false
      referencedRelation: "scheduled_workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"assessment_results": {
                  Row: {
                    "assessment_id": string,"id": string,"note": string | null,"org_id": string,"passed": boolean | null,"side": string,"test_id": string,"value": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assessment_id": string,"id"?: string,"note"?: string | null,"org_id": string,"passed"?: boolean | null,"side"?: string,"test_id": string,"value"?: number | null
                  }
                  Update: {
                    "assessment_id"?: string,"id"?: string,"note"?: string | null,"org_id"?: string,"passed"?: boolean | null,"side"?: string,"test_id"?: string,"value"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_results_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "assessments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_results_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_results_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "assessment_tests"
      referencedColumns: ["id"]
    }
                  ]
                },"assessment_test_catalog": {
                  Row: {
                    "bilateral": boolean,"category": string,"higher_is_better": boolean,"id": string,"instructions": string | null,"kind": string,"name": string,"sort_order": number,"target": number | null,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bilateral"?: boolean,"category": string,"higher_is_better"?: boolean,"id"?: string,"instructions"?: string | null,"kind": string,"name": string,"sort_order"?: number,"target"?: number | null,"unit"?: string | null
                  }
                  Update: {
                    "bilateral"?: boolean,"category"?: string,"higher_is_better"?: boolean,"id"?: string,"instructions"?: string | null,"kind"?: string,"name"?: string,"sort_order"?: number,"target"?: number | null,"unit"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"assessment_tests": {
                  Row: {
                    "archived": boolean,"bilateral": boolean,"category": string,"created_at": string,"higher_is_better": boolean,"id": string,"instructions": string | null,"kind": string,"name": string,"org_id": string,"sort_order": number,"target": number | null,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"bilateral"?: boolean,"category": string,"created_at"?: string,"higher_is_better"?: boolean,"id"?: string,"instructions"?: string | null,"kind": string,"name": string,"org_id": string,"sort_order"?: number,"target"?: number | null,"unit"?: string | null
                  }
                  Update: {
                    "archived"?: boolean,"bilateral"?: boolean,"category"?: string,"created_at"?: string,"higher_is_better"?: boolean,"id"?: string,"instructions"?: string | null,"kind"?: string,"name"?: string,"org_id"?: string,"sort_order"?: number,"target"?: number | null,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_tests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"assessments": {
                  Row: {
                    "athlete_id": string,"created_at": string,"created_by": string | null,"date": string,"id": string,"notes": string | null,"org_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"created_at"?: string,"created_by"?: string | null,"date"?: string,"id"?: string,"notes"?: string | null,"org_id": string,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string,"created_at"?: string,"created_by"?: string | null,"date"?: string,"id"?: string,"notes"?: string | null,"org_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessments_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessments_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"athlete_groups": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"org_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"org_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"org_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "athlete_groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"athlete_sport_profiles": {
                  Row: {
                    "athlete_id": string,"sport_id": string,"updated_at": string,"values": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"sport_id": string,"updated_at"?: string,"values"?: NonNullable<Json>
                  }
                  Update: {
                    "athlete_id"?: string,"sport_id"?: string,"updated_at"?: string,"values"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "athlete_sport_profiles_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "athlete_sport_profiles_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    }
                  ]
                },"athletes": {
                  Row: {
                    "birth_date": string | null,"created_at": string,"email": string | null,"equipment": (string)[],"first_name": string,"goals": string | null,"height_cm": number | null,"id": string,"last_name": string,"level": string | null,"notes": string | null,"org_id": string,"phone": string | null,"sessions_per_week": number | null,"sex": string | null,"sport_id": string | null,"status": string,"training_days": (string)[],"updated_at": string,"user_id": string | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_date"?: string | null,"created_at"?: string,"email"?: string | null,"equipment"?: (string)[],"first_name": string,"goals"?: string | null,"height_cm"?: number | null,"id"?: string,"last_name"?: string,"level"?: string | null,"notes"?: string | null,"org_id": string,"phone"?: string | null,"sessions_per_week"?: number | null,"sex"?: string | null,"sport_id"?: string | null,"status"?: string,"training_days"?: (string)[],"updated_at"?: string,"user_id"?: string | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "birth_date"?: string | null,"created_at"?: string,"email"?: string | null,"equipment"?: (string)[],"first_name"?: string,"goals"?: string | null,"height_cm"?: number | null,"id"?: string,"last_name"?: string,"level"?: string | null,"notes"?: string | null,"org_id"?: string,"phone"?: string | null,"sessions_per_week"?: number | null,"sex"?: string | null,"sport_id"?: string | null,"status"?: string,"training_days"?: (string)[],"updated_at"?: string,"user_id"?: string | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "athletes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "athletes_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    }
                  ]
                },"calendar_events": {
                  Row: {
                    "athlete_id": string,"created_at": string,"created_by": string | null,"end_date": string,"id": string,"kind": string,"location": string | null,"notes": string | null,"org_id": string,"start_date": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"created_at"?: string,"created_by"?: string | null,"end_date": string,"id"?: string,"kind": string,"location"?: string | null,"notes"?: string | null,"org_id": string,"start_date": string,"title": string
                  }
                  Update: {
                    "athlete_id"?: string,"created_at"?: string,"created_by"?: string | null,"end_date"?: string,"id"?: string,"kind"?: string,"location"?: string | null,"notes"?: string | null,"org_id"?: string,"start_date"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"exercise_media": {
                  Row: {
                    "created_at": string,"exercise_id": string,"id": string,"org_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exercise_id": string,"id"?: string,"org_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"exercise_id"?: string,"id"?: string,"org_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_media_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_media_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"exercise_video_overrides": {
                  Row: {
                    "exercise_id": string,"org_id": string,"updated_at": string,"video_url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"org_id": string,"updated_at"?: string,"video_url": string
                  }
                  Update: {
                    "exercise_id"?: string,"org_id"?: string,"updated_at"?: string,"video_url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_video_overrides_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_video_overrides_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "archived": boolean,"category": string,"coaching_cues": string | null,"created_at": string,"created_by": string | null,"description": string | null,"equipment": (string)[],"id": string,"instructions": string | null,"muscle_groups": (string)[],"name": string,"org_id": string | null,"source_exercise_id": string | null,"unilateral": boolean,"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"category": string,"coaching_cues"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"equipment"?: (string)[],"id"?: string,"instructions"?: string | null,"muscle_groups"?: (string)[],"name": string,"org_id"?: string | null,"source_exercise_id"?: string | null,"unilateral"?: boolean,"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "archived"?: boolean,"category"?: string,"coaching_cues"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"equipment"?: (string)[],"id"?: string,"instructions"?: string | null,"muscle_groups"?: (string)[],"name"?: string,"org_id"?: string | null,"source_exercise_id"?: string | null,"unilateral"?: boolean,"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercises_source_exercise_id_fkey"
      columns: ["source_exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "athlete_id": string,"group_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"group_id": string
                  }
                  Update: {
                    "athlete_id"?: string,"group_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "athlete_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"injuries": {
                  Row: {
                    "athlete_id": string,"body_area": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"limitations": string | null,"org_id": string,"resolved_on": string | null,"severity": string,"started_on": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"body_area": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"limitations"?: string | null,"org_id": string,"resolved_on"?: string | null,"severity"?: string,"started_on"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string,"body_area"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"limitations"?: string | null,"org_id"?: string,"resolved_on"?: string | null,"severity"?: string,"started_on"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "injuries_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "injuries_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"athlete_id": string,"created_at": string,"created_by": string | null,"email": string,"expires_at": string,"id": string,"org_id": string,"revoked_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"athlete_id": string,"created_at"?: string,"created_by"?: string | null,"email": string,"expires_at"?: string,"id"?: string,"org_id": string,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"athlete_id"?: string,"created_at"?: string,"created_by"?: string | null,"email"?: string,"expires_at"?: string,"id"?: string,"org_id"?: string,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "created_at": string,"id": string,"org_id": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"org_id": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"org_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"plan": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"plan"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"plan"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"program_blocks": {
                  Row: {
                    "created_at": string,"goal": string | null,"id": string,"name": string,"org_id": string,"program_id": string,"sort_order": number,"weeks": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"goal"?: string | null,"id"?: string,"name": string,"org_id": string,"program_id": string,"sort_order"?: number,"weeks"?: number
                  }
                  Update: {
                    "created_at"?: string,"goal"?: string | null,"id"?: string,"name"?: string,"org_id"?: string,"program_id"?: string,"sort_order"?: number,"weeks"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_blocks_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "program_blocks_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"programs": {
                  Row: {
                    "athlete_id": string | null,"created_at": string,"created_by": string | null,"description": string | null,"goal": string | null,"id": string,"name": string,"org_id": string,"source": string,"source_program_id": string | null,"start_date": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"goal"?: string | null,"id"?: string,"name": string,"org_id": string,"source"?: string,"source_program_id"?: string | null,"start_date"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"goal"?: string | null,"id"?: string,"name"?: string,"org_id"?: string,"source"?: string,"source_program_id"?: string | null,"start_date"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "programs_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "programs_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "programs_source_program_id_fkey"
      columns: ["source_program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"scheduled_workouts": {
                  Row: {
                    "athlete_id": string,"comment": string | null,"completed_at": string | null,"created_at": string,"date": string,"duration_min": number | null,"id": string,"org_id": string,"pain": boolean,"pain_area": string | null,"pain_level": number | null,"program_id": string | null,"session_rpe": number | null,"started_at": string | null,"status": string,"updated_at": string,"workout_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"comment"?: string | null,"completed_at"?: string | null,"created_at"?: string,"date": string,"duration_min"?: number | null,"id"?: string,"org_id": string,"pain"?: boolean,"pain_area"?: string | null,"pain_level"?: number | null,"program_id"?: string | null,"session_rpe"?: number | null,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"workout_id": string
                  }
                  Update: {
                    "athlete_id"?: string,"comment"?: string | null,"completed_at"?: string | null,"created_at"?: string,"date"?: string,"duration_min"?: number | null,"id"?: string,"org_id"?: string,"pain"?: boolean,"pain_area"?: string | null,"pain_level"?: number | null,"program_id"?: string | null,"session_rpe"?: number | null,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"workout_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "scheduled_workouts_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scheduled_workouts_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scheduled_workouts_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scheduled_workouts_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: true
      referencedRelation: "workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"set_logs": {
                  Row: {
                    "athlete_id": string,"done": boolean,"exercise_id": string,"id": string,"load_kg": number | null,"logged_at": string,"org_id": string,"reps": number | null,"scheduled_id": string,"set_number": number,"workout_item_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id": string,"done"?: boolean,"exercise_id": string,"id"?: string,"load_kg"?: number | null,"logged_at"?: string,"org_id": string,"reps"?: number | null,"scheduled_id": string,"set_number": number,"workout_item_id"?: string | null
                  }
                  Update: {
                    "athlete_id"?: string,"done"?: boolean,"exercise_id"?: string,"id"?: string,"load_kg"?: number | null,"logged_at"?: string,"org_id"?: string,"reps"?: number | null,"scheduled_id"?: string,"set_number"?: number,"workout_item_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "set_logs_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_scheduled_id_fkey"
      columns: ["scheduled_id"]
isOneToOne: false
      referencedRelation: "scheduled_workouts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_workout_item_id_fkey"
      columns: ["workout_item_id"]
isOneToOne: false
      referencedRelation: "workout_items"
      referencedColumns: ["id"]
    }
                  ]
                },"sport_fields": {
                  Row: {
                    "field_type": string,"id": string,"key": string,"label": string,"options": NonNullable<Json>,"sort_order": number,"sport_id": string,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "field_type": string,"id"?: string,"key": string,"label": string,"options"?: NonNullable<Json>,"sort_order"?: number,"sport_id": string,"unit"?: string | null
                  }
                  Update: {
                    "field_type"?: string,"id"?: string,"key"?: string,"label"?: string,"options"?: NonNullable<Json>,"sort_order"?: number,"sport_id"?: string,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sport_fields_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    }
                  ]
                },"sports": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"org_id": string | null,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"org_id"?: string | null,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"org_id"?: string | null,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sports_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_items": {
                  Row: {
                    "exercise_id": string,"group_label": string | null,"id": string,"load": string | null,"notes": string | null,"org_id": string,"reps": string | null,"rest_sec": number | null,"rpe": number | null,"sets": number | null,"sort_order": number,"tempo": string | null,"workout_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"group_label"?: string | null,"id"?: string,"load"?: string | null,"notes"?: string | null,"org_id": string,"reps"?: string | null,"rest_sec"?: number | null,"rpe"?: number | null,"sets"?: number | null,"sort_order"?: number,"tempo"?: string | null,"workout_id": string
                  }
                  Update: {
                    "exercise_id"?: string,"group_label"?: string | null,"id"?: string,"load"?: string | null,"notes"?: string | null,"org_id"?: string,"reps"?: string | null,"rest_sec"?: number | null,"rpe"?: number | null,"sets"?: number | null,"sort_order"?: number,"tempo"?: string | null,"workout_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_items_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_items_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_items_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"workouts": {
                  Row: {
                    "athlete_id": string | null,"block_id": string | null,"created_at": string,"day_index": number | null,"est_duration_min": number | null,"focus": (string)[],"goal": string | null,"id": string,"intensity_pct": number | null,"name": string,"notes": string | null,"org_id": string,"program_id": string | null,"sort_order": number,"updated_at": string,"week_index": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id"?: string | null,"block_id"?: string | null,"created_at"?: string,"day_index"?: number | null,"est_duration_min"?: number | null,"focus"?: (string)[],"goal"?: string | null,"id"?: string,"intensity_pct"?: number | null,"name": string,"notes"?: string | null,"org_id": string,"program_id"?: string | null,"sort_order"?: number,"updated_at"?: string,"week_index"?: number | null
                  }
                  Update: {
                    "athlete_id"?: string | null,"block_id"?: string | null,"created_at"?: string,"day_index"?: number | null,"est_duration_min"?: number | null,"focus"?: (string)[],"goal"?: string | null,"id"?: string,"intensity_pct"?: number | null,"name"?: string,"notes"?: string | null,"org_id"?: string,"program_id"?: string | null,"sort_order"?: number,"updated_at"?: string,"week_index"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_athlete_id_fkey"
      columns: ["athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workouts_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "program_blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workouts_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workouts_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"assign_program":
{ Args: { "p_athletes": (string)[],"p_program": string,"p_start": string }; Returns: number
                           },
"assign_workout":
{ Args: { "p_athletes": (string)[],"p_start": string,"p_weekdays": (number)[],"p_weeks": number,"p_workout": string }; Returns: number
                           },
"athlete_org":
{ Args: { "p_athlete": string }; Returns: string
                           },
"copy_program":
{ Args: { "p_athlete"?: string,"p_name"?: string,"p_program": string }; Returns: string
                           },
"copy_week":
{ Args: { "p_block": string,"p_from": number,"p_to": number }; Returns: number
                           },
"copy_workout":
{ Args: { "p_block": string,"p_day": number,"p_name"?: string,"p_program": string,"p_week": number,"p_workout": string }; Returns: string
                           },
"create_invitation":
{ Args: { "p_athlete": string }; Returns: string
                           },
"create_organization":
{ Args: { "p_name": string }; Returns: string
                           },
"exercise_org":
{ Args: { "p_exercise": string }; Returns: string
                           },
"finish_session":
{ Args: { "p_comment": string,"p_duration": number,"p_pain": boolean,"p_pain_area": string,"p_pain_level": number,"p_rpe": number,"p_scheduled": string,"p_status": string }; Returns: undefined
                           },
"get_invitation":
{ Args: { "p_token": string }; Returns: {
              "athlete_first_name": string,"email": string,"expires_at": string,"org_name": string
            }[]
                           },
"group_org":
{ Args: { "p_group": string }; Returns: string
                           },
"import_routine":
{ Args: { "p_data": Json,"p_org": string }; Returns: Json
                           },
"init_assessment_tests":
{ Args: { "p_org": string }; Returns: undefined
                           },
"is_my_scheduled_workout":
{ Args: { "p_workout": string }; Returns: boolean
                           },
"is_org_member":
{ Args: { "p_org": string }; Returns: boolean
                           },
"is_org_staff":
{ Args: { "p_org": string }; Returns: boolean
                           },
"is_program_athlete":
{ Args: { "p": string }; Returns: boolean
                           },
"is_self_athlete":
{ Args: { "p_athlete": string }; Returns: boolean
                           },
"is_visible_schedule":
{ Args: { "p_athlete": string,"p_program": string }; Returns: boolean
                           },
"log_set":
{ Args: { "p_done": boolean,"p_item": string,"p_load": number,"p_reps": number,"p_scheduled": string,"p_set": number }; Returns: undefined
                           },
"my_schedule":
{ Args: { "p_scheduled": string }; Returns: {
              "athlete_id": string,
"comment": string | null,
"completed_at": string | null,
"created_at": string,
"date": string,
"duration_min": number | null,
"id": string,
"org_id": string,
"pain": boolean,
"pain_area": string | null,
"pain_level": number | null,
"program_id": string | null,
"session_rpe": number | null,
"started_at": string | null,
"status": string,
"updated_at": string,
"workout_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "scheduled_workouts"
        isOneToOne: true
        isSetofReturn: false
      } },
"program_org":
{ Args: { "p": string }; Returns: string
                           },
"reopen_session":
{ Args: { "p_scheduled": string }; Returns: undefined
                           },
"save_assessment":
{ Args: { "p_assessment": string,"p_athlete": string,"p_date": string,"p_notes": string,"p_results": Json }; Returns: string
                           },
"save_workout":
{ Args: { "p_data": Json,"p_workout": string }; Returns: undefined
                           },
"schedule_date":
{ Args: { "p_day": number,"p_start": string,"p_week": number }; Returns: string
                           },
"schedule_program":
{ Args: { "p_program": string }; Returns: number
                           },
"set_week_intensity":
{ Args: { "p_block": string,"p_pct": number,"p_week": number }; Returns: number
                           },
"start_session":
{ Args: { "p_scheduled": string }; Returns: undefined
                           },
"storage_org":
{ Args: { "p_name": string }; Returns: string
                           },
"unlink_athlete":
{ Args: { "p_athlete": string }; Returns: undefined
                           },
"workout_abs_week":
{ Args: { "p_block": string,"p_week": number }; Returns: number
                           },
"workout_org":
{ Args: { "p": string }; Returns: string
                           }
          }
          Enums: {
            "member_role": "owner"|"coach"|"athlete"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "member_role": ["owner", "coach", "athlete"]
          }
        }
} as const

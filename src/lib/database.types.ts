
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
            "athlete_groups": {
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"athlete_org":
{ Args: { "p_athlete": string }; Returns: string
                           },
"create_invitation":
{ Args: { "p_athlete": string }; Returns: string
                           },
"create_organization":
{ Args: { "p_name": string }; Returns: string
                           },
"get_invitation":
{ Args: { "p_token": string }; Returns: {
              "athlete_first_name": string,"email": string,"expires_at": string,"org_name": string
            }[]
                           },
"group_org":
{ Args: { "p_group": string }; Returns: string
                           },
"is_org_member":
{ Args: { "p_org": string }; Returns: boolean
                           },
"is_org_staff":
{ Args: { "p_org": string }; Returns: boolean
                           },
"is_self_athlete":
{ Args: { "p_athlete": string }; Returns: boolean
                           },
"unlink_athlete":
{ Args: { "p_athlete": string }; Returns: undefined
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

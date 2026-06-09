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
      applications: {
        Row: {
          ai_flags: Json | null
          ai_matched: Json | null
          ai_missing: Json | null
          ai_recommendation:
            | Database["public"]["Enums"]["ai_recommendation"]
            | null
          ai_score: number | null
          ai_summary: string | null
          applicant_id: string
          created_at: string
          id: string
          job_id: string
          resume_path: string | null
          screening_status: Database["public"]["Enums"]["screening_status"]
          stage: Database["public"]["Enums"]["application_stage"]
          updated_at: string
        }
        Insert: {
          ai_flags?: Json | null
          ai_matched?: Json | null
          ai_missing?: Json | null
          ai_recommendation?:
            | Database["public"]["Enums"]["ai_recommendation"]
            | null
          ai_score?: number | null
          ai_summary?: string | null
          applicant_id: string
          created_at?: string
          id?: string
          job_id: string
          resume_path?: string | null
          screening_status?: Database["public"]["Enums"]["screening_status"]
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Update: {
          ai_flags?: Json | null
          ai_matched?: Json | null
          ai_missing?: Json | null
          ai_recommendation?:
            | Database["public"]["Enums"]["ai_recommendation"]
            | null
          ai_score?: number | null
          ai_summary?: string | null
          applicant_id?: string
          created_at?: string
          id?: string
          job_id?: string
          resume_path?: string | null
          screening_status?: Database["public"]["Enums"]["screening_status"]
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      health_check: {
        Row: {
          id: number
          last_ping: string
        }
        Insert: {
          id: number
          last_ping?: string
        }
        Update: {
          id?: number
          last_ping?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          description: string
          employer_id: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          location: string | null
          requirements: string
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Insert: {
          created_at?: string
          description: string
          employer_id: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          id?: string
          location?: string | null
          requirements: string
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Update: {
          created_at?: string
          description?: string
          employer_id?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          location?: string | null
          requirements?: string
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_recommendation: "STRONG" | "MODERATE" | "WEAK"
      application_stage:
        | "APPLIED"
        | "SCREENED"
        | "TECH_INTERVIEW"
        | "FINAL"
        | "OFFER"
        | "REJECTED"
      employment_type: "FULL_TIME" | "PART_TIME" | "CONTRACT"
      job_status: "OPEN" | "CLOSED"
      screening_status: "PENDING" | "PROCESSING" | "DONE" | "ERROR"
      user_role: "APPLICANT" | "EMPLOYER"
      work_mode: "REMOTE" | "ONSITE" | "HYBRID"
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
      ai_recommendation: ["STRONG", "MODERATE", "WEAK"],
      application_stage: [
        "APPLIED",
        "SCREENED",
        "TECH_INTERVIEW",
        "FINAL",
        "OFFER",
        "REJECTED",
      ],
      employment_type: ["FULL_TIME", "PART_TIME", "CONTRACT"],
      job_status: ["OPEN", "CLOSED"],
      screening_status: ["PENDING", "PROCESSING", "DONE", "ERROR"],
      user_role: ["APPLICANT", "EMPLOYER"],
      work_mode: ["REMOTE", "ONSITE", "HYBRID"],
    },
  },
} as const

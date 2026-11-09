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
    PostgrestVersion: "14.18"
  }
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
      admins: {
        Row: {
          created_at: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          classroom_id: string
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          display_name: string
          id?: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_activities: {
        Row: {
          classroom_id: string
          created_at: string
          created_by: string
          ends_at: string
          id: string
          kind: string
          name: string
          starts_at: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          created_by?: string
          ends_at: string
          id?: string
          kind: string
          name: string
          starts_at: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          kind?: string
          name?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_activities_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          battery_at: string | null
          battery_pct: number | null
          child_id: string | null
          classroom_id: string | null
          created_at: string
          device_id: string
          id: string
          kind: string
          last_seen_at: string | null
          token_hash: string
        }
        Insert: {
          battery_at?: string | null
          battery_pct?: number | null
          child_id?: string | null
          classroom_id?: string | null
          created_at?: string
          device_id: string
          id?: string
          kind: string
          last_seen_at?: string | null
          token_hash: string
        }
        Update: {
          battery_at?: string | null
          battery_pct?: number | null
          child_id?: string | null
          classroom_id?: string | null
          created_at?: string
          device_id?: string
          id?: string
          kind?: string
          last_seen_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notes: {
        Row: {
          accidental: boolean
          created_by: string
          event_id: number
          id: string
          note: string
          updated_at: string
        }
        Insert: {
          accidental?: boolean
          created_by?: string
          event_id: number
          id?: string
          note?: string
          updated_at?: string
        }
        Update: {
          accidental?: boolean
          created_by?: string
          event_id?: number
          id?: string
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "toy_events"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          child_id: string
          profile_id: string
        }
        Insert: {
          child_id: string
          profile_id: string
        }
        Update: {
          child_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_log: {
        Row: {
          detail: string | null
          device_id: string | null
          id: number
          outcome: string
          received_at: string
          status: number
          type: string | null
        }
        Insert: {
          detail?: string | null
          device_id?: string | null
          id?: never
          outcome: string
          received_at?: string
          status: number
          type?: string | null
        }
        Update: {
          detail?: string | null
          device_id?: string | null
          id?: never
          outcome?: string
          received_at?: string
          status?: number
          type?: string | null
        }
        Relationships: []
      }
      interventions: {
        Row: {
          child_id: string
          created_at: string
          created_by: string
          id: string
          note: string
          started_on: string
          title: string
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          started_on: string
          title: string
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          started_on?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          classroom_id: string
          device_id: string
          humidity_pct: number | null
          id: number
          light_lux: number | null
          measured_at: string
          noise_avg: number | null
          noise_peak: number | null
          received_at: string
          seq: number
          temp_c: number | null
          ts_source: string
          window_s: number | null
        }
        Insert: {
          classroom_id: string
          device_id: string
          humidity_pct?: number | null
          id?: never
          light_lux?: number | null
          measured_at: string
          noise_avg?: number | null
          noise_peak?: number | null
          received_at?: string
          seq: number
          temp_c?: number | null
          ts_source: string
          window_s?: number | null
        }
        Update: {
          classroom_id?: string
          device_id?: string
          humidity_pct?: number | null
          id?: never
          light_lux?: number | null
          measured_at?: string
          noise_avg?: number | null
          noise_peak?: number | null
          received_at?: string
          seq?: number
          temp_c?: number | null
          ts_source?: string
          window_s?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      teacher_classrooms: {
        Row: {
          classroom_id: string
          profile_id: string
        }
        Insert: {
          classroom_id: string
          profile_id: string
        }
        Update: {
          classroom_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classrooms_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classrooms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      toy_events: {
        Row: {
          child_id: string
          device_id: string
          id: number
          occurred_at: string
          received_at: string
          seq: number
          ts_source: string
        }
        Insert: {
          child_id: string
          device_id: string
          id?: never
          occurred_at: string
          received_at?: string
          seq: number
          ts_source: string
        }
        Update: {
          child_id?: string
          device_id?: string
          id?: never
          occurred_at?: string
          received_at?: string
          seq?: number
          ts_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "toy_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toy_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
    }
    Views: {
      event_context: {
        Row: {
          child_id: string | null
          event_id: number | null
          humidity_pct: number | null
          light_lux: number | null
          measured_at: string | null
          noise_avg: number | null
          noise_peak: number | null
          occurred_at: string | null
          reading_id: number | null
          temp_c: number | null
          window_s: number | null
        }
        Relationships: [
          {
            foreignKeyName: "toy_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      event_summary: {
        Row: {
          accidental: boolean | null
          child_id: string | null
          event_id: number | null
          humidity_avg: number | null
          light_max: number | null
          light_min: number | null
          noise_avg: number | null
          noise_peak_max: number | null
          occurred_at: string | null
          readings_count: number | null
          temp_avg: number | null
          ts_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toy_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accidental_event_ids: { Args: never; Returns: number[] }
      can_view_child: { Args: { p_child: string }; Returns: boolean }
      can_view_classroom: { Args: { p_classroom: string }; Returns: boolean }
      child_activity_lift: {
        Args: { p_child: string; p_days?: number }
        Returns: {
          baseline_pct: number
          baseline_total: number
          baseline_with: number
          condition: string
          event_pct: number
          events_total: number
          events_with: number
          lift: number
          wilson_high: number
          wilson_low: number
        }[]
      }
      child_condition_combo: {
        Args: {
          p_child: string
          p_days?: number
          p_light_swing?: number
          p_noise?: number
        }
        Returns: {
          baseline_pct: number
          baseline_total: number
          baseline_with: number
          combo: string
          event_pct: number
          events_total: number
          events_with: number
          lift: number
          wilson_high: number
          wilson_low: number
        }[]
      }
      child_condition_lift: {
        Args: {
          p_child: string
          p_days?: number
          p_hum_high?: number
          p_light_high?: number
          p_light_swing?: number
          p_noise?: number
          p_noise_avg?: number
          p_temp_high?: number
        }
        Returns: {
          baseline_pct: number
          baseline_total: number
          baseline_with: number
          condition: string
          event_pct: number
          events_total: number
          events_with: number
          lift: number
          wilson_high: number
          wilson_low: number
        }[]
      }
      child_daily_counts: {
        Args: { p_child: string; p_days?: number }
        Returns: {
          day: string
          events: number
          moving_avg: number
          readings: number
        }[]
      }
      child_episodes: {
        Args: { p_child: string; p_days?: number; p_gap_min?: number }
        Returns: {
          duration_s: number
          ended_at: string
          presses: number
          started_at: string
        }[]
      }
      child_event_curve: {
        Args: {
          p_after_min?: number
          p_before_min?: number
          p_bucket_s?: number
          p_child: string
          p_days?: number
        }
        Returns: {
          baseline_p25: number
          baseline_p50: number
          baseline_p75: number
          events: number
          light_avg: number
          noise_avg: number
          noise_peak: number
          offset_s: number
        }[]
      }
      child_hourly_heatmap: {
        Args: { p_child: string; p_days?: number }
        Returns: {
          dow: number
          events: number
          hour: number
        }[]
      }
      child_intervention_compare: {
        Args: {
          p_child: string
          p_date: string
          p_noise?: number
          p_window_days?: number
        }
        Returns: {
          days_with_data: number
          events: number
          events_noise_high: number
          events_per_day: number
          events_with_context: number
          period: string
        }[]
      }
      child_noise_distribution: {
        Args: { p_bin?: number; p_child: string; p_days?: number }
        Returns: {
          baseline_n: number
          baseline_pct: number
          bin_start: number
          events_n: number
          events_pct: number
        }[]
      }
      child_patterns: {
        Args: {
          p_child: string
          p_days?: number
          p_light_swing?: number
          p_noise?: number
        }
        Returns: {
          avg_humidity_before: number
          avg_noise_before: number
          avg_peak_before: number
          avg_temp_before: number
          baseline_noise_avg: number
          baseline_noise_high_pct: number
          baseline_readings: number
          events_with_context: number
          light_swing_events: number
          noise_high_events: number
          total_events: number
        }[]
      }
      classroom_daily_red: {
        Args: { p_classroom: string; p_days?: number; p_noise?: number }
        Returns: {
          day: string
          high_pct: number
          high_readings: number
          readings: number
        }[]
      }
      classroom_day_events: {
        Args: { p_classroom: string; p_day: string }
        Returns: {
          child_id: string
          display_name: string
          occurred_at: string
        }[]
      }
      classroom_day_timeline: {
        Args: { p_bucket_min?: number; p_classroom: string; p_day: string }
        Returns: {
          bucket_start: string
          light_avg: number
          noise_avg: number
          noise_peak: number
        }[]
      }
      classroom_latest_day: { Args: { p_classroom: string }; Returns: string }
      classroom_live_noise: {
        Args: { p_classroom: string; p_minutes?: number; p_noise?: number }
        Returns: {
          avg_peak: number
          high_n: number
          latest_at: string
          readings_n: number
        }[]
      }
      classroom_noise_heatmap: {
        Args: { p_classroom: string; p_days?: number; p_noise?: number }
        Returns: {
          dow: number
          high_pct: number
          hour: number
          noise_avg: number
          readings: number
        }[]
      }
      classroom_profiles: {
        Args: {
          p_classroom: string
          p_days?: number
          p_hum_high?: number
          p_light_high?: number
          p_light_swing?: number
          p_min_events?: number
          p_min_lift?: number
          p_noise?: number
          p_noise_avg?: number
          p_temp_high?: number
        }
        Returns: {
          child_id: string
          display_name: string
          events_last7: number
          events_period: number
          events_prev7: number
          top_baseline_pct: number
          top_condition: string
          top_event_pct: number
          top_events_total: number
          top_events_with: number
          top_lift: number
          top_wilson_low: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_guardian_of: { Args: { p_child: string }; Returns: boolean }
      is_teacher_of_child: { Args: { p_child: string }; Returns: boolean }
      is_teacher_of_classroom: {
        Args: { p_classroom: string }
        Returns: boolean
      }
      is_teacher_of_event: { Args: { p_event: number }; Returns: boolean }
      visible_child_ids: { Args: never; Returns: string[] }
      visible_classroom_ids: { Args: never; Returns: string[] }
      wilson_high: { Args: { k: number; n: number }; Returns: number }
      wilson_low: { Args: { k: number; n: number }; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const

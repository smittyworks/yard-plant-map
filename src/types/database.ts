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
      care_events: {
        Row: {
          event_type: Database["public"]["Enums"]["care_event_type"]
          id: string
          notes: string | null
          occurred_at: string
          plant_id: string
        }
        Insert: {
          event_type: Database["public"]["Enums"]["care_event_type"]
          id?: string
          notes?: string | null
          occurred_at?: string
          plant_id: string
        }
        Update: {
          event_type?: Database["public"]["Enums"]["care_event_type"]
          id?: string
          notes?: string | null
          occurred_at?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_events_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_photos: {
        Row: {
          id: string
          notes: string | null
          plant_id: string
          storage_url: string
          taken_at: string
        }
        Insert: {
          id?: string
          notes?: string | null
          plant_id: string
          storage_url: string
          taken_at?: string
        }
        Update: {
          id?: string
          notes?: string | null
          plant_id?: string
          storage_url?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_photos_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          botanical_name: string | null
          common_name: string
          created_at: string
          date_planted: string | null
          grid_x: number | null
          grid_y: number | null
          grid_width: number
          grid_height: number
          id: string
          notes: string | null
          placed: boolean
          plant_type: Database["public"]["Enums"]["plant_type"]
          yard_id: string
        }
        Insert: {
          botanical_name?: string | null
          common_name: string
          created_at?: string
          date_planted?: string | null
          grid_x?: number | null
          grid_y?: number | null
          grid_width?: number
          grid_height?: number
          id?: string
          notes?: string | null
          placed?: boolean
          plant_type?: Database["public"]["Enums"]["plant_type"]
          yard_id: string
        }
        Update: {
          botanical_name?: string | null
          common_name?: string
          created_at?: string
          date_planted?: string | null
          grid_x?: number | null
          grid_y?: number | null
          grid_width?: number
          grid_height?: number
          id?: string
          notes?: string | null
          placed?: boolean
          plant_type?: Database["public"]["Enums"]["plant_type"]
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plants_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "yards"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed_at: string | null
          due_date: string
          id: string
          plant_id: string
          reminder_type: Database["public"]["Enums"]["care_event_type"]
        }
        Insert: {
          completed_at?: string | null
          due_date: string
          id?: string
          plant_id: string
          reminder_type: Database["public"]["Enums"]["care_event_type"]
        }
        Update: {
          completed_at?: string | null
          due_date?: string
          id?: string
          plant_id?: string
          reminder_type?: Database["public"]["Enums"]["care_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reminders_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          hardiness_zone: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          hardiness_zone?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          hardiness_zone?: string | null
          id?: string
        }
        Relationships: []
      }
      yards: {
        Row: {
          created_at: string
          grid_height: number
          grid_width: number
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grid_height?: number
          grid_width?: number
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          grid_height?: number
          grid_width?: number
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      care_event_type:
        | "pruning"
        | "fertilizing"
        | "watering"
        | "treatment"
        | "transplanting"
        | "other"
      plant_type:
        | "tree"
        | "shrub"
        | "perennial"
        | "annual"
        | "vine"
        | "grass"
        | "bulb"
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
      care_event_type: [
        "pruning",
        "fertilizing",
        "watering",
        "treatment",
        "transplanting",
        "other",
      ],
      plant_type: [
        "tree",
        "shrub",
        "perennial",
        "annual",
        "vine",
        "grass",
        "bulb",
        "other",
      ],
    },
  },
} as const

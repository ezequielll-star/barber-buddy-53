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
      barbers: {
        Row: {
          active: boolean
          barbershop_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string
          close_time: string
          created_at: string
          id: string
          logo_url: string
          name: string
          open_days: number[]
          open_time: string
          owner_id: string | null
          phone_whatsapp: string
          slug: string
        }
        Insert: {
          address?: string
          close_time?: string
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
          open_days?: number[]
          open_time?: string
          owner_id?: string | null
          phone_whatsapp?: string
          slug: string
        }
        Update: {
          address?: string
          close_time?: string
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
          open_days?: number[]
          open_time?: string
          owner_id?: string | null
          phone_whatsapp?: string
          slug?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          barber_id: string | null
          barber_name: string | null
          barbershop_id: string
          booking_date: string
          booking_time: string
          client_name: string
          created_at: string
          id: string
          service: string
          status: string
          whatsapp: string
        }
        Insert: {
          barber_id?: string | null
          barber_name?: string | null
          barbershop_id: string
          booking_date: string
          booking_time: string
          client_name: string
          created_at?: string
          id?: string
          service: string
          status?: string
          whatsapp: string
        }
        Update: {
          barber_id?: string | null
          barber_name?: string | null
          barbershop_id?: string
          booking_date?: string
          booking_time?: string
          client_name?: string
          created_at?: string
          id?: string
          service?: string
          status?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          last_visit: string | null
          name: string
          notes: string
          phone: string
          visits: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          last_visit?: string | null
          name: string
          notes?: string
          phone: string
          visits?: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          last_visit?: string | null
          name?: string
          notes?: string
          phone?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          barbershop_id: string
          created_at: string
          description: string
          duration_min: number
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          name: string
          price?: number
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          close_time: string
          id: number
          open_days: number[]
          open_time: string
          pin_hash: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          close_time?: string
          id?: number
          open_days?: number[]
          open_time?: string
          pin_hash?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          close_time?: string
          id?: number
          open_days?: number[]
          open_time?: string
          pin_hash?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_shop_owner: { Args: { _shop: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const

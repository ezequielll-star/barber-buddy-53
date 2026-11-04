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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string
          actor_id: string | null
          barbershop_id: string | null
          created_at: string
          details: Json
          id: string
        }
        Insert: {
          action: string
          actor_email?: string
          actor_id?: string | null
          barbershop_id?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string
          actor_id?: string | null
          barbershop_id?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          active: boolean
          avatar_url: string
          barbershop_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string
          barbershop_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          avatar_url?: string
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
          archived_at: string | null
          close_time: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          open_days: number[]
          open_time: string
          owner_id: string | null
          pending_owner_email: string | null
          phone_whatsapp: string
          slug: string
        }
        Insert: {
          address?: string
          archived_at?: string | null
          close_time?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string
          name?: string
          open_days?: number[]
          open_time?: string
          owner_id?: string | null
          pending_owner_email?: string | null
          phone_whatsapp?: string
          slug: string
        }
        Update: {
          address?: string
          archived_at?: string | null
          close_time?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string
          name?: string
          open_days?: number[]
          open_time?: string
          owner_id?: string | null
          pending_owner_email?: string | null
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
      subscription_payments: {
        Row: {
          amount: number
          barbershop_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string
          paid_on: string
          period_due: string | null
        }
        Insert: {
          amount: number
          barbershop_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          paid_on: string
          period_due?: string | null
        }
        Update: {
          amount?: number
          barbershop_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          paid_on?: string
          period_due?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          barbershop_id: string
          due_date: string | null
          last_paid_on: string | null
          monthly_price: number
          notes: string
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          due_date?: string | null
          last_paid_on?: string | null
          monthly_price?: number
          notes?: string
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          due_date?: string | null
          last_paid_on?: string | null
          monthly_price?: number
          notes?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_archive_shop: {
        Args: { _confirm_name: string; _shop: string }
        Returns: undefined
      }
      admin_create_shop: {
        Args: { _name: string; _owner_email: string; _slug: string }
        Returns: string
      }
      admin_list_audit: {
        Args: { _limit?: number; _shop?: string }
        Returns: {
          action: string
          actor_email: string
          barbershop_id: string
          created_at: string
          details: Json
          id: string
          shop_name: string
        }[]
      }
      admin_list_payments: {
        Args: { _shop: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          note: string
          paid_on: string
          period_due: string
        }[]
      }
      admin_list_shops: {
        Args: never
        Returns: {
          address: string
          archived_at: string
          bookings_count: number
          clients_count: number
          created_at: string
          due_date: string
          id: string
          is_active: boolean
          last_paid_on: string
          monthly_price: number
          name: string
          notes: string
          owner_email: string
          pay_status: string
          pending_owner_email: string
          phone_whatsapp: string
          slug: string
        }[]
      }
      admin_record_payment: {
        Args: {
          _amount: number
          _note?: string
          _paid_on: string
          _shop: string
        }
        Returns: undefined
      }
      admin_save_subscription: {
        Args: {
          _due: string
          _notes: string
          _price: number
          _shop: string
          _status: string
        }
        Returns: undefined
      }
      admin_set_shop_active: {
        Args: { _active: boolean; _reason?: string; _shop: string }
        Returns: undefined
      }
      assert_superadmin: { Args: never; Returns: undefined }
      claim_pending_shop: { Args: never; Returns: boolean }
      get_public_barbers: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
        }[]
      }
      get_public_services: {
        Args: { _slug: string }
        Returns: {
          active: boolean
          description: string
          duration_min: number
          id: string
          name: string
          price: number
        }[]
      }
      get_public_shop: {
        Args: { _slug: string }
        Returns: {
          address: string
          close_time: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          open_days: number[]
          open_time: string
          phone_whatsapp: string
          slug: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_shop_owner: { Args: { _shop: string }; Returns: boolean }
      write_audit: {
        Args: { _action: string; _details: Json; _shop: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "superadmin"
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
    Enums: {
      app_role: ["superadmin"],
    },
  },
} as const

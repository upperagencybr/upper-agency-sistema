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
  public: {
    Tables: {
      accounting_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          done: boolean
          due_date: string | null
          due_day: string | null
          id: number
          period_key: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          done?: boolean
          due_date?: string | null
          due_day?: string | null
          id?: number
          period_key?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          done?: boolean
          due_date?: string | null
          due_day?: string | null
          id?: number
          period_key?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_attachments: {
        Row: {
          client_id: number
          created_at: string
          file_name: string
          id: number
          path: string
          user_id: string | null
        }
        Insert: {
          client_id: number
          created_at?: string
          file_name: string
          id?: number
          path: string
          user_id?: string | null
        }
        Update: {
          client_id?: number
          created_at?: string
          file_name?: string
          id?: number
          path?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          drive_url: string | null
          email: string | null
          id: number
          name: string
          notes: string | null
          phone: string | null
          status: string
          tag_ids: number[]
          user_id: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          drive_url?: string | null
          email?: string | null
          id?: number
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          tag_ids?: number[]
          user_id?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          drive_url?: string | null
          email?: string | null
          id?: number
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tag_ids?: number[]
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          brand_colors: string | null
          brand_instagram: string | null
          brand_voice: string | null
          country: string | null
          created_at: string
          email: string | null
          id: number
          legal_name: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          segment: string | null
          tax_id: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          brand_colors?: string | null
          brand_instagram?: string | null
          brand_voice?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: number
          legal_name?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          segment?: string | null
          tax_id?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          brand_colors?: string | null
          brand_instagram?: string | null
          brand_voice?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: number
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          segment?: string | null
          tax_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: number
          created_at: string
          email: string
          id: number
          invited_by: string | null
          kind: string
          name: string | null
          role: string
          tabs: string[]
          user_id: string | null
        }
        Insert: {
          company_id: number
          created_at?: string
          email: string
          id?: number
          invited_by?: string | null
          kind?: string
          name?: string | null
          role?: string
          tabs?: string[]
          user_id?: string | null
        }
        Update: {
          company_id?: number
          created_at?: string
          email?: string
          id?: number
          invited_by?: string | null
          kind?: string
          name?: string | null
          role?: string
          tabs?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          email: string | null
          est_value: number | null
          follow_up_date: string | null
          id: number
          name: string
          notes: string | null
          origin: string | null
          phone: string | null
          stage: string
          tag_ids: number[]
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          est_value?: number | null
          follow_up_date?: string | null
          id?: number
          name: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          stage?: string
          tag_ids?: number[]
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          est_value?: number | null
          follow_up_date?: string | null
          id?: number
          name?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          stage?: string
          tag_ids?: number[]
          user_id?: string | null
        }
        Relationships: []
      }
      feedback_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          thread_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          thread_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "feedback_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_threads: {
        Row: {
          admin_read_at: string | null
          author_email: string
          category: string
          created_at: string
          id: string
          last_sender: string
          preview: string
          updated_at: string
          user_id: string
          user_read_at: string | null
        }
        Insert: {
          admin_read_at?: string | null
          author_email: string
          category: string
          created_at?: string
          id?: string
          last_sender?: string
          preview: string
          updated_at?: string
          user_id?: string
          user_read_at?: string | null
        }
        Update: {
          admin_read_at?: string | null
          author_email?: string
          category?: string
          created_at?: string
          id?: string
          last_sender?: string
          preview?: string
          updated_at?: string
          user_id?: string
          user_read_at?: string | null
        }
        Relationships: []
      }
      inbox_reads: {
        Row: {
          created_at: string
          id: number
          notice_key: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          notice_key: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          notice_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mentoring_sessions: {
        Row: {
          client_id: number | null
          closed_date: string | null
          contact_date: string | null
          created_at: string
          created_by: string | null
          id: number
          mentee_name: string | null
          next_step: string | null
          session_date: string | null
          summary: string | null
          theme: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: number | null
          closed_date?: string | null
          contact_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          mentee_name?: string | null
          next_step?: string | null
          session_date?: string | null
          summary?: string | null
          theme?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: number | null
          closed_date?: string | null
          contact_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          mentee_name?: string | null
          next_step?: string | null
          session_date?: string | null
          summary?: string | null
          theme?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      monthly_goals: {
        Row: {
          clients: number
          created_at: string
          id: number
          month: string
          revenue: number
          sales: number
          user_id: string | null
        }
        Insert: {
          clients?: number
          created_at?: string
          id?: number
          month: string
          revenue?: number
          sales?: number
          user_id?: string | null
        }
        Update: {
          clients?: number
          created_at?: string
          id?: number
          month?: string
          revenue?: number
          sales?: number
          user_id?: string | null
        }
        Relationships: []
      }
      nexo_contents: {
        Row: {
          body: string
          company: string | null
          created_at: string
          created_by: string | null
          id: number
          kind: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string
          company?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          kind: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          company?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          kind?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          das_value: number
          email: string | null
          font: string
          full_name: string | null
          goal_clients: number
          goal_sales: number
          id: string
          lang: string
          lead_origins: string[]
          mei_limit: number
          monthly_goal: number
          notice_prefs: Json
          sidebar_hidden: string[]
          sidebar_labels: Json
          sidebar_order: string[]
          status_appearance: Json
          status_lists: Json
          subscription_status: string
          system_name: string
          theme: string
          tx_categories: string[]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          das_value?: number
          email?: string | null
          font?: string
          full_name?: string | null
          goal_clients?: number
          goal_sales?: number
          id: string
          lang?: string
          lead_origins?: string[]
          mei_limit?: number
          monthly_goal?: number
          notice_prefs?: Json
          sidebar_hidden?: string[]
          sidebar_labels?: Json
          sidebar_order?: string[]
          status_appearance?: Json
          status_lists?: Json
          subscription_status?: string
          system_name?: string
          theme?: string
          tx_categories?: string[]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          das_value?: number
          email?: string | null
          font?: string
          full_name?: string | null
          goal_clients?: number
          goal_sales?: number
          id?: string
          lang?: string
          lead_origins?: string[]
          mei_limit?: number
          monthly_goal?: number
          notice_prefs?: Json
          sidebar_hidden?: string[]
          sidebar_labels?: Json
          sidebar_order?: string[]
          status_appearance?: Json
          status_lists?: Json
          subscription_status?: string
          system_name?: string
          theme?: string
          tx_categories?: string[]
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: number | null
          company: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: number
          name: string
          stage: string
          tag_ids: number[]
          user_id: string | null
        }
        Insert: {
          client_id?: number | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: number
          name: string
          stage?: string
          tag_ids?: number[]
          user_id?: string | null
        }
        Update: {
          client_id?: number | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: number
          name?: string
          stage?: string
          tag_ids?: number[]
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          country: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          environment: string
          id: string
          name: string | null
          past_due_since: string | null
          paused: boolean
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          country?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          environment?: string
          id?: string
          name?: string | null
          past_due_since?: string | null
          paused?: boolean
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          country?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          environment?: string
          id?: string
          name?: string | null
          past_due_since?: string | null
          paused?: boolean
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: number
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: number
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: number
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          client_id: number | null
          client_name: string | null
          company: string | null
          created_at: string
          created_by: string | null
          currency: string
          date: string | null
          description: string | null
          due_date: string | null
          id: number
          installment_count: number | null
          installment_group: string | null
          installment_index: number | null
          paid_at: string | null
          product_codes: string | null
          recurrence_count: number | null
          recurrence_freq: string | null
          recurrence_group: string | null
          recurrence_index: number | null
          recurrence_until: string | null
          status: string
          tag_ids: number[]
          type: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          client_id?: number | null
          client_name?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string | null
          description?: string | null
          due_date?: string | null
          id?: number
          installment_count?: number | null
          installment_group?: string | null
          installment_index?: number | null
          paid_at?: string | null
          product_codes?: string | null
          recurrence_count?: number | null
          recurrence_freq?: string | null
          recurrence_group?: string | null
          recurrence_index?: number | null
          recurrence_until?: string | null
          status?: string
          tag_ids?: number[]
          type?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: number | null
          client_name?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string | null
          description?: string | null
          due_date?: string | null
          id?: number
          installment_count?: number | null
          installment_group?: string | null
          installment_index?: number | null
          paid_at?: string | null
          product_codes?: string | null
          recurrence_count?: number | null
          recurrence_freq?: string | null
          recurrence_group?: string | null
          recurrence_index?: number | null
          recurrence_until?: string | null
          status?: string
          tag_ids?: number[]
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      client_files_deletable: { Args: { _client_id: number }; Returns: boolean }
      client_files_readable: { Args: { _client_id: number }; Returns: boolean }
      client_files_writable: { Args: { _client_id: number }; Returns: boolean }
      company_role: { Args: { _company_id: number }; Returns: string }
      create_feedback: {
        Args: { _body: string; _category: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      member_role: {
        Args: { _company: string; _owner: string; _tab: string }
        Returns: string
      }
      plan_tier: { Args: { _owner: string }; Returns: string }
      read_feedback: { Args: { _thread_id: string }; Returns: undefined }
      reply_feedback: {
        Args: { _body: string; _thread_id: string }
        Returns: string
      }
      role_rank: { Args: { r: string }; Returns: number }
      row_owner: { Args: { _company: string }; Returns: string }
      shares_workspace: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

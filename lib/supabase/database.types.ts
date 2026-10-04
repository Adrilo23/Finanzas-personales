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
      accounts: {
        Row: {
          created_at: string
          currency: string
          id: string
          initial_balance_cents: number
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance_cents?: number
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance_cents?: number
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_prices: {
        Row: {
          currency: string
          fetched_at: string
          price: number
          price_date: string
          symbol: string
          user_id: string
        }
        Insert: {
          currency?: string
          fetched_at?: string
          price: number
          price_date: string
          symbol: string
          user_id: string
        }
        Update: {
          currency?: string
          fetched_at?: string
          price?: number
          price_date?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          file_name: string
          id: string
          storage_path: string
          transaction_id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          id?: string
          storage_path: string
          transaction_id: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          id?: string
          storage_path?: string
          transaction_id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount_cents: number
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      holding_operations: {
        Row: {
          affects_cash: boolean
          amount_cents: number
          created_at: string
          holding_id: string
          id: string
          kind: string
          operation_date: string
          recurring_rule_id: string | null
          status: string
          units: number | null
          user_id: string
        }
        Insert: {
          affects_cash?: boolean
          amount_cents: number
          created_at?: string
          holding_id: string
          id?: string
          kind: string
          operation_date: string
          recurring_rule_id?: string | null
          status?: string
          units?: number | null
          user_id: string
        }
        Update: {
          affects_cash?: boolean
          amount_cents?: number
          created_at?: string
          holding_id?: string
          id?: string
          kind?: string
          operation_date?: string
          recurring_rule_id?: string | null
          status?: string
          units?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holding_operations_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holding_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holding_operations_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holding_operations_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          account_id: string
          asset_type: string
          created_at: string
          currency: string
          id: string
          isin: string | null
          name: string
          prices_checked_at: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          account_id: string
          asset_type: string
          created_at?: string
          currency?: string
          id?: string
          isin?: string | null
          name: string
          prices_checked_at?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          account_id?: string
          asset_type?: string
          created_at?: string
          currency?: string
          id?: string
          isin?: string | null
          name?: string
          prices_checked_at?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_allocations: {
        Row: {
          amount_cents: number
          created_at: string
          holding_id: string
          id: string
          rule_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          holding_id: string
          id?: string
          rule_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          holding_id?: string
          id?: string
          rule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_allocations_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holding_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_allocations_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_allocations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          account_id: string
          active: boolean
          amount_cents: number
          anchor_day: number
          category_id: string | null
          created_at: string
          frequency: string
          id: string
          next_run_date: string
          to_account_id: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          active?: boolean
          amount_cents: number
          anchor_day: number
          category_id?: string | null
          created_at?: string
          frequency: string
          id?: string
          next_run_date: string
          to_account_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          active?: boolean
          amount_cents?: number
          anchor_day?: number
          category_id?: string | null
          created_at?: string
          frequency?: string
          id?: string
          next_run_date?: string
          to_account_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount_cents: number
          category_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          recurring_rule_id: string | null
          transaction_date: string
          transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          recurring_rule_id?: string | null
          transaction_date?: string
          transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          recurring_rule_id?: string | null
          transaction_date?: string
          transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          balance_cents: number | null
          cash_cents: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          initial_balance_cents: number | null
          market_value_cents: number | null
          name: string | null
          type: string | null
          user_id: string | null
        }
        Relationships: []
      }
      holding_values: {
        Row: {
          account_id: string | null
          asset_type: string | null
          currency: string | null
          gain_cents: number | null
          id: string | null
          invested_cents: number | null
          isin: string | null
          name: string | null
          price: number | null
          price_date: string | null
          symbol: string | null
          units: number | null
          user_id: string | null
          value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      run_contribution_plan: {
        Args: { p_dates: string[]; p_next: string; p_rule_id: string }
        Returns: undefined
      }
      update_transfer: {
        Args: {
          p_amount_cents: number
          p_date: string
          p_description: string
          p_from_account: string
          p_to_account: string
          p_transfer_id: string
        }
        Returns: undefined
      }
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

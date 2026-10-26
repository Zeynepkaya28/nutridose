export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      allergens: {
        Row: {
          cross_reactive_substances: string[];
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          cross_reactive_substances?: string[];
          id?: string;
          name: string;
        };
        Update: {
          cross_reactive_substances?: string[];
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      analysis_findings: {
        Row: {
          detail: string | null;
          id: string;
          interaction_id: string | null;
          position: number;
          run_id: string;
          status: Database["public"]["Enums"]["finding_status"];
          step: Database["public"]["Enums"]["analysis_step"];
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          detail?: string | null;
          id?: string;
          interaction_id?: string | null;
          position?: number;
          run_id: string;
          status: Database["public"]["Enums"]["finding_status"];
          step: Database["public"]["Enums"]["analysis_step"];
          title: string;
          user_id?: string;
        };
        Update: {
          detail?: string | null;
          id?: string;
          interaction_id?: string | null;
          position?: number;
          run_id?: string;
          status?: Database["public"]["Enums"]["finding_status"];
          step?: Database["public"]["Enums"]["analysis_step"];
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_findings_interaction_id_fkey";
            columns: ["interaction_id"];
            isOneToOne: false;
            referencedRelation: "interactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analysis_findings_run_id_user_id_fkey";
            columns: ["run_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "analysis_runs";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      analysis_rate_events: {
        Row: {
          created_at: string;
          id: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          user_id?: string;
        };
        Relationships: [];
      };
      analysis_runs: {
        Row: {
          created_at: string;
          id: string;
          input_kind: Database["public"]["Enums"]["input_kind"];
          meal_id: string | null;
          strategy_codes: string[];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          input_kind: Database["public"]["Enums"]["input_kind"];
          meal_id?: string | null;
          strategy_codes?: string[];
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          input_kind?: Database["public"]["Enums"]["input_kind"];
          meal_id?: string | null;
          strategy_codes?: string[];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_runs_meal_id_user_id_fkey";
            columns: ["meal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      conditions: {
        Row: {
          code: string;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      interactions: {
        Row: {
          advice: string | null;
          condition_code: string | null;
          evidence_source: string;
          id: string;
          mechanism: string | null;
          reviewed_at: string | null;
          severity: Database["public"]["Enums"]["severity"];
          substance_a: string;
          substance_b: string;
        };
        ComputedFields: never;
        Insert: {
          advice?: string | null;
          condition_code?: string | null;
          evidence_source: string;
          id?: string;
          mechanism?: string | null;
          reviewed_at?: string | null;
          severity: Database["public"]["Enums"]["severity"];
          substance_a: string;
          substance_b: string;
        };
        Update: {
          advice?: string | null;
          condition_code?: string | null;
          evidence_source?: string;
          id?: string;
          mechanism?: string | null;
          reviewed_at?: string | null;
          severity?: Database["public"]["Enums"]["severity"];
          substance_a?: string;
          substance_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_condition_code_fkey";
            columns: ["condition_code"];
            isOneToOne: false;
            referencedRelation: "conditions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "interactions_substance_a_fkey";
            columns: ["substance_a"];
            isOneToOne: false;
            referencedRelation: "substances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_substance_b_fkey";
            columns: ["substance_b"];
            isOneToOne: false;
            referencedRelation: "substances";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_items: {
        Row: {
          id: string;
          meal_id: string;
          product_id: string | null;
          quantity: number | null;
          raw_text: string;
          unit: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          meal_id: string;
          product_id?: string | null;
          quantity?: number | null;
          raw_text: string;
          unit?: string | null;
          user_id?: string;
        };
        Update: {
          id?: string;
          meal_id?: string;
          product_id?: string | null;
          quantity?: number | null;
          raw_text?: string;
          unit?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_user_id_fkey";
            columns: ["meal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "meal_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      meals: {
        Row: {
          eaten_at: string;
          id: string;
          label: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          eaten_at?: string;
          id?: string;
          label?: string | null;
          user_id?: string;
        };
        Update: {
          eaten_at?: string;
          id?: string;
          label?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      nutrient_limits: {
        Row: {
          condition_code: string | null;
          id: string;
          period: Database["public"]["Enums"]["limit_period"];
          source: string;
          substance_id: string;
          unit: string;
          upper_limit: number;
        };
        ComputedFields: never;
        Insert: {
          condition_code?: string | null;
          id?: string;
          period?: Database["public"]["Enums"]["limit_period"];
          source: string;
          substance_id: string;
          unit: string;
          upper_limit: number;
        };
        Update: {
          condition_code?: string | null;
          id?: string;
          period?: Database["public"]["Enums"]["limit_period"];
          source?: string;
          substance_id?: string;
          unit?: string;
          upper_limit?: number;
        };
        Relationships: [
          {
            foreignKeyName: "nutrient_limits_condition_code_fkey";
            columns: ["condition_code"];
            isOneToOne: false;
            referencedRelation: "conditions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "nutrient_limits_substance_id_fkey";
            columns: ["substance_id"];
            isOneToOne: false;
            referencedRelation: "substances";
            referencedColumns: ["id"];
          },
        ];
      };
      product_substances: {
        Row: {
          amount: number | null;
          product_id: string;
          substance_id: string;
          unit: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount?: number | null;
          product_id: string;
          substance_id: string;
          unit?: string | null;
        };
        Update: {
          amount?: number | null;
          product_id?: string;
          substance_id?: string;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_substances_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_substances_substance_id_fkey";
            columns: ["substance_id"];
            isOneToOne: false;
            referencedRelation: "substances";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          barcode: string | null;
          brand: string | null;
          id: string;
          kind: Database["public"]["Enums"]["product_kind"];
          name: string;
          source: string | null;
        };
        ComputedFields: never;
        Insert: {
          barcode?: string | null;
          brand?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["product_kind"];
          name: string;
          source?: string | null;
        };
        Update: {
          barcode?: string | null;
          brand?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["product_kind"];
          name?: string;
          source?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      substances: {
        Row: {
          id: string;
          kind: Database["public"]["Enums"]["substance_kind"];
          name: string;
          synonyms: string[];
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          kind: Database["public"]["Enums"]["substance_kind"];
          name: string;
          synonyms?: string[];
        };
        Update: {
          id?: string;
          kind?: Database["public"]["Enums"]["substance_kind"];
          name?: string;
          synonyms?: string[];
        };
        Relationships: [];
      };
      user_allergies: {
        Row: {
          allergen_id: string | null;
          free_text: string | null;
          id: string;
          kind: Database["public"]["Enums"]["allergy_kind"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          allergen_id?: string | null;
          free_text?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["allergy_kind"];
          user_id?: string;
        };
        Update: {
          allergen_id?: string | null;
          free_text?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["allergy_kind"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_allergies_allergen_id_fkey";
            columns: ["allergen_id"];
            isOneToOne: false;
            referencedRelation: "allergens";
            referencedColumns: ["id"];
          },
        ];
      };
      user_conditions: {
        Row: {
          condition_code: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          condition_code: string;
          user_id?: string;
        };
        Update: {
          condition_code?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_conditions_condition_code_fkey";
            columns: ["condition_code"];
            isOneToOne: false;
            referencedRelation: "conditions";
            referencedColumns: ["code"];
          },
        ];
      };
      user_medications: {
        Row: {
          active: boolean;
          created_at: string;
          dose: string | null;
          id: string;
          product_id: string;
          schedule: NonNullable<Json>;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          dose?: string | null;
          id?: string;
          product_id: string;
          schedule?: NonNullable<Json>;
          user_id?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          dose?: string | null;
          id?: string;
          product_id?: string;
          schedule?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_medications_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_analysis_quota: {
        Args: { p_limit?: number; p_window_seconds?: number };
        Returns: boolean;
      };
      normalize_search_text: { Args: { p_text: string }; Returns: string };
      save_analysis_run: {
        Args: {
          p_findings: Json;
          p_input_kind: Database["public"]["Enums"]["input_kind"];
          p_meal_id?: string;
          p_strategy_codes: string[];
        };
        Returns: string;
      };
      search_products: {
        Args: {
          p_kinds?: Database["public"]["Enums"]["product_kind"][];
          p_limit?: number;
          p_query: string;
        };
        Returns: {
          product_id: string;
          rank: number;
        }[];
      };
      search_substances: {
        Args: { p_query: string };
        Returns: {
          id: string;
          kind: Database["public"]["Enums"]["substance_kind"];
          name: string;
          synonyms: string[];
        }[];
        SetofOptions: {
          from: "*";
          to: "substances";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      allergy_kind: "allergy" | "intolerance";
      analysis_step: "ingredient_scan" | "drug_food" | "dose_limit" | "tolerance_allergy";
      finding_status: "pass" | "caution" | "high" | "error";
      input_kind: "barcode" | "manual" | "prescription_pdf";
      limit_period: "day";
      product_kind: "drug" | "food" | "supplement";
      severity: "info" | "caution" | "high" | "contraindicated";
      substance_kind: "active_ingredient" | "nutrient" | "compound";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      allergy_kind: ["allergy", "intolerance"],
      analysis_step: ["ingredient_scan", "drug_food", "dose_limit", "tolerance_allergy"],
      finding_status: ["pass", "caution", "high", "error"],
      input_kind: ["barcode", "manual", "prescription_pdf"],
      limit_period: ["day"],
      product_kind: ["drug", "food", "supplement"],
      severity: ["info", "caution", "high", "contraindicated"],
      substance_kind: ["active_ingredient", "nutrient", "compound"],
    },
  },
} as const;

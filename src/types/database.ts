/**
 * Database Types for US Custom Cap Pricing System
 * Generated types for Supabase integration
 */

export interface Database {
  public: {
    Tables: {
      pricing_tiers: {
        Row: {
          id: string
          tier_name: string
          description: string | null
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tier_name: string
          description?: string | null
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tier_name?: string
          description?: string | null
          price_48?: number
          price_144?: number
          price_576?: number
          price_1152?: number
          price_2880?: number
          price_10000?: number
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          code: string
          profile: string
          bill_shape: string
          panel_count: number
          structure_type: string
          pricing_tier_id: string
          nick_names: string[] | null
          tags: Record<string, any> | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          profile: string
          bill_shape: string
          panel_count: number
          structure_type: string
          pricing_tier_id: string
          nick_names?: string[] | null
          tags?: Record<string, any> | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          profile?: string
          bill_shape?: string
          panel_count?: number
          structure_type?: string
          pricing_tier_id?: string
          nick_names?: string[] | null
          tags?: Record<string, any> | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      logo_methods: {
        Row: {
          id: string
          name: string
          application: string
          size: string
          size_example: string | null
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          price_20000: number
          mold_charge_type: string | null
          tags: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          application: string
          size: string
          size_example?: string | null
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          price_20000: number
          mold_charge_type?: string | null
          tags?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          application?: string
          size?: string
          size_example?: string | null
          price_48?: number
          price_144?: number
          price_576?: number
          price_1152?: number
          price_2880?: number
          price_10000?: number
          price_20000?: number
          mold_charge_type?: string | null
          tags?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      mold_charges: {
        Row: {
          id: string
          size: string
          size_example: string | null
          charge_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          size: string
          size_example?: string | null
          charge_amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          size?: string
          size_example?: string | null
          charge_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      premium_fabrics: {
        Row: {
          id: string
          name: string
          cost_type: string
          color_note: string | null
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          available_colors: string[] | null
          tags: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cost_type: string
          color_note?: string | null
          price_48?: number
          price_144?: number
          price_576?: number
          price_1152?: number
          price_2880?: number
          price_10000?: number
          available_colors?: string[] | null
          tags?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cost_type?: string
          color_note?: string | null
          price_48?: number
          price_144?: number
          price_576?: number
          price_1152?: number
          price_2880?: number
          price_10000?: number
          available_colors?: string[] | null
          tags?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      premium_closures: {
        Row: {
          id: string
          name: string
          closure_type: string
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          price_20000: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          closure_type: string
          price_48?: number
          price_144?: number
          price_576?: number
          price_1152?: number
          price_2880?: number
          price_10000?: number
          price_20000?: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          closure_type?: string
          price_48?: number
          price_144?: number
          price_576?: number
          price_1152?: number
          price_2880?: number
          price_10000?: number
          price_20000?: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accessories: {
        Row: {
          id: string
          name: string
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          price_20000: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price_48: number
          price_144: number
          price_576: number
          price_1152: number
          price_2880: number
          price_10000: number
          price_20000: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price_48?: number
          price_144?: number
          price_576?: number
          price_1152?: number
          price_2880?: number
          price_10000?: number
          price_20000?: number
          created_at?: string
          updated_at?: string
        }
      }
      delivery_methods: {
        Row: {
          id: string
          name: string
          delivery_type: string
          delivery_days: string
          price_48: number | null
          price_144: number | null
          price_576: number | null
          price_1152: number | null
          price_2880: number | null
          price_10000: number | null
          price_20000: number | null
          min_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          delivery_type: string
          delivery_days: string
          price_48?: number | null
          price_144?: number | null
          price_576?: number | null
          price_1152?: number | null
          price_2880?: number | null
          price_10000?: number | null
          price_20000?: number | null
          min_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          delivery_type?: string
          delivery_days?: string
          price_48?: number | null
          price_144?: number | null
          price_576?: number | null
          price_1152?: number | null
          price_2880?: number | null
          price_10000?: number | null
          price_20000?: number | null
          min_quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      pricing_cache: {
        Row: {
          id: string
          cache_key: string
          category: string
          pricing_data: Record<string, any>
          last_updated: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          category: string
          pricing_data: Record<string, any>
          last_updated?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          category?: string
          pricing_data?: Record<string, any>
          last_updated?: string
          expires_at?: string
          created_at?: string
        }
      }
      ai_pricing_context: {
        Row: {
          id: string
          context_key: string
          session_id: string | null
          recommended_products: Record<string, any> | null
          cost_estimates: Record<string, any> | null
          optimization_suggestions: Record<string, any> | null
          last_accessed: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          context_key: string
          session_id?: string | null
          recommended_products?: Record<string, any> | null
          cost_estimates?: Record<string, any> | null
          optimization_suggestions?: Record<string, any> | null
          last_accessed?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          context_key?: string
          session_id?: string | null
          recommended_products?: Record<string, any> | null
          cost_estimates?: Record<string, any> | null
          optimization_suggestions?: Record<string, any> | null
          last_accessed?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      pricing_cache_stats: {
        Row: {
          category: string
          cache_entries: number
          active_entries: number
          expired_entries: number
          avg_age_seconds: number
        }
      }
      ai_context_stats: {
        Row: {
          hour: string
          contexts_created: number
          unique_sessions: number
          avg_session_duration: number
        }
      }
    }
    Functions: {
      clean_expired_cache: {
        Args: {}
        Returns: void
      }
    }
    Enums: {}
  }
}
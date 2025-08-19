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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_size_bytes: number | null
          file_type: string | null
          height_px: number | null
          id: string
          image_order: number
          image_url: string
          is_primary: boolean | null
          product_id: string
          updated_at: string | null
          width_px: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          height_px?: number | null
          id?: string
          image_order?: number
          image_url: string
          is_primary?: boolean | null
          product_id: string
          updated_at?: string | null
          width_px?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          height_px?: number | null
          id?: string
          image_order?: number
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          updated_at?: string | null
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          catalog_description: string | null
          catalog_sort_order: number | null
          catalog_visible: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price_per_case: number
          price_per_case_usd: number | null
          price_per_piece: number
          price_per_piece_usd: number | null
          proforma_group_id: string | null
          series_id: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          catalog_description?: string | null
          catalog_sort_order?: number | null
          catalog_visible?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_per_case: number
          price_per_case_usd?: number | null
          price_per_piece: number
          price_per_piece_usd?: number | null
          proforma_group_id?: string | null
          series_id?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          catalog_description?: string | null
          catalog_sort_order?: number | null
          catalog_visible?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_per_case?: number
          price_per_case_usd?: number | null
          price_per_piece?: number
          price_per_piece_usd?: number | null
          proforma_group_id?: string | null
          series_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_proforma_group"
            columns: ["proforma_group_id"]
            isOneToOne: false
            referencedRelation: "proforma_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          created_at: string | null
          description: string | null
          height_cm: number | null
          id: string
          is_active: boolean | null
          length_cm: number | null
          name: string
          net_weight_kg_per_case: number
          net_weight_kg_per_piece: number
          packaging_weight_kg_per_case: number
          pieces_per_case: number
          updated_at: string | null
          width_cm: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          length_cm?: number | null
          name: string
          net_weight_kg_per_case: number
          net_weight_kg_per_piece: number
          packaging_weight_kg_per_case: number
          pieces_per_case: number
          updated_at?: string | null
          width_cm?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          length_cm?: number | null
          name?: string
          net_weight_kg_per_case?: number
          net_weight_kg_per_piece?: number
          packaging_weight_kg_per_case?: number
          pieces_per_case?: number
          updated_at?: string | null
          width_cm?: number | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type ProductWithImages = Database['public']['Tables']['products']['Row'] & {
  product_images: Database['public']['Tables']['product_images']['Row'][]
  series?: Database['public']['Tables']['series']['Row']
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          id: string
          user_id: string | null
          product_id: string | null
          quantity: number
          selected_variants: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          product_id?: string | null
          quantity: number
          selected_variants?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          product_id?: string | null
          quantity?: number
          selected_variants?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          price: number
          selected_variants: Json | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          price: number
          selected_variants?: Json | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          price?: number
          selected_variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string
          shop_id: string
          status: string | null
          total: number
          created_at: string | null
          order_number: string | null
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_zip_code: string | null
          shipping_country: string | null
          shipping_method: string | null
          tracking_number: string | null
          tracking_carrier: string | null
          payment_method: string | null
          payment_status: string | null
          iveri_transaction_id: string | null
          iveri_transaction_token: string | null
        }
        Insert: {
          id?: string
          user_id: string
          shop_id: string
          status?: string | null
          total: number
          created_at?: string | null
          order_number?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip_code?: string | null
          shipping_country?: string | null
          shipping_method?: string | null
          tracking_number?: string | null
          tracking_carrier?: string | null
          payment_method?: string | null
          payment_status?: string | null
          iveri_transaction_id?: string | null
          iveri_transaction_token?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          shop_id?: string
          status?: string | null
          total?: number
          created_at?: string | null
          order_number?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip_code?: string | null
          shipping_country?: string | null
          shipping_method?: string | null
          tracking_number?: string | null
          tracking_carrier?: string | null
          payment_method?: string | null
          payment_status?: string | null
          iveri_transaction_id?: string | null
          iveri_transaction_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            referencedRelation: "shops"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string | null
          image_url: string
          color: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          image_url: string
          color?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          image_url?: string
          color?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_engagement: {
        Row: {
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_engagement_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_likes: {
        Row: {
          user_id: string
          product_id: string
          created_at: string | null
        }
        Insert: {
          user_id: string
          product_id: string
          created_at?: string | null
        }
        Update: {
          user_id?: string
          product_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string | null
          name: string
          type: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          name: string
          type: string
        }
        Update: {
          id?: string
          product_id?: string | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          shop_id: string
          name: string
          slug: string
          price: number
          original_price: number | null
          description: string | null
          category_id: string | null
          in_stock: boolean | null
          stock_count: number | null
          rating: number | null
          review_count: number | null
          like_count: number | null
          is_trending: boolean | null
          is_on_discover: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          slug: string
          price: number
          original_price?: number | null
          description?: string | null
          category_id?: string | null
          in_stock?: boolean | null
          stock_count?: number | null
          rating?: number | null
          review_count?: number | null
          like_count?: number | null
          is_trending?: boolean | null
          is_on_discover?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          slug?: string
          price?: number
          original_price?: number | null
          description?: string | null
          category_id?: string | null
          in_stock?: boolean | null
          stock_count?: number | null
          rating?: number | null
          review_count?: number | null
          like_count?: number | null
          is_trending?: boolean | null
          is_on_discover?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          user_id: string | null
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          role: string | null
          is_dev: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: string | null
          is_dev?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: string | null
          is_dev?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      review_images: {
        Row: {
          id: string
          review_id: string | null
          image_url: string
        }
        Insert: {
          id?: string
          review_id?: string | null
          image_url: string
        }
        Update: {
          id?: string
          review_id?: string | null
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          product_id: string | null
          user_id: string | null
          rating: number | null
          comment: string | null
          owner_reply: string | null
          owner_replied_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          user_id?: string | null
          rating?: number | null
          comment?: string | null
          owner_reply?: string | null
          owner_replied_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          user_id?: string | null
          rating?: number | null
          comment?: string | null
          owner_reply?: string | null
          owner_replied_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_products: {
        Row: {
          user_id: string
          product_id: string
          created_at: string | null
        }
        Insert: {
          user_id: string
          product_id: string
          created_at?: string | null
        }
        Update: {
          user_id?: string
          product_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_products_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      shop_followers: {
        Row: {
          user_id: string
          shop_id: string
          created_at: string | null
        }
        Insert: {
          user_id: string
          shop_id: string
          created_at?: string | null
        }
        Update: {
          user_id?: string
          shop_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_followers_shop_id_fkey"
            columns: ["shop_id"]
            referencedRelation: "shops"
            referencedColumns: ["id"]
          }
        ]
      }
      shop_conversations: {
        Row: {
          id: string
          shop_id: string
          customer_id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          shop_id: string
          customer_id: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          shop_id?: string
          customer_id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_conversations_shop_id_fkey"
            columns: ["shop_id"]
            referencedRelation: "shops"
            referencedColumns: ["id"]
          }
        ]
      }
      shop_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "shop_conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      shops: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          logo: string | null
          banner: string | null
          bio: string | null
          category_id: string | null
          location: string | null
          is_verified: boolean | null
          is_featured: boolean | null
          is_on_discover: boolean | null
          rating: number | null
          review_count: number | null
          follower_count: number | null
          product_count: number | null
          pricing_tier: string
          created_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          logo?: string | null
          banner?: string | null
          bio?: string | null
          category_id?: string | null
          location?: string | null
          is_verified?: boolean | null
          is_featured?: boolean | null
          is_on_discover?: boolean | null
          rating?: number | null
          review_count?: number | null
          follower_count?: number | null
          product_count?: number | null
          pricing_tier?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          logo?: string | null
          banner?: string | null
          bio?: string | null
          category_id?: string | null
          location?: string | null
          is_verified?: boolean | null
          is_featured?: boolean | null
          is_on_discover?: boolean | null
          rating?: number | null
          review_count?: number | null
          follower_count?: number | null
          product_count?: number | null
          pricing_tier?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      variant_options: {
        Row: {
          id: string
          variant_id: string | null
          value: string
        }
        Insert: {
          id?: string
          variant_id?: string | null
          value: string
        }
        Update: {
          id?: string
          variant_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_options_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
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
    Enums: {},
  },
} as const

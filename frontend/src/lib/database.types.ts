export type Database = {
  public: {
    Tables: {
      society_members: {
        Row: {
          id: string;
          society_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["member_role"];
          membership_status: Database["public"]["Enums"]["membership_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          society_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["member_role"];
          membership_status?: Database["public"]["Enums"]["membership_status"];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["society_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "society_members_society_id_fkey";
            columns: ["society_id"];
            isOneToOne: false;
            referencedRelation: "societies";
            referencedColumns: ["id"];
          },
        ];
      };
      societies: {
        Row: {
          id: string;
          name: string;
          city_area: string;
          invite_code_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city_area: string;
          invite_code_hash: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["societies"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          supplier_id: string;
          name: string;
          description: string;
          image_url: string | null;
          unit_size: string;
          reference_price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          name: string;
          description?: string;
          image_url?: string | null;
          unit_size: string;
          reference_price: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      deals: {
        Row: {
          id: string;
          society_id: string;
          product_id: string;
          target_quantity: number;
          pooled_price: number;
          starts_at: string;
          ends_at: string;
          status: Database["public"]["Enums"]["deal_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          society_id: string;
          product_id: string;
          target_quantity: number;
          pooled_price: number;
          starts_at: string;
          ends_at: string;
          status?: Database["public"]["Enums"]["deal_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "deals_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_society_id_fkey";
            columns: ["society_id"];
            isOneToOne: false;
            referencedRelation: "societies";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          society_id: string;
          deal_id: string;
          quantity: number;
          unit_price_snapshot: number;
          total_amount_snapshot: number;
          status: Database["public"]["Enums"]["order_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          society_id: string;
          deal_id: string;
          quantity: number;
          unit_price_snapshot: number;
          total_amount_snapshot: number;
          status?: Database["public"]["Enums"]["order_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order: {
        Args: { p_deal_id: string; p_quantity: number };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      get_deal_progress: {
        Args: { p_deal_id: string };
        Returns: Array<{
          deal_id: string;
          joined_quantity: number;
          target_quantity: number;
          status: Database["public"]["Enums"]["deal_status"];
        }>;
      };
      join_society: {
        Args: { p_invite_code: string };
        Returns: Array<{ id: string; name: string; city_area: string }>;
      };
    };
    Enums: {
      deal_status: "draft" | "scheduled" | "open" | "target_reached" | "successful" | "failed" | "expired" | "cancelled";
      member_role: "resident" | "admin";
      membership_status: "active" | "pending" | "removed";
      order_status: "pending_confirmation" | "confirmed" | "packed" | "ready_for_pickup" | "out_for_delivery" | "completed" | "cancelled" | "refund_pending" | "refunded";
    };
    CompositeTypes: Record<string, never>;
  };
};

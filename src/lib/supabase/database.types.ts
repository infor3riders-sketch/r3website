/**
 * Database types, hand-maintained in the shape `supabase gen types typescript` emits.
 * Regenerate against a running local stack with `pnpm db:types` (overwrites this file) and
 * keep the helper exports at the bottom of `./types.ts`, which this file does not define.
 * Mirrors supabase/migrations/*.sql.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "member" | "officer" | "admin";
export type ApplicationStatus = "pending" | "info_requested" | "approved" | "rejected";
export type RsvpStatus = "going" | "maybe" | "no";
export type PaymentStatus = "pending" | "paid" | "rejected" | "refunded" | "cancelled";
export type PaymentMethod = "manual" | "paymongo";
export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "completed" | "cancelled" | "expired";
export type DiscountKind = "percent" | "fixed";

type Ts = string; // timestamptz / date as ISO string
type Uuid = string;

/** Insert = required keys + optional rest; Update = all optional. */
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

type Stamps = {
  created_at: Ts;
  updated_at: Ts;
};

export interface Database {
  public: {
    Tables: {
      membership_types: Table<
        {
          id: Uuid; slug: string; name: string; description: string | null; requirements: string | null;
          fee_amount: number; benefits: string[]; is_public: boolean; is_active: boolean; sort_order: number;
        } & Stamps,
        "slug" | "name"
      >;
      profiles: Table<
        {
          id: Uuid; email: string | null; role: UserRole; status: "active" | "inactive" | "suspended";
          full_name: string | null; road_name: string | null; phone: string | null; address: string | null;
          avatar_path: string | null; birthdate: string | null; blood_type: string | null;
          emergency_contact_name: string | null; emergency_contact_phone: string | null; emergency_contact_relation: string | null;
          membership_type_id: Uuid | null; member_since: string | null;
          directory_visible: boolean; show_phone: boolean; show_email: boolean; show_motorcycles: boolean;
        } & Stamps,
        "id"
      >;
      motorcycles: Table<
        {
          id: Uuid; profile_id: Uuid; make: string; model: string; year: number | null; displacement_cc: number | null;
          color: string | null; plate_number: string | null;
        } & Stamps,
        "profile_id" | "make" | "model"
      >;
      applications: Table<
        {
          id: Uuid; status: ApplicationStatus; membership_type_id: Uuid | null; full_name: string; email: string; phone: string;
          birthdate: string | null; address: string | null; road_name: string | null; riding_years: number | null;
          riding_experience: string | null; license_number: string | null; motorcycles: Json; references: Json;
          volunteer_interests: string[]; agreed_rules: boolean; consent_privacy: boolean;
          reviewed_by: Uuid | null; reviewed_at: Ts | null; review_notes: string | null; profile_id: Uuid | null;
        } & Stamps,
        "full_name" | "email" | "phone" | "agreed_rules" | "consent_privacy"
      >;
      programs: Table<
        {
          id: Uuid; slug: string; title: string; summary: string | null; description: string | null; schedule: string | null;
          how_to_join: string | null; cover_path: string | null; photo_paths: string[]; volunteer_enabled: boolean;
          is_public: boolean; sort_order: number;
        } & Stamps,
        "slug" | "title"
      >;
      events: Table<
        {
          id: Uuid; slug: string; title: string; description: string | null; program_id: Uuid | null; starts_at: Ts;
          ends_at: Ts | null; meeting_point: string | null; route: string | null; requirements: string | null;
          capacity: number | null; requires_waiver: boolean; public_interest_enabled: boolean; is_public: boolean;
          created_by: Uuid | null;
        } & Stamps,
        "slug" | "title" | "starts_at"
      >;
      event_rsvps: Table<
        { id: Uuid; event_id: Uuid; profile_id: Uuid; status: RsvpStatus; riders: number; passengers: number; waiver_signed_at: Ts | null } & Stamps,
        "event_id" | "profile_id" | "status"
      >;
      event_interest: Table<
        { id: Uuid; event_id: Uuid; name: string; email: string; phone: string | null; created_at: Ts },
        "event_id" | "name" | "email"
      >;
      event_attendance: Table<
        {
          id: Uuid; event_id: Uuid; profile_id: Uuid; checked_in_at: Ts; checked_in_by: Uuid | null; waiver_signed_at: Ts | null;
        },
        "event_id" | "profile_id"
      >;
      volunteer_slots: Table<
        {
          id: Uuid; program_id: Uuid; event_id: Uuid | null; title: string; starts_at: Ts | null; ends_at: Ts | null;
          capacity: number | null; created_at: Ts;
        },
        "program_id" | "title"
      >;
      volunteer_signups: Table<
        {
          id: Uuid; program_id: Uuid; slot_id: Uuid | null; profile_id: Uuid | null; name: string; email: string;
          phone: string | null; message: string | null; hours: number | null;
          status: "pending" | "confirmed" | "completed" | "cancelled"; created_at: Ts;
        },
        "program_id" | "name" | "email"
      >;
      announcements: Table<
        {
          id: Uuid; title: string; body: string; pinned: boolean; author_id: Uuid | null; published_at: Ts;
        } & Stamps,
        "title" | "body"
      >;
      announcement_reads: Table<{ announcement_id: Uuid; profile_id: Uuid; read_at: Ts }, "announcement_id" | "profile_id">;
      news_posts: Table<
        {
          id: Uuid; slug: string; title: string; excerpt: string | null; body: string | null; cover_path: string | null;
          is_public: boolean; published_at: Ts | null; author_id: Uuid | null;
        } & Stamps,
        "slug" | "title"
      >;
      gallery_albums: Table<
        { id: Uuid; slug: string; title: string; description: string | null; is_public: boolean; created_at: Ts },
        "slug" | "title"
      >;
      gallery_photos: Table<
        { id: Uuid; album_id: Uuid; path: string; caption: string | null; sort_order: number; created_at: Ts },
        "album_id" | "path"
      >;
      documents: Table<
        {
          id: Uuid; title: string; description: string | null; category: string; storage_path: string; min_role: UserRole;
          uploaded_by: Uuid | null; created_at: Ts;
        },
        "title" | "storage_path"
      >;
      contact_messages: Table<
        {
          id: Uuid; name: string; email: string; subject: string | null; message: string;
          status: "new" | "read" | "replied" | "archived"; created_at: Ts;
        },
        "name" | "email" | "message"
      >;
      site_settings: Table<
        { key: string; value: Json; is_public: boolean; updated_by: Uuid | null; updated_at: Ts },
        "key"
      >;
      dues_periods: Table<
        { id: Uuid; label: string; starts_on: string; due_on: string; amount: number; created_at: Ts },
        "label" | "starts_on" | "due_on" | "amount"
      >;
      dues_payments: Table<
        {
          id: Uuid; period_id: Uuid; profile_id: Uuid; amount: number; status: PaymentStatus; reference_no: string | null;
          proof_path: string | null; verified_by: Uuid | null; verified_at: Ts | null; reject_reason: string | null;
        } & Stamps,
        "period_id" | "profile_id" | "amount"
      >;
      products: Table<
        { id: Uuid; slug: string; name: string; description: string | null; category: string | null; is_active: boolean } & Stamps,
        "slug" | "name"
      >;
      product_variants: Table<
        {
          id: Uuid; product_id: Uuid; sku: string | null; label: string; size: string | null; color: string | null;
          price_php: number; stock: number; reserved: number; is_active: boolean;
        } & Stamps,
        "product_id" | "label" | "price_php"
      >;
      product_images: Table<
        { id: Uuid; product_id: Uuid; path: string; alt: string | null; sort_order: number },
        "product_id" | "path"
      >;
      discount_codes: Table<
        {
          id: Uuid; code: string; kind: DiscountKind; value: number; min_subtotal: number; max_uses: number | null;
          uses: number; starts_at: Ts | null; ends_at: Ts | null; is_active: boolean; created_at: Ts;
        },
        "code" | "kind" | "value"
      >;
      orders: Table<
        {
          id: Uuid; order_no: string; status: OrderStatus; profile_id: Uuid | null; customer_name: string; email: string;
          phone: string; address_line: string; city: string; province: string; postal_code: string | null; notes: string | null;
          subtotal: number; discount_total: number; total: number; discount_code_id: Uuid | null;
          payment_method: PaymentMethod; payment_reference: string | null; payment_proof_path: string | null;
          lookup_token_hash: string; tracking_note: string | null; paid_at: Ts | null; expires_at: Ts;
        } & Stamps,
        "customer_name" | "email" | "phone" | "address_line" | "city" | "province" | "subtotal" | "total" | "lookup_token_hash"
      >;
      order_items: Table<
        { id: Uuid; order_id: Uuid; variant_id: Uuid | null; name_snapshot: string; unit_price: number; quantity: number },
        "order_id" | "name_snapshot" | "unit_price" | "quantity"
      >;
      donation_campaigns: Table<
        {
          id: Uuid; slug: string; title: string; description: string | null; goal_amount: number | null;
          cover_path: string | null; starts_at: Ts | null; ends_at: Ts | null; is_public: boolean; is_active: boolean;
        } & Stamps,
        "slug" | "title"
      >;
      donations: Table<
        {
          id: Uuid; campaign_id: Uuid | null; profile_id: Uuid | null; donor_name: string; donor_email: string;
          is_anonymous: boolean; message: string | null; amount: number; status: PaymentStatus;
          payment_method: PaymentMethod; payment_reference: string | null; payment_proof_path: string | null;
          verified_by: Uuid | null; verified_at: Ts | null; acknowledged_at: Ts | null;
        } & Stamps,
        "donor_name" | "donor_email" | "amount"
      >;
      payments: Table<
        {
          id: Uuid; subject_type: "order" | "donation" | "dues"; subject_id: Uuid; provider: PaymentMethod;
          provider_ref: string | null; amount: number; status: PaymentStatus; raw: Json | null; created_by: Uuid | null;
          created_at: Ts;
        },
        "subject_type" | "subject_id" | "provider" | "amount" | "status"
      >;
      audit_log: Table<
        {
          id: number; actor_id: Uuid | null; action: string; table_name: string | null; row_id: string | null;
          old_data: Json | null; new_data: Json | null; created_at: Ts;
        },
        "action"
      >;
      rate_limits: Table<{ key: string; window_start: Ts; hits: number }, "key" | "window_start">;
    };
    Views: {
      member_directory: {
        Row: {
          id: Uuid | null; full_name: string | null; road_name: string | null; avatar_path: string | null;
          member_since: string | null; phone: string | null; email: string | null; motorcycles: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_officer: { Args: never; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      is_member: { Args: never; Returns: boolean };
      campaign_totals: { Args: never; Returns: { campaign_id: Uuid; raised: number; donors: number }[] };
      check_rate_limit: { Args: { p_key: string; p_max: number; p_window_secs: number }; Returns: boolean };
      reserve_stock: { Args: { p_variant: Uuid; p_qty: number }; Returns: boolean };
      cancel_order: { Args: { p_order: Uuid; p_new_status?: OrderStatus }; Returns: boolean };
      mark_order_paid: { Args: { p_order: Uuid; p_verifier?: Uuid }; Returns: boolean };
      expire_stale_orders: { Args: never; Returns: number };
      event_seats_taken: { Args: { p_events: Uuid[] }; Returns: { event_id: Uuid; taken: number }[] };
      slot_seats_taken: { Args: { p_slots: Uuid[] }; Returns: { slot_id: Uuid; taken: number }[] };
    };
    Enums: {
      user_role: UserRole;
      application_status: ApplicationStatus;
      rsvp_status: RsvpStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      order_status: OrderStatus;
      discount_kind: DiscountKind;
    };
    CompositeTypes: Record<string, never>;
  };
}

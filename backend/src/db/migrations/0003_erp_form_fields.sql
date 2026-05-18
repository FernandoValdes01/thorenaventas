ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "whatsapp" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "instagram" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "monthly_target" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "accumulated_sales" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "goal_progress" numeric(5, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "credit_limit" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "observations" text DEFAULT '' NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last_purchase" timestamp;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_name" varchar(255) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_rut" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_number" varchar(64) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "contact_phone" varchar(64) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_address" varchar(255) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "seller_name" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "seller_rut" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "client_type_snapshot" varchar(100) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "zone_snapshot" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sector_snapshot" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "debt_snapshot" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "show_receipt" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "base_price" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "offer_discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "unit_price_before_scale" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "volume_scale_id" varchar(64) DEFAULT '' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "volume_scale_label" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "volume_discount_rate" numeric(5, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "volume_discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "subtotal_before_scale" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "client" varchar(255) DEFAULT '' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "zone" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "sector" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "seller" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "order_code" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "product" varchar(255) DEFAULT '' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "sale" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cost" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "profit" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "margin_pct" numeric(5, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "payment_method" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "dispatch_status" varchar(64) DEFAULT 'Pendiente' NOT NULL;
--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "date" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "seller" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "sales" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "effectiveness_pct" numeric(5, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "km_route" integer DEFAULT 0 NOT NULL;
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "fuel" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "observation" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "cobranzas" ADD COLUMN IF NOT EXISTS "client_name" varchar(255) DEFAULT '' NOT NULL;
ALTER TABLE "cobranzas" ADD COLUMN IF NOT EXISTS "document" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "cobranzas" ADD COLUMN IF NOT EXISTS "issue_date" timestamp;
ALTER TABLE "cobranzas" ADD COLUMN IF NOT EXISTS "paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "cobranzas" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "volume_scales" ADD COLUMN IF NOT EXISTS "objective" text DEFAULT '' NOT NULL;
ALTER TABLE "volume_scales" ADD COLUMN IF NOT EXISTS "comment" text DEFAULT '' NOT NULL;

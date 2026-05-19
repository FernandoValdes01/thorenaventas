ALTER TABLE "clients" ADD COLUMN "business_name" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "nickname" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "whatsapp" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "instagram" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "monthly_target" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "accumulated_sales" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "goal_progress" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "credit_limit" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "observations" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "last_purchase" timestamp;--> statement-breakpoint
ALTER TABLE "cobranzas" ADD COLUMN "client_name" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cobranzas" ADD COLUMN "document" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cobranzas" ADD COLUMN "issue_date" timestamp;--> statement-breakpoint
ALTER TABLE "cobranzas" ADD COLUMN "paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "cobranzas" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "base_price" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "offer_discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_price_before_scale" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "volume_scale_id" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "volume_scale_label" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "volume_discount_rate" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "volume_discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "subtotal_before_scale" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "custom_discount_rate" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "custom_discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "item_kind" varchar(24) DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "promo_components" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_rut" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_number" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "contact_phone" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "seller_name" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "seller_rut" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "client_type_snapshot" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zone_snapshot" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sector_snapshot" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "debt_snapshot" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "custom_discount_rate" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "custom_discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "show_receipt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" varchar(64) DEFAULT 'Unidad' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "purchase_cost" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "transport_unit" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "final_cost" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "location" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "date" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "purchase_order" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "unit_cost" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "transport_unit" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "reception" varchar(64) DEFAULT 'Recibido' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "doc" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "observation" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "date" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "seller" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "sales" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "effectiveness_pct" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "km_route" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "fuel" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "observation" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "client" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "zone" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "sector" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "seller" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "order_code" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "product" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "sale" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cost" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "profit" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "margin_pct" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "payment_method" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "dispatch_status" varchar(64) DEFAULT 'Pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contact" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "phone" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "email" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "volume_scales" ADD COLUMN "objective" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "volume_scales" ADD COLUMN "comment" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
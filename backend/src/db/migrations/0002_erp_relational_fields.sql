ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "contact" varchar(255) DEFAULT '' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "phone" varchar(64) DEFAULT '' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "email" varchar(255) DEFAULT '' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" varchar(64) DEFAULT 'Unidad' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "purchase_cost" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "transport_unit" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "final_cost" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "location" varchar(120) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "date" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "purchase_order" varchar(64) DEFAULT '' NOT NULL;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "unit_cost" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "transport_unit" numeric(14, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "reception" varchar(64) DEFAULT 'Recibido' NOT NULL;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "doc" varchar(120) DEFAULT '' NOT NULL;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "observation" text DEFAULT '' NOT NULL;

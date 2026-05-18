ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "supplier_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_supplier_id_suppliers_id_fk'
  ) THEN
    ALTER TABLE "products"
    ADD CONSTRAINT "products_supplier_id_suppliers_id_fk"
    FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id")
    ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

import 'dotenv/config';
import { Client } from 'pg';

const statements = [
  "ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_name varchar(255) NOT NULL DEFAULT ''",
  "ALTER TABLE clients ADD COLUMN IF NOT EXISTS nickname varchar(255) NOT NULL DEFAULT ''",
  "UPDATE clients SET business_name = COALESCE(NULLIF(business_name,''), name), nickname = COALESCE(NULLIF(nickname,''), name)",
  "ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_discount_rate numeric(5,4) NOT NULL DEFAULT '0'",
  "ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_discount_amount numeric(14,2) NOT NULL DEFAULT '0'",
  "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS custom_discount_rate numeric(5,4) NOT NULL DEFAULT '0'",
  "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS custom_discount_amount numeric(14,2) NOT NULL DEFAULT '0'",
  "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_kind varchar(24) NOT NULL DEFAULT 'product'",
  "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS promo_components text NOT NULL DEFAULT '[]'",
];

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
      console.log(`OK: ${statement}`);
    }
    console.log('Manual migration 0004 completed.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Manual migration 0004 failed:', error);
  process.exit(1);
});

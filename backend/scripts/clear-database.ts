import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';

const includeAuth = process.argv.includes('--include-auth');

const businessTables = [
  'app_state',
  'sales',
  'order_items',
  'orders',
  'quote_items',
  'quotes',
  'purchases',
  'products',
  'suppliers',
  'cobranzas',
  'routes',
  'city_rates',
  'volume_scales',
  'payment_methods',
  'clients',
];

const authTables = ['session', 'account', 'verification', 'user', 'users'];
const tables = includeAuth ? [...businessTables, ...authTables] : businessTables;

await db.execute(sql`
  do $$
  declare
    table_name text;
  begin
    foreach table_name in array ${tables}::text[] loop
      if to_regclass('public.' || table_name) is not null then
        execute format('truncate table public.%I restart identity cascade', table_name);
      end if;
    end loop;
  end $$;
`);

console.log(
  includeAuth
    ? 'Base de datos limpiada incluyendo usuarios/login.'
    : 'Base de datos limpiada. Usuarios/login conservados.',
);

process.exit(0);

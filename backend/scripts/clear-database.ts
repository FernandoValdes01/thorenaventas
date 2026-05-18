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

function isSafeIdentifier(value: string) {
  return /^[a-z_][a-z0-9_]*$/i.test(value);
}

for (const table of tables) {
  if (!isSafeIdentifier(table)) {
    throw new Error(`Nombre de tabla invalido: ${table}`);
  }

  const exists = await db.execute(sql`select to_regclass(${`public.${table}`}) as regclass`);
  const regclass = exists.rows[0]?.regclass;
  if (!regclass) continue;

  await db.execute(sql.raw(`truncate table public."${table}" restart identity cascade;`));
}

console.log(
  includeAuth
    ? 'Base de datos limpiada incluyendo usuarios/login.'
    : 'Base de datos limpiada. Usuarios/login conservados.',
);

process.exit(0);

import { sql } from 'drizzle-orm';
import { db } from '../db/client';

type JsonValue = unknown;

const ensureTableSql = sql`
  create table if not exists app_state (
    key text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
  )
`;

async function ensureTable() {
  await db.execute(ensureTableSql);
}

export const stateService = {
  async get<T = JsonValue>(key: string): Promise<T | null> {
    await ensureTable();
    const result = await db.execute(sql`select data from app_state where key = ${key} limit 1`);
    if (!result.rows.length) return null;
    return result.rows[0].data as T;
  },

  async set<T = JsonValue>(key: string, data: T): Promise<T> {
    await ensureTable();
    await db.execute(sql`
      insert into app_state (key, data)
      values (${key}, ${JSON.stringify(data)}::jsonb)
      on conflict (key)
      do update set data = excluded.data, updated_at = now()
    `);
    return data;
  },
};

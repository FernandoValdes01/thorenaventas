import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 32 }).notNull().default('vendedor'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
}, (table) => ({
  emailUnique: uniqueIndex('users_email_unique').on(table.email),
}));

export const authUsers = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailUnique: uniqueIndex('auth_user_email_unique').on(table.email),
}));

export const authSessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
}, (table) => ({
  tokenUnique: uniqueIndex('auth_session_token_unique').on(table.token),
}));

export const authAccounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export const authVerifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export const user = authUsers;
export const session = authSessions;
export const account = authAccounts;
export const verification = authVerifications;

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  rut: varchar('rut', { length: 32 }).notNull().default(''),
  phone: varchar('phone', { length: 32 }).notNull().default(''),
  contact: varchar('contact', { length: 255 }).notNull().default(''),
  email: varchar('email', { length: 255 }).notNull().default(''),
  address: varchar('address', { length: 255 }).notNull().default(''),
  zone: varchar('zone', { length: 120 }).notNull().default(''),
  sector: varchar('sector', { length: 120 }).notNull().default(''),
  frequency: varchar('frequency', { length: 32 }).notNull().default('Semanal'),
  status: varchar('status', { length: 32 }).notNull().default('Activo'),
  creditEnabled: boolean('credit_enabled').notNull().default(false),
  debt: numeric('debt', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes').notNull().default(''),
  ...timestamps,
}, (table) => ({
  codeUnique: uniqueIndex('clients_code_unique').on(table.code),
}));

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 64 }).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 120 }).notNull(),
  stock: integer('stock').notNull().default(0),
  stockMin: integer('stock_min').notNull().default(0),
  basePrice: numeric('base_price', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 32 }).notNull().default('Activo'),
  ...timestamps,
}, (table) => ({
  skuUnique: uniqueIndex('products_sku_unique').on(table.sku),
}));

export const volumeScales = pgTable('volume_scales', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: varchar('label', { length: 120 }).notNull(),
  minQuantity: integer('min_quantity').notNull(),
  maxQuantity: integer('max_quantity').notNull(),
  discountRate: numeric('discount_rate', { precision: 5, scale: 4 }).notNull().default('0'),
  ...timestamps,
});

export const cityRates = pgTable('city_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  city: varchar('city', { length: 120 }).notNull(),
  rate: numeric('rate', { precision: 5, scale: 4 }).notNull().default('0'),
  ...timestamps,
}, (table) => ({
  cityUnique: uniqueIndex('city_rates_city_unique').on(table.city),
}));

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  ...timestamps,
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  saleChannel: varchar('sale_channel', { length: 32 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 120 }).notNull(),
  subtotalBeforeDiscount: numeric('subtotal_before_discount', { precision: 14, scale: 2 }).notNull().default('0'),
  totalDiscountAmount: numeric('total_discount_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  itemsTotal: numeric('items_total', { precision: 14, scale: 2 }).notNull().default('0'),
  dispatchCity: varchar('dispatch_city', { length: 120 }).notNull().default(''),
  dispatchRate: numeric('dispatch_rate', { precision: 5, scale: 4 }).notNull().default('0'),
  dispatchSurcharge: numeric('dispatch_surcharge', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
  observations: text('observations').notNull().default(''),
  ...timestamps,
}, (table) => ({
  codeUnique: uniqueIndex('orders_code_unique').on(table.code),
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: uuid('product_id').references(() => products.id),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  ...timestamps,
});

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  status: varchar('status', { length: 32 }).notNull().default('Cotizado'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
  ...timestamps,
}, (table) => ({
  codeUnique: uniqueIndex('quotes_code_unique').on(table.code),
}));

export const quoteItems = pgTable('quote_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id').notNull().references(() => quotes.id),
  productId: uuid('product_id').references(() => products.id),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  ...timestamps,
});

export const sales = pgTable('sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id),
  date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
  ...timestamps,
});

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('Activo'),
  ...timestamps,
});

export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  productId: uuid('product_id').references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  totalCost: numeric('total_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  ...timestamps,
});

export const routes = pgTable('routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  zone: varchar('zone', { length: 120 }).notNull(),
  sector: varchar('sector', { length: 120 }).notNull(),
  visitedClients: integer('visited_clients').notNull().default(0),
  clientsWithOrder: integer('clients_with_order').notNull().default(0),
  ...timestamps,
});

export const cobranzas = pgTable('cobranzas', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull().default('0'),
  balance: numeric('balance', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 32 }).notNull().default('Pendiente'),
  dueDate: timestamp('due_date', { withTimezone: false }),
  ...timestamps,
});

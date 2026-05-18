import { Hono } from 'hono';
import type { Context } from 'hono';
import { handle } from '@hono/node-server/vercel';
import { sql } from 'drizzle-orm';
import { db } from './db/client';
import { authMiddleware } from './middlewares/auth';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler } from './middlewares/error-handler';
import { requireRole } from './middlewares/require-role';
import { ok } from './lib/http';
import { authRoutes } from './routes/auth.routes';
import { cityRatesRoutes } from './routes/city-rates.routes';
import { clientsRoutes } from './routes/clients.routes';
import { cobranzasRoutes } from './routes/cobranzas.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { orderItemsRoutes } from './routes/order-items.routes';
import { ordersRoutes } from './routes/orders.routes';
import { paymentMethodsRoutes } from './routes/payment-methods.routes';
import { productsRoutes } from './routes/products.routes';
import { purchasesRoutes } from './routes/purchases.routes';
import { quoteItemsRoutes } from './routes/quote-items.routes';
import { quotesRoutes } from './routes/quotes.routes';
import { routesRoutes } from './routes/routes.routes';
import { salesRoutes } from './routes/sales.routes';
import { suppliersRoutes } from './routes/suppliers.routes';
import { stateRoutes } from './routes/state.routes';
import { volumeScalesRoutes } from './routes/volume-scales.routes';

export const app = new Hono();

app.use('*', corsMiddleware);
app.use('*', errorHandler);

const healthHandler = async (c: Context) => {
  try {
    await db.execute(sql`select 1`);
    return ok(c, { status: 'ok', database: 'connected' });
  } catch {
    return c.json(
      {
        success: false,
        error: {
          code: 'DB_UNAVAILABLE',
          message: 'Base de datos no disponible.',
        },
      },
      500,
    );
  }
};

app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);
app.route('/api/v1/auth', authRoutes);

app.use('/api/v1/*', authMiddleware);
app.use('/api/v1/*', requireRole(['admin']));

app.route('/api/v1/clients', clientsRoutes);
app.route('/api/v1/products', productsRoutes);
app.route('/api/v1/orders', ordersRoutes);
app.route('/api/v1', orderItemsRoutes);
app.route('/api/v1/quotes', quotesRoutes);
app.route('/api/v1', quoteItemsRoutes);
app.route('/api/v1/city-rates', cityRatesRoutes);
app.route('/api/v1/volume-scales', volumeScalesRoutes);
app.route('/api/v1/payment-methods', paymentMethodsRoutes);
app.route('/api/v1/sales', salesRoutes);
app.route('/api/v1/purchases', purchasesRoutes);
app.route('/api/v1/suppliers', suppliersRoutes);
app.route('/api/v1/cobranzas', cobranzasRoutes);
app.route('/api/v1/dashboard', dashboardRoutes);
app.route('/api/v1/routes', routesRoutes);
app.route('/api/v1/state', stateRoutes);

export default handle(app);

import { Hono } from 'hono';
import { ok, fail } from '../lib/http';
import { stateService } from '../services/state.service';

const allowedKeys = new Set([
  'clients',
  'products',
  'orders',
  'cobranzas',
  'erpRoutes',
  'erpScales',
  'erpPurchases',
  'erpSales',
  'erpProductsFull',
  'erpSuppliers',
  'erpCityRates',
  'erpPromotions',
  'companyInfo',
]);

export const stateRoutes = new Hono()
  .get('/:key', async (c) => {
    const key = c.req.param('key');
    if (!allowedKeys.has(key)) return fail(c, 'INVALID_KEY', 'Modulo no permitido.', 400);
    const data = await stateService.get(key);
    return ok(c, { key, data });
  })
  .post('/:key', async (c) => {
    const key = c.req.param('key');
    if (!allowedKeys.has(key)) return fail(c, 'INVALID_KEY', 'Modulo no permitido.', 400);
    const body = await c.req.json();
    const data = await stateService.set(key, body?.data ?? body);
    return ok(c, { key, data }, 201);
  });

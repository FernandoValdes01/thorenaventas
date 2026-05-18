import { Hono } from 'hono';
import { ok } from '../lib/http';
import { dashboardService } from '../services/dashboard.service';

export const dashboardRoutes = new Hono()
  .get('/summary', (c) => ok(c, dashboardService.summary()))
  .get('/sales-by-month', (c) => ok(c, dashboardService.salesByMonth()))
  .get('/orders-by-status', (c) => ok(c, dashboardService.ordersByStatus()))
  .get('/top-products', (c) => ok(c, dashboardService.topProducts()))
  .get('/debt-summary', (c) => ok(c, dashboardService.debtSummary()));

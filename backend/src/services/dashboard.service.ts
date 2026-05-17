export const dashboardService = {
  summary: () => ({ salesTotal: 0, ordersCount: 0, source: 'stub' }),
  salesByMonth: () => [],
  ordersByStatus: () => [],
  topProducts: () => [],
  debtSummary: () => ({ pending: 0, overdue: 0, paid: 0 }),
};

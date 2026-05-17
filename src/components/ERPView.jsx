import { useMemo, useState } from 'react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'rutas', label: 'Rutas' },
  { id: 'escalas', label: 'Escalas de ventas' },
  { id: 'compras', label: 'Compras' },
  { id: 'productos', label: 'Productos' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'proveedores', label: 'Proveedores' },
];

const CLIENT_TYPES = ['Negocio fijo', 'Mayorista', 'Minorista', 'Distribuidor', 'Cafeteria', 'Restaurant', 'Camping', 'Cabanas', 'Hotel/Hostal', 'Food Truck'];
const VISIT_FREQUENCIES = ['Semanal', 'Quincenal', 'Mensual'];
const CLIENT_STATUSES = ['Activo', 'Inactivo'];
const ROUTE_SELLERS = ['Jorge', 'Ruta 2'];
const RECEPTION_STATUSES = ['Recibido', 'Pendiente', 'Con observacion'];
const DISPATCH_STATUSES = ['Pendiente', 'Preparando', 'Despachado', 'Pagado', 'Anulado'];
const SUPPLIER_STATUSES = ['Activo', 'Inactivo'];
const PRODUCT_STATUSES = ['Activo', 'Inactivo'];
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Debito/Credito', 'Credito 7 dias', 'Credito 15 dias'];

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('es-CL', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
});

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (value) => String(value || '').slice(0, 7);
const dayKey = (value) => String(value || '').slice(8, 10);

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatCurrency = (value) => currencyFormatter.format(Math.round(Math.max(0, asNumber(value, 0))));
const formatPercent = (value) => percentFormatter.format(clamp(asNumber(value, 0), 0, 1));
const formatInteger = (value) => integerFormatter.format(Math.round(Math.max(0, asNumber(value, 0))));

const emptyClientForm = {
  name: '',
  type: 'Negocio fijo',
  rut: '',
  contact: '',
  phone: '',
  whatsapp: '',
  email: '',
  instagram: '',
  address: '',
  sector: '',
  zone: '',
  frequency: 'Semanal',
  creditEnabled: 'false',
  debt: '0',
  monthlyTarget: '0',
  accumulatedSales: '0',
  goalProgress: '0',
  creditLimit: '0',
  status: 'Activo',
  notes: '',
};

const emptyRouteForm = {
  date: todayISO(),
  zone: '',
  sector: '',
  seller: 'Jorge',
  visitedClients: '0',
  clientsWithOrder: '0',
  sales: '0',
  kmRoute: '0',
  fuel: '0',
  observation: '',
};

const emptyScaleForm = {
  label: '',
  minQuantity: '1',
  maxQuantity: '9',
  discountRate: '0',
  objective: '',
  comment: '',
};

const emptyPurchaseForm = {
  date: todayISO(),
  supplier: '',
  purchaseOrder: '',
  sku: '',
  product: '',
  quantity: '1',
  unitCost: '0',
  transportUnit: '0',
  reception: 'Recibido',
  doc: '',
  observation: '',
};

const emptyProductForm = {
  sku: '',
  barcode: '',
  category: '',
  product: '',
  brand: '',
  unit: 'Unidad',
  purchaseCost: '0',
  transportUnit: '0',
  salePriceBase: '0',
  stock: '0',
  stockMin: '0',
  location: '',
  status: 'Activo',
};

const emptySaleForm = {
  date: todayISO(),
  client: '',
  zone: '',
  sector: '',
  seller: 'Jorge',
  orderCode: '',
  product: '',
  sale: '0',
  cost: '0',
  paymentMethod: 'Efectivo',
  dispatchStatus: 'Pendiente',
};

const emptySupplierForm = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  status: 'Activo',
  notes: '',
};

function ChartBars({ items, valueFormat = formatCurrency }) {
  const maxValue = Math.max(1, ...items.map((item) => asNumber(item.value, 0)));

  if (!items.length) {
    return <p className="muted">Sin datos para este grafico.</p>;
  }

  return (
    <div className="chart-bars" role="img" aria-label="Grafico de barras">
      {items.map((item) => {
        const value = Math.max(0, asNumber(item.value, 0));
        const width = Math.max(3, (value / maxValue) * 100);

        return (
          <div key={item.label} className="chart-row">
            <div className="chart-row-head">
              <span>{item.label}</span>
              <strong>{valueFormat(value)}</strong>
            </div>
            <div className="chart-track">
              <span className="chart-fill" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartLine({ points }) {
  if (!points.length) {
    return <p className="muted">Sin datos para este grafico.</p>;
  }

  const width = 520;
  const height = 170;
  const pad = 24;
  const maxValue = Math.max(1, ...points.map((point) => asNumber(point.value, 0)));
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  const mapped = points.map((point, index) => {
    const value = Math.max(0, asNumber(point.value, 0));
    const x = pad + index * stepX;
    const y = height - pad - (value / maxValue) * (height - pad * 2);
    return { ...point, x, y, value };
  });

  const polyline = mapped.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${pad},${height - pad} ${polyline} ${pad + stepX * (mapped.length - 1)},${height - pad}`;

  return (
    <div className="chart-line-wrap" role="img" aria-label="Tendencia diaria de ventas">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-line-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="erpChartArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <polyline points={area} fill="url(#erpChartArea)" stroke="none" />
        <polyline points={polyline} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {mapped.map((point) => (
          <g key={`${point.label}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="var(--surface-strong)" stroke="var(--brand)" strokeWidth="2" />
          </g>
        ))}
      </svg>

      <div className="chart-line-labels">
        {mapped.map((point) => (
          <span key={`${point.label}-label`}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <article className="panel erp-metric-card">
      <p className="erp-metric-title">{title}</p>
      <strong className="erp-metric-value">{value}</strong>
    </article>
  );
}

function ERPView({
  clients,
  setClients,
  orders,
  routes,
  setRoutes,
  scales,
  setScales,
  purchases,
  setPurchases,
  sales,
  setSales,
  productsFull,
  setProductsFull,
  suppliers,
  setSuppliers,
}) {
  const [tab, setTab] = useState('dashboard');
  const [feedback, setFeedback] = useState(null);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [scaleForm, setScaleForm] = useState(emptyScaleForm);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const salesMonth = useMemo(() => sales.filter((item) => monthKey(item.date) === currentMonth), [sales, currentMonth]);

  const ordersMonth = useMemo(() => orders.filter((item) => monthKey(item.createdAt) === currentMonth), [orders, currentMonth]);

  const salesByZone = useMemo(() => {
    const map = new Map();
    salesMonth.forEach((item) => {
      const key = item.zone || 'Sin zona';
      map.set(key, (map.get(key) || 0) + asNumber(item.sale, 0));
    });
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [salesMonth]);

  const salesByDay = useMemo(() => {
    const map = new Map();
    salesMonth.forEach((item) => {
      const key = dayKey(item.date) || '--';
      map.set(key, (map.get(key) || 0) + asNumber(item.sale, 0));
    });

    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => Number(a.label) - Number(b.label));
  }, [salesMonth]);

  const salesByProduct = useMemo(() => {
    const map = new Map();
    sales.forEach((item) => {
      const key = item.product || 'Sin producto';
      map.set(key, (map.get(key) || 0) + asNumber(item.sale, 0));
    });
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [sales]);

  const salesByClient = useMemo(() => {
    const map = new Map();
    sales.forEach((item) => {
      const key = item.client || 'Sin cliente';
      map.set(key, (map.get(key) || 0) + asNumber(item.sale, 0));
    });
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [sales]);

  const totals = useMemo(() => {
    const salesTotal = salesMonth.reduce((sum, item) => sum + asNumber(item.sale, 0), 0);
    const costsTotal = salesMonth.reduce((sum, item) => sum + asNumber(item.cost, 0), 0);
    const profitTotal = salesMonth.reduce((sum, item) => sum + asNumber(item.profit, asNumber(item.sale, 0) - asNumber(item.cost, 0)), 0);

    const uniqueOrders = new Set(salesMonth.map((item) => String(item.orderCode || '').trim()).filter(Boolean));
    const uniqueClients = new Set(salesMonth.map((item) => String(item.client || '').trim()).filter(Boolean));
    const activeClients = clients.filter((item) => (item.status || 'Activo') === 'Activo').length;
    const pendingDebt = clients.reduce((sum, item) => sum + Math.max(0, asNumber(item.debt, 0)), 0);
    const stockValue = productsFull.reduce((sum, item) => sum + Math.max(0, asNumber(item.stock, 0)) * Math.max(0, asNumber(item.finalCost, 0)), 0);

    const avgMargin = salesTotal > 0 ? profitTotal / salesTotal : 0;
    const ticket = uniqueOrders.size > 0 ? salesTotal / uniqueOrders.size : 0;

    return {
      salesTotal,
      costsTotal,
      profitTotal,
      avgMargin,
      ticket,
      uniqueClients: uniqueClients.size,
      activeClients,
      pendingDebt,
      stockValue,
      ordersCount: ordersMonth.length,
    };
  }, [clients, ordersMonth.length, productsFull, salesMonth]);

  const updateClientField = (key) => (event) => {
    setClientForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updateRouteField = (key) => (event) => {
    setRouteForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updateScaleField = (key) => (event) => {
    setScaleForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updatePurchaseField = (key) => (event) => {
    setPurchaseForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updateProductField = (key) => (event) => {
    setProductForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updateSaleField = (key) => (event) => {
    setSaleForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updateSupplierField = (key) => (event) => {
    setSupplierForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleAddClient = (event) => {
    event.preventDefault();

    const name = clientForm.name.trim();
    if (!name) {
      setFeedback({ type: 'error', text: 'Debes ingresar el nombre del cliente.' });
      return;
    }

    const nowId = Date.now();
    const clientId = `CLI-${String(nowId).slice(-6)}`;
    const newClient = {
      id: clientId,
      name,
      type: clientForm.type,
      rut: clientForm.rut.trim(),
      phone: clientForm.phone.trim(),
      contact: clientForm.contact.trim(),
      email: clientForm.email.trim(),
      address: clientForm.address.trim(),
      sector: clientForm.sector.trim(),
      zone: clientForm.zone.trim(),
      frequency: clientForm.frequency,
      creditEnabled: clientForm.creditEnabled === 'true',
      debt: Math.max(0, Math.round(asNumber(clientForm.debt, 0))),
      monthlyTarget: Math.max(0, Math.round(asNumber(clientForm.monthlyTarget, 0))),
      accumulatedSales: Math.max(0, Math.round(asNumber(clientForm.accumulatedSales, 0))),
      goalProgress: clamp(asNumber(clientForm.goalProgress, 0), 0, 1),
      creditLimit: Math.max(0, Math.round(asNumber(clientForm.creditLimit, 0))),
      status: clientForm.status,
      notes: clientForm.notes.trim(),
      observations: clientForm.notes.trim(),
      whatsapp: clientForm.whatsapp.trim(),
      instagram: clientForm.instagram.trim(),
      lastPurchase: '',
    };

    setClients((current) => [newClient, ...current]);
    setClientForm(emptyClientForm);
    setFeedback({ type: 'success', text: 'Cliente agregado al ERP.' });
  };

  const handleAddRoute = (event) => {
    event.preventDefault();

    if (!routeForm.zone.trim() || !routeForm.sector.trim()) {
      setFeedback({ type: 'error', text: 'Debes completar zona y sector para la ruta.' });
      return;
    }

    const visitedClients = Math.max(0, Math.round(asNumber(routeForm.visitedClients, 0)));
    const clientsWithOrder = Math.max(0, Math.round(asNumber(routeForm.clientsWithOrder, 0)));
    const effectivenessPct = visitedClients > 0 ? clamp(clientsWithOrder / visitedClients, 0, 1) : 0;

    const newRoute = {
      id: `rut-${Date.now()}`,
      date: routeForm.date || todayISO(),
      zone: routeForm.zone.trim(),
      sector: routeForm.sector.trim(),
      seller: routeForm.seller,
      visitedClients,
      clientsWithOrder,
      sales: Math.max(0, Math.round(asNumber(routeForm.sales, 0))),
      effectivenessPct,
      kmRoute: Math.max(0, Math.round(asNumber(routeForm.kmRoute, 0))),
      fuel: Math.max(0, Math.round(asNumber(routeForm.fuel, 0))),
      observation: routeForm.observation.trim(),
    };

    setRoutes((current) => [newRoute, ...current]);
    setRouteForm(emptyRouteForm);
    setFeedback({ type: 'success', text: 'Ruta agregada correctamente.' });
  };

  const handleAddScale = (event) => {
    event.preventDefault();

    const label = scaleForm.label.trim();
    if (!label) {
      setFeedback({ type: 'error', text: 'Debes ingresar un nombre para la escala.' });
      return;
    }

    const minQuantity = Math.max(1, Math.round(asNumber(scaleForm.minQuantity, 1)));
    const maxQuantity = Math.max(minQuantity, Math.round(asNumber(scaleForm.maxQuantity, minQuantity)));
    const discountRate = clamp(asNumber(scaleForm.discountRate, 0), 0, 0.95);

    const newScale = {
      id: `esc-${Date.now()}`,
      label,
      minQuantity,
      maxQuantity,
      discountRate,
      objective: scaleForm.objective.trim(),
      comment: scaleForm.comment.trim(),
    };

    setScales((current) => [...current, newScale].sort((a, b) => a.minQuantity - b.minQuantity));
    setScaleForm(emptyScaleForm);
    setFeedback({ type: 'success', text: 'Escala agregada correctamente.' });
  };

  const handleScaleInlineChange = (id, key, value) => {
    setScales((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item;

          if (key === 'minQuantity' || key === 'maxQuantity') {
            return { ...item, [key]: Math.max(1, Math.round(asNumber(value, 1))) };
          }

          if (key === 'discountRate') {
            return { ...item, discountRate: clamp(asNumber(value, 0), 0, 0.95) };
          }

          return { ...item, [key]: value };
        })
        .sort((a, b) => a.minQuantity - b.minQuantity),
    );
  };

  const handleDeleteScale = (id) => {
    setScales((current) => current.filter((item) => item.id !== id));
  };

  const handleAddPurchase = (event) => {
    event.preventDefault();

    if (!purchaseForm.supplier.trim() || !purchaseForm.product.trim()) {
      setFeedback({ type: 'error', text: 'Debes completar proveedor y producto.' });
      return;
    }

    const quantity = Math.max(1, Math.round(asNumber(purchaseForm.quantity, 1)));
    const unitCost = Math.max(0, Math.round(asNumber(purchaseForm.unitCost, 0)));
    const transportUnit = Math.max(0, Math.round(asNumber(purchaseForm.transportUnit, 0)));
    const totalCost = quantity * (unitCost + transportUnit);

    const newPurchase = {
      id: `comp-${Date.now()}`,
      date: purchaseForm.date || todayISO(),
      supplier: purchaseForm.supplier.trim(),
      purchaseOrder: purchaseForm.purchaseOrder.trim(),
      sku: purchaseForm.sku.trim(),
      product: purchaseForm.product.trim(),
      quantity,
      unitCost,
      transportUnit,
      totalCost,
      reception: purchaseForm.reception,
      doc: purchaseForm.doc.trim(),
      observation: purchaseForm.observation.trim(),
    };

    setPurchases((current) => [newPurchase, ...current]);
    setPurchaseForm(emptyPurchaseForm);
    setFeedback({ type: 'success', text: 'Compra registrada.' });
  };

  const handleAddProduct = (event) => {
    event.preventDefault();

    const productName = productForm.product.trim();
    const sku = productForm.sku.trim();
    if (!productName || !sku) {
      setFeedback({ type: 'error', text: 'Debes completar SKU y nombre de producto.' });
      return;
    }

    const purchaseCost = Math.max(0, Math.round(asNumber(productForm.purchaseCost, 0)));
    const transportUnit = Math.max(0, Math.round(asNumber(productForm.transportUnit, 0)));
    const finalCost = purchaseCost + transportUnit;
    const salePriceBase = Math.max(0, Math.round(asNumber(productForm.salePriceBase, 0)));
    const unitProfit = Math.max(0, salePriceBase - finalCost);
    const marginPct = salePriceBase > 0 ? unitProfit / salePriceBase : 0;

    const newProduct = {
      id: sku,
      sku,
      barcode: productForm.barcode.trim(),
      category: productForm.category.trim() || 'General',
      product: productName,
      brand: productForm.brand.trim(),
      unit: productForm.unit,
      purchaseCost,
      transportUnit,
      finalCost,
      iva: 0.19,
      salePriceBase,
      stock: Math.max(0, Math.round(asNumber(productForm.stock, 0))),
      stockMin: Math.max(0, Math.round(asNumber(productForm.stockMin, 0))),
      marginPct,
      unitProfit,
      location: productForm.location.trim(),
      status: productForm.status,
    };

    setProductsFull((current) => [newProduct, ...current.filter((item) => item.sku !== sku)]);
    setProductForm(emptyProductForm);
    setFeedback({ type: 'success', text: 'Producto registrado en ERP.' });
  };

  const handleProductInlineChange = (sku, key, value) => {
    setProductsFull((current) =>
      current.map((item) => {
        if (item.sku !== sku) return item;

        if (key === 'stock' || key === 'stockMin') {
          return { ...item, [key]: Math.max(0, Math.round(asNumber(value, 0))) };
        }

        if (key === 'salePriceBase') {
          const salePriceBase = Math.max(0, Math.round(asNumber(value, 0)));
          const finalCost = Math.max(0, Math.round(asNumber(item.finalCost, 0)));
          const unitProfit = Math.max(0, salePriceBase - finalCost);
          const marginPct = salePriceBase > 0 ? unitProfit / salePriceBase : 0;
          return { ...item, salePriceBase, unitProfit, marginPct };
        }

        if (key === 'status') {
          return { ...item, status: value };
        }

        return item;
      }),
    );
  };

  const handleAddSale = (event) => {
    event.preventDefault();

    if (!saleForm.client.trim() || !saleForm.product.trim()) {
      setFeedback({ type: 'error', text: 'Debes completar cliente y producto de la venta.' });
      return;
    }

    const saleValue = Math.max(0, Math.round(asNumber(saleForm.sale, 0)));
    const costValue = Math.max(0, Math.round(asNumber(saleForm.cost, 0)));
    const profit = Math.max(0, saleValue - costValue);
    const marginPct = saleValue > 0 ? profit / saleValue : 0;

    const newSale = {
      id: `ven-${Date.now()}`,
      date: saleForm.date || todayISO(),
      client: saleForm.client.trim(),
      zone: saleForm.zone.trim() || 'Sin zona',
      sector: saleForm.sector.trim() || 'Sin sector',
      seller: saleForm.seller,
      orderCode: saleForm.orderCode.trim() || `PED-${String(Date.now()).slice(-4)}`,
      product: saleForm.product.trim(),
      sale: saleValue,
      cost: costValue,
      profit,
      marginPct,
      paymentMethod: saleForm.paymentMethod,
      dispatchStatus: saleForm.dispatchStatus,
    };

    setSales((current) => [newSale, ...current]);
    setSaleForm(emptySaleForm);
    setFeedback({ type: 'success', text: 'Venta registrada en ERP.' });
  };

  const handleAddSupplier = (event) => {
    event.preventDefault();

    const name = supplierForm.name.trim();
    if (!name) {
      setFeedback({ type: 'error', text: 'Debes ingresar el nombre del proveedor.' });
      return;
    }

    const newSupplier = {
      id: `prov-${Date.now()}`,
      name,
      contact: supplierForm.contact.trim(),
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim(),
      status: supplierForm.status,
      notes: supplierForm.notes.trim(),
    };

    setSuppliers((current) => [newSupplier, ...current]);
    setSupplierForm(emptySupplierForm);
    setFeedback({ type: 'success', text: 'Proveedor agregado.' });
  };

  const topProducts = salesByProduct.slice(0, 5);
  const topClients = salesByClient.slice(0, 5);
  const bottomClients = [...salesByClient].reverse().slice(0, 5).reverse();
  const dashboardMetrics = [
    { id: 'sales-month', title: 'Ventas del mes', value: formatCurrency(totals.salesTotal) },
    { id: 'profit-month', title: 'Utilidad del mes', value: formatCurrency(totals.profitTotal) },
    { id: 'avg-margin', title: 'Margen promedio', value: formatPercent(totals.avgMargin) },
    { id: 'avg-ticket', title: 'Ticket promedio', value: formatCurrency(totals.ticket) },
    { id: 'orders-month', title: 'Pedidos del mes', value: formatInteger(totals.ordersCount) },
    { id: 'clients-served', title: 'Clientes atendidos', value: formatInteger(totals.uniqueClients) },
    { id: 'clients-active', title: 'Clientes activos', value: formatInteger(totals.activeClients) },
    { id: 'pending-debt', title: 'Cobranza pendiente', value: formatCurrency(totals.pendingDebt) },
    { id: 'stock-value', title: 'Stock valorizado', value: formatCurrency(totals.stockValue) },
  ];

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">ERP</p>
        <h2>Gestion comercial integral</h2>
      </div>

      {feedback ? <div className={`notice notice-${feedback.type}`}>{feedback.text}</div> : null}

      <div className="erp-tabs">
        {TABS.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? 'nav-button is-active' : 'nav-button'} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' ? (
        <div className="erp-dashboard-layout">
          <div className="erp-metrics-grid" aria-label="Resumen ejecutivo de metricas">
            {dashboardMetrics.map((metric) => (
              <MetricCard key={metric.id} title={metric.title} value={metric.value} />
            ))}
          </div>

          <div className="erp-dashboard-charts">
            <article className="panel erp-chart-panel">
              <div className="panel-title">
                <h3>Ventas por zona</h3>
                <p className="muted">Ranking comercial del mes actual.</p>
              </div>
              <ChartBars items={salesByZone.slice(0, 6)} />
            </article>

            <article className="panel erp-chart-panel">
              <div className="panel-title">
                <h3>Ventas mes (tendencia diaria)</h3>
                <p className="muted">Curva de avance diario en CLP.</p>
              </div>
              <ChartLine points={salesByDay} />
            </article>

            <article className="panel erp-chart-panel">
              <div className="panel-title">
                <h3>Top productos</h3>
                <p className="muted">Productos con mayor venta acumulada.</p>
              </div>
              <ChartBars items={topProducts} />
            </article>

            <article className="panel erp-chart-panel">
              <div className="panel-title">
                <h3>Ventas por cliente (top 5)</h3>
                <p className="muted">Clientes con mayor aporte total.</p>
              </div>
              <ChartBars items={topClients} />
            </article>

            <article className="panel erp-chart-panel">
              <div className="panel-title">
                <h3>Ventas por cliente (bottom 5)</h3>
                <p className="muted">Clientes con menor venta acumulada.</p>
              </div>
              <ChartBars items={bottomClients} />
            </article>
          </div>
        </div>
      ) : null}

      {tab === 'clientes' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddClient}>
            <div className="panel-title">
              <h3>Alta de cliente</h3>
              <p className="muted">Registro completo con datos comerciales y contacto.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Nombre cliente</span>
                <input value={clientForm.name} onChange={updateClientField('name')} />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select value={clientForm.type} onChange={updateClientField('type')}>
                  {CLIENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Estado</span>
                <select value={clientForm.status} onChange={updateClientField('status')}>
                  {CLIENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>RUT</span>
                <input value={clientForm.rut} onChange={updateClientField('rut')} />
              </label>
              <label className="field">
                <span>Contacto</span>
                <input value={clientForm.contact} onChange={updateClientField('contact')} />
              </label>
              <label className="field">
                <span>Telefono</span>
                <input value={clientForm.phone} onChange={updateClientField('phone')} />
              </label>
              <label className="field">
                <span>WhatsApp</span>
                <input value={clientForm.whatsapp} onChange={updateClientField('whatsapp')} />
              </label>
              <label className="field field-wide">
                <span>Email</span>
                <input value={clientForm.email} onChange={updateClientField('email')} />
              </label>
              <label className="field field-wide">
                <span>Instagram</span>
                <input value={clientForm.instagram} onChange={updateClientField('instagram')} placeholder="@cuenta" />
              </label>
              <label className="field field-wide">
                <span>Direccion</span>
                <input value={clientForm.address} onChange={updateClientField('address')} />
              </label>
              <label className="field">
                <span>Zona</span>
                <input value={clientForm.zone} onChange={updateClientField('zone')} />
              </label>
              <label className="field">
                <span>Sector</span>
                <input value={clientForm.sector} onChange={updateClientField('sector')} />
              </label>
              <label className="field">
                <span>Frecuencia visita</span>
                <select value={clientForm.frequency} onChange={updateClientField('frequency')}>
                  {VISIT_FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Credito habilitado</span>
                <select value={clientForm.creditEnabled} onChange={updateClientField('creditEnabled')}>
                  <option value="true">Si</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="field">
                <span>Deuda actual</span>
                <input type="number" min="0" step="1" value={clientForm.debt} onChange={updateClientField('debt')} />
              </label>
              <label className="field">
                <span>Meta mensual</span>
                <input type="number" min="0" step="1" value={clientForm.monthlyTarget} onChange={updateClientField('monthlyTarget')} />
              </label>
              <label className="field">
                <span>Ventas acumuladas</span>
                <input type="number" min="0" step="1" value={clientForm.accumulatedSales} onChange={updateClientField('accumulatedSales')} />
              </label>
              <label className="field">
                <span>Progreso meta (0-1)</span>
                <input type="number" min="0" max="1" step="0.01" value={clientForm.goalProgress} onChange={updateClientField('goalProgress')} />
              </label>
              <label className="field">
                <span>Limite credito</span>
                <input type="number" min="0" step="1" value={clientForm.creditLimit} onChange={updateClientField('creditLimit')} />
              </label>
              <label className="field field-wide">
                <span>Notas</span>
                <textarea rows="3" value={clientForm.notes} onChange={updateClientField('notes')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar cliente
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Tabla completa de clientes</h3>
              <p className="muted">Vista ERP integral de cartera, deuda y estado comercial.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table erp-wide-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Zona</th>
                    <th>Sector</th>
                    <th>Contacto</th>
                    <th>Telefono</th>
                    <th>Deuda</th>
                    <th>Meta</th>
                    <th>Acumulado</th>
                    <th>Progreso</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.id}</td>
                      <td>
                        <strong>{client.name}</strong>
                        <div className="muted">{client.rut || '-'}</div>
                      </td>
                      <td>{client.type || '-'}</td>
                      <td>{client.zone || '-'}</td>
                      <td>{client.sector || '-'}</td>
                      <td>{client.contact || '-'}</td>
                      <td>{client.phone || '-'}</td>
                      <td>{formatCurrency(client.debt || 0)}</td>
                      <td>{formatCurrency(client.monthlyTarget || 0)}</td>
                      <td>{formatCurrency(client.accumulatedSales || 0)}</td>
                      <td>{formatPercent(client.goalProgress || 0)}</td>
                      <td>{client.status || 'Activo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'rutas' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddRoute}>
            <div className="panel-title">
              <h3>Registro de ruta</h3>
              <p className="muted">Carga salidas de terreno con efectividad y costo operacional.</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={routeForm.date} onChange={updateRouteField('date')} />
              </label>
              <label className="field">
                <span>Vendedor</span>
                <select value={routeForm.seller} onChange={updateRouteField('seller')}>
                  {ROUTE_SELLERS.map((seller) => (
                    <option key={seller} value={seller}>
                      {seller}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Zona</span>
                <input value={routeForm.zone} onChange={updateRouteField('zone')} />
              </label>
              <label className="field">
                <span>Sector</span>
                <input value={routeForm.sector} onChange={updateRouteField('sector')} />
              </label>
              <label className="field">
                <span>Clientes visitados</span>
                <input type="number" min="0" step="1" value={routeForm.visitedClients} onChange={updateRouteField('visitedClients')} />
              </label>
              <label className="field">
                <span>Clientes con pedido</span>
                <input type="number" min="0" step="1" value={routeForm.clientsWithOrder} onChange={updateRouteField('clientsWithOrder')} />
              </label>
              <label className="field">
                <span>Ventas ruta</span>
                <input type="number" min="0" step="1" value={routeForm.sales} onChange={updateRouteField('sales')} />
              </label>
              <label className="field">
                <span>Km ruta</span>
                <input type="number" min="0" step="1" value={routeForm.kmRoute} onChange={updateRouteField('kmRoute')} />
              </label>
              <label className="field">
                <span>Costo combustible</span>
                <input type="number" min="0" step="1" value={routeForm.fuel} onChange={updateRouteField('fuel')} />
              </label>
              <label className="field field-wide">
                <span>Observacion</span>
                <textarea rows="3" value={routeForm.observation} onChange={updateRouteField('observation')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar ruta
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Rutas comerciales</h3>
              <p className="muted">Historico de efectividad y desplazamiento.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Zona</th>
                    <th>Sector</th>
                    <th>Vendedor</th>
                    <th>Visitados</th>
                    <th>Con pedido</th>
                    <th>Efectividad</th>
                    <th>Ventas</th>
                    <th>Km</th>
                    <th>Combustible</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id}>
                      <td>{route.date || '-'}</td>
                      <td>{route.zone || '-'}</td>
                      <td>{route.sector || '-'}</td>
                      <td>{route.seller || '-'}</td>
                      <td>{formatInteger(route.visitedClients || 0)}</td>
                      <td>{formatInteger(route.clientsWithOrder || 0)}</td>
                      <td>{formatPercent(route.effectivenessPct || 0)}</td>
                      <td>{formatCurrency(route.sales || 0)}</td>
                      <td>{formatInteger(route.kmRoute || 0)}</td>
                      <td>{formatCurrency(route.fuel || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'escalas' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddScale}>
            <div className="panel-title">
              <h3>Nueva escala de ventas</h3>
              <p className="muted">Estructura editable utilizada en ventas por volumen.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Nombre escala</span>
                <input value={scaleForm.label} onChange={updateScaleField('label')} />
              </label>
              <label className="field">
                <span>Cantidad minima</span>
                <input type="number" min="1" step="1" value={scaleForm.minQuantity} onChange={updateScaleField('minQuantity')} />
              </label>
              <label className="field">
                <span>Cantidad maxima</span>
                <input type="number" min="1" step="1" value={scaleForm.maxQuantity} onChange={updateScaleField('maxQuantity')} />
              </label>
              <label className="field">
                <span>Descuento (0-0.95)</span>
                <input type="number" min="0" max="0.95" step="0.01" value={scaleForm.discountRate} onChange={updateScaleField('discountRate')} />
              </label>
              <label className="field field-wide">
                <span>Objetivo comercial</span>
                <input value={scaleForm.objective} onChange={updateScaleField('objective')} />
              </label>
              <label className="field field-wide">
                <span>Comentario</span>
                <textarea rows="3" value={scaleForm.comment} onChange={updateScaleField('comment')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Agregar escala
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Escalas editables</h3>
              <p className="muted">Cualquier cambio impacta el modulo de Ventas automaticamente.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Escala</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Desc.</th>
                    <th>Objetivo</th>
                    <th>Comentario</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {scales.map((scale) => (
                    <tr key={scale.id}>
                      <td>
                        <input value={scale.label || ''} onChange={(event) => handleScaleInlineChange(scale.id, 'label', event.target.value)} />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={scale.minQuantity ?? 1}
                          onChange={(event) => handleScaleInlineChange(scale.id, 'minQuantity', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={scale.maxQuantity ?? 1}
                          onChange={(event) => handleScaleInlineChange(scale.id, 'maxQuantity', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="0.95"
                          step="0.01"
                          value={scale.discountRate ?? 0}
                          onChange={(event) => handleScaleInlineChange(scale.id, 'discountRate', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          value={scale.objective || ''}
                          onChange={(event) => handleScaleInlineChange(scale.id, 'objective', event.target.value)}
                        />
                      </td>
                      <td>
                        <input value={scale.comment || ''} onChange={(event) => handleScaleInlineChange(scale.id, 'comment', event.target.value)} />
                      </td>
                      <td>
                        <button className="icon-button" type="button" onClick={() => handleDeleteScale(scale.id)} aria-label={`Eliminar escala ${scale.label || scale.id}`}>
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'compras' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddPurchase}>
            <div className="panel-title">
              <h3>Registro de compra</h3>
              <p className="muted">Ingreso de costos y recepcion desde proveedores.</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={purchaseForm.date} onChange={updatePurchaseField('date')} />
              </label>
              <label className="field">
                <span>Proveedor</span>
                <input value={purchaseForm.supplier} onChange={updatePurchaseField('supplier')} />
              </label>
              <label className="field">
                <span>Orden compra</span>
                <input value={purchaseForm.purchaseOrder} onChange={updatePurchaseField('purchaseOrder')} />
              </label>
              <label className="field">
                <span>SKU</span>
                <input value={purchaseForm.sku} onChange={updatePurchaseField('sku')} />
              </label>
              <label className="field field-wide">
                <span>Producto</span>
                <input value={purchaseForm.product} onChange={updatePurchaseField('product')} />
              </label>
              <label className="field">
                <span>Cantidad</span>
                <input type="number" min="1" step="1" value={purchaseForm.quantity} onChange={updatePurchaseField('quantity')} />
              </label>
              <label className="field">
                <span>Costo unitario</span>
                <input type="number" min="0" step="1" value={purchaseForm.unitCost} onChange={updatePurchaseField('unitCost')} />
              </label>
              <label className="field">
                <span>Transporte unidad</span>
                <input type="number" min="0" step="1" value={purchaseForm.transportUnit} onChange={updatePurchaseField('transportUnit')} />
              </label>
              <label className="field">
                <span>Recepcion</span>
                <select value={purchaseForm.reception} onChange={updatePurchaseField('reception')}>
                  {RECEPTION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Documento</span>
                <input value={purchaseForm.doc} onChange={updatePurchaseField('doc')} />
              </label>
              <label className="field field-wide">
                <span>Observacion</span>
                <textarea rows="3" value={purchaseForm.observation} onChange={updatePurchaseField('observation')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar compra
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Libro de compras</h3>
              <p className="muted">Control de costo final, estado de recepcion y documentos.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table erp-wide-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>OC</th>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Costo unit.</th>
                    <th>Transporte</th>
                    <th>Costo total</th>
                    <th>Recepcion</th>
                    <th>Doc</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.date || '-'}</td>
                      <td>{purchase.supplier || '-'}</td>
                      <td>{purchase.purchaseOrder || '-'}</td>
                      <td>{purchase.sku || '-'}</td>
                      <td>{purchase.product || '-'}</td>
                      <td>{formatInteger(purchase.quantity || 0)}</td>
                      <td>{formatCurrency(purchase.unitCost || 0)}</td>
                      <td>{formatCurrency(purchase.transportUnit || 0)}</td>
                      <td>{formatCurrency(purchase.totalCost || 0)}</td>
                      <td>{purchase.reception || '-'}</td>
                      <td>{purchase.doc || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'productos' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddProduct}>
            <div className="panel-title">
              <h3>Alta de producto completo</h3>
              <p className="muted">SKU, costos, margen, stock y estado operativo.</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>SKU</span>
                <input value={productForm.sku} onChange={updateProductField('sku')} />
              </label>
              <label className="field">
                <span>Codigo barra</span>
                <input value={productForm.barcode} onChange={updateProductField('barcode')} />
              </label>
              <label className="field">
                <span>Categoria</span>
                <input value={productForm.category} onChange={updateProductField('category')} />
              </label>
              <label className="field field-wide">
                <span>Nombre producto</span>
                <input value={productForm.product} onChange={updateProductField('product')} />
              </label>
              <label className="field">
                <span>Marca</span>
                <input value={productForm.brand} onChange={updateProductField('brand')} />
              </label>
              <label className="field">
                <span>Unidad</span>
                <input value={productForm.unit} onChange={updateProductField('unit')} />
              </label>
              <label className="field">
                <span>Costo compra</span>
                <input type="number" min="0" step="1" value={productForm.purchaseCost} onChange={updateProductField('purchaseCost')} />
              </label>
              <label className="field">
                <span>Transporte unidad</span>
                <input type="number" min="0" step="1" value={productForm.transportUnit} onChange={updateProductField('transportUnit')} />
              </label>
              <label className="field">
                <span>Precio venta base</span>
                <input type="number" min="0" step="1" value={productForm.salePriceBase} onChange={updateProductField('salePriceBase')} />
              </label>
              <label className="field">
                <span>Stock actual</span>
                <input type="number" min="0" step="1" value={productForm.stock} onChange={updateProductField('stock')} />
              </label>
              <label className="field">
                <span>Stock minimo</span>
                <input type="number" min="0" step="1" value={productForm.stockMin} onChange={updateProductField('stockMin')} />
              </label>
              <label className="field">
                <span>Ubicacion</span>
                <input value={productForm.location} onChange={updateProductField('location')} />
              </label>
              <label className="field">
                <span>Estado</span>
                <select value={productForm.status} onChange={updateProductField('status')}>
                  {PRODUCT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar producto
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Maestro de productos</h3>
              <p className="muted">Edicion rapida de stock, precio y estado.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table erp-wide-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Stock</th>
                    <th>Min</th>
                    <th>Costo final</th>
                    <th>Precio</th>
                    <th>Utilidad</th>
                    <th>Margen</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productsFull.map((product) => (
                    <tr key={product.sku}>
                      <td>{product.sku}</td>
                      <td>
                        <strong>{product.product}</strong>
                        <div className="muted">{product.brand || '-'}</div>
                      </td>
                      <td>{product.category || '-'}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={product.stock ?? 0}
                          onChange={(event) => handleProductInlineChange(product.sku, 'stock', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={product.stockMin ?? 0}
                          onChange={(event) => handleProductInlineChange(product.sku, 'stockMin', event.target.value)}
                        />
                      </td>
                      <td>{formatCurrency(product.finalCost || 0)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={product.salePriceBase ?? 0}
                          onChange={(event) => handleProductInlineChange(product.sku, 'salePriceBase', event.target.value)}
                        />
                      </td>
                      <td>{formatCurrency(product.unitProfit || 0)}</td>
                      <td>{formatPercent(product.marginPct || 0)}</td>
                      <td>
                        <select value={product.status || 'Activo'} onChange={(event) => handleProductInlineChange(product.sku, 'status', event.target.value)}>
                          {PRODUCT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'ventas' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddSale}>
            <div className="panel-title">
              <h3>Registro de venta ERP</h3>
              <p className="muted">Carga lineas comerciales para analitica y margenes.</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={saleForm.date} onChange={updateSaleField('date')} />
              </label>
              <label className="field">
                <span>Cliente</span>
                <input value={saleForm.client} onChange={updateSaleField('client')} />
              </label>
              <label className="field">
                <span>Zona</span>
                <input value={saleForm.zone} onChange={updateSaleField('zone')} />
              </label>
              <label className="field">
                <span>Sector</span>
                <input value={saleForm.sector} onChange={updateSaleField('sector')} />
              </label>
              <label className="field">
                <span>Vendedor</span>
                <select value={saleForm.seller} onChange={updateSaleField('seller')}>
                  {ROUTE_SELLERS.map((seller) => (
                    <option key={seller} value={seller}>
                      {seller}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Codigo pedido</span>
                <input value={saleForm.orderCode} onChange={updateSaleField('orderCode')} placeholder="PED-1001" />
              </label>
              <label className="field field-wide">
                <span>Producto</span>
                <input value={saleForm.product} onChange={updateSaleField('product')} />
              </label>
              <label className="field">
                <span>Venta</span>
                <input type="number" min="0" step="1" value={saleForm.sale} onChange={updateSaleField('sale')} />
              </label>
              <label className="field">
                <span>Costo</span>
                <input type="number" min="0" step="1" value={saleForm.cost} onChange={updateSaleField('cost')} />
              </label>
              <label className="field">
                <span>Metodo pago</span>
                <select value={saleForm.paymentMethod} onChange={updateSaleField('paymentMethod')}>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Estado despacho</span>
                <select value={saleForm.dispatchStatus} onChange={updateSaleField('dispatchStatus')}>
                  {DISPATCH_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar venta
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Libro de ventas</h3>
              <p className="muted">Seguimiento de margen, utilidad y estado logistica.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table erp-wide-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Zona</th>
                    <th>Pedido</th>
                    <th>Producto</th>
                    <th>Venta</th>
                    <th>Costo</th>
                    <th>Utilidad</th>
                    <th>Margen</th>
                    <th>Pago</th>
                    <th>Despacho</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date || '-'}</td>
                      <td>{row.client || '-'}</td>
                      <td>{row.zone || '-'}</td>
                      <td>{row.orderCode || '-'}</td>
                      <td>{row.product || '-'}</td>
                      <td>{formatCurrency(row.sale || 0)}</td>
                      <td>{formatCurrency(row.cost || 0)}</td>
                      <td>{formatCurrency(row.profit || 0)}</td>
                      <td>{formatPercent(row.marginPct || 0)}</td>
                      <td>{row.paymentMethod || '-'}</td>
                      <td>{row.dispatchStatus || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'proveedores' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddSupplier}>
            <div className="panel-title">
              <h3>Alta de proveedor</h3>
              <p className="muted">Gestion de contactos y disponibilidad de abastecimiento.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Nombre proveedor</span>
                <input value={supplierForm.name} onChange={updateSupplierField('name')} />
              </label>
              <label className="field">
                <span>Contacto</span>
                <input value={supplierForm.contact} onChange={updateSupplierField('contact')} />
              </label>
              <label className="field">
                <span>Telefono</span>
                <input value={supplierForm.phone} onChange={updateSupplierField('phone')} />
              </label>
              <label className="field field-wide">
                <span>Email</span>
                <input value={supplierForm.email} onChange={updateSupplierField('email')} />
              </label>
              <label className="field">
                <span>Estado</span>
                <select value={supplierForm.status} onChange={updateSupplierField('status')}>
                  {SUPPLIER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-wide">
                <span>Notas</span>
                <textarea rows="3" value={supplierForm.notes} onChange={updateSupplierField('notes')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar proveedor
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Maestro de proveedores</h3>
              <p className="muted">Referencia de proveedores activos y contactos directos.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Contacto</th>
                    <th>Telefono</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>{supplier.name || '-'}</td>
                      <td>{supplier.contact || '-'}</td>
                      <td>{supplier.phone || '-'}</td>
                      <td>{supplier.email || '-'}</td>
                      <td>{supplier.status || '-'}</td>
                      <td>{supplier.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ERPView;

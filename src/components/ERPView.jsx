import { useEffect, useMemo, useState } from 'react';
import { clientsService } from '../services/clients.service';
import { routesService } from '../services/routes.service';
import { volumeScalesService } from '../services/volume-scales.service';
import { salesService } from '../services/sales.service';
import { productsService } from '../services/products.service';
import { purchasesService } from '../services/purchases.service';
import { suppliersService } from '../services/suppliers.service';
import { cityRatesService } from '../services/city-rates.service';
import {
  normalizeEmail,
  normalizePhone,
  normalizeRut,
  normalizeText,
  normalizeTextKey,
  validateEmail,
  validatePhone,
  validateRutDetailed,
} from '../lib/normalization';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'rutas', label: 'Rutas' },
  { id: 'escalas', label: 'Escalas de ventas' },
  { id: 'compras', label: 'Compras' },
  { id: 'productos', label: 'Productos' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'tarifas-ciudad', label: 'Tarifas por ciudad' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'promociones', label: 'Promociones' },
  { id: 'datos-thorena', label: 'Datos Thorena' },
];

const CLIENT_TYPES = [
  'Negocio fijo',
  'Mayorista',
  'Minorista',
  'Distribuidor',
  'Cafeteria',
  'Restaurant',
  'Camping',
  'Cabanas',
  'Hotel/Hostal',
  'Food Truck',
  'Minimarket',
  'Provisiones',
  'Panaderia',
  'Pasteleria',
  'Botilleria',
];
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
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const formatCurrency = (value) => currencyFormatter.format(Math.round(Math.max(0, asNumber(value, 0))));
const formatPercent = (value) => percentFormatter.format(clamp(asNumber(value, 0), 0, 1));
const formatInteger = (value) => integerFormatter.format(Math.round(Math.max(0, asNumber(value, 0))));

const emptyClientForm = {
  businessName: '',
  nickname: '',
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
  supplierId: '',
  purchaseOrder: '',
  productSku: '',
  quantity: '1',
  unitCost: '0',
  transportUnit: '0',
  reception: 'Recibido',
  doc: '',
  observation: '',
};

const emptyProductForm = {
  supplierId: '',
  createSupplier: 'false',
  newSupplierName: '',
  newSupplierContact: '',
  newSupplierPhone: '',
  newSupplierEmail: '',
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
  initialPurchaseQuantity: '1',
  initialPurchaseUnitCost: '0',
  initialPurchaseTransportUnit: '0',
  initialPurchaseOrder: '',
  initialPurchaseDoc: '',
  initialPurchaseReception: 'Recibido',
  initialPurchaseObservation: '',
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

const emptyCityRateForm = {
  city: '',
  rate: '0',
};

const emptyCompanyForm = {
  name: '',
  address: '',
  rut: '',
  phone: '',
  email: '',
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
  products,
  setProducts,
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
  cityRates,
  setCityRates,
  promotions,
  onSavePromotions,
  companyInfo,
  onSaveCompanyInfo,
}) {
  const [tab, setTab] = useState('dashboard');
  const [feedback, setFeedback] = useState(null);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [scaleForm, setScaleForm] = useState(emptyScaleForm);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [cityRateForm, setCityRateForm] = useState(emptyCityRateForm);
  const [promoForm, setPromoForm] = useState({ name: '', price: '0', status: 'Activo', components: [{ productId: '', quantity: '1' }] });
  const [companyForm, setCompanyForm] = useState(() => ({ ...emptyCompanyForm, ...(companyInfo || {}) }));
  const [editModal, setEditModal] = useState(null);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    setCompanyForm({ ...emptyCompanyForm, ...(companyInfo || {}) });
  }, [companyInfo]);

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

  const suppliersById = useMemo(() => {
    const map = new Map();
    suppliers.forEach((supplier) => {
      map.set(String(supplier.id), supplier);
    });
    return map;
  }, [suppliers]);

  const supplierIdByName = useMemo(() => {
    const map = new Map();
    suppliers.forEach((supplier) => {
      const key = String(supplier.name || '').trim().toLowerCase();
      if (key) map.set(key, String(supplier.id));
    });
    return map;
  }, [suppliers]);

  const purchaseSupplierBySku = useMemo(() => {
    const map = new Map();
    purchases.forEach((purchase) => {
      const sku = String(purchase.productSku || purchase.sku || '').trim();
      if (!sku) return;
      const byId = String(purchase.supplierId || '').trim();
      if (byId) {
        map.set(sku, byId);
        return;
      }
      const byName = supplierIdByName.get(String(purchase.supplier || '').trim().toLowerCase());
      if (byName) map.set(sku, byName);
    });
    return map;
  }, [purchases, supplierIdByName]);

  const getEffectiveSupplierId = (product) => {
    const direct = String(product?.supplierId || '').trim();
    if (direct) return direct;
    const fromPurchase = purchaseSupplierBySku.get(String(product?.sku || '').trim());
    if (fromPurchase) return fromPurchase;
    const fromName = supplierIdByName.get(String(product?.supplier || product?.brand || '').trim().toLowerCase());
    return fromName || '';
  };

  const productsBySupplier = useMemo(() => {
    const map = new Map();
    productsFull.forEach((product) => {
      const supplierId = getEffectiveSupplierId(product);
      if (!supplierId) return;
      if (!map.has(supplierId)) map.set(supplierId, []);
      map.get(supplierId).push(product);
    });
    return map;
  }, [productsFull, purchaseSupplierBySku, supplierIdByName]);

  const purchaseProductsForSupplier = useMemo(() => {
    const supplierId = String(purchaseForm.supplierId || '');
    if (!supplierId) return [];
    return productsBySupplier.get(supplierId) || [];
  }, [productsBySupplier, purchaseForm.supplierId]);

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

  const updateCityRateField = (key) => (event) => {
    setCityRateForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updateCompanyField = (key) => (event) => {
    setCompanyForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handlePurchaseSupplierChange = (event) => {
    const supplierId = event.target.value;
    setPurchaseForm((current) => ({ ...current, supplierId, productSku: '' }));
    setFeedback(null);
  };

  const handleAddClient = async (event) => {
    event.preventDefault();

    const businessName = normalizeText(clientForm.businessName);
    const nickname = normalizeText(clientForm.nickname);
    if (!businessName || !nickname) {
      setFeedback({ type: 'error', text: 'Debes ingresar razon social y apodo del local.' });
      return;
    }

    const rut = normalizeRut(clientForm.rut);
    const phone = normalizePhone(clientForm.phone);
    const whatsapp = normalizePhone(clientForm.whatsapp);
    const email = normalizeEmail(clientForm.email);

    const rutCheck = validateRutDetailed(rut);
    if (!rutCheck.valid) {
      setFeedback({ type: 'error', text: rutCheck.reason === 'format' ? 'Formato de RUT invalido. Usa 12345678-5.' : 'RUT invalido: digito verificador incorrecto.' });
      return;
    }
    if (!validatePhone(phone)) {
      setFeedback({ type: 'error', text: 'Telefono invalido. Usa formato +56912345678.' });
      return;
    }
    if (!validatePhone(whatsapp)) {
      setFeedback({ type: 'error', text: 'WhatsApp invalido. Usa formato +56912345678.' });
      return;
    }
    if (!validateEmail(email)) {
      setFeedback({ type: 'error', text: 'Correo invalido. Ejemplo: nombre@dominio.cl' });
      return;
    }

    const duplicatedRut = rut && clients.some((item) => normalizeTextKey(item.rut) === normalizeTextKey(rut));
    if (duplicatedRut) {
      setFeedback({ type: 'error', text: 'Ya existe un cliente con ese RUT.' });
      return;
    }

    const nowId = Date.now();
    const clientId = `CLI-${String(nowId).slice(-6)}`;
    const newClient = {
      id: clientId,
      code: clientId,
      name: nickname,
      businessName,
      nickname,
      type: normalizeText(clientForm.type),
      rut,
      phone,
      contact: normalizeText(clientForm.contact),
      email,
      address: normalizeText(clientForm.address),
      sector: normalizeText(clientForm.sector),
      zone: normalizeText(clientForm.zone),
      frequency: clientForm.frequency,
      creditEnabled: clientForm.creditEnabled === 'true',
      debt: 0,
      monthlyTarget: Math.max(0, Math.round(asNumber(clientForm.monthlyTarget, 0))),
      accumulatedSales: 0,
      goalProgress: clamp(asNumber(clientForm.goalProgress, 0), 0, 1),
      creditLimit: Math.max(0, Math.round(asNumber(clientForm.creditLimit, 0))),
      status: clientForm.status,
      notes: normalizeText(clientForm.notes),
      observations: normalizeText(clientForm.notes),
      whatsapp,
      instagram: normalizeText(clientForm.instagram),
      lastPurchase: '',
    };

    const result = await clientsService.create(newClient);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar cliente en base de datos: ${result.error.message}` });
      return;
    }

    setClients((current) => [result.data || newClient, ...current]);
    setClientForm(emptyClientForm);
    setFeedback({ type: 'success', text: 'Cliente agregado al ERP.' });
  };

  const handleAddRoute = async (event) => {
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

    const result = await routesService.create(newRoute);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar ruta en base de datos: ${result.error.message}` });
      return;
    }

    setRoutes((current) => [result.data || newRoute, ...current]);
    setRouteForm(emptyRouteForm);
    setFeedback({ type: 'success', text: 'Ruta agregada correctamente.' });
  };

  const handleAddScale = async (event) => {
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

    const result = await volumeScalesService.create(newScale);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar escala en base de datos: ${result.error.message}` });
      return;
    }

    setScales((current) => [...current, result.data || newScale].sort((a, b) => a.minQuantity - b.minQuantity));
    setScaleForm(emptyScaleForm);
    setFeedback({ type: 'success', text: 'Escala agregada correctamente.' });
  };

  const handleScaleInlineChange = (id, key, value) => {
    const backendValue = key === 'minQuantity' || key === 'maxQuantity'
      ? Math.max(1, Math.round(asNumber(value, 1)))
      : key === 'discountRate'
        ? clamp(asNumber(value, 0), 0, 0.95)
        : value;
    volumeScalesService.update(id, { [key]: backendValue });

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
    volumeScalesService.remove(id);
    setScales((current) => current.filter((item) => item.id !== id));
  };

  const handleDeleteClient = async (id) => {
    const target = clients.find((item) => item.id === id);
    const clientLabel = target?.nickname || target?.name || target?.businessName || id;
    const confirmed = window.confirm(`Eliminar cliente "${clientLabel}"? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    const result = await clientsService.remove(id);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo eliminar cliente: ${result.error.message}` });
      return;
    }
    setClients((current) => current.filter((item) => item.id !== id));
    setFeedback({ type: 'success', text: 'Cliente eliminado correctamente.' });
  };

  const handleAddPurchase = async (event) => {
    event.preventDefault();

    const supplierId = String(purchaseForm.supplierId || '').trim();
    if (!supplierId) {
      setFeedback({ type: 'error', text: 'Debes seleccionar un proveedor.' });
      return;
    }

    const productSku = String(purchaseForm.productSku || '').trim();
    if (!productSku) {
      setFeedback({ type: 'error', text: 'Debes seleccionar un producto.' });
      return;
    }

    const supplier = suppliersById.get(supplierId);
    if (!supplier) {
      setFeedback({ type: 'error', text: 'El proveedor seleccionado no existe.' });
      return;
    }

    const product = productsFull.find((item) => String(item.sku || '') === productSku);
    if (!product) {
      setFeedback({ type: 'error', text: 'El producto seleccionado no existe.' });
      return;
    }

    if (getEffectiveSupplierId(product) !== supplierId) {
      setFeedback({ type: 'error', text: 'El producto no pertenece al proveedor seleccionado.' });
      return;
    }

    const quantity = Math.max(1, Math.round(asNumber(purchaseForm.quantity, 1)));
    const unitCost = Math.max(0, Math.round(asNumber(purchaseForm.unitCost, 0)));
    const transportUnit = Math.max(0, Math.round(asNumber(purchaseForm.transportUnit, 0)));
    const totalCost = quantity * (unitCost + transportUnit);

    const newPurchase = {
      id: `comp-${Date.now()}`,
      date: purchaseForm.date || todayISO(),
      supplierId,
      supplier: supplier.name,
      purchaseOrder: purchaseForm.purchaseOrder.trim(),
      productSku,
      sku: product.sku,
      product: product.product,
      quantity,
      unitCost,
      transportUnit,
      totalCost,
      reception: purchaseForm.reception,
      doc: purchaseForm.doc.trim(),
      observation: purchaseForm.observation.trim(),
    };

    const purchaseResult = await purchasesService.create({
      supplierId: purchaseForm.supplierId,
      supplierName: supplier.name,
      date: newPurchase.date,
      purchaseOrder: newPurchase.purchaseOrder,
      reception: newPurchase.reception,
      doc: newPurchase.doc,
      observation: newPurchase.observation,
      items: [
        {
          productSku: product.sku,
          quantity,
          unitCost,
          transportUnit,
        },
      ],
    });

    if (!purchaseResult.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar compra en base de datos: ${purchaseResult.error.message}` });
      return;
    }

    setProductsFull((current) =>
      current.map((item) => {
        if (item.sku !== productSku) return item;
        return { ...item, stock: Math.max(0, Math.round(asNumber(item.stock, 0))) + quantity };
      }),
    );
    setProducts((current) => {
      const exists = current.some((item) => String(item.id || '') === productSku);
      if (!exists) {
        return [
          {
            id: productSku,
            sku: productSku,
            name: product.product || productSku,
            category: product.category || 'General',
            stock: quantity,
            stockMin: Math.max(0, Math.round(asNumber(product.stockMin, 0))),
            basePrice: Math.max(0, Math.round(asNumber(product.salePriceBase, 0))),
            offer: { mode: 'none', discountPercent: 0, endDate: '' },
          },
          ...current,
        ];
      }

      return current.map((item) => {
        if (String(item.id || '') !== productSku) return item;
        return { ...item, stock: Math.max(0, Math.round(asNumber(item.stock, 0))) + quantity };
      });
    });
    setPurchases((current) => [newPurchase, ...current]);
    setPurchaseForm(emptyPurchaseForm);
    setFeedback({ type: 'success', text: 'Compra registrada.' });
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();

    const productName = normalizeText(productForm.product);
    const sku = normalizeText(productForm.sku);
    if (!productName || !sku) {
      setFeedback({ type: 'error', text: 'Debes completar SKU y nombre de producto.' });
      return;
    }

    const skuAlreadyExists = productsFull.some((item) => String(item.sku || '').trim().toLowerCase() === sku.toLowerCase());
    if (skuAlreadyExists) {
      setFeedback({ type: 'error', text: 'El SKU ya existe. Usa un SKU unico.' });
      return;
    }

    const shouldCreateSupplier = productForm.createSupplier === 'true';
    const selectedSupplierId = String(productForm.supplierId || '').trim();
    let supplierId = selectedSupplierId;
    let supplierName = suppliersById.get(selectedSupplierId)?.name || '';

    if (shouldCreateSupplier) {
      const newSupplierName = normalizeText(productForm.newSupplierName);
      if (!newSupplierName) {
        setFeedback({ type: 'error', text: 'Debes ingresar el nombre del nuevo proveedor.' });
        return;
      }

      const duplicatedSupplier = suppliers.find((item) => normalizeTextKey(item.name) === normalizeTextKey(newSupplierName));
      if (duplicatedSupplier) {
        supplierId = String(duplicatedSupplier.id);
        supplierName = duplicatedSupplier.name;
      } else {
        supplierId = `prov-${Date.now()}`;
        supplierName = newSupplierName;
      }
    }

    if (!supplierId) {
      setFeedback({ type: 'error', text: 'Debes seleccionar un proveedor o crear uno nuevo.' });
      return;
    }

    const newSupplierPhone = normalizePhone(productForm.newSupplierPhone);
    const newSupplierEmail = normalizeEmail(productForm.newSupplierEmail);
    if (!validatePhone(newSupplierPhone)) {
      setFeedback({ type: 'error', text: 'Telefono de proveedor invalido. Usa formato +56912345678.' });
      return;
    }
    if (!validateEmail(newSupplierEmail)) {
      setFeedback({ type: 'error', text: 'Correo de proveedor invalido. Ejemplo: contacto@proveedor.cl' });
      return;
    }

    const initialPurchaseQuantity = Math.max(0, Math.round(asNumber(productForm.initialPurchaseQuantity, 0)));
    if (initialPurchaseQuantity < 1) {
      setFeedback({ type: 'error', text: 'Debes ingresar una cantidad inicial valida mayor a 0.' });
      return;
    }

    const purchaseCost = Math.max(0, Math.round(asNumber(productForm.purchaseCost, 0)));
    const transportUnit = Math.max(0, Math.round(asNumber(productForm.transportUnit, 0)));
    const finalCost = purchaseCost + transportUnit;
    const salePriceBase = Math.max(0, Math.round(asNumber(productForm.salePriceBase, 0)));
    const unitProfit = Math.max(0, salePriceBase - finalCost);
    const marginPct = salePriceBase > 0 ? unitProfit / salePriceBase : 0;

    if (salePriceBase < finalCost) {
      setFeedback({ type: 'error', text: 'El precio minimo/base de venta no puede ser menor al costo real unitario.' });
      return;
    }

    const supplierIdForBackend = uuidRegex.test(supplierId) ? supplierId : undefined;
    const fallbackSupplier = suppliers.find((item) => String(item.id) === supplierId);

    const backendPayload = {
      sku,
      name: productName,
      category: normalizeTextKey(productForm.category) || 'general',
      unit: normalizeText(productForm.unit) || 'Unidad',
      basePrice: salePriceBase,
      stockMin: Math.max(0, Math.round(asNumber(productForm.stockMin, 0))),
      status: productForm.status,
      supplierId: shouldCreateSupplier ? undefined : supplierIdForBackend,
      newSupplier: shouldCreateSupplier
        ? {
            name: normalizeText(supplierName),
            contact: normalizeText(productForm.newSupplierContact),
            phone: newSupplierPhone,
            email: newSupplierEmail,
          }
        : !supplierIdForBackend
          ? {
              name: normalizeText(supplierName),
              contact: normalizeText(fallbackSupplier?.contact || ''),
              phone: normalizePhone(fallbackSupplier?.phone || ''),
              email: normalizeEmail(fallbackSupplier?.email || ''),
            }
          : undefined,
      barcode: normalizeText(productForm.barcode),
      brand: normalizeText(productForm.brand),
      purchaseCost,
      transportUnit,
      location: normalizeText(productForm.location),
      initialPurchase: {
        quantity: initialPurchaseQuantity,
        unitCost: purchaseCost,
        transportUnit,
        purchaseOrder: normalizeText(productForm.initialPurchaseOrder),
        doc: normalizeText(productForm.initialPurchaseDoc),
        reception: productForm.initialPurchaseReception,
        observation: normalizeText(productForm.initialPurchaseObservation),
      },
    };

    const backendResult = await productsService.createWithInitialPurchase(backendPayload);
    if (!backendResult.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar en base de datos: ${backendResult.error.message}` });
      return;
    }

    const persistedSupplierId = backendResult.data?.payload?.supplierId || supplierId;

    if (shouldCreateSupplier && !suppliers.some((item) => String(item.id) === String(persistedSupplierId))) {
      const newSupplier = {
        id: persistedSupplierId,
        name: supplierName,
        contact: normalizeText(productForm.newSupplierContact),
        phone: newSupplierPhone,
        email: newSupplierEmail,
        status: 'Activo',
        notes: '',
      };
      setSuppliers((current) => [newSupplier, ...current]);
    }

    const newProduct = {
      id: sku,
      sku,
      barcode: normalizeText(productForm.barcode),
      category: normalizeTextKey(productForm.category) || 'general',
      product: productName,
      brand: normalizeText(productForm.brand),
      supplierId: persistedSupplierId,
      supplier: supplierName,
      unit: normalizeText(productForm.unit) || 'Unidad',
      purchaseCost,
      transportUnit,
      finalCost,
      iva: 0.19,
      salePriceBase,
      stock: initialPurchaseQuantity,
      stockMin: Math.max(0, Math.round(asNumber(productForm.stockMin, 0))),
      marginPct,
      unitProfit,
      location: normalizeText(productForm.location),
      status: productForm.status,
    };

    const initialPurchaseUnitCost = purchaseCost;
    const initialPurchaseTransportUnit = transportUnit;
    const initialPurchase = {
      id: `comp-${Date.now()}`,
      date: todayISO(),
      supplierId: persistedSupplierId,
      supplier: supplierName,
      purchaseOrder: normalizeText(productForm.initialPurchaseOrder),
      productSku: sku,
      sku,
      product: productName,
      quantity: initialPurchaseQuantity,
      unitCost: initialPurchaseUnitCost,
      transportUnit: initialPurchaseTransportUnit,
      totalCost: initialPurchaseQuantity * (initialPurchaseUnitCost + initialPurchaseTransportUnit),
      reception: productForm.initialPurchaseReception,
      doc: normalizeText(productForm.initialPurchaseDoc),
      observation: normalizeText(productForm.initialPurchaseObservation),
    };

    setProductsFull((current) => [newProduct, ...current]);
    setProducts((current) => {
      const existing = current.find((item) => String(item.id || '') === sku);
      const nextItem = {
        id: sku,
        sku,
        name: productName,
        category: newProduct.category,
        stock: newProduct.stock,
        stockMin: newProduct.stockMin,
        basePrice: newProduct.salePriceBase,
        offer: existing?.offer || { mode: 'none', discountPercent: 0, endDate: '' },
      };
      return [nextItem, ...current.filter((item) => String(item.id || '') !== sku)];
    });
    setPurchases((current) => [initialPurchase, ...current]);
    setProductForm(emptyProductForm);
    setFeedback({ type: 'success', text: 'Producto y compra inicial registrados en ERP.' });
  };

  const handleProductInlineChange = (sku, key, value) => {
    const backendValue = ['stock', 'stockMin', 'salePriceBase', 'purchaseCost', 'transportUnit'].includes(key)
      ? Math.max(0, Math.round(asNumber(value, 0)))
      : key === 'name' || key === 'category' || key === 'barcode' || key === 'brand' || key === 'unit' || key === 'location'
        ? normalizeText(value)
        : value;
    productsService.update(sku, { [key]: backendValue });

    setProductsFull((current) =>
      current.map((item) => {
        if (item.sku !== sku) return item;

        if (key === 'stock' || key === 'stockMin') {
          return { ...item, [key]: Math.max(0, Math.round(asNumber(value, 0))) };
        }

        if (key === 'salePriceBase' || key === 'purchaseCost' || key === 'transportUnit') {
          const salePriceBase = Math.max(0, Math.round(asNumber(value, 0)));
          const nextSalePrice = key === 'salePriceBase' ? salePriceBase : Math.max(0, Math.round(asNumber(item.salePriceBase, 0)));
          const nextPurchaseCost = key === 'purchaseCost' ? Math.max(0, Math.round(asNumber(value, 0))) : Math.max(0, Math.round(asNumber(item.purchaseCost, 0)));
          const nextTransportUnit = key === 'transportUnit' ? Math.max(0, Math.round(asNumber(value, 0))) : Math.max(0, Math.round(asNumber(item.transportUnit, 0)));
          const finalCost = nextPurchaseCost + nextTransportUnit;
          const unitProfit = Math.max(0, nextSalePrice - finalCost);
          const marginPct = nextSalePrice > 0 ? unitProfit / nextSalePrice : 0;
          return {
            ...item,
            salePriceBase: nextSalePrice,
            purchaseCost: nextPurchaseCost,
            transportUnit: nextTransportUnit,
            finalCost,
            unitProfit,
            marginPct,
          };
        }

        if (key === 'status') {
          return { ...item, status: value };
        }

        if (key === 'name') {
          return { ...item, name: normalizeText(value), product: normalizeText(value) };
        }

        if (['category', 'barcode', 'brand', 'unit', 'location', 'supplierId'].includes(key)) {
          return { ...item, [key]: value };
        }

        return item;
      }),
    );

    setProducts((current) =>
      current.map((item) => {
        if (String(item.id || '') !== sku) return item;

        if (key === 'stock' || key === 'stockMin') {
          return { ...item, [key]: Math.max(0, Math.round(asNumber(value, 0))) };
        }

        if (key === 'salePriceBase') {
          return { ...item, basePrice: Math.max(0, Math.round(asNumber(value, 0))) };
        }

        if (key === 'name') {
          return { ...item, name: normalizeText(value) };
        }

        if (key === 'category') {
          return { ...item, category: normalizeText(value) };
        }

        if (key === 'status') {
          return { ...item, status: value };
        }

        if (key === 'barcode' || key === 'brand' || key === 'unit' || key === 'location' || key === 'supplierId') {
          return { ...item, [key]: value };
        }

        if (key === 'purchaseCost' || key === 'transportUnit') {
          return { ...item, [key]: Math.max(0, Math.round(asNumber(value, 0))) };
        }

        return item;
      }),
    );
  };

  const handleDeleteProduct = async (sku) => {
    const target = productsFull.find((item) => String(item.sku || '') === String(sku));
    const productName = target?.product || target?.name || sku;
    const confirmed = window.confirm(`Eliminar producto "${productName}"? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    const result = await productsService.remove(sku);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo eliminar producto: ${result.error.message}` });
      return;
    }

    setProductsFull((current) => current.filter((item) => String(item.sku || '') !== String(sku)));
    setProducts((current) => current.filter((item) => String(item.id || item.sku || '') !== String(sku)));
    setPurchases((current) =>
      current.map((purchase) => {
        const purchaseSku = String(purchase.productSku || purchase.sku || '');
        if (purchaseSku !== String(sku)) return purchase;
        return { ...purchase, product: '[Producto Eliminado]' };
      }),
    );
    setFeedback({ type: 'success', text: 'Producto eliminado correctamente.' });
  };

  const handleClientInlineChange = (id, key, value) => {
    if (key === 'rut') {
      const rut = normalizeRut(value);
      const rutCheck = validateRutDetailed(rut);
      if (!rutCheck.valid) {
        setFeedback({ type: 'error', text: rutCheck.reason === 'format' ? 'Formato de RUT invalido. Usa 12345678-5.' : 'RUT invalido: digito verificador incorrecto.' });
        return;
      }
      const duplicatedRut = rut && clients.some((item) => item.id !== id && normalizeTextKey(item.rut) === normalizeTextKey(rut));
      if (duplicatedRut) {
        setFeedback({ type: 'error', text: 'Ya existe un cliente con ese RUT.' });
        return;
      }
      value = rut;
    }

    if (key === 'phone' || key === 'whatsapp') {
      const phone = normalizePhone(value);
      if (!validatePhone(phone)) {
        setFeedback({ type: 'error', text: 'Telefono invalido. Usa formato +56912345678.' });
        return;
      }
      value = phone;
    }

    if (key === 'email') {
      const email = normalizeEmail(value);
      if (!validateEmail(email)) {
        setFeedback({ type: 'error', text: 'Correo invalido. Ejemplo: nombre@dominio.cl' });
        return;
      }
      value = email;
    }

    const backendValue = ['debt', 'monthlyTarget', 'accumulatedSales', 'creditLimit'].includes(key)
      ? Math.max(0, Math.round(asNumber(value, 0)))
      : key === 'goalProgress'
        ? clamp(asNumber(value, 0), 0, 1)
        : key === 'creditEnabled'
          ? value === 'true'
          : value;
    if (key === 'nickname') {
      clientsService.update(id, { nickname: normalizeText(value), name: normalizeText(value) });
    } else {
      clientsService.update(id, { [key]: backendValue });
    }

    setClients((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        if (['debt', 'monthlyTarget', 'accumulatedSales', 'creditLimit'].includes(key)) {
          return { ...item, [key]: Math.max(0, Math.round(asNumber(value, 0))) };
        }

        if (key === 'goalProgress') {
          return { ...item, goalProgress: clamp(asNumber(value, 0), 0, 1) };
        }

        if (key === 'creditEnabled') {
          return { ...item, creditEnabled: value === 'true' };
        }

        if (key === 'nickname') {
          const nickname = normalizeText(value);
          return { ...item, nickname, name: nickname };
        }

        if (key === 'businessName') {
          return { ...item, businessName: normalizeText(value) };
        }

        return { ...item, [key]: value };
      }),
    );
  };

  const handleRouteInlineChange = (id, key, value) => {
    const numericFields = ['visitedClients', 'clientsWithOrder', 'sales', 'kmRoute', 'fuel'];
    routesService.update(id, { [key]: numericFields.includes(key) ? Math.max(0, Math.round(asNumber(value, 0))) : value });

    setRoutes((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        const next = numericFields.includes(key)
          ? { ...item, [key]: Math.max(0, Math.round(asNumber(value, 0))) }
          : { ...item, [key]: value };

        const visitedClients = Math.max(0, Math.round(asNumber(next.visitedClients, 0)));
        const clientsWithOrder = Math.max(0, Math.round(asNumber(next.clientsWithOrder, 0)));
        return {
          ...next,
          effectivenessPct: visitedClients > 0 ? clamp(clientsWithOrder / visitedClients, 0, 1) : 0,
        };
      }),
    );
  };

  const handlePurchaseInlineChange = (id, key, value) => {
    const currentPurchase = purchases.find((item) => item.id === id);
    if (!currentPurchase) return;

    const backendValue = key === 'quantity' || key === 'unitCost' || key === 'transportUnit'
      ? Math.max(key === 'quantity' ? 1 : 0, Math.round(asNumber(value, key === 'quantity' ? 1 : 0)))
      : value;
    purchasesService.update(id, { [key]: backendValue });

    if (key === 'quantity') {
      const previousQuantity = Math.max(0, Math.round(asNumber(currentPurchase.quantity, 0)));
      const nextQuantity = Math.max(1, Math.round(asNumber(value, 1)));
      const delta = nextQuantity - previousQuantity;
      const sku = String(currentPurchase.productSku || currentPurchase.sku || '');

      if (delta !== 0 && sku) {
        setProductsFull((current) =>
          current.map((product) => {
            if (product.sku !== sku) return product;
            return { ...product, stock: Math.max(0, Math.round(asNumber(product.stock, 0)) + delta) };
          }),
        );
        setProducts((current) =>
          current.map((product) => {
            if (String(product.id || '') !== sku) return product;
            return { ...product, stock: Math.max(0, Math.round(asNumber(product.stock, 0)) + delta) };
          }),
        );
      }
    }

    setPurchases((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        if (key === 'supplierId') {
          const supplierId = String(value || '');
          const supplier = suppliersById.get(supplierId);
          return {
            ...item,
            supplierId,
            supplier: supplier?.name || item.supplier,
          };
        }

        if (key === 'quantity' || key === 'unitCost' || key === 'transportUnit') {
          const quantity = key === 'quantity' ? Math.max(1, Math.round(asNumber(value, 1))) : Math.max(1, Math.round(asNumber(item.quantity, 1)));
          const unitCost = key === 'unitCost' ? Math.max(0, Math.round(asNumber(value, 0))) : Math.max(0, Math.round(asNumber(item.unitCost, 0)));
          const transportUnit = key === 'transportUnit' ? Math.max(0, Math.round(asNumber(value, 0))) : Math.max(0, Math.round(asNumber(item.transportUnit, 0)));
          return {
            ...item,
            quantity,
            unitCost,
            transportUnit,
            totalCost: quantity * (unitCost + transportUnit),
          };
        }

        return { ...item, [key]: value };
      }),
    );
  };

  const handleSaleInlineChange = (id, key, value) => {
    const backendValue = key === 'sale' || key === 'cost' ? Math.max(0, Math.round(asNumber(value, 0))) : value;
    salesService.update(id, { [key]: backendValue });

    setSales((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        if (key === 'sale' || key === 'cost') {
          const sale = key === 'sale' ? Math.max(0, Math.round(asNumber(value, 0))) : Math.max(0, Math.round(asNumber(item.sale, 0)));
          const cost = key === 'cost' ? Math.max(0, Math.round(asNumber(value, 0))) : Math.max(0, Math.round(asNumber(item.cost, 0)));
          const profit = Math.max(0, sale - cost);
          return { ...item, sale, cost, profit, marginPct: sale > 0 ? profit / sale : 0 };
        }

        return { ...item, [key]: value };
      }),
    );
  };

  const handleDeletePurchase = async (id) => {
    const target = purchases.find((item) => item.id === id);
    const purchaseLabel = target?.purchaseOrder || target?.product || id;
    const confirmed = window.confirm(`Eliminar compra "${purchaseLabel}"?`);
    if (!confirmed) return;

    const result = await purchasesService.remove(id);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo eliminar compra: ${result.error.message}` });
      return;
    }

    const sku = String(target?.productSku || target?.sku || '');
    const quantity = Math.max(0, Math.round(asNumber(target?.quantity, 0)));

    setPurchases((current) => current.filter((item) => item.id !== id));
    if (sku && quantity > 0) {
      setProductsFull((current) => current.map((item) => (String(item.sku || '') === sku ? { ...item, stock: Math.max(0, asNumber(item.stock, 0) - quantity) } : item)));
      setProducts((current) => current.map((item) => (String(item.id || item.sku || '') === sku ? { ...item, stock: Math.max(0, asNumber(item.stock, 0) - quantity) } : item)));
    }
    setFeedback({ type: 'success', text: 'Compra eliminada correctamente.' });
  };

  const handleDeleteSale = async (id) => {
    const target = sales.find((item) => item.id === id);
    const saleLabel = target?.orderCode || target?.product || id;
    const confirmed = window.confirm(`Eliminar venta "${saleLabel}"?`);
    if (!confirmed) return;

    const result = await salesService.remove(id);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo eliminar venta: ${result.error.message}` });
      return;
    }
    setSales((current) => current.filter((item) => item.id !== id));
    setFeedback({ type: 'success', text: 'Venta eliminada correctamente.' });
  };

  const handleSupplierInlineChange = (id, key, value) => {
    if (key === 'phone') {
      const phone = normalizePhone(value);
      if (!validatePhone(phone)) {
        setFeedback({ type: 'error', text: 'Telefono invalido. Usa formato +56912345678.' });
        return;
      }
      value = phone;
    }

    if (key === 'email') {
      const email = normalizeEmail(value);
      if (!validateEmail(email)) {
        setFeedback({ type: 'error', text: 'Correo invalido. Ejemplo: contacto@proveedor.cl' });
        return;
      }
      value = email;
    }

    suppliersService.update(id, { [key]: value });
    setSuppliers((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const handleAddSale = async (event) => {
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

    const result = await salesService.create(newSale);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar venta en base de datos: ${result.error.message}` });
      return;
    }

    setSales((current) => [result.data || newSale, ...current]);
    setSaleForm(emptySaleForm);
    setFeedback({ type: 'success', text: 'Venta registrada en ERP.' });
  };

  const handleAddCityRate = async (event) => {
    event.preventDefault();

    const city = cityRateForm.city.trim();
    if (!city) {
      setFeedback({ type: 'error', text: 'Debes ingresar una ciudad.' });
      return;
    }

    const ratePercent = clamp(asNumber(cityRateForm.rate, 0), 0, 95);
    const rate = ratePercent / 100;
    const normalizedKey = city.toLowerCase();

    const result = await cityRatesService.create({ city, rate });
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar tarifa en base de datos: ${result.error.message}` });
      return;
    }

    const savedRate = result.data || { id: `city-${Date.now()}`, city, rate };
    setCityRates((current) => {
      const existing = current.find((item) => String(item.city || '').trim().toLowerCase() === normalizedKey);

      if (existing) {
        return current.map((item) => (item.id === existing.id ? savedRate : item));
      }

      return [...current, savedRate];
    });

    setCityRateForm(emptyCityRateForm);
    setFeedback({ type: 'success', text: 'Tarifa por ciudad guardada.' });
  };

  const handleCityRateInlineChange = (id, key, value) => {
    cityRatesService.update(id, { [key]: key === 'rate' ? clamp(asNumber(value, 0), 0, 95) / 100 : value });

    setCityRates((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (key === 'rate') {
          return { ...item, rate: clamp(asNumber(value, 0), 0, 95) / 100 };
        }
        return { ...item, city: value };
      }),
    );
  };

  const handleDeleteCityRate = (id) => {
    cityRatesService.remove(id);
    setCityRates((current) => current.filter((item) => item.id !== id));
  };

  const handleSaveCompanyInfo = async (event) => {
    event.preventDefault();

    const payload = {
      name: normalizeText(companyForm.name),
      address: normalizeText(companyForm.address),
      rut: normalizeRut(companyForm.rut),
      phone: normalizePhone(companyForm.phone),
      email: normalizeEmail(companyForm.email),
    };

    if (!payload.name) {
      setFeedback({ type: 'error', text: 'Debes ingresar el nombre comercial de Thorena.' });
      return;
    }

    const rutCheck = validateRutDetailed(payload.rut);
    if (!rutCheck.valid) {
      setFeedback({ type: 'error', text: rutCheck.reason === 'format' ? 'Formato de RUT invalido. Usa 12345678-5.' : 'RUT invalido: digito verificador incorrecto.' });
      return;
    }
    if (!validatePhone(payload.phone)) {
      setFeedback({ type: 'error', text: 'Telefono invalido. Usa formato +56912345678.' });
      return;
    }
    if (!validateEmail(payload.email)) {
      setFeedback({ type: 'error', text: 'Correo invalido. Ejemplo: contacto@thorena.cl' });
      return;
    }

    if (!onSaveCompanyInfo) {
      setFeedback({ type: 'error', text: 'No se pudo guardar datos de Thorena.' });
      return;
    }

    const result = await onSaveCompanyInfo(payload);
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar datos de Thorena: ${result.error.message}` });
      return;
    }

    setFeedback({ type: 'success', text: 'Datos Thorena actualizados para cotizaciones.' });
  };

  const updatePromoField = (key) => (event) => {
    setPromoForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const updatePromoComponent = (index, key) => (event) => {
    const value = event.target.value;
    setPromoForm((current) => ({
      ...current,
      components: current.components.map((component, componentIndex) => (componentIndex === index ? { ...component, [key]: value } : component)),
    }));
  };

  const addPromoComponentRow = () => {
    setPromoForm((current) => ({ ...current, components: [...current.components, { productId: '', quantity: '1' }] }));
  };

  const removePromoComponentRow = (index) => {
    setPromoForm((current) => ({ ...current, components: current.components.filter((_, componentIndex) => componentIndex !== index) }));
  };

  const handleAddPromotion = async (event) => {
    event.preventDefault();
    const name = normalizeText(promoForm.name);
    const price = Math.max(0, Math.round(asNumber(promoForm.price, 0)));
    const components = promoForm.components
      .map((item) => ({ productId: item.productId, quantity: Math.max(1, Math.round(asNumber(item.quantity, 1))) }))
      .filter((item) => item.productId);

    if (!name) {
      setFeedback({ type: 'error', text: 'Debes ingresar nombre de promocion.' });
      return;
    }
    if (!components.length) {
      setFeedback({ type: 'error', text: 'Agrega al menos un producto en la promocion.' });
      return;
    }

    const nextPromotions = [
      {
        id: `promo-${Date.now()}`,
        name,
        price,
        status: promoForm.status || 'Activo',
        components,
      },
      ...(promotions || []),
    ];

    const result = onSavePromotions ? await onSavePromotions(nextPromotions) : { success: false, error: { message: 'No disponible' } };
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar promocion: ${result.error.message}` });
      return;
    }
    setPromoForm({ name: '', price: '0', status: 'Activo', components: [{ productId: '', quantity: '1' }] });
    setFeedback({ type: 'success', text: 'Promocion guardada.' });
  };

  const handleDeletePromotion = async (id) => {
    const nextPromotions = (promotions || []).filter((item) => item.id !== id);
    const result = onSavePromotions ? await onSavePromotions(nextPromotions) : { success: false, error: { message: 'No disponible' } };
    if (!result.success) {
      setFeedback({ type: 'error', text: `No se pudo eliminar promocion: ${result.error.message}` });
      return;
    }
    setFeedback({ type: 'success', text: 'Promocion eliminada.' });
  };

  const openEditModal = (entity, id, draft) => {
    setEditError('');
    setEditModal({ entity, id, draft });
  };
  const closeEditModal = () => {
    setEditError('');
    setEditModal(null);
  };
  const updateEditDraft = (key) => (event) => {
    const value = event.target.value;
    setEditError('');
    setEditModal((current) => (current ? { ...current, draft: { ...current.draft, [key]: value } } : current));
  };

  const handleSaveEdit = () => {
    if (!editModal) return;
    const { entity, id } = editModal;
    const draft = { ...(editModal.draft || {}) };

    if (entity === 'client') {
      draft.rut = normalizeRut(draft.rut || '');
      draft.phone = normalizePhone(draft.phone || '');
      draft.email = normalizeEmail(draft.email || '');
      const rutCheck = validateRutDetailed(draft.rut);
      if (!rutCheck.valid) {
        setEditError(rutCheck.reason === 'format' ? 'Formato de RUT invalido. Usa 12345678-5.' : 'RUT invalido: digito verificador incorrecto.');
        return;
      }
      if (!validatePhone(draft.phone)) {
        setEditError('Telefono invalido. Usa formato +56912345678.');
        return;
      }
      if (!validateEmail(draft.email)) {
        setEditError('Correo invalido. Ejemplo: nombre@dominio.cl');
        return;
      }
      const duplicatedRut = draft.rut && clients.some((item) => item.id !== id && normalizeTextKey(item.rut) === normalizeTextKey(draft.rut));
      if (duplicatedRut) {
        setEditError('Ya existe un cliente con ese RUT.');
        return;
      }
    }

    if (entity === 'supplier') {
      draft.phone = normalizePhone(draft.phone || '');
      draft.email = normalizeEmail(draft.email || '');
      if (!validatePhone(draft.phone)) {
        setEditError('Telefono invalido. Usa formato +56912345678.');
        return;
      }
      if (!validateEmail(draft.email)) {
        setEditError('Correo invalido. Ejemplo: contacto@proveedor.cl');
        return;
      }
    }

    const entries = Object.entries(draft);

    if (entity === 'client') entries.forEach(([key, value]) => handleClientInlineChange(id, key, value));
    if (entity === 'route') entries.forEach(([key, value]) => handleRouteInlineChange(id, key, value));
    if (entity === 'scale') entries.forEach(([key, value]) => handleScaleInlineChange(id, key, value));
    if (entity === 'purchase') entries.forEach(([key, value]) => handlePurchaseInlineChange(id, key, value));
    if (entity === 'product') entries.forEach(([key, value]) => handleProductInlineChange(id, key, value));
    if (entity === 'sale') entries.forEach(([key, value]) => handleSaleInlineChange(id, key, value));
    if (entity === 'supplier') entries.forEach(([key, value]) => handleSupplierInlineChange(id, key, value));
    if (entity === 'cityRate') entries.forEach(([key, value]) => handleCityRateInlineChange(id, key, value));

    closeEditModal();
  };

  const topProducts = salesByProduct.slice(0, 5);
  const topClients = salesByClient.slice(0, 5);
  const bottomClients = [...salesByClient].reverse().slice(0, 5).reverse();
  const suppliersWithRelations = suppliers.map((supplier) => {
    const supplierId = String(supplier.id || '');
    const supplierProducts = productsBySupplier.get(supplierId) || [];
    const supplierPurchases = purchases.filter((purchase) => String(purchase.supplierId || '') === supplierId);
    return {
      ...supplier,
      productsCount: supplierProducts.length,
      purchasesCount: supplierPurchases.length,
      productNames: supplierProducts.map((product) => product.product).filter(Boolean),
    };
  });
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
                <span>Razon Social del local</span>
                <input value={clientForm.businessName} onChange={updateClientField('businessName')} placeholder="Ej: Comercial Don Pedro SpA" />
              </label>
              <label className="field field-wide">
                <span>Apodo del local</span>
                <input value={clientForm.nickname} onChange={updateClientField('nickname')} placeholder="Ej: Almacen Don Pedro" />
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
                <input value={clientForm.rut} onChange={updateClientField('rut')} placeholder="Ej: 76.123.456-7" />
              </label>
              <label className="field">
                <span>Contacto</span>
                <input value={clientForm.contact} onChange={updateClientField('contact')} placeholder="Ej: Pedro Munoz" />
              </label>
              <label className="field">
                <span>Telefono</span>
                <input value={clientForm.phone} onChange={updateClientField('phone')} placeholder="Ej: +56912345678" />
              </label>
              <label className="field">
                <span>WhatsApp</span>
                <input value={clientForm.whatsapp} onChange={updateClientField('whatsapp')} placeholder="Ej: +56912345678" />
              </label>
              <label className="field field-wide">
                <span>Email</span>
                <input value={clientForm.email} onChange={updateClientField('email')} placeholder="Ej: compras@cliente.cl" />
              </label>
              <label className="field field-wide">
                <span>Instagram</span>
                <input value={clientForm.instagram} onChange={updateClientField('instagram')} placeholder="@cuenta" />
              </label>
              <label className="field field-wide">
                <span>Direccion</span>
                <input value={clientForm.address} onChange={updateClientField('address')} placeholder="Ej: Pedro de Valdivia 402" />
              </label>
              <label className="field">
                <span>Zona</span>
                <input value={clientForm.zone} onChange={updateClientField('zone')} placeholder="Ej: Villarrica" />
              </label>
              <label className="field">
                <span>Sector</span>
                <input value={clientForm.sector} onChange={updateClientField('sector')} placeholder="Ej: Segunda Faja" />
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
                <span>Meta mensual</span>
                <input type="number" min="0" step="1" value={clientForm.monthlyTarget} onChange={updateClientField('monthlyTarget')} placeholder="Ej: 350000" />
              </label>
              <label className="field">
                <span>Limite credito</span>
                <input type="number" min="0" step="1" value={clientForm.creditLimit} onChange={updateClientField('creditLimit')} placeholder="Ej: 120000" />
              </label>
              <label className="field field-wide">
                <span>Notas</span>
                <textarea rows="3" value={clientForm.notes} onChange={updateClientField('notes')} placeholder="Ej: Prefiere entregas martes AM" />
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
              <table className="items-table erp-wide-table erp-table-min-1100">
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
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.id}</td>
                      <td>
                        <strong>{client.businessName || '-'}</strong>
                        <p className="muted">Apodo: {client.nickname || client.name || '-'}</p>
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
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('client', client.id, {
                            businessName: client.businessName || client.name || '', nickname: client.nickname || client.name || '', type: client.type || CLIENT_TYPES[0], status: client.status || 'Activo', rut: client.rut || '',
                            zone: client.zone || '', sector: client.sector || '', contact: client.contact || '', phone: client.phone || '', email: client.email || '', debt: String(client.debt ?? 0),
                            monthlyTarget: String(client.monthlyTarget ?? 0), accumulatedSales: String(client.accumulatedSales ?? 0), goalProgress: String(client.goalProgress ?? 0),
                          })}>
                            Editar
                          </button>
                          <button className="button button-small button-danger" type="button" onClick={() => handleDeleteClient(client.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
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
                <input value={routeForm.zone} onChange={updateRouteField('zone')} placeholder="Ej: Villarrica" />
              </label>
              <label className="field">
                <span>Sector</span>
                <input value={routeForm.sector} onChange={updateRouteField('sector')} placeholder="Ej: Segunda Faja" />
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
                <textarea rows="3" value={routeForm.observation} onChange={updateRouteField('observation')} placeholder="Ej: Ruta con trafico alto" />
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
              <table className="items-table erp-table-min-1100">
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
                    <th className="table-actions-col">Acciones</th>
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
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('route', route.id, {
                            date: route.date || '', zone: route.zone || '', sector: route.sector || '', seller: route.seller || ROUTE_SELLERS[0],
                            visitedClients: String(route.visitedClients ?? 0), clientsWithOrder: String(route.clientsWithOrder ?? 0), sales: String(route.sales ?? 0),
                            kmRoute: String(route.kmRoute ?? 0), fuel: String(route.fuel ?? 0), observation: route.observation || '',
                          })}>
                            Editar
                          </button>
                        </div>
                      </td>
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
                <input value={scaleForm.label} onChange={updateScaleField('label')} placeholder="Ej: Mayorista base" />
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
                <input value={scaleForm.objective} onChange={updateScaleField('objective')} placeholder="Ej: Activar recompra" />
              </label>
              <label className="field field-wide">
                <span>Comentario</span>
                <textarea rows="3" value={scaleForm.comment} onChange={updateScaleField('comment')} placeholder="Ej: Pedido mixto" />
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
              <table className="items-table erp-table-min-900">
                <thead>
                  <tr>
                    <th>Escala</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Desc.</th>
                    <th>Objetivo</th>
                    <th>Comentario</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {scales.map((scale) => (
                    <tr key={scale.id}>
                      <td>{scale.label || '-'}</td>
                      <td>{formatInteger(scale.minQuantity || 0)}</td>
                      <td>{formatInteger(scale.maxQuantity || 0)}</td>
                      <td>{formatPercent(scale.discountRate || 0)}</td>
                      <td>{scale.objective || '-'}</td>
                      <td>{scale.comment || '-'}</td>
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('scale', scale.id, {
                            label: scale.label || '', minQuantity: String(scale.minQuantity ?? 1), maxQuantity: String(scale.maxQuantity ?? 1),
                            discountRate: String(scale.discountRate ?? 0), objective: scale.objective || '', comment: scale.comment || '',
                          })}>
                            Editar
                          </button>
                          <button className="button button-small button-danger" type="button" onClick={() => handleDeleteScale(scale.id)} aria-label={`Eliminar escala ${scale.label || scale.id}`}>
                            Eliminar
                          </button>
                        </div>
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
                <select value={purchaseForm.supplierId} onChange={handlePurchaseSupplierChange} required>
                  <option value="">Selecciona proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Orden compra</span>
                <input value={purchaseForm.purchaseOrder} onChange={updatePurchaseField('purchaseOrder')} placeholder="Ej: OC-2026-001" />
              </label>
              <label className="field">
                <span>SKU</span>
                <input value={purchaseForm.productSku} readOnly placeholder="Se completa al elegir producto" />
              </label>
              <label className="field field-wide">
                <span>Producto</span>
                <select
                  value={purchaseForm.productSku}
                  onChange={updatePurchaseField('productSku')}
                  disabled={!purchaseForm.supplierId}
                  required
                >
                  <option value="">Selecciona producto</option>
                  {purchaseProductsForSupplier.map((product) => (
                    <option key={product.sku} value={product.sku}>
                      {product.product} ({product.sku})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Cantidad</span>
                <input type="number" min="1" step="1" value={purchaseForm.quantity} onChange={updatePurchaseField('quantity')} required />
              </label>
              <label className="field">
                <span>Costo unitario</span>
                <input type="number" min="0" step="1" value={purchaseForm.unitCost} onChange={updatePurchaseField('unitCost')} placeholder="Ej: 1850" required />
              </label>
              <label className="field">
                <span>Transporte unidad</span>
                <input type="number" min="0" step="1" value={purchaseForm.transportUnit} onChange={updatePurchaseField('transportUnit')} placeholder="Ej: 120" />
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
                <input value={purchaseForm.doc} onChange={updatePurchaseField('doc')} placeholder="Ej: G-1004" />
              </label>
              <label className="field field-wide">
                <span>Observacion</span>
                <textarea rows="3" value={purchaseForm.observation} onChange={updatePurchaseField('observation')} placeholder="Ej: Recepcion completa" />
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
              <table className="items-table erp-wide-table erp-table-min-1100">
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
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.date || '-'}</td>
                      <td>{purchase.supplier || '-'}</td>
                      <td>{purchase.purchaseOrder || '-'}</td>
                      <td>{purchase.sku || '-'}</td>
                      <td>{purchase.product || '[Producto Eliminado]'}</td>
                      <td>{formatInteger(purchase.quantity || 0)}</td>
                      <td>{formatCurrency(purchase.unitCost || 0)}</td>
                      <td>{formatCurrency(purchase.transportUnit || 0)}</td>
                      <td>{formatCurrency(purchase.totalCost || 0)}</td>
                      <td>{purchase.reception || 'Recibido'}</td>
                      <td>{purchase.doc || '-'}</td>
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('purchase', purchase.id, {
                            date: purchase.date || '', supplierId: purchase.supplierId || '', purchaseOrder: purchase.purchaseOrder || '', quantity: String(purchase.quantity ?? 1),
                            unitCost: String(purchase.unitCost ?? 0), transportUnit: String(purchase.transportUnit ?? 0), reception: purchase.reception || 'Recibido', doc: purchase.doc || '',
                            observation: purchase.observation || '',
                          })}>
                            Editar
                          </button>
                          <button className="button button-small button-danger" type="button" onClick={() => handleDeletePurchase(purchase.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
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
              <h3>Agregar productos nuevos</h3>
              <p className="muted">SKU, costos, margen, stock y estado operativo.</p>
            </div>

            <div className="erp-form-section">
              <div className="erp-form-section-title">1. Proveedor</div>
              <div className="form-grid">
              <label className="field">
                <span>Proveedor</span>
                <select value={productForm.createSupplier} onChange={updateProductField('createSupplier')}>
                  <option value="false">Usar proveedor existente</option>
                  <option value="true">Crear proveedor nuevo</option>
                </select>
              </label>
              {productForm.createSupplier === 'true' ? (
                <>
                  <label className="field field-wide">
                    <span>Nombre proveedor nuevo</span>
                    <input value={productForm.newSupplierName} onChange={updateProductField('newSupplierName')} placeholder="Ej: Proveedor Bebidas" required />
                  </label>
                  <label className="field">
                    <span>Contacto proveedor</span>
                    <input value={productForm.newSupplierContact} onChange={updateProductField('newSupplierContact')} placeholder="Ej: Camila Soto" />
                  </label>
                  <label className="field">
                    <span>Telefono proveedor</span>
                    <input value={productForm.newSupplierPhone} onChange={updateProductField('newSupplierPhone')} placeholder="Ej: +56998765432" />
                  </label>
                  <label className="field field-wide">
                    <span>Email proveedor</span>
                    <input value={productForm.newSupplierEmail} onChange={updateProductField('newSupplierEmail')} placeholder="Ej: contacto@proveedor.cl" />
                  </label>
                </>
              ) : (
                <label className="field field-wide">
                  <span>Proveedor existente</span>
                  <select value={productForm.supplierId} onChange={updateProductField('supplierId')} required>
                    <option value="">Selecciona proveedor</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              </div>
            </div>

            <div className="erp-form-section">
              <div className="erp-form-section-title">2. Datos del producto</div>
              <div className="form-grid">
              <label className="field">
                <span>SKU</span>
                <input value={productForm.sku} onChange={updateProductField('sku')} placeholder="Ej: THO-BEB-001" required />
              </label>
              <label className="field">
                <span>Codigo barra</span>
                <input value={productForm.barcode} onChange={updateProductField('barcode')} placeholder="Ej: 7801234567890" />
              </label>
              <label className="field">
                <span>Categoria</span>
                <input value={productForm.category} onChange={updateProductField('category')} placeholder="Ej: Bebidas" />
              </label>
              <label className="field field-wide">
                <span>Nombre producto</span>
                <input value={productForm.product} onChange={updateProductField('product')} placeholder="Ej: Energetica Score 735 ml" required />
              </label>
              <label className="field">
                <span>Marca</span>
                <input value={productForm.brand} onChange={updateProductField('brand')} placeholder="Ej: Score" />
              </label>
              <label className="field">
                <span>Unidad</span>
                <input value={productForm.unit} onChange={updateProductField('unit')} placeholder="Ej: Unidad" />
              </label>
              <label className="field">
                <span>Costo unitario de compra</span>
                <input type="number" min="0" step="1" value={productForm.purchaseCost} onChange={updateProductField('purchaseCost')} />
              </label>
              <label className="field">
                <span>Transporte por unidad</span>
                <input type="number" min="0" step="1" value={productForm.transportUnit} onChange={updateProductField('transportUnit')} />
              </label>
              <label className="field">
                <span>Precio minimo/base de venta</span>
                <input type="number" min="0" step="1" value={productForm.salePriceBase} onChange={updateProductField('salePriceBase')} />
              </label>
              <label className="field">
                <span>Stock minimo</span>
                <input type="number" min="0" step="1" value={productForm.stockMin} onChange={updateProductField('stockMin')} />
              </label>
              <label className="field">
                <span>Ubicacion</span>
                <input value={productForm.location} onChange={updateProductField('location')} placeholder="Ej: Bodega B" />
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
            </div>

            <div className="erp-form-section">
              <div className="erp-form-section-title">3. Compra inicial</div>
              <div className="form-grid">
              <label className="field">
                <span>Cantidad comprada inicialmente</span>
                <input type="number" min="1" step="1" value={productForm.initialPurchaseQuantity} onChange={updateProductField('initialPurchaseQuantity')} required />
              </label>
              <label className="field field-wide">
                <span>Costo real unitario (compra + transporte)</span>
                <input
                  type="text"
                  value={formatCurrency(Math.max(0, Math.round(asNumber(productForm.purchaseCost, 0) + asNumber(productForm.transportUnit, 0))))}
                  readOnly
                />
              </label>
              <label className="field">
                <span>Orden de compra inicial</span>
                <input value={productForm.initialPurchaseOrder} onChange={updateProductField('initialPurchaseOrder')} />
              </label>
              <label className="field">
                <span>Documento inicial</span>
                <input value={productForm.initialPurchaseDoc} onChange={updateProductField('initialPurchaseDoc')} />
              </label>
              <label className="field">
                <span>Recepcion inicial</span>
                <select value={productForm.initialPurchaseReception} onChange={updateProductField('initialPurchaseReception')}>
                  {RECEPTION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-wide">
                <span>Observacion compra inicial</span>
                <textarea rows="3" value={productForm.initialPurchaseObservation} onChange={updateProductField('initialPurchaseObservation')} placeholder="Ej: Recepcion parcial, revisar lote" />
              </label>
            </div>
            </div>

            <button className="button button-primary" type="submit">
              Guardar producto
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Inventario de productos</h3>
              <p className="muted">Edicion rapida de stock, precio y estado.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table erp-wide-table erp-table-min-1100">
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
                    <th className="table-actions-col">Acciones</th>
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
                      <td>{formatInteger(product.stock || 0)}</td>
                      <td>{formatInteger(product.stockMin || 0)}</td>
                      <td>{formatCurrency(product.finalCost || 0)}</td>
                      <td>{formatCurrency(product.salePriceBase || 0)}</td>
                      <td>{formatCurrency(product.unitProfit || 0)}</td>
                      <td>{formatPercent(product.marginPct || 0)}</td>
                      <td>{product.status || 'Activo'}</td>
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('product', product.sku, {
                            name: product.product || product.name || '',
                            category: product.category || '',
                            barcode: product.barcode || '',
                            brand: product.brand || '',
                            unit: product.unit || 'Unidad',
                            supplierId: product.supplierId || '',
                            purchaseCost: String(product.purchaseCost ?? 0),
                            transportUnit: String(product.transportUnit ?? 0),
                            salePriceBase: String(product.salePriceBase ?? 0),
                            stock: String(product.stock ?? 0),
                            stockMin: String(product.stockMin ?? 0),
                            location: product.location || '',
                            status: product.status || 'Activo',
                          })}>
                            Editar
                          </button>
                          <button className="button button-small button-danger" type="button" onClick={() => handleDeleteProduct(product.sku)}>
                            Eliminar
                          </button>
                        </div>
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
                <input value={saleForm.client} onChange={updateSaleField('client')} placeholder="Ej: Cafe Araucania" />
              </label>
              <label className="field">
                <span>Zona</span>
                <input value={saleForm.zone} onChange={updateSaleField('zone')} placeholder="Ej: Pucon" />
              </label>
              <label className="field">
                <span>Sector</span>
                <input value={saleForm.sector} onChange={updateSaleField('sector')} placeholder="Ej: Centro" />
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
                <input value={saleForm.product} onChange={updateSaleField('product')} placeholder="Ej: Agua 1.5 L" />
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
              <table className="items-table erp-wide-table erp-table-min-1100">
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
                    <th className="table-actions-col">Acciones</th>
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
                      <td>{row.paymentMethod || PAYMENT_METHODS[0]}</td>
                      <td>{row.dispatchStatus || DISPATCH_STATUSES[0]}</td>
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('sale', row.id, {
                            date: row.date || '', client: row.client || '', zone: row.zone || '', orderCode: row.orderCode || '', product: row.product || '',
                            sale: String(row.sale ?? 0), cost: String(row.cost ?? 0), paymentMethod: row.paymentMethod || PAYMENT_METHODS[0],
                            dispatchStatus: row.dispatchStatus || DISPATCH_STATUSES[0],
                          })}>
                            Editar
                          </button>
                          <button className="button button-small button-danger" type="button" onClick={() => handleDeleteSale(row.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'proveedores' ? (
        <div className="erp-content-layout erp-content-layout-full">
          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Proveedores</h3>
              <p className="muted">Consulta de proveedores, sus productos y compras relacionadas.</p>
            </div>

            <p className="muted">Los proveedores nuevos se crean desde Productos al registrar producto con compra inicial.</p>

            <div className="table-wrap">
              <table className="items-table erp-wide-table suppliers-table erp-table-min-1100">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Contacto</th>
                    <th>Telefono</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Productos</th>
                    <th>Compras</th>
                    <th>Notas</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliersWithRelations.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>{supplier.name || '-'}</td>
                      <td>{supplier.contact || '-'}</td>
                      <td>{supplier.phone || '-'}</td>
                      <td>{supplier.email || '-'}</td>
                      <td>{supplier.status || 'Activo'}</td>
                      <td>
                        {supplier.productsCount > 0
                          ? `${supplier.productsCount} (${supplier.productNames.slice(0, 2).join(', ')}${supplier.productsCount > 2 ? ', ...' : ''})`
                          : '0'}
                      </td>
                      <td>{supplier.purchasesCount}</td>
                      <td>{supplier.notes || '-'}</td>
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('supplier', supplier.id, {
                            name: supplier.name || '', contact: supplier.contact || '', phone: supplier.phone || '', email: supplier.email || '',
                            status: supplier.status || 'Activo', notes: supplier.notes || '',
                          })}>
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'tarifas-ciudad' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddCityRate}>
            <div className="panel-title">
              <h3>Nueva tarifa de despacho</h3>
              <p className="muted">Define el porcentaje adicional por ciudad para aplicar en ventas.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Ciudad</span>
                <input value={cityRateForm.city} onChange={updateCityRateField('city')} placeholder="Ej: Pucon" />
              </label>
              <label className="field">
                <span>Tarifa (%)</span>
                <input type="number" min="0" max="95" step="0.1" value={cityRateForm.rate} onChange={updateCityRateField('rate')} />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar tarifa
            </button>
          </form>

          <div className="panel erp-list-panel">
            <div className="panel-title">
              <h3>Tarifas por ciudad</h3>
              <p className="muted">Estas tarifas se aplican en terreno, online y oficina.</p>
            </div>

            <div className="table-wrap">
              <table className="items-table erp-table-min-900">
                <thead>
                  <tr>
                    <th>Ciudad</th>
                    <th>Tarifa</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cityRates.map((row) => (
                    <tr key={row.id}>
                      <td>{row.city || '-'}</td>
                      <td>{formatPercent(row.rate || 0)}</td>
                      <td className="table-actions-col">
                        <div className="table-actions">
                          <button className="button button-small button-ghost" type="button" onClick={() => openEditModal('cityRate', row.id, {
                            city: row.city || '', rate: String(Math.round((row.rate ?? 0) * 1000) / 10),
                          })}>
                            Editar
                          </button>
                          <button className="button button-small button-danger" type="button" onClick={() => handleDeleteCityRate(row.id)} aria-label={`Eliminar tarifa ${row.city || row.id}`}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'promociones' ? (
        <div className="erp-content-layout">
          <form className="panel erp-form" onSubmit={handleAddPromotion}>
            <div className="panel-title">
              <h3>Nueva promocion</h3>
              <p className="muted">Arma combos con multiples productos y precio fijo en CLP.</p>
            </div>
            <div className="form-grid">
              <label className="field field-wide"><span>Nombre promo</span><input value={promoForm.name} onChange={updatePromoField('name')} placeholder="Ej: Promo Lena x3" /></label>
              <label className="field"><span>Precio promo (CLP)</span><input type="number" min="0" step="1" value={promoForm.price} onChange={updatePromoField('price')} /></label>
              <label className="field"><span>Estado</span><select value={promoForm.status} onChange={updatePromoField('status')}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
              <div className="field field-wide">
                <span>Componentes</span>
                {promoForm.components.map((component, index) => (
                  <div key={`promo-component-${index}`} className="table-actions" style={{ marginBottom: 8 }}>
                    <select value={component.productId} onChange={updatePromoComponent(index, 'productId')}>
                      <option value="">Selecciona producto</option>
                      {productsFull.map((product) => <option key={product.sku || product.id} value={product.sku || product.id}>{product.product || product.name}</option>)}
                    </select>
                    <input type="number" min="1" step="1" value={component.quantity} onChange={updatePromoComponent(index, 'quantity')} />
                    <button className="button button-small button-danger" type="button" onClick={() => removePromoComponentRow(index)}>Quitar</button>
                  </div>
                ))}
                <button className="button button-small button-ghost" type="button" onClick={addPromoComponentRow}>Agregar producto</button>
              </div>
            </div>
            <button className="button button-primary" type="submit">Guardar promocion</button>
          </form>

          <article className="panel erp-table-panel">
            <div className="panel-title"><h3>Promociones</h3></div>
            <div className="table-wrap">
              <table className="erp-table erp-table-min-900">
                <thead><tr><th>Nombre</th><th>Precio</th><th>Componentes</th><th>Estado</th><th className="table-actions-col">Acciones</th></tr></thead>
                <tbody>
                  {(promotions || []).map((promotion) => (
                    <tr key={promotion.id}>
                      <td>{promotion.name}</td>
                      <td>{formatCurrency(promotion.price || 0)}</td>
                      <td>{(promotion.components || []).map((component) => `${component.quantity}x ${(productsFull.find((product) => String(product.sku || product.id) === String(component.productId))?.product || component.productId)}`).join(', ')}</td>
                      <td>{promotion.status || 'Activo'}</td>
                      <td className="table-actions-col"><div className="table-actions"><button className="button button-small button-danger" type="button" onClick={() => handleDeletePromotion(promotion.id)}>Eliminar</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : null}

      {tab === 'datos-thorena' ? (
        <div className="erp-content-layout erp-content-layout-full">
          <form className="panel erp-form" onSubmit={handleSaveCompanyInfo}>
            <div className="panel-title">
              <h3>Datos Thorena para cotizaciones</h3>
              <p className="muted">Esta informacion se usa en el PDF de cotizacion que se genera desde Ventas.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Nombre comercial</span>
                <input value={companyForm.name} onChange={updateCompanyField('name')} placeholder="Ej: Thorena Comercial" />
              </label>
              <label className="field field-wide">
                <span>Direccion</span>
                <input value={companyForm.address} onChange={updateCompanyField('address')} placeholder="Ej: Calle 123, Villarrica" />
              </label>
              <label className="field">
                <span>RUT (12345678-5)</span>
                <input value={companyForm.rut} onChange={updateCompanyField('rut')} placeholder="12345678-5" />
              </label>
              <label className="field">
                <span>Telefono (+56912345678)</span>
                <input value={companyForm.phone} onChange={updateCompanyField('phone')} placeholder="+56912345678" />
              </label>
              <label className="field field-wide">
                <span>Correo (contacto@thorena.cl)</span>
                <input value={companyForm.email} onChange={updateCompanyField('email')} placeholder="contacto@thorena.cl" />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Guardar datos Thorena
            </button>
          </form>
        </div>
      ) : null}

      {editModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar registro ERP">
          <div className="panel modal-card">
            <div className="panel-title">
              <h3>Editar registro</h3>
              <p className="muted">Actualiza solo el elemento seleccionado.</p>
            </div>

            {editError ? (
              <div className="notice notice-error" role="alert">
                {editError}
              </div>
            ) : null}

            <div className="form-grid">
              {editModal.entity === 'client' ? (
                <>
                  <label className="field"><span>Razon Social</span><input value={editModal.draft.businessName || editModal.draft.name || ''} onChange={updateEditDraft('businessName')} /></label>
                  <label className="field"><span>Apodo</span><input value={editModal.draft.nickname || editModal.draft.name || ''} onChange={updateEditDraft('nickname')} /></label>
                  <label className="field"><span>Tipo</span><select value={editModal.draft.type || CLIENT_TYPES[0]} onChange={updateEditDraft('type')}>{CLIENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                  <label className="field"><span>Estado</span><select value={editModal.draft.status || 'Activo'} onChange={updateEditDraft('status')}>{CLIENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                  <label className="field"><span>RUT (12345678-5)</span><input value={editModal.draft.rut || ''} onChange={updateEditDraft('rut')} placeholder="12345678-5" /></label>
                  <label className="field"><span>Zona</span><input value={editModal.draft.zone || ''} onChange={updateEditDraft('zone')} /></label>
                  <label className="field"><span>Sector</span><input value={editModal.draft.sector || ''} onChange={updateEditDraft('sector')} /></label>
                  <label className="field"><span>Contacto</span><input value={editModal.draft.contact || ''} onChange={updateEditDraft('contact')} /></label>
                  <label className="field"><span>Telefono (+56912345678)</span><input value={editModal.draft.phone || ''} onChange={updateEditDraft('phone')} placeholder="+56912345678" /></label>
                  <label className="field"><span>Email (nombre@dominio.cl)</span><input value={editModal.draft.email || ''} onChange={updateEditDraft('email')} placeholder="nombre@dominio.cl" /></label>
                  <label className="field"><span>Deuda</span><input type="number" min="0" step="1" value={editModal.draft.debt || 0} onChange={updateEditDraft('debt')} /></label>
                  <label className="field"><span>Meta mensual</span><input type="number" min="0" step="1" value={editModal.draft.monthlyTarget || 0} onChange={updateEditDraft('monthlyTarget')} /></label>
                  <label className="field"><span>Acumulado</span><input type="number" min="0" step="1" value={editModal.draft.accumulatedSales || 0} onChange={updateEditDraft('accumulatedSales')} /></label>
                  <label className="field"><span>Progreso</span><input type="number" min="0" max="1" step="0.01" value={editModal.draft.goalProgress || 0} onChange={updateEditDraft('goalProgress')} /></label>
                </>
              ) : null}

              {editModal.entity === 'route' ? (
                <>
                  <label className="field"><span>Fecha</span><input type="date" value={editModal.draft.date || ''} onChange={updateEditDraft('date')} /></label>
                  <label className="field"><span>Vendedor</span><select value={editModal.draft.seller || ROUTE_SELLERS[0]} onChange={updateEditDraft('seller')}>{ROUTE_SELLERS.map((seller) => <option key={seller} value={seller}>{seller}</option>)}</select></label>
                  <label className="field"><span>Zona</span><input value={editModal.draft.zone || ''} onChange={updateEditDraft('zone')} /></label>
                  <label className="field"><span>Sector</span><input value={editModal.draft.sector || ''} onChange={updateEditDraft('sector')} /></label>
                  <label className="field"><span>Visitados</span><input type="number" min="0" step="1" value={editModal.draft.visitedClients || 0} onChange={updateEditDraft('visitedClients')} /></label>
                  <label className="field"><span>Con pedido</span><input type="number" min="0" step="1" value={editModal.draft.clientsWithOrder || 0} onChange={updateEditDraft('clientsWithOrder')} /></label>
                  <label className="field"><span>Ventas</span><input type="number" min="0" step="1" value={editModal.draft.sales || 0} onChange={updateEditDraft('sales')} /></label>
                  <label className="field"><span>Km</span><input type="number" min="0" step="1" value={editModal.draft.kmRoute || 0} onChange={updateEditDraft('kmRoute')} /></label>
                  <label className="field"><span>Combustible</span><input type="number" min="0" step="1" value={editModal.draft.fuel || 0} onChange={updateEditDraft('fuel')} /></label>
                  <label className="field field-wide"><span>Observacion</span><textarea rows="3" value={editModal.draft.observation || ''} onChange={updateEditDraft('observation')} /></label>
                </>
              ) : null}

              {editModal.entity === 'scale' ? (
                <>
                  <label className="field field-wide"><span>Escala</span><input value={editModal.draft.label || ''} onChange={updateEditDraft('label')} /></label>
                  <label className="field"><span>Min</span><input type="number" min="1" step="1" value={editModal.draft.minQuantity || 1} onChange={updateEditDraft('minQuantity')} /></label>
                  <label className="field"><span>Max</span><input type="number" min="1" step="1" value={editModal.draft.maxQuantity || 1} onChange={updateEditDraft('maxQuantity')} /></label>
                  <label className="field"><span>Descuento</span><input type="number" min="0" max="0.95" step="0.01" value={editModal.draft.discountRate || 0} onChange={updateEditDraft('discountRate')} /></label>
                  <label className="field field-wide"><span>Objetivo</span><input value={editModal.draft.objective || ''} onChange={updateEditDraft('objective')} /></label>
                  <label className="field field-wide"><span>Comentario</span><textarea rows="3" value={editModal.draft.comment || ''} onChange={updateEditDraft('comment')} /></label>
                </>
              ) : null}

              {editModal.entity === 'purchase' ? (
                <>
                  <label className="field"><span>Fecha</span><input type="date" value={editModal.draft.date || ''} onChange={updateEditDraft('date')} /></label>
                  <label className="field"><span>Proveedor</span><select value={editModal.draft.supplierId || ''} onChange={updateEditDraft('supplierId')}><option value="">Selecciona proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
                  <label className="field"><span>OC</span><input value={editModal.draft.purchaseOrder || ''} onChange={updateEditDraft('purchaseOrder')} /></label>
                  <label className="field"><span>Cantidad</span><input type="number" min="1" step="1" value={editModal.draft.quantity || 1} onChange={updateEditDraft('quantity')} /></label>
                  <label className="field"><span>Costo unit.</span><input type="number" min="0" step="1" value={editModal.draft.unitCost || 0} onChange={updateEditDraft('unitCost')} /></label>
                  <label className="field"><span>Transporte</span><input type="number" min="0" step="1" value={editModal.draft.transportUnit || 0} onChange={updateEditDraft('transportUnit')} /></label>
                  <label className="field"><span>Recepcion</span><select value={editModal.draft.reception || 'Recibido'} onChange={updateEditDraft('reception')}>{RECEPTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                  <label className="field"><span>Doc</span><input value={editModal.draft.doc || ''} onChange={updateEditDraft('doc')} /></label>
                  <label className="field field-wide"><span>Observacion</span><textarea rows="3" value={editModal.draft.observation || ''} onChange={updateEditDraft('observation')} /></label>
                </>
              ) : null}

              {editModal.entity === 'product' ? (
                <>
                  <label className="field field-wide"><span>Nombre producto</span><input value={editModal.draft.name || ''} onChange={updateEditDraft('name')} /></label>
                  <label className="field"><span>Categoria</span><input value={editModal.draft.category || ''} onChange={updateEditDraft('category')} /></label>
                  <label className="field"><span>Codigo barra</span><input value={editModal.draft.barcode || ''} onChange={updateEditDraft('barcode')} /></label>
                  <label className="field"><span>Marca</span><input value={editModal.draft.brand || ''} onChange={updateEditDraft('brand')} /></label>
                  <label className="field"><span>Unidad</span><input value={editModal.draft.unit || ''} onChange={updateEditDraft('unit')} /></label>
                  <label className="field"><span>Proveedor</span><select value={editModal.draft.supplierId || ''} onChange={updateEditDraft('supplierId')}><option value="">Sin proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
                  <label className="field"><span>Costo compra</span><input type="number" min="0" step="1" value={editModal.draft.purchaseCost || 0} onChange={updateEditDraft('purchaseCost')} /></label>
                  <label className="field"><span>Transporte unidad</span><input type="number" min="0" step="1" value={editModal.draft.transportUnit || 0} onChange={updateEditDraft('transportUnit')} /></label>
                  <label className="field"><span>Stock</span><input type="number" min="0" step="1" value={editModal.draft.stock || 0} onChange={updateEditDraft('stock')} /></label>
                  <label className="field"><span>Stock minimo</span><input type="number" min="0" step="1" value={editModal.draft.stockMin || 0} onChange={updateEditDraft('stockMin')} /></label>
                  <label className="field"><span>Precio base</span><input type="number" min="0" step="1" value={editModal.draft.salePriceBase || 0} onChange={updateEditDraft('salePriceBase')} /></label>
                  <label className="field"><span>Ubicacion</span><input value={editModal.draft.location || ''} onChange={updateEditDraft('location')} /></label>
                  <label className="field"><span>Estado</span><select value={editModal.draft.status || 'Activo'} onChange={updateEditDraft('status')}>{PRODUCT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                </>
              ) : null}

              {editModal.entity === 'sale' ? (
                <>
                  <label className="field"><span>Fecha</span><input type="date" value={editModal.draft.date || ''} onChange={updateEditDraft('date')} /></label>
                  <label className="field"><span>Cliente</span><input value={editModal.draft.client || ''} onChange={updateEditDraft('client')} /></label>
                  <label className="field"><span>Zona</span><input value={editModal.draft.zone || ''} onChange={updateEditDraft('zone')} /></label>
                  <label className="field"><span>Pedido</span><input value={editModal.draft.orderCode || ''} onChange={updateEditDraft('orderCode')} /></label>
                  <label className="field field-wide"><span>Producto</span><input value={editModal.draft.product || ''} onChange={updateEditDraft('product')} /></label>
                  <label className="field"><span>Venta</span><input type="number" min="0" step="1" value={editModal.draft.sale || 0} onChange={updateEditDraft('sale')} /></label>
                  <label className="field"><span>Costo</span><input type="number" min="0" step="1" value={editModal.draft.cost || 0} onChange={updateEditDraft('cost')} /></label>
                  <label className="field"><span>Pago</span><select value={editModal.draft.paymentMethod || PAYMENT_METHODS[0]} onChange={updateEditDraft('paymentMethod')}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
                  <label className="field"><span>Despacho</span><select value={editModal.draft.dispatchStatus || DISPATCH_STATUSES[0]} onChange={updateEditDraft('dispatchStatus')}>{DISPATCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                </>
              ) : null}

              {editModal.entity === 'supplier' ? (
                <>
                  <label className="field"><span>Proveedor</span><input value={editModal.draft.name || ''} onChange={updateEditDraft('name')} /></label>
                  <label className="field"><span>Contacto</span><input value={editModal.draft.contact || ''} onChange={updateEditDraft('contact')} /></label>
                  <label className="field"><span>Telefono (+56912345678)</span><input value={editModal.draft.phone || ''} onChange={updateEditDraft('phone')} placeholder="+56912345678" /></label>
                  <label className="field"><span>Email (contacto@proveedor.cl)</span><input value={editModal.draft.email || ''} onChange={updateEditDraft('email')} placeholder="contacto@proveedor.cl" /></label>
                  <label className="field"><span>Estado</span><select value={editModal.draft.status || 'Activo'} onChange={updateEditDraft('status')}>{SUPPLIER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                  <label className="field field-wide"><span>Notas</span><textarea rows="3" value={editModal.draft.notes || ''} onChange={updateEditDraft('notes')} /></label>
                </>
              ) : null}

              {editModal.entity === 'cityRate' ? (
                <>
                  <label className="field field-wide"><span>Ciudad</span><input value={editModal.draft.city || ''} onChange={updateEditDraft('city')} /></label>
                  <label className="field"><span>Tarifa (%)</span><input type="number" min="0" max="95" step="0.1" value={editModal.draft.rate || 0} onChange={updateEditDraft('rate')} /></label>
                </>
              ) : null}
            </div>

            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={closeEditModal}>Cancelar</button>
              <button className="button button-primary" type="button" onClick={handleSaveEdit}>Guardar cambios</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ERPView;

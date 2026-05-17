import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  APP_NAME,
  APP_SUBTITLE,
  DEFAULT_SELLER,
  CHECKLIST_ITEMS,
  LOGIN_CREDENTIALS,
  PRODUCTS,
  logo,
} from './data/appData';
import { ERP_CLIENTS, ERP_PAYMENT_METHODS, ERP_PRODUCTS } from './data/erpSeed';
import { ERP_COBRANZAS } from './data/erpCobranzas';
import { ERP_CLIENT_LAST_PURCHASE } from './data/erpClientLastPurchase';
import ERP_VOLUME_SCALES from './data/erpScales.json';
import {
  ERP_PRODUCTS_FULL,
  ERP_PURCHASES,
  ERP_ROUTES,
  ERP_SALES,
  ERP_SCALES,
  ERP_SUPPLIERS,
  ERP_CITY_RATES,
} from './data/erpModulesSeed';
import ProductsView from './components/ProductsView';
import ERPView from './components/ERPView';
import {
  buildProductOptionLabel,
  formatCurrency as formatProductCurrency,
  getActiveOffer,
  getCurrentPrice,
  mergeProductList,
  normalizeProducts,
  updateProductOffer,
} from './lib/catalog';
import SalesWorkspace from './components/SalesView';
import { readJSON, readString, removeItem, writeJSON, writeString } from './lib/storage';

const STORAGE_KEYS = {
  themeMode: 'thorena.theme-mode',
  auth: 'thorena.authenticated',
  orders: 'thorena.orders',
  activeView: 'thorena.active-view',
  products: 'thorena.products',
  clients: 'thorena.clients',
  cobranzas: 'thorena.cobranzas',
  erpRoutes: 'thorena.erp-routes',
  erpScales: 'thorena.erp-scales',
  erpPurchases: 'thorena.erp-purchases',
  erpSales: 'thorena.erp-sales',
  erpProductsFull: 'thorena.erp-products-full',
  erpSuppliers: 'thorena.erp-suppliers',
  erpCityRates: 'thorena.erp-city-rates',
};

const ERP_ORDER_STATUSES = ['Cotizado', 'Pedido', 'Preparando', 'Despachado', 'Pagado', 'Pendiente', 'Anulado'];
const FINAL_ORDER_STATUSES = new Set(['Pagado', 'Anulado', 'Terminado']);
const ORDER_DETAIL_EXPAND_THRESHOLD = 4;

const EMPTY_FORM = {
  customerName: '',
  customerRut: '',
  customerNumber: '',
  deliveryAddress: '',
  observations: '',
};

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getResolvedTheme(themeMode) {
  return themeMode === 'system' ? getSystemTheme() : themeMode;
}

function getInitialThemeMode() {
  return readString(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.themeMode, 'system');
}

function getInitialAuth() {
  return readString(typeof window === 'undefined' ? null : window.sessionStorage, STORAGE_KEYS.auth, 'false') === 'true';
}

function normalizeActiveView(view) {
  if (view === 'productos') return 'inventario';
  return view;
}

function normalizeNameKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function excelSerialToISO(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }

  const date = new Date((numeric - 25569) * 86400 * 1000);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function normalizeDateValue(value) {
  if (!value) return '';

  if (typeof value === 'number') {
    return excelSerialToISO(value);
  }

  const normalized = String(value).trim();
  if (!normalized) return '';

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeCobranzaStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'vencido') return 'Vencido';
  if (status === 'pagada' || status === 'pagado') return 'Pagada';
  return 'Pendiente';
}

function normalizeCobranza(raw = {}, index = 0) {
  const clientName = String(raw.clientName || raw.cliente || '').trim();
  const amount = Math.max(0, Number(raw.amount ?? raw.monto) || 0);
  const paidAmount = Math.max(0, Number(raw.paidAmount ?? raw.abono) || 0);
  const balanceFromRaw = Number(raw.balance ?? raw.saldo);
  const balance = Math.max(0, Number.isFinite(balanceFromRaw) ? balanceFromRaw : amount - paidAmount);

  return {
    id: String(raw.id || `cob-${index + 1}`),
    clientName,
    document: String(raw.document || raw.documento || '').trim(),
    issueDate: normalizeDateValue(raw.issueDate ?? raw.fechaEmision),
    dueDate: normalizeDateValue(raw.dueDate ?? raw.vencimiento),
    amount,
    paidAmount,
    balance,
    status: normalizeCobranzaStatus(raw.status ?? raw.estado),
    notes: String(raw.notes ?? raw.observacion ?? '').trim(),
  };
}

function normalizeChecklist(checklist) {
  return CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = Boolean(checklist?.[item.key]);
    return acc;
  }, {});
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const quantity = Math.max(1, Number(item?.quantity) || 1);
      const unitPrice = Math.max(0, Number(item?.unitPrice) || 0);
      const productName = String(item?.productName || '').trim();
      const basePrice = Math.max(0, Number(item?.basePrice ?? unitPrice) || unitPrice);
      const offerDiscountPercent = Math.max(0, Number(item?.offerDiscountPercent ?? item?.discountPercent) || 0);
      const unitPriceBeforeScale = Math.max(0, Number(item?.unitPriceBeforeScale ?? unitPrice) || unitPrice);
      const volumeDiscountRate = Math.max(0, Number(item?.volumeDiscountRate) || 0);
      const volumeDiscountPercent = Math.max(0, Number(item?.volumeDiscountPercent) || Math.round(volumeDiscountRate * 100));
      const volumeScaleLabel = String(item?.volumeScaleLabel || '').trim() || 'Sin escala';
      const subtotalBeforeScale = Math.max(0, Number(item?.subtotalBeforeScale ?? unitPriceBeforeScale * quantity) || unitPriceBeforeScale * quantity);
      const subtotal = Math.max(0, Number(item?.subtotal ?? unitPrice * quantity) || unitPrice * quantity);
      const discountAmount = Math.max(0, Number(item?.discountAmount) || Math.max(0, subtotalBeforeScale - subtotal));

      if (!productName || !Number.isFinite(unitPrice)) {
        return null;
      }

      return {
        productId: String(item?.productId || productName),
        productName,
        unitPrice,
        unitPriceBeforeScale,
        basePrice,
        offerDiscountPercent,
        volumeDiscountRate,
        volumeDiscountPercent,
        volumeScaleLabel,
        subtotalBeforeScale,
        discountAmount,
        quantity,
        subtotal,
      };
    })
    .filter(Boolean);
}

function normalizeOrder(order) {
  const rawStatus = String(order?.status || '').trim();
  const mappedStatus = rawStatus === 'Terminado' ? 'Pagado' : rawStatus;
  const status = ERP_ORDER_STATUSES.includes(mappedStatus) ? mappedStatus : 'Pendiente';
  const items = normalizeItems(order?.items);
  const customerContact = String(order?.customerNumber || order?.contactPhone || '');
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.subtotalBeforeScale || item.subtotal), 0);
  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalDiscountAmount = Math.max(0, subtotalBeforeDiscount - itemsTotal);
  const dispatchRate = Math.max(0, Number(order?.dispatchRate) || 0);
  const dispatchSurchargeRaw = Number(order?.dispatchSurcharge);
  const dispatchSurcharge = Math.max(
    0,
    Number.isFinite(dispatchSurchargeRaw) ? dispatchSurchargeRaw : Math.round(itemsTotal * dispatchRate),
  );
  const normalizedItemsTotal = Math.max(0, Number(order?.itemsTotal) || itemsTotal);
  const normalizedTotal = Math.max(0, Number(order?.total) || normalizedItemsTotal + dispatchSurcharge);

  return {
    code: String(order?.code || 'PED-0000'),
    createdAt: order?.createdAt || new Date().toISOString(),
    saleChannel: order?.saleChannel === 'online' ? 'online' : order?.saleChannel === 'oficina' ? 'oficina' : 'terreno',
    customerName: String(order?.customerName || ''),
    customerRut: String(order?.customerRut || ''),
    customerNumber: customerContact,
    clientId: String(order?.clientId || ''),
    paymentMethod: String(order?.paymentMethod || ''),
    deliveryAddress: String(order?.deliveryAddress || ''),
    contactPhone: customerContact,
    observations: String(order?.observations || ''),
    sellerName: String(order?.sellerName || DEFAULT_SELLER.name),
    sellerRut: String(order?.sellerRut || DEFAULT_SELLER.rut),
    status,
    subtotalBeforeDiscount,
    totalDiscountAmount,
    itemsTotal: normalizedItemsTotal,
    dispatchCity: String(order?.dispatchCity || order?.clientSnapshot?.zone || ''),
    dispatchRate,
    dispatchSurcharge,
    total: normalizedTotal,
    items,
    clientSnapshot: order?.clientSnapshot
      ? {
          id: String(order.clientSnapshot.id || ''),
          name: String(order.clientSnapshot.name || ''),
          type: String(order.clientSnapshot.type || ''),
          zone: String(order.clientSnapshot.zone || ''),
          sector: String(order.clientSnapshot.sector || ''),
          creditEnabled: Boolean(order.clientSnapshot.creditEnabled),
          debt: Math.max(0, Number(order.clientSnapshot.debt) || 0),
        }
      : null,
    checklist: normalizeChecklist(order?.checklist),
    showReceipt: Boolean(order?.showReceipt),
  };
}

function loadOrders() {
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.orders, []);
  return Array.isArray(stored) ? stored.map(normalizeOrder) : [];
}

function loadProducts() {
  const fallback = ERP_PRODUCTS.length ? ERP_PRODUCTS : PRODUCTS;
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.products, fallback);
  return normalizeProducts(Array.isArray(stored) ? stored : fallback);
}

function loadClients() {
  const fallback = ERP_CLIENTS;
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.clients, fallback);
  const source = Array.isArray(stored) ? stored : fallback;

  return source.map((client) => ({
    ...client,
    contact: client.contact || '',
    whatsapp: client.whatsapp || client.phone || '',
    instagram: client.instagram || '',
    monthlyTarget: Math.max(0, Number(client.monthlyTarget) || 0),
    accumulatedSales: Math.max(0, Number(client.accumulatedSales) || 0),
    goalProgress: Math.max(0, Number(client.goalProgress) || 0),
    creditLimit: Math.max(0, Number(client.creditLimit) || 0),
    sector: client.sector || '',
    zone: client.zone || '',
    frequency: client.frequency || 'Semanal',
    notes: client.notes || client.observations || '',
    status: client.status || 'Activo',
    lastPurchase: normalizeDateValue(client.lastPurchase || ERP_CLIENT_LAST_PURCHASE[client.id] || ''),
  }));
}

function loadCobranzas() {
  const fallback = ERP_COBRANZAS;
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.cobranzas, fallback);
  const source = Array.isArray(stored) ? stored : fallback;

  return source.map((item, index) => normalizeCobranza(item, index)).filter((item) => item.clientName);
}

function loadErpModule(storageKey, fallback) {
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, storageKey, fallback);
  return Array.isArray(stored) ? stored : fallback;
}

function createInitialDraft(products) {
  const availableProduct = products.find((product) => product.stock > 0) || products[0] || null;

  return {
    productId: availableProduct?.id || '',
    quantity: 1,
  };
}

function formatOrderCode(number) {
  return `PED-${String(number).padStart(4, '0')}`;
}

function getNextOrderNumber(orders) {
  const highest = orders.reduce((max, order) => {
    const match = /^PED-(\d{4})$/.exec(order.code);
    const parsed = match ? Number(match[1]) : 0;
    return Math.max(max, parsed);
  }, 0);

  return highest + 1;
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatDateTime(value) {
  return dateTimeFormatter.format(new Date(value));
}

function getCustomerContact(order) {
  return order.customerNumber || order.contactPhone || '-';
}

function getProductById(productId, catalog = PRODUCTS) {
  return catalog.find((product) => product.id === productId) || null;
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (username.trim() === LOGIN_CREDENTIALS.username && password === LOGIN_CREDENTIALS.password) {
      setError('');
      onLogin();
      return;
    }

    setError('Credenciales inválidas. Usa usuario1 / boceto.');
  };

  return (
    <main className="auth-screen">
      <section className="auth-card panel">
        <div className="auth-brand">
          <div className="brand-mark">
            <img src={logo} alt="Logo de Thorena Comercial" />
          </div>
          <div>
            <p className="eyebrow">Acceso interno</p>
            <h1>{APP_NAME}</h1>
            <p className="muted">{APP_SUBTITLE}</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Usuario</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="usuario1"
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="boceto"
            />
          </label>

          {error ? (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          ) : null}

          <button className="button button-primary button-full" type="submit">
            Ingresar
          </button>
        </form>
      </section>
    </main>
  );
}

function Header({ activeView, onChangeView, onLogout, resolvedTheme, onToggleTheme }) {
  const themeLabel = resolvedTheme === 'light' ? 'Tema claro' : 'Tema oscuro';

  return (
    <header className="app-header panel">
      <div className="brand-block">
        <div className="brand-mark brand-mark-small">
          <img src={logo} alt="Logo de Thorena Comercial" />
        </div>
        <div>
          <p className="eyebrow">{APP_SUBTITLE}</p>
          <h1>{APP_NAME}</h1>
        </div>
      </div>

      <nav className="app-nav" aria-label="Secciones principales">
        <button
          type="button"
          className={activeView === 'ventas' ? 'nav-button is-active' : 'nav-button'}
          onClick={() => onChangeView('ventas')}
          aria-current={activeView === 'ventas' ? 'page' : undefined}
        >
          Ventas
        </button>
        <button
          type="button"
          className={activeView === 'pedidos' ? 'nav-button is-active' : 'nav-button'}
          onClick={() => onChangeView('pedidos')}
          aria-current={activeView === 'pedidos' ? 'page' : undefined}
        >
          Pedidos
        </button>
        <button
          type="button"
          className={activeView === 'inventario' ? 'nav-button is-active' : 'nav-button'}
          onClick={() => onChangeView('inventario')}
          aria-current={activeView === 'inventario' ? 'page' : undefined}
        >
          Inventario
        </button>
        <button
          type="button"
          className={activeView === 'clientes' ? 'nav-button is-active' : 'nav-button'}
          onClick={() => onChangeView('clientes')}
          aria-current={activeView === 'clientes' ? 'page' : undefined}
        >
          Clientes
        </button>
        <button
          type="button"
          className={activeView === 'erp' ? 'nav-button is-active' : 'nav-button'}
          onClick={() => onChangeView('erp')}
          aria-current={activeView === 'erp' ? 'page' : undefined}
        >
          ERP
        </button>
      </nav>

      <div className="header-actions">
        <label className="theme-switch">
          <span className="theme-switch-copy">
            <strong>{themeLabel}</strong>
          </span>
          <input
            type="checkbox"
            checked={resolvedTheme === 'light'}
            onChange={onToggleTheme}
            aria-label="Cambiar tema"
          />
          <span className="theme-switch-track" aria-hidden="true">
            <span className="theme-switch-thumb" />
          </span>
        </label>

        <button className="button button-secondary logout-button" type="button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

function SalesView({ orders, setOrders }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState([]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

  const handleFieldChange = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleDraftChange = (key) => (event) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleAddProduct = (event) => {
    event.preventDefault();
    setFeedback(null);

    const quantity = Number(draft.quantity);
    const product = getProductById(draft.productId);

    if (!product) {
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setErrors(['La cantidad debe ser un número entero mayor que 0.']);
      return;
    }

    setErrors([]);

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * item.unitPrice,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity,
          subtotal: product.price * quantity,
        },
      ];
    });

    setDraft((current) => ({ ...current, quantity: 1 }));
  };

  const handleRemoveItem = (productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const handleGenerateOrder = (event) => {
    event.preventDefault();

    const nextErrors = [];
    const customerContact = form.customerNumber.trim();

    if (!form.customerName.trim()) nextErrors.push('Ingresa el nombre del cliente o negocio.');
    if (!form.customerRut.trim()) nextErrors.push('Ingresa el RUT del cliente o negocio.');
    if (!customerContact) nextErrors.push('Ingresa el número de cliente o teléfono de contacto.');
    if (!form.deliveryAddress.trim()) nextErrors.push('Ingresa la dirección de despacho.');
    if (items.length === 0) nextErrors.push('Agrega al menos un producto al pedido.');

    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      setFeedback(null);
      return;
    }

    const code = formatOrderCode(getNextOrderNumber(orders));

    const newOrder = normalizeOrder({
      code,
      createdAt: new Date().toISOString(),
      customerName: form.customerName.trim(),
      customerRut: form.customerRut.trim(),
      customerNumber: customerContact,
      contactPhone: customerContact,
      deliveryAddress: form.deliveryAddress.trim(),
      observations: form.observations.trim(),
      sellerName: DEFAULT_SELLER.name,
      sellerRut: DEFAULT_SELLER.rut,
      status: 'Pendiente',
      items,
      checklist: {},
      showReceipt: false,
    });

    setOrders((current) => [...current, newOrder]);

    setFeedback({ type: 'success', text: `Pedido generado correctamente. Código ${code}.` });
    setErrors([]);
    setForm(EMPTY_FORM);
    setDraft(EMPTY_DRAFT);
    setItems([]);
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">Ventas</p>
        <h2>Crear pedido en terreno</h2>
        <p className="muted">
          Completa los datos, agrega productos y genera el pedido para enviarlo a gestión.
        </p>
      </div>

      {feedback ? (
        <div className={`notice notice-${feedback.type}`} role="status">
          {feedback.text}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="notice notice-error" role="alert">
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="sales-layout">
        <form id="sales-form" className="panel sales-panel" onSubmit={handleGenerateOrder}>
          <div className="panel-title">
            <h3>Datos del pedido</h3>
            <p className="muted">Información del cliente para construir el pedido interno.</p>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Nombre del cliente o negocio</span>
              <input value={form.customerName} onChange={handleFieldChange('customerName')} />
            </label>

            <label className="field">
              <span>RUT del cliente o negocio</span>
              <input value={form.customerRut} onChange={handleFieldChange('customerRut')} />
            </label>

            <label className="field field-wide">
              <span>Número de cliente / Teléfono o contacto</span>
              <input value={form.customerNumber} onChange={handleFieldChange('customerNumber')} />
            </label>

            <label className="field field-wide">
              <span>Dirección de despacho</span>
              <input value={form.deliveryAddress} onChange={handleFieldChange('deliveryAddress')} />
            </label>

            <label className="field field-wide">
              <span>Observaciones opcionales</span>
              <textarea
                rows="3"
                value={form.observations}
                onChange={handleFieldChange('observations')}
              />
            </label>
          </div>

          <div className="panel-divider" />

          <div className="panel-title">
            <h3>Agregar productos</h3>
            <p className="muted">Selecciona un producto y suma cantidades al pedido.</p>
          </div>

          <div className="product-builder">
            <label className="field">
              <span>Producto</span>
              <select value={draft.productId} onChange={handleDraftChange('productId')}>
                {PRODUCTS.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.price)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field quantity-field">
              <span>Cantidad</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={draft.quantity}
                onChange={handleDraftChange('quantity')}
              />
            </label>

            <button className="button button-secondary add-button" type="button" onClick={handleAddProduct}>
              Agregar producto
            </button>
          </div>
        </form>

        <aside className="panel cart-panel">
          <div className="panel-title">
            <h3>Productos agregados</h3>
            <p className="muted">Revisa, elimina y genera el pedido.</p>
          </div>

          {items.length === 0 ? (
            <div className="empty-state empty-state-inline">
              <p>No hay productos agregados todavía.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Unitario</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                      <td>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          aria-label={`Eliminar ${item.productName}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="total-box">
            <span>Total general</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <button className="button button-primary button-full" type="submit" form="sales-form">
            Generar pedido
          </button>
        </aside>
      </div>
    </section>
  );
}

function getStatusBadgeClass(status) {
  if (status === 'Pagado' || status === 'Despachado') {
    return 'badge badge-success';
  }

  if (status === 'Anulado') {
    return 'badge badge-warning';
  }

  return 'badge badge-warning';
}

function OrderCard({ order, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const hasManyItems = order.items.length > ORDER_DETAIL_EXPAND_THRESHOLD;
  const visibleItems = hasManyItems && !expanded ? order.items.slice(0, ORDER_DETAIL_EXPAND_THRESHOLD) : order.items;
  const hiddenItemsCount = Math.max(0, order.items.length - visibleItems.length);
  const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const lineDiscountTotal = order.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const statusLocked = FINAL_ORDER_STATUSES.has(order.status);

  return (
    <article className={order.status === 'Pagado' ? 'order-card panel order-card-done' : 'order-card panel'}>
      <div className="order-head">
        <div>
          <p className="eyebrow">{order.code}</p>
          <h3>{order.customerName || 'Pedido sin nombre'}</h3>
          <p className="muted">{formatDateTime(order.createdAt)}</p>
        </div>

        <div className={getStatusBadgeClass(order.status)}>{order.status}</div>
      </div>

      <div className="order-grid">
        <div>
          <span className="field-label">Nombre cliente</span>
          <p>{order.customerName || '-'}</p>
        </div>
        <div>
          <span className="field-label">RUT cliente</span>
          <p>{order.customerRut || '-'}</p>
        </div>
        <div>
          <span className="field-label">Direccion de despacho</span>
          <p>{order.deliveryAddress || '-'}</p>
        </div>
        <div>
          <span className="field-label">Telefono cliente</span>
          <p>{getCustomerContact(order)}</p>
        </div>
        <div>
          <span className="field-label">Metodo de pago</span>
          <p>{order.paymentMethod || '-'}</p>
        </div>
        <div>
          <span className="field-label">Tipo de cliente</span>
          <p>{order.clientSnapshot?.type || '-'}</p>
        </div>
        <div>
          <span className="field-label">Zona / Sector</span>
          <p>
            {order.clientSnapshot?.zone || '-'} / {order.clientSnapshot?.sector || '-'}
          </p>
        </div>
        <div>
          <span className="field-label">Origen de venta</span>
          <p>
            {order.saleChannel === 'online'
              ? 'Venta Online'
              : order.saleChannel === 'oficina'
                ? 'Venta Oficina'
                : 'Venta en Terreno'}
          </p>
        </div>
        <div>
          <span className="field-label">Deuda cliente</span>
          <p>{formatCurrency(order.clientSnapshot?.debt || 0)}</p>
        </div>
        <div>
          <span className="field-label">Tarifa ciudad</span>
          <p>
            {order.dispatchCity || '-'} ({Math.round((order.dispatchRate || 0) * 100)}%)
          </p>
        </div>
        <div>
          <span className="field-label">Recargo despacho</span>
          <p>{formatCurrency(order.dispatchSurcharge || 0)}</p>
        </div>
        <div>
          <span className="field-label">Total del pedido</span>
          <p className="order-total-value">{formatCurrency(order.total)}</p>
        </div>
      </div>

      {order.observations ? (
        <div className="order-notes">
          <span className="field-label">Observaciones</span>
          <p>{order.observations}</p>
        </div>
      ) : null}

      <div className="panel-title compact-title">
        <h4>Detalle del pedido</h4>
        <p className="muted">
          {order.items.length} items · {totalUnits} unidades · descuento por producto: {formatCurrency(lineDiscountTotal)}
        </p>
      </div>

      <div className="table-wrap">
        <table className="items-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Escala</th>
              <th>Desc. linea</th>
              <th>Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>
                  {item.volumeScaleLabel || 'Sin escala'} ({Math.max(0, Number(item.volumeDiscountPercent) || 0)}%)
                </td>
                <td>{item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-'}</td>
                <td>
                  {item.unitPriceBeforeScale > item.unitPrice ? <span className="strike-price">{formatCurrency(item.unitPriceBeforeScale)}</span> : null}
                  <div>{formatCurrency(item.unitPrice)}</div>
                </td>
                <td>
                  {item.subtotalBeforeScale > item.subtotal ? <span className="strike-price">{formatCurrency(item.subtotalBeforeScale)}</span> : null}
                  <div>{formatCurrency(item.subtotal)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="order-actions">
        {hasManyItems ? (
          <button className="button button-secondary" type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Ocultar detalle' : `Ver detalle completo (+${hiddenItemsCount})`}
          </button>
        ) : null}

        <label className="field status-select-field">
          <span>Estado ERP</span>
          <select value={order.status} onChange={(event) => onUpdateStatus(order.code, event.target.value)} disabled={statusLocked}>
            {ERP_ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        {statusLocked ? <span className="status-lock-note">Estado final bloqueado</span> : null}
      </div>
    </article>
  );
}

function OrdersView({ orders, setOrders }) {
  const ordered = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const updateStatus = (code, nextStatus) => {
    if (!ERP_ORDER_STATUSES.includes(nextStatus)) {
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.code === code && !FINAL_ORDER_STATUSES.has(order.status)
          ? {
              ...order,
              status: nextStatus,
            }
          : order,
      ),
    );
  };

  const statusSummary = ERP_ORDER_STATUSES.map((status) => ({
    status,
    count: ordered.filter((order) => order.status === status).length,
  }));

  return (
    <section className="screen">
      <div className="screen-heading orders-heading-compact">
        <h2>Pedidos</h2>
        <p className="muted">Estado, cliente y detalle con descuentos por producto.</p>
      </div>

      {ordered.length === 0 ? (
        <div className="panel empty-orders">
          <h3>No hay pedidos generados todavia</h3>
          <p className="muted">Vuelve a Ventas para crear el primero.</p>
        </div>
      ) : (
        <div className="orders-groups">
          <div className="status-summary-list" aria-label="Resumen de estados">
            {statusSummary.map((row) => (
              <span key={row.status} className="offer-chip">
                {row.status}: {row.count}
              </span>
            ))}
          </div>

          <section className="orders-group">
            <div className="orders-list">
              {ordered.map((order) => (
                <OrderCard key={order.code} order={order} onUpdateStatus={updateStatus} />
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function ClientsView({ clients, orders, cobranzas, setCobranzas }) {
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }), []);

  const latestOrderByClient = useMemo(() => {
    const map = new Map();

    orders.forEach((order) => {
      const key = normalizeNameKey(order.customerName);
      if (!key || !order.createdAt) return;

      const parsed = new Date(order.createdAt);
      if (Number.isNaN(parsed.getTime())) return;

      const current = map.get(key);
      if (!current || parsed > current) {
        map.set(key, parsed);
      }
    });

    return map;
  }, [orders]);

  const cobranzaByClient = useMemo(() => {
    const map = new Map();

    cobranzas.forEach((record) => {
      const key = normalizeNameKey(record.clientName);
      if (!key) return;

      const current = map.get(key);
      if (!current) {
        map.set(key, record);
        return;
      }

      const currentBalance = Number(current.balance) || 0;
      const nextBalance = Number(record.balance) || 0;
      if (nextBalance > currentBalance) {
        map.set(key, record);
        return;
      }

      const currentDue = current.dueDate ? new Date(current.dueDate).getTime() : 0;
      const nextDue = record.dueDate ? new Date(record.dueDate).getTime() : 0;
      if (nextDue > currentDue) {
        map.set(key, record);
      }
    });

    return map;
  }, [cobranzas]);

  const clientRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return clients
      .map((client) => {
        const key = normalizeNameKey(client.name);
        const cobranza = cobranzaByClient.get(key) || null;
        const balance = cobranza ? Math.max(0, Number(cobranza.balance) || 0) : Math.max(0, Number(client.debt) || 0);
        const dueDate = cobranza?.dueDate ? new Date(cobranza.dueDate) : null;
        const isDueOver = dueDate ? dueDate < today : false;

        let debtStatus = 'Pagada';
        if (balance > 0) {
          debtStatus = cobranza?.status === 'Vencido' || isDueOver ? 'Vencido' : 'Pendiente';
        }

        const latestOrder = latestOrderByClient.get(key) || null;
        const lastPurchase = client.lastPurchase ? new Date(client.lastPurchase) : latestOrder;

        return {
          id: client.id,
          name: client.name,
          zone: client.zone || '-',
          status: client.status || 'Activo',
          debtStatus,
          balance,
          dueDate,
          lastPurchase,
          cobranzaId: cobranza?.id || null,
        };
      })
      .sort((a, b) => {
        const priority = { Vencido: 0, Pendiente: 1, Pagada: 2 };
        const statusDiff = priority[a.debtStatus] - priority[b.debtStatus];
        if (statusDiff !== 0) return statusDiff;
        return a.name.localeCompare(b.name);
      });
  }, [clients, cobranzaByClient, latestOrderByClient]);

  const summary = useMemo(
    () =>
      clientRows.reduce(
        (acc, row) => {
          if (row.debtStatus === 'Vencido') acc.vencido += 1;
          if (row.debtStatus === 'Pendiente') acc.pendiente += 1;
          if (row.debtStatus === 'Pagada') acc.pagada += 1;
          return acc;
        },
        { pendiente: 0, vencido: 0, pagada: 0 },
      ),
    [clientRows],
  );

  const handleDeleteCobranza = (cobranzaId) => {
    setCobranzas((current) => current.filter((item) => item.id !== cobranzaId));
  };

  const formatDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '-';
    return dateFormatter.format(date);
  };

  return (
    <section className="screen">
      <div className="screen-heading orders-heading-compact">
        <h2>Clientes</h2>
        <p className="muted">Nombre, zona, deuda, vencimiento y ultima compra de cada cliente.</p>
      </div>

      <div className="status-summary-list" aria-label="Resumen de cobranza por cliente">
        <span className="offer-chip">Pendiente: {summary.pendiente}</span>
        <span className="offer-chip">Vencido: {summary.vencido}</span>
        <span className="offer-chip">Pagada: {summary.pagada}</span>
      </div>

      <div className="inventory-grid">
        {clientRows.length === 0 ? (
          <div className="panel empty-orders">
            <h3>No hay clientes para mostrar</h3>
            <p className="muted">Revisa ERP para agregar clientes activos.</p>
          </div>
        ) : (
          clientRows.map((row) => {
            const debtClass = row.debtStatus === 'Vencido' ? 'debt-chip-overdue' : row.debtStatus === 'Pendiente' ? 'debt-chip-pending' : 'debt-chip-paid';

            return (
              <article className="panel client-card" key={row.id}>
                <div className="inventory-card-head">
                  <div>
                    <p className="eyebrow">{row.zone}</p>
                    <h3>{row.name}</h3>
                  </div>
                  <span className={`inventory-status-chip ${debtClass}`}>{row.debtStatus}</span>
                </div>

                <div className="inventory-metrics">
                  <div>
                    <span className="field-label">Estado de deuda</span>
                    <strong>{formatCurrency(row.balance)}</strong>
                  </div>
                  <div>
                    <span className="field-label">Hasta cuando paga</span>
                    <strong>{formatDate(row.dueDate)}</strong>
                  </div>
                  <div>
                    <span className="field-label">Ultima compra</span>
                    <strong>{formatDate(row.lastPurchase)}</strong>
                  </div>
                  <div>
                    <span className="field-label">Estado</span>
                    <strong>{row.status}</strong>
                  </div>
                </div>

                {row.debtStatus === 'Pagada' && row.cobranzaId ? (
                  <button className="button button-secondary" type="button" onClick={() => handleDeleteCobranza(row.cobranzaId)}>
                    Eliminar cobranza
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function App() {
  const [themeMode, setThemeMode] = useState(() => getInitialThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState(() => getResolvedTheme(getInitialThemeMode()));
  const [authenticated, setAuthenticated] = useState(() => getInitialAuth());
  const [activeView, setActiveView] = useState(() =>
    getInitialAuth()
      ? normalizeActiveView(readString(typeof window === 'undefined' ? null : window.sessionStorage, STORAGE_KEYS.activeView, 'ventas'))
      : 'ventas',
  );
  const [orders, setOrders] = useState(() => loadOrders());
  const [products, setProducts] = useState(() => loadProducts());
  const [clients, setClients] = useState(() => loadClients());
  const [cobranzas, setCobranzas] = useState(() => loadCobranzas());
  const [erpRoutes, setErpRoutes] = useState(() => loadErpModule(STORAGE_KEYS.erpRoutes, ERP_ROUTES));
  const [erpScales, setErpScales] = useState(() =>
    loadErpModule(STORAGE_KEYS.erpScales, ERP_SCALES.length ? ERP_SCALES : ERP_VOLUME_SCALES),
  );
  const [erpPurchases, setErpPurchases] = useState(() => loadErpModule(STORAGE_KEYS.erpPurchases, ERP_PURCHASES));
  const [erpSales, setErpSales] = useState(() => loadErpModule(STORAGE_KEYS.erpSales, ERP_SALES));
  const [erpProductsFull, setErpProductsFull] = useState(() => loadErpModule(STORAGE_KEYS.erpProductsFull, ERP_PRODUCTS_FULL));
  const [erpSuppliers, setErpSuppliers] = useState(() => loadErpModule(STORAGE_KEYS.erpSuppliers, ERP_SUPPLIERS));
  const [erpCityRates, setErpCityRates] = useState(() => loadErpModule(STORAGE_KEYS.erpCityRates, ERP_CITY_RATES));

  useLayoutEffect(() => {
    const nextResolvedTheme = getResolvedTheme(themeMode);
    setResolvedTheme(nextResolvedTheme);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== 'system') {
      setResolvedTheme(themeMode);
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      setResolvedTheme(media.matches ? 'dark' : 'light');
    };

    applyTheme();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', applyTheme);
    } else {
      media.addListener(applyTheme);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', applyTheme);
      } else {
        media.removeListener(applyTheme);
      }
    };
  }, [themeMode]);

  useEffect(() => {
    writeString(window.localStorage, STORAGE_KEYS.themeMode, themeMode);
  }, [themeMode]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.orders, orders);
  }, [orders]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.products, products);
  }, [products]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.clients, clients);
  }, [clients]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.cobranzas, cobranzas);
  }, [cobranzas]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.erpRoutes, erpRoutes);
  }, [erpRoutes]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.erpScales, erpScales);
  }, [erpScales]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.erpPurchases, erpPurchases);
  }, [erpPurchases]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.erpSales, erpSales);
  }, [erpSales]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.erpProductsFull, erpProductsFull);
  }, [erpProductsFull]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.erpSuppliers, erpSuppliers);
  }, [erpSuppliers]);

  useEffect(() => {
    writeJSON(window.localStorage, STORAGE_KEYS.erpCityRates, erpCityRates);
  }, [erpCityRates]);

  useEffect(() => {
    if (authenticated) {
      writeString(window.sessionStorage, STORAGE_KEYS.activeView, activeView);
    }
  }, [activeView, authenticated]);

  const handleThemeToggle = () => {
    setThemeMode((currentMode) => {
      if (currentMode === 'system') {
        return resolvedTheme === 'light' ? 'dark' : 'light';
      }

      return currentMode === 'light' ? 'dark' : 'light';
    });
  };

  const handleLogin = () => {
    writeString(window.sessionStorage, STORAGE_KEYS.auth, 'true');
    writeString(window.sessionStorage, STORAGE_KEYS.activeView, 'ventas');
    setAuthenticated(true);
    setActiveView('ventas');
  };

  const handleLogout = () => {
    removeItem(window.sessionStorage, STORAGE_KEYS.auth);
    removeItem(window.sessionStorage, STORAGE_KEYS.activeView);
    setAuthenticated(false);
    setActiveView('ventas');
  };

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <Header
        activeView={activeView}
        onChangeView={handleViewChange}
        onLogout={handleLogout}
        resolvedTheme={resolvedTheme}
        onToggleTheme={handleThemeToggle}
      />

      <main className="app-main">
        {activeView === 'ventas' ? (
          <SalesWorkspace
            products={products}
            setProducts={setProducts}
            orders={orders}
            setOrders={setOrders}
            clients={clients}
            paymentMethods={ERP_PAYMENT_METHODS}
            volumeScales={erpScales}
            cityRates={erpCityRates}
          />
        ) : activeView === 'pedidos' ? (
          <OrdersView orders={orders} setOrders={setOrders} />
        ) : activeView === 'clientes' ? (
          <ClientsView clients={clients} orders={orders} cobranzas={cobranzas} setCobranzas={setCobranzas} />
        ) : activeView === 'erp' ? (
          <ERPView
            clients={clients}
            setClients={setClients}
            orders={orders}
            routes={erpRoutes}
            setRoutes={setErpRoutes}
            scales={erpScales}
            setScales={setErpScales}
            purchases={erpPurchases}
            setPurchases={setErpPurchases}
            sales={erpSales}
            setSales={setErpSales}
            productsFull={erpProductsFull}
            setProductsFull={setErpProductsFull}
            suppliers={erpSuppliers}
            setSuppliers={setErpSuppliers}
            cityRates={erpCityRates}
            setCityRates={setErpCityRates}
          />
        ) : (
          <ProductsView products={products} setProducts={setProducts} />
        )}
      </main>
    </div>
  );
}

export default App;

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
import ERP_VOLUME_SCALES from './data/erpScales.json';
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
  spaces: 'thorena.spaces',
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
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalDiscountAmount = Math.max(0, subtotalBeforeDiscount - total);

  return {
    code: String(order?.code || 'PED-0000'),
    createdAt: order?.createdAt || new Date().toISOString(),
    saleChannel: order?.saleChannel === 'online' ? 'online' : 'terreno',
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
    total,
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
  return Array.isArray(stored) ? stored : fallback;
}

function loadSpaces() {
  const fallback = [
    {
      id: 'esp-base-1',
      name: 'Bodega Central',
      manager: 'Jefe de Bodega',
      status: 'Disponible',
      notes: 'Zona principal de preparacion de pedidos.',
    },
    {
      id: 'esp-base-2',
      name: 'Sala de Ventas',
      manager: 'Encargado Comercial',
      status: 'Ocupado',
      notes: 'Atencion presencial de clientes minoristas.',
    },
  ];
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.spaces, fallback);
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
          <p>{order.saleChannel === 'online' ? 'Venta Online' : 'Venta en Terreno'}</p>
        </div>
        <div>
          <span className="field-label">Deuda cliente</span>
          <p>{formatCurrency(order.clientSnapshot?.debt || 0)}</p>
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

function ClientsView() {
  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">Clientes</p>
        <h2>Modulo en construccion</h2>
        <p className="muted">Esta pestaña quedara disponible en la siguiente iteracion.</p>
      </div>
      <div className="panel empty-orders">
        <h3>Pronto veras la gestion dedicada de clientes</h3>
        <p className="muted">Por ahora, utiliza ERP para revisar y cargar informacion comercial de clientes.</p>
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
  const [spaces, setSpaces] = useState(() => loadSpaces());

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
    writeJSON(window.localStorage, STORAGE_KEYS.spaces, spaces);
  }, [spaces]);

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
            volumeScales={ERP_VOLUME_SCALES}
          />
        ) : activeView === 'pedidos' ? (
          <OrdersView orders={orders} setOrders={setOrders} />
        ) : activeView === 'clientes' ? (
          <ClientsView />
        ) : activeView === 'erp' ? (
          <ERPView clients={clients} setClients={setClients} spaces={spaces} setSpaces={setSpaces} orders={orders} />
        ) : (
          <ProductsView products={products} setProducts={setProducts} />
        )}
      </main>
    </div>
  );
}

export default App;

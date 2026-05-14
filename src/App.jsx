import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  APP_LOCATION,
  APP_NAME,
  APP_SUBTITLE,
  DEFAULT_SELLER,
  CHECKLIST_ITEMS,
  LOGIN_CREDENTIALS,
  PRODUCTS,
  logo,
} from './data/appData';
import ProductsView from './components/ProductsView';
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
};

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
      const discountPercent = Math.max(0, Number(item?.discountPercent) || 0);

      if (!productName || !Number.isFinite(unitPrice)) {
        return null;
      }

      return {
        productId: String(item?.productId || productName),
        productName,
        unitPrice,
        basePrice,
        discountPercent,
        quantity,
        subtotal: unitPrice * quantity,
      };
    })
    .filter(Boolean);
}

function normalizeOrder(order) {
  const status = order?.status === 'Terminado' ? 'Terminado' : 'Pendiente';
  const items = normalizeItems(order?.items);
  const customerContact = String(order?.customerNumber || order?.contactPhone || '');

  return {
    code: String(order?.code || 'PED-0000'),
    createdAt: order?.createdAt || new Date().toISOString(),
    customerName: String(order?.customerName || ''),
    customerRut: String(order?.customerRut || ''),
    customerNumber: customerContact,
    deliveryAddress: String(order?.deliveryAddress || ''),
    contactPhone: customerContact,
    observations: String(order?.observations || ''),
    sellerName: String(order?.sellerName || DEFAULT_SELLER.name),
    sellerRut: String(order?.sellerRut || DEFAULT_SELLER.rut),
    status,
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
    items,
    checklist: normalizeChecklist(order?.checklist),
    showReceipt: Boolean(order?.showReceipt),
  };
}

function loadOrders() {
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.orders, []);
  return Array.isArray(stored) ? stored.map(normalizeOrder) : [];
}

function loadProducts() {
  const stored = readJSON(typeof window === 'undefined' ? null : window.localStorage, STORAGE_KEYS.products, PRODUCTS);
  return normalizeProducts(Array.isArray(stored) ? stored : PRODUCTS);
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
          className={activeView === 'productos' ? 'nav-button is-active' : 'nav-button'}
          onClick={() => onChangeView('productos')}
          aria-current={activeView === 'productos' ? 'page' : undefined}
        >
          Productos
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

function OrderCard({ order, onToggleChecklist, onToggleReceipt, onFinishOrder }) {
  const completed = order.status === 'Terminado';

  return (
    <article className={completed ? 'order-card panel order-card-done' : 'order-card panel'}>
      <div className="order-head">
        <div>
          <p className="eyebrow">{order.code}</p>
          <h3>{order.customerName || 'Pedido sin nombre'}</h3>
          <p className="muted">{formatDateTime(order.createdAt)}</p>
        </div>

        <div className={completed ? 'badge badge-success' : 'badge badge-warning'}>
          {order.status}
        </div>
      </div>

      <div className="order-grid">
        <div>
          <span className="field-label">RUT cliente</span>
          <p>{order.customerRut || '-'}</p>
        </div>
        <div>
          <span className="field-label">Número de cliente / Teléfono o contacto</span>
          <p>{getCustomerContact(order)}</p>
        </div>
        <div>
          <span className="field-label">Dirección de despacho</span>
          <p>{order.deliveryAddress || '-'}</p>
        </div>
        <div>
          <span className="field-label">Vendedor</span>
          <p>{order.sellerName || '-'}</p>
        </div>
        <div>
          <span className="field-label">RUT vendedor</span>
          <p>{order.sellerRut || '-'}</p>
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

      <div className="checklist-block">
        <div className="panel-title compact-title">
          <h4>Checklist</h4>
        </div>

        <div className="checklist-grid">
          {CHECKLIST_ITEMS.map((item) => (
            <label className="check-item" key={item.key}>
              <input
                type="checkbox"
                checked={Boolean(order.checklist[item.key])}
                onChange={(event) => onToggleChecklist(order.code, item.key, event.target.checked)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="order-actions">
        <button className="button button-secondary" type="button" onClick={() => onToggleReceipt(order.code)}>
          {order.showReceipt ? 'Ocultar boleta' : 'Mostrar boleta'}
        </button>

        {!completed ? (
          <button className="button button-primary" type="button" onClick={() => onFinishOrder(order.code)}>
            Marcar como terminado
          </button>
        ) : (
          <span className="done-note">Pedido terminado</span>
        )}
      </div>

      {order.showReceipt ? <Receipt order={order} /> : null}
    </article>
  );
}

function Receipt({ order }) {
  return (
    <section className="receipt">
      <div className="receipt-header">
        <div>
          <h4>{APP_NAME}</h4>
          <p>{APP_LOCATION}</p>
        </div>
        <div className="receipt-code">{order.code}</div>
      </div>

      <div className="receipt-meta">
        <div>
          <span className="field-label">Fecha</span>
          <p>{formatDateTime(order.createdAt)}</p>
        </div>
        <div>
          <span className="field-label">Cliente</span>
          <p>{order.customerName || '-'}</p>
        </div>
        <div>
          <span className="field-label">RUT cliente</span>
          <p>{order.customerRut || '-'}</p>
        </div>
        <div>
          <span className="field-label">Número de cliente / Teléfono o contacto</span>
          <p>{getCustomerContact(order)}</p>
        </div>
        <div>
          <span className="field-label">Dirección</span>
          <p>{order.deliveryAddress || '-'}</p>
        </div>
        <div>
          <span className="field-label">Vendedor</span>
          <p>{order.sellerName || '-'}</p>
        </div>
        <div>
          <span className="field-label">RUT vendedor</span>
          <p>{order.sellerRut || '-'}</p>
        </div>
      </div>

      <div className="receipt-table-wrap">
        <table className="receipt-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="receipt-total">
        <span>Total final</span>
        <strong>{formatCurrency(order.total)}</strong>
      </div>

      <p className="receipt-foot">Documento referencial generado para mockup MVP</p>
    </section>
  );
}

function OrdersView({ orders, setOrders }) {
  const ordered = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pendingOrders = ordered.filter((order) => order.status !== 'Terminado');
  const finishedOrders = ordered.filter((order) => order.status === 'Terminado');

  const toggleChecklist = (code, key, checked) => {
    setOrders((current) =>
      current.map((order) =>
        order.code === code
          ? {
              ...order,
              checklist: {
                ...order.checklist,
                [key]: checked,
              },
            }
          : order,
      ),
    );
  };

  const toggleReceipt = (code) => {
    setOrders((current) =>
      current.map((order) =>
        order.code === code
          ? {
              ...order,
              showReceipt: !order.showReceipt,
            }
          : order,
      ),
    );
  };

  const finishOrder = (code) => {
    setOrders((current) =>
      current.map((order) =>
        order.code === code
          ? {
              ...order,
              status: 'Terminado',
            }
          : order,
      ),
    );
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">Pedidos</p>
        <h2>Gestión de pedidos</h2>
        <p className="muted">Revisa pedidos, marca checklist y cierra los que ya están listos.</p>
      </div>

      {ordered.length === 0 ? (
        <div className="panel empty-orders">
          <h3>No hay pedidos generados todavía</h3>
          <p className="muted">Vuelve a Ventas para crear el primero.</p>
        </div>
      ) : (
        <div className="orders-groups">
          {pendingOrders.length > 0 ? (
            <section className="orders-group">
              <div className="section-heading compact-section-heading">
                <h3>Pendientes</h3>
                <p className="muted">Pedidos que aún están en proceso.</p>
              </div>

              <div className="orders-list">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.code}
                    order={order}
                    onToggleChecklist={toggleChecklist}
                    onToggleReceipt={toggleReceipt}
                    onFinishOrder={finishOrder}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {finishedOrders.length > 0 ? (
            <section className="orders-group">
              <div className="section-heading compact-section-heading">
                <h3>Terminados</h3>
                <p className="muted">Pedidos ya cerrados y listos.</p>
              </div>

              <div className="orders-list">
                {finishedOrders.map((order) => (
                  <OrderCard
                    key={order.code}
                    order={order}
                    onToggleChecklist={toggleChecklist}
                    onToggleReceipt={toggleReceipt}
                    onFinishOrder={finishOrder}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}

function App() {
  const [themeMode, setThemeMode] = useState(() => getInitialThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState(() => getResolvedTheme(getInitialThemeMode()));
  const [authenticated, setAuthenticated] = useState(() => getInitialAuth());
  const [activeView, setActiveView] = useState(() =>
    getInitialAuth()
      ? readString(typeof window === 'undefined' ? null : window.sessionStorage, STORAGE_KEYS.activeView, 'ventas')
      : 'ventas',
  );
  const [orders, setOrders] = useState(() => loadOrders());
  const [products, setProducts] = useState(() => loadProducts());

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
          <SalesWorkspace products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} />
        ) : activeView === 'pedidos' ? (
          <OrdersView orders={orders} setOrders={setOrders} />
        ) : (
          <ProductsView products={products} setProducts={setProducts} />
        )}
      </main>
    </div>
  );
}

export default App;

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SELLER } from '../data/appData';
import { buildProductOptionLabel, getActiveOffer, getCurrentPrice } from '../lib/catalog';

const EMPTY_FORM = {
  clientId: '',
  paymentMethod: '',
  observations: '',
};

const SALE_CHANNELS = {
  terreno: {
    label: 'Venta en Terreno',
    initialStatus: 'Pedido',
  },
  online: {
    label: 'Venta Online',
    initialStatus: 'Cotizado',
  },
};

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currencyFormatter.format(value);
const formatRate = (rate) => `${Math.round(rate * 100)}%`;
const roundMoney = (value) => Math.max(0, Math.round(value));

const getProductById = (products, productId) => products.find((product) => product.id === productId) || null;

const createInitialDraft = (products) => {
  const availableProduct = products.find((product) => product.stock > 0) || products[0] || null;

  return {
    productId: availableProduct?.id || '',
    quantity: 1,
  };
};

const normalizeScales = (volumeScales = []) =>
  volumeScales
    .map((scale) => ({
      id: String(scale?.id || ''),
      label: String(scale?.label || '').trim() || 'Escala',
      minQuantity: Math.max(1, Number(scale?.minQuantity) || 1),
      maxQuantity: Math.max(1, Number(scale?.maxQuantity) || 1),
      discountRate: Math.max(0, Number(scale?.discountRate) || 0),
    }))
    .sort((a, b) => a.minQuantity - b.minQuantity);

const getScaleByQuantity = (quantity, scales) => {
  if (!scales.length) {
    return {
      id: 'default',
      label: 'Sin escala',
      minQuantity: 1,
      maxQuantity: Number.POSITIVE_INFINITY,
      discountRate: 0,
    };
  }

  const match = scales.find((scale) => quantity >= scale.minQuantity && quantity <= scale.maxQuantity);

  if (match) {
    return match;
  }

  return scales[scales.length - 1];
};

const buildPricedItem = (product, quantity, scales) => {
  const activeOffer = getActiveOffer(product);
  const unitPriceBeforeScale = getCurrentPrice(product);
  const appliedScale = getScaleByQuantity(quantity, scales);
  const volumeDiscountRate = Math.max(0, appliedScale.discountRate || 0);
  const unitPrice = roundMoney(unitPriceBeforeScale * (1 - volumeDiscountRate));
  const subtotalBeforeScale = roundMoney(unitPriceBeforeScale * quantity);
  const subtotal = roundMoney(unitPrice * quantity);
  const discountAmount = Math.max(0, subtotalBeforeScale - subtotal);

  return {
    productId: product.id,
    productName: product.name,
    quantity,
    basePrice: product.basePrice,
    offerDiscountPercent: activeOffer?.discountPercent || 0,
    unitPriceBeforeScale,
    unitPrice,
    subtotalBeforeScale,
    subtotal,
    volumeScaleId: appliedScale.id,
    volumeScaleLabel: appliedScale.label,
    volumeDiscountRate,
    volumeDiscountPercent: Math.round(volumeDiscountRate * 100),
    discountAmount,
  };
};

function SalesView({ products, setProducts, orders, setOrders, clients, paymentMethods, volumeScales }) {
  const [saleChannel, setSaleChannel] = useState('terreno');
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState(() => createInitialDraft(products));
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState([]);

  const normalizedScales = useMemo(() => normalizeScales(volumeScales), [volumeScales]);
  const availableProducts = useMemo(() => products.filter((product) => product.stock > 0), [products]);
  const availablePaymentMethods = useMemo(() => paymentMethods || [], [paymentMethods]);
  const activeClients = useMemo(
    () => clients.filter((client) => client.name && (client.status || 'Activo') === 'Activo'),
    [clients],
  );
  const selectedClient = useMemo(
    () => activeClients.find((client) => client.id === form.clientId) || null,
    [activeClients, form.clientId],
  );

  const subtotalBeforeDiscount = useMemo(
    () => items.reduce((sum, item) => sum + (item.subtotalBeforeScale || item.subtotal), 0),
    [items],
  );
  const total = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);
  const totalDiscountAmount = useMemo(() => Math.max(0, subtotalBeforeDiscount - total), [subtotalBeforeDiscount, total]);

  useEffect(() => {
    if (!availableProducts.length) {
      if (draft.productId) {
        setDraft((current) => ({ ...current, productId: '' }));
      }

      return;
    }

    if (!availableProducts.some((product) => product.id === draft.productId)) {
      setDraft((current) => ({ ...current, productId: availableProducts[0].id }));
    }
  }, [availableProducts, draft.productId]);

  const handleFieldChange = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleClientChange = (event) => {
    const clientId = event.target.value;
    setForm((current) => ({ ...current, clientId }));
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
    const product = getProductById(products, draft.productId);

    if (!product) {
      setErrors(['Selecciona un producto disponible.']);
      return;
    }

    if (product.stock <= 0) {
      setErrors(['Ese producto no tiene stock disponible.']);
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setErrors(['La cantidad debe ser un numero entero mayor que 0.']);
      return;
    }

    setErrors([]);

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const nextQuantity = (existing?.quantity || 0) + quantity;

      if (nextQuantity > product.stock) {
        setErrors([`Solo hay ${product.stock} unidades disponibles de ${product.name}.`]);
        return current;
      }

      const pricedItem = buildPricedItem(product, nextQuantity, normalizedScales);

      if (existing) {
        return current.map((item) => (item.productId === product.id ? pricedItem : item));
      }

      return [...current, pricedItem];
    });

    setDraft((current) => ({ ...current, quantity: 1 }));
  };

  const handleRemoveItem = (productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const handleGenerateOrder = (event) => {
    event.preventDefault();

    const nextErrors = [];

    if (!form.clientId) nextErrors.push('Selecciona un cliente para el pedido.');
    if (!form.paymentMethod) nextErrors.push('Selecciona un metodo de pago.');
    if (!selectedClient) nextErrors.push('El cliente seleccionado no esta disponible.');
    if (items.length === 0) nextErrors.push('Agrega al menos un producto al pedido.');

    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      setFeedback(null);
      return;
    }

    const code = `PED-${String(
      orders.reduce((highest, order) => {
        const match = /^PED-(\d{4})$/.exec(order.code);
        return Math.max(highest, match ? Number(match[1]) : 0);
      }, 0) + 1,
    ).padStart(4, '0')}`;

    const initialStatus = SALE_CHANNELS[saleChannel]?.initialStatus || 'Pedido';
    const newOrder = {
      code,
      createdAt: new Date().toISOString(),
      saleChannel,
      customerName: selectedClient?.name || '',
      customerRut: selectedClient?.rut || '',
      customerNumber: selectedClient?.phone || selectedClient?.contact || '',
      contactPhone: selectedClient?.phone || selectedClient?.contact || '',
      deliveryAddress: selectedClient?.address || '',
      observations: form.observations.trim(),
      clientId: form.clientId,
      paymentMethod: form.paymentMethod,
      clientSnapshot: selectedClient
        ? {
            id: selectedClient.id,
            name: selectedClient.name,
            type: selectedClient.type,
            zone: selectedClient.zone,
            sector: selectedClient.sector,
            creditEnabled: Boolean(selectedClient.creditEnabled),
            debt: Number(selectedClient.debt) || 0,
          }
        : null,
      sellerName: DEFAULT_SELLER.name,
      sellerRut: DEFAULT_SELLER.rut,
      status: initialStatus,
      subtotalBeforeDiscount,
      totalDiscountAmount,
      total,
      items,
    };

    setOrders((current) => [...current, newOrder]);

    setProducts((current) =>
      current.map((product) => {
        const soldItem = items.find((item) => item.productId === product.id);

        if (!soldItem) {
          return product;
        }

        return {
          ...product,
          stock: Math.max(0, product.stock - soldItem.quantity),
        };
      }),
    );

    setFeedback({ type: 'success', text: `Pedido generado correctamente. Codigo ${code} en estado ${initialStatus}.` });
    setErrors([]);
    setForm(EMPTY_FORM);
    setDraft(createInitialDraft(products));
    setItems([]);
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">Ventas</p>
        <h2>Crear pedido comercial</h2>
        <p className="muted">Elige cliente, metodo de pago y productos para generar el pedido.</p>
      </div>

      <div className="erp-tabs">
        {Object.entries(SALE_CHANNELS).map(([key, channel]) => (
          <button
            key={key}
            type="button"
            className={saleChannel === key ? 'nav-button is-active' : 'nav-button'}
            onClick={() => setSaleChannel(key)}
          >
            {channel.label}
          </button>
        ))}
      </div>

      <p className="muted">Estado inicial: {SALE_CHANNELS[saleChannel]?.initialStatus || 'Pedido'}.</p>

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
            <p className="muted">El sistema toma automaticamente los datos del cliente seleccionado.</p>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Seleccione al cliente</span>
              <select value={form.clientId} onChange={handleClientChange}>
                <option value="">Selecciona un cliente</option>
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.zone}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-wide">
              <span>Seleccione metodo de pago</span>
              <select value={form.paymentMethod} onChange={handleFieldChange('paymentMethod')}>
                <option value="">Selecciona metodo de pago</option>
                {availablePaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-wide">
              <span>Observaciones opcionales</span>
              <textarea rows="3" value={form.observations} onChange={handleFieldChange('observations')} />
            </label>
          </div>

          <div className="panel-divider" />

          <div className="panel-title">
            <h3>Agregar productos</h3>
            <p className="muted">La escala de volumen se aplica automaticamente por cantidad de cada producto.</p>
          </div>

          <div className="product-builder">
            <label className="field">
              <span>Producto</span>
              <select value={draft.productId} onChange={handleDraftChange('productId')}>
                <option value="">Selecciona un producto</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {buildProductOptionLabel(product)}
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

            <button className="button button-secondary add-button" type="button" onClick={handleAddProduct} disabled={!availableProducts.length}>
              Agregar producto
            </button>
          </div>
        </form>

        <aside className="panel cart-panel">
          <div className="panel-title">
            <h3>Productos agregados</h3>
            <p className="muted">Revisa descuentos por escala y genera el pedido.</p>
          </div>

          {items.length === 0 ? (
            <div className="empty-state empty-state-inline">
              <p>No hay productos agregados todavia.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Escala</th>
                    <th>Unitario</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="item-name-stack">
                          <strong>{item.productName}</strong>
                          <div className="item-name-stack">
                            {item.offerDiscountPercent > 0 ? (
                              <span className="offer-chip offer-chip-active">Oferta {item.offerDiscountPercent}%</span>
                            ) : null}
                            {item.volumeDiscountPercent > 0 ? (
                              <span className="offer-chip offer-chip-active">Escala {item.volumeDiscountPercent}%</span>
                            ) : (
                              <span className="offer-chip">Sin descuento por escala</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        {item.volumeScaleLabel} ({formatRate(item.volumeDiscountRate)})
                      </td>
                      <td>
                        {item.unitPriceBeforeScale > item.unitPrice ? <span className="strike-price">{formatMoney(item.unitPriceBeforeScale)}</span> : null}
                        <div>{formatMoney(item.unitPrice)}</div>
                      </td>
                      <td>
                        {item.subtotalBeforeScale > item.subtotal ? <span className="strike-price">{formatMoney(item.subtotalBeforeScale)}</span> : null}
                        <div>{formatMoney(item.subtotal)}</div>
                      </td>
                      <td>
                        <button className="icon-button" type="button" onClick={() => handleRemoveItem(item.productId)} aria-label={`Eliminar ${item.productName}`}>
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
            <div>
              <span>Total general</span>
              {totalDiscountAmount > 0 ? <p className="muted">Descuento por escala aplicado: -{formatMoney(totalDiscountAmount)}</p> : null}
            </div>
            <strong>{formatMoney(total)}</strong>
          </div>

          <button className="button button-primary button-full" type="submit" form="sales-form">
            Generar pedido
          </button>
        </aside>
      </div>
    </section>
  );
}

export default SalesView;

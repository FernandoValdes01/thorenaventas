import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SELLER, CHECKLIST_ITEMS } from '../data/appData';
import {
  buildProductOptionLabel,
  getActiveOffer,
  getCurrentPrice,
} from '../lib/catalog';

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

const formatDateTime = (value) => dateTimeFormatter.format(new Date(value));

const formatMoney = (value) => currencyFormatter.format(value);

const getProductById = (products, productId) => products.find((product) => product.id === productId) || null;

const createInitialDraft = (products) => {
  const availableProduct = products.find((product) => product.stock > 0) || products[0] || null;

  return {
    productId: availableProduct?.id || '',
    quantity: 1,
  };
};

function SalesView({ products, setProducts, orders, setOrders }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState(() => createInitialDraft(products));
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState([]);

  const availableProducts = useMemo(() => products.filter((product) => product.stock > 0), [products]);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

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
      setErrors(['La cantidad debe ser un número entero mayor que 0.']);
      return;
    }

    if (quantity > product.stock) {
      setErrors([`Solo hay ${product.stock} unidades disponibles de ${product.name}.`]);
      return;
    }

    setErrors([]);

    const activeOffer = getActiveOffer(product);
    const unitPrice = getCurrentPrice(product);

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
          unitPrice,
          basePrice: product.basePrice,
          discountPercent: activeOffer?.discountPercent || 0,
          quantity,
          subtotal: unitPrice * quantity,
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

    const code = `PED-${String(
      orders.reduce((highest, order) => {
        const match = /^PED-(\d{4})$/.exec(order.code);
        return Math.max(highest, match ? Number(match[1]) : 0);
      }, 0) + 1,
    ).padStart(4, '0')}`;

    const newOrder = {
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
      total,
      items,
      checklist: CHECKLIST_ITEMS.reduce((acc, item) => {
        acc[item.key] = false;
        return acc;
      }, {}),
      showReceipt: false,
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

    setFeedback({ type: 'success', text: `Pedido generado correctamente. Código ${code}.` });
    setErrors([]);
    setForm(EMPTY_FORM);
    setDraft(createInitialDraft(products));
    setItems([]);
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">Ventas</p>
        <h2>Crear pedido en terreno</h2>
        <p className="muted">Completa los datos, agrega productos y genera el pedido para enviarlo a gestión.</p>
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
              <textarea rows="3" value={form.observations} onChange={handleFieldChange('observations')} />
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
                      <td>
                        <div className="item-name-stack">
                          <strong>{item.productName}</strong>
                          {item.discountPercent > 0 ? <span className="offer-chip offer-chip-active">{item.discountPercent}% desc.</span> : null}
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unitPrice)}</td>
                      <td>{formatMoney(item.subtotal)}</td>
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
            <span>Total general</span>
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

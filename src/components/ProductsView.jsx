import { useMemo } from 'react';

const INVENTORY_STATUS = {
  out: {
    label: 'Sin stock',
    cardClass: 'inventory-card-out',
  },
  low: {
    label: 'Bajo',
    cardClass: 'inventory-card-low',
  },
  ok: {
    label: 'OK',
    cardClass: 'inventory-card-ok',
  },
};

const statusOrder = ['out', 'low', 'ok'];

function getEstimatedMinStock(product) {
  const explicitMin = Number(product?.stockMin);

  if (Number.isFinite(explicitMin) && explicitMin > 0) {
    return Math.round(explicitMin);
  }

  const stock = Math.max(0, Number(product?.stock) || 0);
  return Math.max(5, Math.ceil(stock * 0.25));
}

function resolveInventoryStatus(stock, stockMin) {
  if (stock <= 0) return 'out';
  if (stock <= stockMin) return 'low';
  return 'ok';
}

function ProductsView({ products }) {
  const inventoryCards = useMemo(
    () =>
      products
        .map((product) => {
          const stock = Math.max(0, Number(product.stock) || 0);
          const stockMin = getEstimatedMinStock(product);
          const statusKey = resolveInventoryStatus(stock, stockMin);

          return {
            id: product.id,
            name: product.name,
            category: product.category || 'General',
            stock,
            stockMin,
            statusKey,
            statusLabel: INVENTORY_STATUS[statusKey].label,
            cardClass: INVENTORY_STATUS[statusKey].cardClass,
          };
        })
        .sort((a, b) => statusOrder.indexOf(a.statusKey) - statusOrder.indexOf(b.statusKey) || a.name.localeCompare(b.name)),
    [products],
  );

  const summary = useMemo(
    () =>
      inventoryCards.reduce(
        (acc, card) => {
          acc[card.statusKey] += 1;
          return acc;
        },
        { out: 0, low: 0, ok: 0 },
      ),
    [inventoryCards],
  );

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">Inventario</p>
        <h2>Estado de stock</h2>
        <p className="muted">Vista rápida de productos según stock actual versus mínimo ERP.</p>
      </div>

      <div className="status-summary-list" aria-label="Resumen de estado de inventario">
        <span className="offer-chip">Sin stock: {summary.out}</span>
        <span className="offer-chip">Bajo: {summary.low}</span>
        <span className="offer-chip">OK: {summary.ok}</span>
      </div>

      <div className="inventory-grid">
        {inventoryCards.length === 0 ? (
          <div className="panel empty-products">
            <h3>No hay productos en inventario</h3>
            <p className="muted">Carga o sincroniza productos desde ERP para ver el estado.</p>
          </div>
        ) : (
          inventoryCards.map((card) => (
            <article className={`panel inventory-card ${card.cardClass}`} key={card.id}>
              <div className="inventory-card-head">
                <div>
                  <p className="eyebrow">{card.category}</p>
                  <h3>{card.name}</h3>
                </div>
                <span className="inventory-status-chip">{card.statusLabel}</span>
              </div>

              <div className="inventory-metrics">
                <div>
                  <span className="field-label">Stock actual</span>
                  <strong>{card.stock}</strong>
                </div>
                <div>
                  <span className="field-label">Stock mínimo</span>
                  <strong>{card.stockMin}</strong>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default ProductsView;

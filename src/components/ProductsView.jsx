import { useEffect, useState } from 'react';
import {
  buildProductOptionLabel,
  formatCurrency,
  formatOfferSummary,
  getActiveOffer,
  getCurrentPrice,
  mergeProductList,
  parseProductsFromExcelFile,
  updateProductOffer,
} from '../lib/catalog';

const INITIAL_PRODUCT_FORM = {
  name: '',
  category: 'General',
  stock: '',
  basePrice: '',
};

const INITIAL_OFFER_FORM = {
  productId: '',
  mode: 'date',
  discountPercent: '15',
  endDate: '',
};

function ProductsView({ products, setProducts }) {
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [offerForm, setOfferForm] = useState(INITIAL_OFFER_FORM);
  const [feedback, setFeedback] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!products.length) {
      return;
    }

    setOfferForm((current) =>
      current.productId && products.some((product) => product.id === current.productId)
        ? current
        : { ...current, productId: products[0].id },
    );
  }, [products]);

  const handleProductChange = (key) => (event) => {
    setProductForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleOfferChange = (key) => (event) => {
    setOfferForm((current) => ({ ...current, [key]: event.target.value }));
    setFeedback(null);
  };

  const handleAddProduct = (event) => {
    event.preventDefault();

    const name = productForm.name.trim();
    const category = productForm.category.trim() || 'General';
    const stock = Number(productForm.stock);
    const basePrice = Number(productForm.basePrice);

    if (!name) {
      setFeedback({ type: 'error', text: 'Ingresa el nombre del producto.' });
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setFeedback({ type: 'error', text: 'La cantidad debe ser un número entero mayor o igual a 0.' });
      return;
    }

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      setFeedback({ type: 'error', text: 'El precio debe ser un número válido.' });
      return;
    }

    setProducts((current) =>
      mergeProductList(current, {
        name,
        category,
        stock,
        basePrice,
      }),
    );

    setFeedback({ type: 'success', text: 'Producto agregado correctamente.' });
    setProductForm(INITIAL_PRODUCT_FORM);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setImporting(true);
    setFeedback(null);

    try {
      const importedProducts = await parseProductsFromExcelFile(file);

      if (!importedProducts.length) {
        setFeedback({ type: 'error', text: 'El archivo no contenía filas válidas.' });
        return;
      }

      setProducts((current) => importedProducts.reduce((list, product) => mergeProductList(list, product), current));
      setFeedback({ type: 'success', text: `Se importaron ${importedProducts.length} productos desde Excel.` });
    } catch {
      setFeedback({ type: 'error', text: 'No se pudo leer el archivo Excel.' });
    } finally {
      setImporting(false);
    }
  };

  const handleOfferSubmit = (event) => {
    event.preventDefault();

    if (!offerForm.productId) {
      setFeedback({ type: 'error', text: 'Selecciona un producto para la oferta.' });
      return;
    }

    const discountPercent = Number(offerForm.discountPercent);

    if (offerForm.mode !== 'none' && (!Number.isInteger(discountPercent) || discountPercent <= 0)) {
      setFeedback({ type: 'error', text: 'El descuento debe ser un número entero mayor que 0.' });
      return;
    }

    if (offerForm.mode === 'date' && !offerForm.endDate) {
      setFeedback({ type: 'error', text: 'Define una fecha de término para la oferta.' });
      return;
    }

    setProducts((current) =>
      updateProductOffer(current, offerForm.productId, {
        mode: offerForm.mode,
        discountPercent: offerForm.mode === 'none' ? 0 : discountPercent,
        endDate: offerForm.endDate,
      }),
    );

    setFeedback({ type: 'success', text: 'Oferta guardada correctamente.' });
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <p className="eyebrow">Productos</p>
        <h2>Administración de productos</h2>
        <p className="muted">Crea productos, importa desde Excel y configura ofertas por fecha o stock.</p>
      </div>

      {feedback ? (
        <div className={`notice notice-${feedback.type}`} role="status">
          {feedback.text}
        </div>
      ) : null}

      <div className="products-layout">
        <div className="panel products-forms-panel">
          <form className="products-form" onSubmit={handleAddProduct}>
            <div className="panel-title">
              <h3>Alta manual</h3>
              <p className="muted">Añade nombre, categoría, cantidad y precio.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Nombre</span>
                <input value={productForm.name} onChange={handleProductChange('name')} />
              </label>

              <label className="field">
                <span>Categoría</span>
                <input value={productForm.category} onChange={handleProductChange('category')} />
              </label>

              <label className="field">
                <span>Cantidad</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={productForm.stock}
                  onChange={handleProductChange('stock')}
                />
              </label>

              <label className="field field-wide">
                <span>Precio</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={productForm.basePrice}
                  onChange={handleProductChange('basePrice')}
                />
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Agregar producto
            </button>
          </form>

          <div className="panel-divider" />

          <div className="products-import">
            <div className="panel-title">
              <h3>Cargar Excel</h3>
              <p className="muted">Columnas admitidas: nombre, categoría, cantidad y precio.</p>
            </div>

            <label className="file-dropzone">
              <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} />
              <span>{importing ? 'Procesando archivo...' : 'Seleccionar archivo Excel'}</span>
            </label>
          </div>

          <div className="panel-divider" />

          <form className="products-form" onSubmit={handleOfferSubmit}>
            <div className="panel-title">
              <h3>Crear oferta</h3>
              <p className="muted">Aplica descuento por fecha o hasta agotar stock.</p>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Producto</span>
                <select value={offerForm.productId} onChange={handleOfferChange('productId')}>
                  <option value="">Selecciona un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {buildProductOptionLabel(product)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Tipo</span>
                <select value={offerForm.mode} onChange={handleOfferChange('mode')}>
                  <option value="date">Hasta una fecha</option>
                  <option value="stock">Hasta agotar stock</option>
                  <option value="none">Sin oferta</option>
                </select>
              </label>

              <label className="field">
                <span>Descuento %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  inputMode="numeric"
                  value={offerForm.discountPercent}
                  onChange={handleOfferChange('discountPercent')}
                />
              </label>

              {offerForm.mode === 'date' ? (
                <label className="field field-wide">
                  <span>Fecha de término</span>
                  <input type="date" value={offerForm.endDate} onChange={handleOfferChange('endDate')} />
                </label>
              ) : null}
            </div>

            <button className="button button-secondary" type="submit">
              Guardar oferta
            </button>
          </form>
        </div>

        <div className="products-grid">
          {products.length === 0 ? (
            <div className="panel empty-products">
              <h3>No hay productos cargados</h3>
              <p className="muted">Agrega uno manualmente o importa un Excel.</p>
            </div>
          ) : (
            products.map((product) => {
              const activeOffer = getActiveOffer(product);
              const currentPrice = getCurrentPrice(product);

              return (
                <article className="panel product-card" key={product.id}>
                  <div className="product-card-head">
                    <div>
                      <p className="eyebrow">{product.category}</p>
                      <h3>{product.name}</h3>
                    </div>

                    <span className={product.stock > 0 ? 'badge badge-success' : 'badge badge-warning'}>
                      {product.stock > 0 ? `${product.stock} en stock` : 'Sin stock'}
                    </span>
                  </div>

                  <div className="product-price-stack">
                    {activeOffer ? (
                      <>
                        <span className="strike-price">{formatCurrency(product.basePrice)}</span>
                        <strong>{formatCurrency(currentPrice)}</strong>
                      </>
                    ) : (
                      <strong>{formatCurrency(currentPrice)}</strong>
                    )}

                    <span className={activeOffer ? 'offer-chip offer-chip-active' : 'offer-chip'}>
                      {activeOffer ? `${activeOffer.discountPercent}% descuento` : 'Sin oferta'}
                    </span>
                  </div>

                  <p className="product-meta">{formatOfferSummary(product)}</p>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductsView;

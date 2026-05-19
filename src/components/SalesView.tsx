import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_SELLER, logo as logoUrl } from '../data/appData';
import { buildProductOptionLabel, getActiveOffer, getCurrentPrice } from '../lib/catalog';
import { ordersService } from '../services/orders.service';

const DEFAULT_COMPANY_INFO = {
  name: 'Thorena Comercial',
  address: 'Luis Advis 1415, Villarrica, Chile',
  rut: '76.123.456-7',
  phone: '+56 9 7479 7740',
  email: 'thorenatravel@gmail.com',
};

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
  oficina: {
    label: 'Venta Oficina',
    initialStatus: 'Pagado',
  },
};

const OFFICE_PAYMENT_METHODS = ['Efectivo', 'Debito', 'Credito', 'Transferencia'];

const NATURAL_CLIENT_ID = 'CLI-NATURAL';
const NATURAL_CLIENT = {
  id: NATURAL_CLIENT_ID,
  name: 'Cliente natural',
  type: 'Cliente natural',
  rut: '',
  phone: '',
  contact: '',
  address: '',
  zone: '',
  sector: '',
  status: 'Activo',
  creditEnabled: false,
  debt: 0,
};

const QUOTE_DATA_MARKER_START = 'THORENA_QUOTE_DATA_BEGIN:';
const QUOTE_DATA_MARKER_END = ':THORENA_QUOTE_DATA_END';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currencyFormatter.format(value);
const formatRate = (rate) => `${Math.round(rate * 100)}%`;
const roundMoney = (value) => Math.max(0, Math.round(value));

const encodeQuotePayload = (payload) => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return '';
  }
};

const decodeQuotePayload = (encoded) => {
  try {
    const decoded = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const PDF_COLORS = {
  navy: [22, 45, 86],
  slate: [95, 106, 124],
  softBg: [246, 248, 251],
  border: [221, 226, 234],
  white: [255, 255, 255],
  accent: [16, 70, 140],
};

const loadImageAsDataUrl = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('No se pudo inicializar canvas.'));
          return;
        }

        context.drawImage(image, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: image.width,
          height: image.height,
        });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('No se pudo cargar el logo para PDF.'));
    image.src = src;
  });

const drawContainedImage = (pdf, image, x, y, width, height, padding = 2) => {
  if (!image?.dataUrl || !image?.width || !image?.height) {
    return;
  }

  const maxWidth = Math.max(1, width - padding * 2);
  const maxHeight = Math.max(1, height - padding * 2);
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  pdf.addImage(image.dataUrl, 'PNG', drawX, drawY, drawWidth, drawHeight);
};

const drawCard = (pdf, { x, y, width, height, title, rows }) => {
  pdf.setDrawColor(...PDF_COLORS.border);
  pdf.setFillColor(...PDF_COLORS.white);
  pdf.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');

  pdf.setFillColor(...PDF_COLORS.softBg);
  pdf.roundedRect(x, y, width, 8, 2.5, 2.5, 'F');

  pdf.setTextColor(...PDF_COLORS.navy);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(title, x + 4, y + 5.4);

  pdf.setTextColor(...PDF_COLORS.slate);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  let lineY = y + 12;
  rows.forEach((row) => {
    if (lineY > y + height - 3) {
      return;
    }

    const [label, value] = row;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, x + 4, lineY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(value || '-'), x + 26, lineY);
    lineY += 5.4;
  });
};

const getProductById = (products, productId) => products.find((product) => product.id === productId) || null;

const createInitialDraft = (products) => {
  const availableProduct = products.find((product) => product.stock > 0) || products[0] || null;

  return {
    productId: availableProduct?.id || '',
    quantity: 1,
  };
};

const getNextOrderCode = (orders) =>
  `PED-${String(
    orders.reduce((highest, order) => {
      const match = /^PED-(\d{4})$/.exec(order.code);
      return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0) + 1,
  ).padStart(4, '0')}`;

const isValidOrderDraft = ({ form, selectedClient, items }) => {
  const nextErrors = [];

  if (!form.clientId) nextErrors.push('Selecciona un cliente para el pedido.');
  if (!form.paymentMethod) nextErrors.push('Selecciona un metodo de pago.');
  if (!selectedClient) nextErrors.push('El cliente seleccionado no esta disponible.');
  if (items.length === 0) nextErrors.push('Agrega al menos un producto al pedido.');

  return nextErrors;
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

function SalesView({ products, setProducts, productsFull, setProductsFull, orders, setOrders, setSales, clients, paymentMethods, volumeScales, cityRates, companyInfo }) {
  const [saleChannel, setSaleChannel] = useState('terreno');
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState(() => createInitialDraft(products));
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState([]);
  const [downloadingQuote, setDownloadingQuote] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const company = useMemo(() => ({ ...DEFAULT_COMPANY_INFO, ...(companyInfo || {}) }), [companyInfo]);

  const normalizedScales = useMemo(() => normalizeScales(volumeScales), [volumeScales]);
  const availableProducts = useMemo(() => products.filter((product) => product.stock > 0), [products]);
  const availablePaymentMethods = useMemo(() => paymentMethods || [], [paymentMethods]);
  const normalizedCityRates = useMemo(
    () =>
      (cityRates || [])
        .map((item) => ({ city: String(item?.city || '').trim(), rate: Math.max(0, Number(item?.rate) || 0) }))
        .filter((item) => item.city),
    [cityRates],
  );
  const activeClients = useMemo(() => {
    const normalized = clients.filter((client) => client.name && (client.status || 'Activo') === 'Activo');
    if (normalized.some((client) => client.id === NATURAL_CLIENT_ID)) {
      return normalized;
    }
    return [NATURAL_CLIENT, ...normalized];
  }, [clients]);
  const availablePaymentMethodsByChannel = useMemo(() => {
    if (saleChannel === 'oficina') {
      return OFFICE_PAYMENT_METHODS;
    }
    return availablePaymentMethods;
  }, [availablePaymentMethods, saleChannel]);
  const selectedClient = useMemo(
    () => activeClients.find((client) => client.id === form.clientId) || null,
    [activeClients, form.clientId],
  );
  const selectedCity = useMemo(() => String(selectedClient?.zone || '').trim(), [selectedClient?.zone]);
  const dispatchRate = useMemo(() => {
    if (saleChannel === 'oficina') {
      return 0;
    }

    const cityKey = normalizeText(selectedCity);
    if (!cityKey || cityKey === 'villarrica') {
      return 0;
    }
    const match = normalizedCityRates.find((item) => normalizeText(item.city) === cityKey);
    return Math.max(0, match?.rate || 0);
  }, [normalizedCityRates, selectedCity, saleChannel]);

  const subtotalBeforeDiscount = useMemo(
    () => items.reduce((sum, item) => sum + (item.subtotalBeforeScale || item.subtotal), 0),
    [items],
  );
  const itemsTotal = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);
  const totalDiscountAmount = useMemo(() => Math.max(0, subtotalBeforeDiscount - itemsTotal), [subtotalBeforeDiscount, itemsTotal]);
  const dispatchSurcharge = useMemo(() => roundMoney(itemsTotal * dispatchRate), [itemsTotal, dispatchRate]);
  const total = useMemo(() => itemsTotal + dispatchSurcharge, [itemsTotal, dispatchSurcharge]);

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

  useEffect(() => {
    if (!availablePaymentMethodsByChannel.length) {
      if (form.paymentMethod) {
        setForm((current) => ({ ...current, paymentMethod: '' }));
      }
      return;
    }

    if (!availablePaymentMethodsByChannel.includes(form.paymentMethod)) {
      setForm((current) => ({ ...current, paymentMethod: availablePaymentMethodsByChannel[0] }));
    }
  }, [availablePaymentMethodsByChannel, form.paymentMethod]);

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

  const buildDraftPayload = ({ status, includeCode = false }) => ({
    ...(includeCode ? { code: getNextOrderCode(orders) } : {}),
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
    status,
    subtotalBeforeDiscount,
    totalDiscountAmount,
    dispatchCity: selectedCity,
    dispatchRate,
    dispatchSurcharge,
    itemsTotal,
    total,
    items,
  });

  const buildOrderPayload = (status) => buildDraftPayload({ status, includeCode: true });

  const handleLoadQuote = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setLoadingQuote(true);
    setFeedback(null);

    try {
      const buffer = await file.arrayBuffer();
      const content = new TextDecoder('latin1').decode(buffer);
      const startIndex = content.indexOf(QUOTE_DATA_MARKER_START);
      const endIndex = content.indexOf(QUOTE_DATA_MARKER_END, startIndex + QUOTE_DATA_MARKER_START.length);

      if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
        throw new Error('Formato no compatible.');
      }

      const encoded = content
        .slice(startIndex + QUOTE_DATA_MARKER_START.length, endIndex)
        .replace(/\\/g, '')
        .trim();
      const payload = decodeQuotePayload(encoded);

      if (!payload || !Array.isArray(payload.items)) {
        throw new Error('Contenido de cotizacion invalido.');
      }

      const nextChannel = payload.saleChannel === 'oficina' ? 'oficina' : 'online';
      setSaleChannel(nextChannel);

      const nextPaymentMethod = payload.paymentMethod || '';
      const validPaymentMethod =
        nextChannel === 'oficina'
          ? OFFICE_PAYMENT_METHODS.includes(nextPaymentMethod)
            ? nextPaymentMethod
            : OFFICE_PAYMENT_METHODS[0]
          : nextPaymentMethod;

      setForm({
        clientId: payload.clientId || '',
        paymentMethod: validPaymentMethod,
        observations: String(payload.observations || ''),
      });

      const rebuiltItems = payload.items
        .map((item) => {
          const product = getProductById(products, item.productId);
          const quantity = Math.max(1, Number(item.quantity) || 1);
          if (!product) {
            return null;
          }
          return buildPricedItem(product, quantity, normalizedScales);
        })
        .filter(Boolean);

      if (!rebuiltItems.length) {
        throw new Error('No se encontraron productos vigentes en la cotizacion.');
      }

      setItems(rebuiltItems);
      setErrors([]);
      setFeedback({ type: 'success', text: 'Cotizacion cargada correctamente. Ya puedes generar el pedido.' });
    } catch {
      setFeedback({ type: 'error', text: 'No se pudo cargar la cotizacion PDF.' });
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleDownloadQuote = async () => {
    const nextErrors = isValidOrderDraft({ form, selectedClient, items });
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      setFeedback(null);
      return;
    }

    const quoteStatus = SALE_CHANNELS.online.initialStatus;
    const draftOrder = buildDraftPayload({ status: quoteStatus, includeCode: false });
    const client = draftOrder.clientSnapshot || selectedClient;

    setDownloadingQuote(true);
    setFeedback(null);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const top = 12;

      let logoImage = null;
      try {
        logoImage = await loadImageAsDataUrl(logoUrl);
      } catch {
        logoImage = null;
      }

      pdf.setFillColor(...PDF_COLORS.softBg);
      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.roundedRect(margin, top, contentWidth, 34, 3, 3, 'FD');

      const logoBox = {
        x: margin + 4,
        y: top + 4,
        width: 44,
        height: 26,
      };

      pdf.setFillColor(...PDF_COLORS.white);
      pdf.roundedRect(logoBox.x, logoBox.y, logoBox.width, logoBox.height, 2.5, 2.5, 'FD');
      drawContainedImage(pdf, logoImage, logoBox.x, logoBox.y, logoBox.width, logoBox.height, 2);

      const headingX = logoBox.x + logoBox.width + 6;
      pdf.setTextColor(...PDF_COLORS.navy);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('Cotización Comercial', headingX, top + 12);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...PDF_COLORS.slate);
      pdf.text(`Canal: ${SALE_CHANNELS[draftOrder.saleChannel]?.label || 'Venta Online'}`, headingX, top + 20);
      pdf.text(`Fecha: ${new Date(draftOrder.createdAt).toLocaleString('es-CL')}`, headingX, top + 26);

      const cardsTop = top + 40;
      const gap = 6;
      const halfCardWidth = (contentWidth - gap) / 2;
      const cardHeight = 36;

      drawCard(pdf, {
        x: margin,
        y: cardsTop,
        width: halfCardWidth,
        height: cardHeight,
        title: '1. Datos de Thorena',
        rows: [
          ['Nombre', company.name],
          ['Dirección', company.address],
          ['RUT', company.rut],
          ['Teléfono', company.phone],
          ['Correo', company.email],
        ],
      });

      drawCard(pdf, {
        x: margin + halfCardWidth + gap,
        y: cardsTop,
        width: halfCardWidth,
        height: cardHeight,
        title: '2. Datos del cliente',
        rows: [
          ['Nombre', draftOrder.customerName || '-'],
          ['RUT', draftOrder.customerRut || '-'],
          ['Dirección', draftOrder.deliveryAddress || '-'],
          ['Teléfono', draftOrder.customerNumber || '-'],
          ['Zona/Sector', `${client?.zone || '-'} / ${client?.sector || '-'}`],
        ],
      });

      const conditionsTop = cardsTop + cardHeight + 6;
      const defaultObservations = 'Precios sujetos a disponibilidad de stock.';
      const commercialConditions = {
        paymentMethod: draftOrder.paymentMethod || 'Por definir',
        validity: '7 días',
        deliveryTerm: 'Según disponibilidad',
        owner: draftOrder.sellerName && draftOrder.sellerName !== '-' ? draftOrder.sellerName : 'Thorena Comercial',
        observations: draftOrder.observations || defaultObservations,
      };

      const conditionRows = [
        ['Método de pago', commercialConditions.paymentMethod],
        ['Validez', commercialConditions.validity],
        ['Plazo de entrega', commercialConditions.deliveryTerm],
        ['Responsable', commercialConditions.owner],
        ['Observaciones', commercialConditions.observations],
      ];

      const conditionsCard = {
        x: margin,
        y: conditionsTop,
        width: contentWidth,
      };

      const labelOffsetX = 4;
      const valueOffsetX = 42;
      const lineHeight = 4.1;
      const rowSpacing = 1.8;
      const bodyStartY = conditionsCard.y + 12;
      const valueWidth = conditionsCard.width - valueOffsetX - 4;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      const preparedConditionRows = conditionRows.map(([label, value]) => ({
        label,
        lines: pdf.splitTextToSize(String(value || '-'), valueWidth),
      }));

      const bodyHeight = preparedConditionRows.reduce(
        (sum, row) => sum + Math.max(1, row.lines.length) * lineHeight + rowSpacing,
        0,
      );

      const conditionsHeight = Math.max(34, 12 + bodyHeight + 2);

      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.setFillColor(...PDF_COLORS.white);
      pdf.roundedRect(conditionsCard.x, conditionsCard.y, conditionsCard.width, conditionsHeight, 2.5, 2.5, 'FD');

      pdf.setFillColor(...PDF_COLORS.softBg);
      pdf.roundedRect(conditionsCard.x, conditionsCard.y, conditionsCard.width, 8, 2.5, 2.5, 'F');

      pdf.setTextColor(...PDF_COLORS.navy);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('3. Condiciones comerciales', conditionsCard.x + 4, conditionsCard.y + 5.4);

      pdf.setTextColor(...PDF_COLORS.slate);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      let rowY = bodyStartY;
      preparedConditionRows.forEach((row) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${row.label}:`, conditionsCard.x + labelOffsetX, rowY);

        pdf.setFont('helvetica', 'normal');
        pdf.text(row.lines, conditionsCard.x + valueOffsetX, rowY);

        rowY += Math.max(1, row.lines.length) * lineHeight + rowSpacing;
      });

      const tableStartY = conditionsCard.y + conditionsHeight + 6;
      autoTable(pdf, {
        startY: tableStartY,
        head: [['Producto', 'Cant.', 'Descuento por cantidad', 'Descuento', 'Unitario', 'Subtotal']],
        body: draftOrder.items.map((item) => [
          item.productName,
          item.quantity,
          `${item.volumeDiscountPercent || 0}%`,
          item.discountAmount > 0 ? `-${formatMoney(item.discountAmount)}` : formatMoney(0),
          formatMoney(item.unitPrice),
          formatMoney(item.subtotal),
        ]),
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: PDF_COLORS.border,
          textColor: [45, 56, 72],
        },
        headStyles: {
          fillColor: PDF_COLORS.navy,
          textColor: PDF_COLORS.white,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [250, 252, 255],
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 66 },
          1: { halign: 'center', cellWidth: 16 },
          2: { halign: 'right', cellWidth: 32 },
          3: { halign: 'right', cellWidth: 24 },
          4: { halign: 'right', cellWidth: 24 },
          5: { halign: 'right', cellWidth: 24 },
        },
      });

      let summaryTop = (pdf.lastAutoTable?.finalY || tableStartY) + 7;
      const summaryWidth = 74;
      const summaryHeight = 39;
      const footerReserve = 30;

      if (summaryTop + summaryHeight + footerReserve > pageHeight) {
        pdf.addPage('a4', 'portrait');
        summaryTop = margin;
      }

      const summaryX = pageWidth - margin - summaryWidth;

      pdf.setFillColor(...PDF_COLORS.softBg);
      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.roundedRect(summaryX, summaryTop, summaryWidth, summaryHeight, 2.5, 2.5, 'FD');

      pdf.setTextColor(...PDF_COLORS.navy);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Resumen financiero', summaryX + 4, summaryTop + 6);

      const valueX = summaryX + summaryWidth - 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...PDF_COLORS.slate);
      pdf.text('Subtotal sin descuento', summaryX + 4, summaryTop + 12);
      pdf.text(formatMoney(draftOrder.subtotalBeforeDiscount || draftOrder.total), valueX, summaryTop + 12, { align: 'right' });

      pdf.text('Descuento por escala', summaryX + 4, summaryTop + 18);
      pdf.text(`-${formatMoney(draftOrder.totalDiscountAmount || 0)}`, valueX, summaryTop + 18, { align: 'right' });

      pdf.text(`Despacho ${Math.round((draftOrder.dispatchRate || 0) * 100)}%`, summaryX + 4, summaryTop + 24);
      pdf.text(formatMoney(draftOrder.dispatchSurcharge || 0), valueX, summaryTop + 24, { align: 'right' });

      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.line(summaryX + 4, summaryTop + 27, summaryX + summaryWidth - 4, summaryTop + 27);

      pdf.setTextColor(...PDF_COLORS.accent);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Total cotizado', summaryX + 4, summaryTop + 35);
      pdf.text(formatMoney(draftOrder.total), valueX, summaryTop + 35, { align: 'right' });

      const footerY = pageHeight - 16;
      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.3);
      pdf.setTextColor(...PDF_COLORS.slate);
      pdf.text('Documento no tributario. Esta cotización no constituye boleta ni factura.', pageWidth / 2, footerY - 1.5, {
        align: 'center',
      });

      pdf.text(
        `${company.email}  |  ${company.phone}  |  ${company.address}`,
        pageWidth / 2,
        footerY + 3.8,
        { align: 'center' },
      );

      const quoteExportPayload = {
        createdAt: draftOrder.createdAt,
        saleChannel: draftOrder.saleChannel,
        clientId: draftOrder.clientId,
        paymentMethod: draftOrder.paymentMethod,
        observations: draftOrder.observations,
        dispatchCity: draftOrder.dispatchCity,
        dispatchRate: draftOrder.dispatchRate,
        dispatchSurcharge: draftOrder.dispatchSurcharge,
        itemsTotal: draftOrder.itemsTotal,
        total: draftOrder.total,
        items: draftOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };
      const encodedQuotePayload = encodeQuotePayload(quoteExportPayload);
      if (encodedQuotePayload) {
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(1);
        pdf.text(`${QUOTE_DATA_MARKER_START}${encodedQuotePayload}${QUOTE_DATA_MARKER_END}`, margin, pageHeight - 1);
      }

      const safeClientName = (draftOrder.customerName || 'cliente').toLowerCase().replace(/\s+/g, '-');
      const safeDate = new Date(draftOrder.createdAt).toISOString().slice(0, 10);
      const fileName = `cotizacion-${safeClientName}-${safeDate}.pdf`;
      pdf.save(fileName);
      setFeedback({ type: 'success', text: `Cotización descargada correctamente (${fileName}).` });
    } catch {
      setFeedback({ type: 'error', text: 'No se pudo generar la cotizacion PDF.' });
    } finally {
      setDownloadingQuote(false);
    }
  };

  const handleGenerateOrder = async (event) => {
    event.preventDefault();

    const nextErrors = isValidOrderDraft({ form, selectedClient, items });

    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      setFeedback(null);
      return;
    }

    const initialStatus = SALE_CHANNELS[saleChannel]?.initialStatus || 'Pedido';
    const newOrder = buildOrderPayload(initialStatus);
    const saveResult = await ordersService.create(newOrder);

    if (!saveResult.success) {
      setFeedback({ type: 'error', text: `No se pudo guardar pedido en base de datos: ${saveResult.error.message}` });
      return;
    }

    const savedOrder = saveResult.data || newOrder;

    setOrders((current) => [...current, savedOrder]);

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

    if (setProductsFull) {
      setProductsFull((current) =>
        current.map((product) => {
          const soldItem = items.find((item) => item.productId === product.id || item.productId === product.sku);

          if (!soldItem) {
            return product;
          }

          return {
            ...product,
            stock: Math.max(0, Number(product.stock) - soldItem.quantity),
          };
        }),
      );
    }

    if (initialStatus === 'Pagado' && setSales) {
      const productCostByKey = new Map();
      (productsFull || []).forEach((product) => {
        const cost = Math.max(0, Number(product.finalCost ?? product.purchaseCost) || 0);
        [product.id, product.sku, product.product, product.name].filter(Boolean).forEach((key) => productCostByKey.set(String(key), cost));
      });

      const saleRows = newOrder.items.map((item, index) => {
        const sale = Math.max(0, Number(item.subtotal) || 0);
        const unitCost = productCostByKey.get(String(item.productId)) ?? productCostByKey.get(String(item.productName)) ?? 0;
        const cost = Math.max(0, unitCost * item.quantity);
        const profit = Math.max(0, sale - cost);
        return {
          id: `ven-${newOrder.code}-${index}`,
          date: String(newOrder.createdAt).slice(0, 10),
          client: newOrder.customerName,
          zone: newOrder.clientSnapshot?.zone || newOrder.dispatchCity || 'Sin zona',
          sector: newOrder.clientSnapshot?.sector || 'Sin sector',
          seller: newOrder.sellerName,
          orderCode: newOrder.code,
          product: item.productName,
          sale,
          cost,
          profit,
          marginPct: sale > 0 ? profit / sale : 0,
          paymentMethod: newOrder.paymentMethod,
          dispatchStatus: 'Pagado',
        };
      });
      setSales((current) => [...saleRows.filter((row) => !current.some((item) => item.orderCode === row.orderCode && item.product === row.product)), ...current]);
    }

    setFeedback({ type: 'success', text: `Pedido generado correctamente. Codigo ${newOrder.code} en estado ${initialStatus}.` });
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
            <p className="muted">
              {saleChannel === 'oficina'
                ? 'Completa cliente, pago y productos para cerrar la venta como pagada.'
                : 'El sistema toma automaticamente los datos del cliente seleccionado.'}
            </p>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Seleccione al cliente</span>
              <select value={form.clientId} onChange={handleClientChange}>
                <option value="">Selecciona un cliente</option>
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.zone ? ` - ${client.zone}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-wide">
              <span>Seleccione metodo de pago</span>
              <select value={form.paymentMethod} onChange={handleFieldChange('paymentMethod')}>
                <option value="">Selecciona metodo de pago</option>
                {availablePaymentMethodsByChannel.map((method) => (
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
              <p className="muted">Ciudad despacho: {selectedCity || 'Sin ciudad'}</p>
              <p className="muted">
                Tarifa ciudad ({Math.round(dispatchRate * 100)}%): {formatMoney(dispatchSurcharge)}
              </p>
            </div>
            <strong>{formatMoney(total)}</strong>
          </div>

          {saleChannel === 'online' ? (
            <>
              <button
                className="button button-secondary button-full"
                type="button"
                onClick={handleDownloadQuote}
                disabled={downloadingQuote}
              >
                {downloadingQuote ? 'Generando PDF...' : 'Descargar cotizacion'}
              </button>
              <label className="button button-secondary button-full" aria-disabled={loadingQuote}>
                {loadingQuote ? 'Cargando cotizacion...' : 'Cargar cotizacion'}
                <input type="file" accept="application/pdf,.pdf" onChange={handleLoadQuote} disabled={loadingQuote} hidden />
              </label>
              <button className="button button-primary button-full" type="submit" form="sales-form">
                Generar pedido
              </button>
            </>
          ) : (
            <button className="button button-primary button-full" type="submit" form="sales-form">
              Generar pedido
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}

export default SalesView;
